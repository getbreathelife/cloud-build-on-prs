import { Request, Response } from 'express';
import { PullRequest } from 'github-webhook-event-types';
import { ChecksCreateResponse } from '@octokit/rest';
import {
  authenticateInstallation,
  createCheck,
  getChangedPrFilenames,
  isActionFiltered,
  getFileContents,
} from './github';
import { triggerBuilds } from './cloudbuild';
import { Build, filterBuildsWithChangedFiles } from './builds';
import { builds } from './config/builds';

exports.githubPrUpdate = async (req: Request, res: Response) => {
  try {
    // Delay by 2s to prevent race condition issue with Google Cloud Repository syncing with GitHub
    await wait(2000);
    const buildIds: string[] = await onGithubPrUpdate(req.body);
    const message = buildIds.length ? `Started cloud builds: ${buildIds.join(', ')}` : 'No cloud build required';
    console.log(message);
    res.status(200).send(message);
  } catch (error) {
    res.status(500).send(error);
    throw error; // Make it appear in Stackdriver Error Reporting
  }
};

async function onGithubPrUpdate(event: PullRequest): Promise<string[]> {
  // @ts-ignore `installation` is missing from type definitions
  const installationId: number = event.installation.id;
  authenticateInstallation(installationId);

  // Limit actions to those that should trigger a build
  if (!isActionFiltered(event.action)) return [];

  const repoOwner: string = event.repository.owner.login;
  const repoName: string = event.repository.name;
  const branchName: string = event.pull_request.head.ref;
  const commitSha: string = event.pull_request.head.sha;
  const prNumber: number = event.pull_request.number;

  // Get the filenames of all changed files in this PR from GitHub
  const changedFilenames: string[] = await getChangedPrFilenames(event);

  console.log(
    `Repo: ${repoName}\n` +
      `Branch: ${branchName}\n` +
      `Commit: ${commitSha}\n` +
      `PR: #${prNumber}\n` +
      `Changed files: ${changedFilenames.join(', ')}`
  );

  // Identify which builds are required based on the changed files
  const requiredBuilds: Build[] = filterBuildsWithChangedFiles(builds, changedFilenames);

  // Add a GitHub check to the last commit for every required build
  const checks: ChecksCreateResponse[] = await Promise.all(
    requiredBuilds.map(build =>
      createCheck({
        owner: repoOwner,
        repo: repoName,
        name: build.label,
        head_sha: commitSha,
      })
    )
  );

  const checkIds: number[] = checks.map(check => check.id);

  const manifestFilesContents: string[] = await Promise.all(
    requiredBuilds.map((build: Build) => {
      try {
        return getFileContents({
          owner: repoOwner,
          repo: repoName,
          ref: branchName,
          path: build.manifestFile,
        });
      } catch (e) {
        throw Error(`Failed to fetch manifest file from GitHub: ${build.manifestFile} on branch ${branchName}: ${e}`);
      }
    })
  );

  console.log(`Triggering builds for projects: ${requiredBuilds.map(buildType => buildType.id).join(', ')}`);

  // Trigger Cloud Build only for projects containing changed files
  return await triggerBuilds(manifestFilesContents, checkIds, installationId, repoName, branchName, commitSha);
}

async function wait(durationMs: number) {
  return new Promise(resolve => setTimeout(resolve, durationMs));
}
