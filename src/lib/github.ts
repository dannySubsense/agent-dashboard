/**
 * src/lib/github.ts
 *
 * @octokit/rest wrapper for all GitHub API calls.
 * Octokit instance is initialized at module load.
 * All functions return 0 / [] on error — they do not throw.
 * owner and repo always come from parameters (resolved via getGitHubRemote during discovery).
 */

import { Octokit } from '@octokit/rest';
import { requireEnv } from './env';
import type { GitHubPr, GitHubIssue } from '@/types/index';

// Instantiated once at module load.
// requireEnv returns "" if GITHUB_TOKEN is absent; "" is falsy, so Octokit runs
// in unauthenticated mode (60 req/hour). All functions still work, just rate-limited.
const octokit = new Octokit({ auth: requireEnv('GITHUB_TOKEN') });

/**
 * Internal: returns true if the GitHub rate limit has been exhausted.
 * Octokit response headers use lowercase keys per the Fetch/HTTP spec.
 */
function isRateLimited(
  headers: Record<string, string | number | undefined>
): boolean {
  const remaining = headers['x-ratelimit-remaining'];
  // GitHub sends the header as a string; handle both string and numeric representations.
  return remaining === '0' || remaining === 0;
}

/**
 * Returns the count of open pull requests for the given repo.
 * Uses getOpenPrs with a high per_page to get an accurate count (up to 100).
 * Returns 0 on any error.
 */
export async function getOpenPrCount(owner: string, repo: string): Promise<number> {
  const prs = await getOpenPrs(owner, repo, 100);
  return prs.length;
}

/**
 * Returns up to `limit` open pull requests for the given repo.
 * Default limit: 25.
 * Returns [] on any error (network failure, 401, 404, rate limit, etc.).
 */
export async function getOpenPrs(
  owner: string,
  repo: string,
  limit = 25
): Promise<GitHubPr[]> {
  try {
    const response = await octokit.rest.pulls.list({
      owner,
      repo,
      state: 'open',
      per_page: limit,
    });

    if (isRateLimited(response.headers)) {
      console.warn(`[github] Rate limit exhausted for ${owner}/${repo} (getOpenPrs)`);
      return [];
    }

    return response.data.map((item) => ({
      number: item.number,
      title: item.title,
      url: item.html_url,
    }));
  } catch (err) {
    console.error(`[github] getOpenPrs(${owner}/${repo}) error:`, err);
    return [];
  }
}

/**
 * Returns up to `limit` open issues for the given repo (pull requests excluded).
 * Default limit: 25.
 * Returns [] on any error.
 */
export async function getOpenIssues(
  owner: string,
  repo: string,
  limit = 25
): Promise<GitHubIssue[]> {
  try {
    const response = await octokit.rest.issues.listForRepo({
      owner,
      repo,
      state: 'open',
      per_page: limit,
    });

    if (isRateLimited(response.headers)) {
      console.warn(`[github] Rate limit exhausted for ${owner}/${repo} (getOpenIssues)`);
      return [];
    }

    return response.data
      // Filter out pull requests — the issues endpoint returns both.
      // Items with a pull_request property are PRs, not issues.
      .filter((item) => !item.pull_request)
      .map((item) => ({
        number: item.number,
        title: item.title,
        url: item.html_url,
      }));
  } catch (err) {
    console.error(`[github] getOpenIssues(${owner}/${repo}) error:`, err);
    return [];
  }
}

/**
 * Returns pull requests that were merged on or after `since`.
 * Fetches the 50 most recently updated closed PRs and filters client-side.
 * Returns [] on any error.
 */
export async function getMergedPrs(
  owner: string,
  repo: string,
  since: Date
): Promise<GitHubPr[]> {
  try {
    const response = await octokit.rest.pulls.list({
      owner,
      repo,
      state: 'closed',
      sort: 'updated',
      direction: 'desc',
      per_page: 50,
    });

    if (isRateLimited(response.headers)) {
      console.warn(`[github] Rate limit exhausted for ${owner}/${repo} (getMergedPrs)`);
      return [];
    }

    return response.data
      .filter(
        (item) =>
          item.merged_at !== null && new Date(item.merged_at) >= since
      )
      .map((item) => ({
        number: item.number,
        title: item.title,
        url: item.html_url,
        // merged_at is confirmed non-null by the filter above
        mergedAt: new Date(item.merged_at as string),
      }));
  } catch (err) {
    console.error(`[github] getMergedPrs(${owner}/${repo}) error:`, err);
    return [];
  }
}
