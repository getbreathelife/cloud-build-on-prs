import { auth } from 'google-auth-library';
import axios, { AxiosResponse } from 'axios';
import _ from 'lodash';
import * as yaml from 'js-yaml';
import btoa from 'btoa';
import { GetAccessTokenResponse } from 'google-auth-library/build/src/auth/oauth2client';

export async function triggerBuilds(
  manifestFilesContent: string[],
  checkIds: number[],
  installationId: number,
  repoName: string,
  branchName: string,
  commitSha: string
): Promise<string[]> {
  // Read token to authenticate to Cloud Build
  const gcloudToken = await authenticate();

  // Trigger all builds
  const buildIds: string[] = [];
  for (const manifestFileContent of manifestFilesContent) {
    const buildId: string = await triggerBuild(
      manifestFileContent,
      checkIds[manifestFilesContent.indexOf(manifestFileContent)],
      installationId,
      repoName,
      branchName,
      commitSha,
      gcloudToken
    );
    buildIds.push(buildId);
  }

  return buildIds;
}

async function triggerBuild(
  manifestFileContents: string,
  checkId: number,
  installationId: number,
  repoName: string,
  branchName: string,
  commitSha: string,
  gcloudToken: string
): Promise<string> {
  const cloudbuildObj = await yaml.safeLoad(manifestFileContents);
  const projectId: string = await auth.getProjectId();

  const branchNameBase64: string = btoa(branchName).replace(/=/g, '');

  const requestData = {
    ...cloudbuildObj,
    source: {
      repoSource: {
        commitSha,
        projectId,
        repoName,
      },
    },
    // Set GitHub check ID and installation ID in cloud build tags, will be used in `cloudbuild-update` cloud function
    // Also set branch name in tags, will be used by the Slack notifier
    tags: [`branch_${branchNameBase64}`, `check_${checkId}`, `installation_${installationId}`],
  };

  let buildResponse: AxiosResponse;
  try {
    buildResponse = await axios({
      method: 'POST',
      url: `https://cloudbuild.googleapis.com/v1/projects/${projectId}/builds`,
      headers: { Authorization: `Bearer ${gcloudToken}` },
      data: requestData,
    });
  } catch (data) {
    throw Error(`Failed to start cloud build: ${JSON.stringify(data.response.data.error)}`);
  }

  const buildId = _.get(buildResponse, ['data', 'metadata', 'build', 'id']);

  if (typeof buildId === 'undefined') {
    throw Error(
      `Unexpected response from Cloud Build API. Cannot extract build ID. Response: ${JSON.stringify(buildResponse)}`
    );
  }

  return buildId;
}

async function authenticate(): Promise<string> {
  const client = await auth.getClient({
    scopes: 'https://www.googleapis.com/auth/cloud-platform',
  });

  // Will use the service account set in Google Cloud Functions
  const tokenResponse: GetAccessTokenResponse = await client.getAccessToken();

  if (!tokenResponse.token) throw Error(`Failed to get a Google access token: ${tokenResponse.res}`);

  return tokenResponse.token;
}
