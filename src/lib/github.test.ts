/**
 * Acceptance criteria covered:
 * - All four public functions are exported and are typeof 'function'
 * - getOpenPrs returns [] on network error (does not throw)
 * - getOpenPrs returns [] when rate limited (x-ratelimit-remaining: '0')
 * - getOpenPrs returns mapped GitHubPr array on success
 * - getOpenIssues returns [] on network error (does not throw)
 * - getOpenIssues filters out items with a pull_request property
 * - getMergedPrs returns [] on network error (does not throw)
 * - getMergedPrs filters by merged_at >= since, excludes unmerged
 * - getOpenPrCount returns 0 on network error (does not throw)
 * - getOpenPrCount returns the count of open PRs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Hoist mock handles so they are defined before vi.mock factory runs.
const { mockPullsList, mockIssuesListForRepo } = vi.hoisted(() => ({
  mockPullsList: vi.fn(),
  mockIssuesListForRepo: vi.fn(),
}));

vi.mock('@octokit/rest', () => ({
  Octokit: vi.fn().mockImplementation(() => ({
    rest: {
      pulls: { list: mockPullsList },
      issues: { listForRepo: mockIssuesListForRepo },
    },
  })),
}));

import {
  getOpenPrCount,
  getOpenPrs,
  getOpenIssues,
  getMergedPrs,
} from './github';

// Suppress console.warn from requireEnv (GITHUB_TOKEN absent in test env)
// and console.error from caught errors in the module under test.
beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mockPullsList.mockReset();
  mockIssuesListForRepo.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Module exports
// ---------------------------------------------------------------------------

describe('github module exports', () => {
  it('exports getOpenPrCount as a function', () => {
    expect(typeof getOpenPrCount).toBe('function');
  });

  it('exports getOpenPrs as a function', () => {
    expect(typeof getOpenPrs).toBe('function');
  });

  it('exports getOpenIssues as a function', () => {
    expect(typeof getOpenIssues).toBe('function');
  });

  it('exports getMergedPrs as a function', () => {
    expect(typeof getMergedPrs).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// getOpenPrs
// ---------------------------------------------------------------------------

describe('getOpenPrs', () => {
  it('returns [] on network error (does not throw)', async () => {
    mockPullsList.mockRejectedValue(new Error('Network failure'));

    const result = await getOpenPrs('dannySubsense', 'agent-dashboard');

    expect(result).toEqual([]);
  });

  it('returns [] when rate limited (x-ratelimit-remaining: "0")', async () => {
    mockPullsList.mockResolvedValue({
      headers: { 'x-ratelimit-remaining': '0' },
      data: [],
    });

    const result = await getOpenPrs('dannySubsense', 'agent-dashboard');

    expect(result).toEqual([]);
  });

  it('returns mapped GitHubPr array on success', async () => {
    mockPullsList.mockResolvedValue({
      headers: { 'x-ratelimit-remaining': '59' },
      data: [
        { number: 1, title: 'Fix bug', html_url: 'https://github.com/owner/repo/pull/1' },
        { number: 2, title: 'Add feature', html_url: 'https://github.com/owner/repo/pull/2' },
      ],
    });

    const result = await getOpenPrs('dannySubsense', 'agent-dashboard');

    expect(result).toEqual([
      { number: 1, title: 'Fix bug', url: 'https://github.com/owner/repo/pull/1' },
      { number: 2, title: 'Add feature', url: 'https://github.com/owner/repo/pull/2' },
    ]);
  });
});

// ---------------------------------------------------------------------------
// getOpenIssues
// ---------------------------------------------------------------------------

describe('getOpenIssues', () => {
  it('returns [] on network error (does not throw)', async () => {
    mockIssuesListForRepo.mockRejectedValue(new Error('Network failure'));

    const result = await getOpenIssues('dannySubsense', 'agent-dashboard');

    expect(result).toEqual([]);
  });

  it('filters out items that have a pull_request property', async () => {
    mockIssuesListForRepo.mockResolvedValue({
      headers: { 'x-ratelimit-remaining': '59' },
      data: [
        { number: 1, title: 'Real issue', html_url: 'https://github.com/owner/repo/issues/1' },
        {
          number: 2,
          title: 'A PR masquerading as issue',
          html_url: 'https://github.com/owner/repo/pull/2',
          pull_request: { url: 'https://api.github.com/repos/owner/repo/pulls/2' },
        },
      ],
    });

    const result = await getOpenIssues('dannySubsense', 'agent-dashboard');

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      number: 1,
      title: 'Real issue',
      url: 'https://github.com/owner/repo/issues/1',
    });
  });
});

// ---------------------------------------------------------------------------
// getMergedPrs
// ---------------------------------------------------------------------------

describe('getMergedPrs', () => {
  it('returns [] on network error (does not throw)', async () => {
    mockPullsList.mockRejectedValue(new Error('Network failure'));

    const result = await getMergedPrs('dannySubsense', 'agent-dashboard', new Date('2024-01-01'));

    expect(result).toEqual([]);
  });

  it('returns only PRs merged on or after `since`, excluding unmerged', async () => {
    const since = new Date('2024-06-01T00:00:00Z');

    mockPullsList.mockResolvedValue({
      headers: { 'x-ratelimit-remaining': '59' },
      data: [
        {
          number: 1,
          title: 'Recent merge',
          html_url: 'https://github.com/owner/repo/pull/1',
          merged_at: '2024-07-01T00:00:00Z',
        },
        {
          number: 2,
          title: 'Old merge',
          html_url: 'https://github.com/owner/repo/pull/2',
          merged_at: '2024-01-01T00:00:00Z',
        },
        {
          number: 3,
          title: 'Never merged (closed without merge)',
          html_url: 'https://github.com/owner/repo/pull/3',
          merged_at: null,
        },
      ],
    });

    const result = await getMergedPrs('dannySubsense', 'agent-dashboard', since);

    expect(result).toHaveLength(1);
    expect(result[0].number).toBe(1);
    expect(result[0].mergedAt).toEqual(new Date('2024-07-01T00:00:00Z'));
  });
});

// ---------------------------------------------------------------------------
// getOpenPrCount
// ---------------------------------------------------------------------------

describe('getOpenPrCount', () => {
  it('returns 0 on network error (does not throw)', async () => {
    mockPullsList.mockRejectedValue(new Error('Network failure'));

    const result = await getOpenPrCount('dannySubsense', 'agent-dashboard');

    expect(result).toBe(0);
  });

  it('returns the count of open PRs returned by the API', async () => {
    mockPullsList.mockResolvedValue({
      headers: { 'x-ratelimit-remaining': '59' },
      data: [
        { number: 1, title: 'PR 1', html_url: 'https://github.com/owner/repo/pull/1' },
        { number: 2, title: 'PR 2', html_url: 'https://github.com/owner/repo/pull/2' },
        { number: 3, title: 'PR 3', html_url: 'https://github.com/owner/repo/pull/3' },
      ],
    });

    const result = await getOpenPrCount('dannySubsense', 'agent-dashboard');

    expect(result).toBe(3);
  });
});
