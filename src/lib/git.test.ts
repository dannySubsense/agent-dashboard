/**
 * Acceptance criteria covered (Slice 2 — git.ts):
 * - getGitHubRemote parses HTTPS remote URL → { owner, repo }
 * - getGitHubRemote parses SSH remote URL → { owner, repo }
 * - getGitHubRemote returns null for non-GitHub remote
 * - getGitHubRemote returns null for non-repo path without throwing
 * - getLastCommit returns a GitCommit with non-null hash, date, message for a real repo
 * - getLastCommit returns null for a non-repo path without throwing
 * - getCommitsSince returns an array of GitCommit objects for a real repo
 * - getCommitsSince returns [] for a non-repo path without throwing
 *
 * URL parsing tests use mockImplementationOnce to control the remote URL returned
 * by simple-git. Real repo tests fall through to the actual simple-git implementation
 * via vi.fn(actual.default), which calls the real module by default.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getGitHubRemote, getLastCommit, getCommitsSince } from './git';
import simpleGit from 'simple-git';
import type { SimpleGit } from 'simple-git';

vi.mock('simple-git', async () => {
  const actual = await vi.importActual<typeof import('simple-git')>('simple-git');
  return { default: vi.fn(actual.default) };
});

function partialGit(overrides: Partial<SimpleGit>): SimpleGit {
  return overrides as unknown as SimpleGit;
}

describe('getGitHubRemote URL parsing', () => {
  beforeEach(() => {
    vi.mocked(simpleGit).mockClear();
  });

  it('parses HTTPS GitHub remote URL to { owner, repo }', async () => {
    vi.mocked(simpleGit).mockImplementationOnce(() =>
      partialGit({
        getConfig: vi.fn().mockResolvedValue({
          value: 'https://github.com/dannySubsense/agent-dashboard.git',
        }),
      })
    );
    const result = await getGitHubRemote('/any/path');
    expect(result).toEqual({ owner: 'dannySubsense', repo: 'agent-dashboard' });
  });

  it('parses SSH GitHub remote URL to { owner, repo }', async () => {
    vi.mocked(simpleGit).mockImplementationOnce(() =>
      partialGit({
        getConfig: vi.fn().mockResolvedValue({
          value: 'git@github.com:dannySubsense/agent-dashboard.git',
        }),
      })
    );
    const result = await getGitHubRemote('/any/path');
    expect(result).toEqual({ owner: 'dannySubsense', repo: 'agent-dashboard' });
  });

  it('returns null for a non-GitHub remote without throwing', async () => {
    vi.mocked(simpleGit).mockImplementationOnce(() =>
      partialGit({
        getConfig: vi.fn().mockResolvedValue({
          value: 'https://gitlab.com/owner/repo.git',
        }),
      })
    );
    const result = await getGitHubRemote('/any/path');
    expect(result).toBeNull();
  });

  it('returns null for a non-repo path without throwing', async () => {
    const result = await getGitHubRemote('/tmp/not-a-repo');
    expect(result).toBeNull();
  });
});

describe('getLastCommit', () => {
  it('returns a GitCommit with non-null hash, date, and message for the real repo', async () => {
    const result = await getLastCommit('/home/d-tuned/projects/agent-dashboard');
    expect(result).not.toBeNull();
    expect(result!.hash).toBeTruthy();
    expect(result!.date).toBeInstanceOf(Date);
    expect(typeof result!.message).toBe('string');
  });

  it('returns null for a non-repo path without throwing', async () => {
    const result = await getLastCommit('/tmp/not-a-repo');
    expect(result).toBeNull();
  });
});

describe('getCommitsSince', () => {
  it('returns an array of GitCommit objects for the real repo', async () => {
    const since = new Date(Date.now() - 14 * 86400 * 1000);
    const result = await getCommitsSince('/home/d-tuned/projects/agent-dashboard', since);
    expect(Array.isArray(result)).toBe(true);
  });

  it('returns [] for a non-repo path without throwing', async () => {
    const result = await getCommitsSince('/tmp/not-a-repo', new Date());
    expect(result).toEqual([]);
  });
});
