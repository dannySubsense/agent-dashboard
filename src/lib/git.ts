/**
 * src/lib/git.ts
 *
 * Thin wrapper over simple-git for local git repo reads.
 * All functions return null / [] on any error — no throws to caller.
 */

import simpleGit from 'simple-git';
import type { GitCommit } from '@/types';

/** Maps a simple-git log entry to the shared GitCommit interface. */
function toGitCommit(raw: {
  hash: string;
  date: string;
  message: string;
  author_name: string;
}): GitCommit {
  return {
    hash: raw.hash,
    // simple-git date is an ISO string; parse to Date
    date: new Date(raw.date),
    // first line only (short message)
    message: raw.message.split('\n')[0].trim(),
    author: raw.author_name,
  };
}

/**
 * Returns the most recent commit in the repo, or null if the path is not a
 * git repository, has no commits, or any other error occurs.
 */
export async function getLastCommit(
  repoPath: string
): Promise<GitCommit | null> {
  try {
    const git = simpleGit(repoPath);
    const log = await git.log({ maxCount: 1 });
    if (!log.latest) return null;
    return toGitCommit(log.latest);
  } catch {
    return null;
  }
}

/**
 * Returns all commits in the repo with author date >= since.
 * Uses git's --after flag for date filtering.
 * Returns [] on any error (no .git dir, empty log, etc.).
 * Does not throw.
 */
export async function getCommitsSince(
  repoPath: string,
  since: Date
): Promise<GitCommit[]> {
  try {
    const git = simpleGit(repoPath);
    // Pass --after as a raw git flag; simple-git's LogOptions.from is
    // a commit-range specifier, not a date filter.
    const log = await git.log([`--after=${since.toISOString()}`]);
    return log.all.map(toGitCommit);
  } catch {
    return [];
  }
}

/**
 * Reads the remote.origin.url git config and parses the GitHub owner/repo.
 *
 * Supported URL formats:
 *   HTTPS: https://github.com/owner/repo.git  or  https://github.com/owner/repo
 *   SSH:   git@github.com:owner/repo.git       or  git@github.com:owner/repo
 *
 * Returns null for:
 *   - Non-GitHub remotes (GitLab, Bitbucket, self-hosted)
 *   - Missing or empty remote.origin.url
 *   - Any git or parse error
 *
 * Does not throw.
 */
export async function getGitHubRemote(
  repoPath: string
): Promise<{ owner: string; repo: string } | null> {
  try {
    const git = simpleGit(repoPath);
    const config = await git.getConfig('remote.origin.url');
    const url = config.value;
    if (!url) return null;

    // Matches both HTTPS and SSH GitHub remote formats
    const match = url.match(
      /^(?:https?:\/\/github\.com\/|git@github\.com:)([^/]+)\/([^/\n.]+?)(?:\.git)?$/
    );
    if (!match) return null;

    return { owner: match[1], repo: match[2] };
  } catch {
    return null;
  }
}
