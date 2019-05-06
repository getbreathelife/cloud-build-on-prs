import Octokit, { Response, ChecksUpdateParams, ChecksUpdateResponse } from '@octokit/rest';
import * as env from 'env-var';
import App from '@octokit/app';

export const GITHUB_OWNER = env
  .get('GITHUB_OWNER')
  .required()
  .asString();

const GITHUB_APP_ID = env
  .get('GITHUB_APP_ID')
  .required()
  .asString();

const GITHUB_APP_PRIVATE_KEY = env
  .get('GITHUB_APP_PRIVATE_KEY')
  .required()
  .asString()
  .replace(/\\n/g, '\n');

let octokit: Octokit;
const app = new App({ id: GITHUB_APP_ID, privateKey: GITHUB_APP_PRIVATE_KEY });

export function authenticateInstallation(installationId: number): void {
  if (octokit) return;

  // Authenticate as a GitHub app installation
  // https://developer.github.com/apps/building-github-apps/authenticating-with-github-apps/#authenticating-as-an-installation
  // Octokit will automatically handle the refresh of the JWT every hour
  octokit = new Octokit({
    async auth() {
      const installationToken = await app.getInstallationAccessToken({ installationId });
      return `token ${installationToken}`;
    },
  });
}

export async function updateCheck(params: ChecksUpdateParams): Promise<ChecksUpdateResponse> {
  const checkResponse: Response<ChecksUpdateResponse> = await octokit.checks.update(params);
  return checkResponse.data;
}
