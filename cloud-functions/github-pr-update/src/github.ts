import Octokit, {
  Response,
  PullsListFilesResponseItem,
  ChecksCreateParams,
  ChecksCreateResponse,
  ReposGetContentsParams,
} from '@octokit/rest';
import App from '@octokit/app';
import * as env from 'env-var';
import atob from 'atob';
import { PullRequest } from 'github-webhook-event-types';

const GITHUB_APP_ID = env
  .get('GITHUB_APP_ID')
  .required()
  .asString();

const GITHUB_APP_PRIVATE_KEY = env
  .get('GITHUB_APP_PRIVATE_KEY')
  .required()
  .asString()
  .replace(/\\n/g, '\n');

const FILTERED_ACTIONS = ['opened', 'synchronize'];

let octokit: Octokit;
const app = new App({ id: GITHUB_APP_ID, privateKey: GITHUB_APP_PRIVATE_KEY });

export const isActionFiltered = (action: string) => FILTERED_ACTIONS.includes(action);

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

async function getChangedPrFiles(event: PullRequest): Promise<PullsListFilesResponseItem[]> {
  return octokit.paginate('GET /repos/:owner/:repo/pulls/:number/files', {
    owner: event.repository.owner.login,
    repo: event.repository.name,
    number: event.pull_request.number,
  });
}

export async function getChangedPrFilenames(event: PullRequest): Promise<string[]> {
  // Fetch the list of changed files in this PR from GitHub
  const changedFiles: PullsListFilesResponseItem[] = await getChangedPrFiles(event);

  // Match the path of those changed files with the project paths to find which projects changed
  return changedFiles.map(changedFile => changedFile.filename);
}

export async function createCheck(params: ChecksCreateParams): Promise<ChecksCreateResponse> {
  const checkResponse: Response<ChecksCreateResponse> = await octokit.checks.create(params);
  return checkResponse.data;
}

export async function getFileContents(params: ReposGetContentsParams): Promise<string> {
  const fileContentsResponse: Response<string> = await octokit.repos.getContents(params);

  try {
    // @ts-ignore get contents response is not typed
    return atob(fileContentsResponse.data.content);
  } catch (e) {
    throw Error(`Failed to decode GitHub file ${params.path}: ${e}`);
  }
}
