import { ChecksUpdateParams } from '@octokit/rest';
import { authenticateInstallation, GITHUB_OWNER, updateCheck } from './github';
import { extractIdFromTags, getFailureSummary } from './cloudbuild';

exports.cloudbuildUpdate = (data: any, context: any) => {
  const pubSubMessage: string = Buffer.from(data.data, 'base64').toString();
  const build = JSON.parse(pubSubMessage);

  onCloudbuildUpdate(build).catch(e => {
    console.error(e);
  });
};

async function onCloudbuildUpdate(build: any): Promise<void> {
  // Extract GitHub check ID and installation ID from cloud build tags
  const checkId: number | undefined = extractIdFromTags(build, 'check');
  const installationId: number | undefined = extractIdFromTags(build, 'installation');
  if (typeof checkId === 'undefined' || typeof installationId === 'undefined') {
    console.log(
      'Check ID and installation ID not found in build tags. This build was not initiated by github-pr-update. Skipping.'
    );
    return;
  }

  authenticateInstallation(installationId);

  // @ts-ignore TypeScript doesn't compare union types properly in the switch case
  const checksUpdateParams: ChecksUpdateParams | undefined = (status => {
    const commonParams = {
      owner: GITHUB_OWNER,
      repo: build.source.repoSource.repoName,
      check_run_id: checkId,
    };

    const completedParams = {
      ...commonParams,
      status: 'completed',
      completed_at: new Date().toISOString(),
    };

    // Update GitHub check according to Cloud Build status
    switch (status) {
      case 'WORKING':
        return {
          ...commonParams,
          status: 'in_progress',
          details_url: build.logUrl,
        };
      case 'SUCCESS':
        return {
          ...completedParams,
          conclusion: 'success',
          output: {
            title: 'Success',
            summary: 'The cloud build completed successfully',
          },
        };
      case 'FAILURE':
        return {
          ...completedParams,
          conclusion: 'failure',
          output: {
            title: 'Failure',
            summary: getFailureSummary(build),
          },
        };
      case 'INTERNAL_ERROR':
        return {
          ...completedParams,
          conclusion: 'failure',
          output: {
            title: 'Internal error',
            summary: `An internal error occurred in Google Cloud Build: ${build.statusDetail}\n${build.logUrl}`,
          },
        };
      case 'TIMEOUT':
        return {
          ...completedParams,
          conclusion: 'timed_out',
          output: {
            title: 'Timed out',
            summary: 'The cloud build took too long to complete',
          },
        };
      case 'CANCELLED':
        return {
          ...completedParams,
          conclusion: 'cancelled',
          title: 'Cancelled',
          summary: 'The cloud build was cancelled',
        };
    }
  })(build.status);

  if (!checksUpdateParams) return;

  await updateCheck(checksUpdateParams);
  console.log(`Updated GitHub check for build ${build.id} with new status: ${build.status}`);
}
