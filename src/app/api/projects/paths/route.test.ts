/**
 * src/app/api/projects/paths/route.test.ts
 *
 * Acceptance criteria covered (Slice 4 — POST /api/projects/paths):
 * - AC1: POST with a valid git repo path returns HTTP 200 with data: ProjectCardData[]
 * - AC2: POST with a valid path appends it to config file; file is created if absent
 * - AC3: POST with a path already in config file returns HTTP 200 without duplicating the entry
 * - AC4: POST with a path already discoverable via env returns HTTP 200; does NOT write config file
 * - AC5: POST with a non-existent path returns HTTP 400 with "Path does not exist or is not readable"
 * - AC6: POST with path that exists but has no .git returns HTTP 400 with "Path exists but has no .git directory"
 * - AC7: POST with a relative path returns HTTP 400 with "Path must be absolute"
 * - AC8: POST with missing path field returns HTTP 400 with "Missing or invalid path field"
 * - AC9: POST success: cache.get('projects') returns null immediately after (cache is invalidated)
 * - AC10: POST when config file write fails returns HTTP 500 with error beginning "Config file write failed:"
 *
 * Isolation strategy:
 * - fs/promises — manual factory mock (controls stat call outcomes)
 * - @/lib/discovery, @/lib/config, @/lib/projects — vi.fn() factories
 * - next/server — minimal mock captures body + status without Next.js runtime init
 * - cache — real implementation; AC9 verifies actual cache.delete() side effect
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs/promises';
import { cache } from '@/lib/cache';
import { discoverProjects } from '@/lib/discovery';
import { readConfigFile, writeConfigFile } from '@/lib/config';
import { getProjectsData } from '@/lib/projects';
import { POST } from '@/app/api/projects/paths/route';
import type { ProjectCardData } from '@/types';

// ── Module mocks ─────────────────────────────────────────────────────────────

vi.mock('fs/promises', () => ({
  default: { stat: vi.fn() },
}));

vi.mock('@/lib/discovery', () => ({ discoverProjects: vi.fn() }));
vi.mock('@/lib/config', () => ({ readConfigFile: vi.fn(), writeConfigFile: vi.fn() }));
vi.mock('@/lib/projects', () => ({ getProjectsData: vi.fn() }));

// Minimal NextResponse mock: avoids Next.js server-side initialisation in jsdom.
// Returns { json, status } so tests can assert on both body and HTTP status code.
vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      json: async () => body,
      status: init?.status ?? 200,
    }),
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/projects/paths', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const fakeProject: ProjectCardData = {
  repoPath: '/repos/my-repo',
  repoName: 'my-repo',
  projectId: 'my-repo',
  agentName: null,
  lastCommit: null,
  lastLoreCapture: null,
  currentSprint: null,
  openPrCount: 0,
  hasActiveHalt: false,
  lastTouchedAt: new Date('2026-06-21T00:00:00Z'),
};

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetAllMocks();
  cache.clear();

  // Default: both stat calls succeed (path exists AND .git exists)
  vi.mocked(fs.stat).mockResolvedValue({} as any);

  // Default: no projects discoverable via env
  vi.mocked(discoverProjects).mockResolvedValue([]);

  // Default: config file is empty
  vi.mocked(readConfigFile).mockResolvedValue({ projectPaths: [] });

  // Default: config file write succeeds
  vi.mocked(writeConfigFile).mockResolvedValue(undefined);

  // Default: getProjectsData returns one project
  vi.mocked(getProjectsData).mockResolvedValue([fakeProject]);
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/projects/paths', () => {
  it('AC1: returns HTTP 200 with data array for a valid git repo path', async () => {
    const response = await POST(makeRequest({ path: '/repos/my-repo' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.error).toBeNull();
  });

  it('AC2: appends the resolved path to the config file when the path is new', async () => {
    vi.mocked(readConfigFile).mockResolvedValue({ projectPaths: [] });

    await POST(makeRequest({ path: '/repos/new-repo' }));

    expect(vi.mocked(writeConfigFile)).toHaveBeenCalledWith({
      projectPaths: ['/repos/new-repo'],
    });
  });

  it('AC3: returns HTTP 200 without duplicating when path is already in config file', async () => {
    vi.mocked(readConfigFile).mockResolvedValue({ projectPaths: ['/repos/my-repo'] });

    const response = await POST(makeRequest({ path: '/repos/my-repo' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(vi.mocked(writeConfigFile)).not.toHaveBeenCalled();
  });

  it('AC4: returns HTTP 200 without writing config when path is already discoverable via env', async () => {
    vi.mocked(discoverProjects).mockResolvedValue([
      {
        repoPath: '/repos/my-repo',
        repoName: 'my-repo',
        projectId: null,
        agentName: null,
        githubRemote: null,
      },
    ]);

    const response = await POST(makeRequest({ path: '/repos/my-repo' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(vi.mocked(readConfigFile)).not.toHaveBeenCalled();
    expect(vi.mocked(writeConfigFile)).not.toHaveBeenCalled();
  });

  it('AC5: returns HTTP 400 with "Path does not exist or is not readable" for a non-existent path', async () => {
    vi.mocked(fs.stat).mockRejectedValue(
      Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' }),
    );

    const response = await POST(makeRequest({ path: '/nonexistent/path' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Path does not exist or is not readable');
  });

  it('AC6: returns HTTP 400 with "Path exists but has no .git directory" for a path without .git', async () => {
    // First stat call (path itself) resolves; second stat call (.git) rejects
    vi.mocked(fs.stat)
      .mockResolvedValueOnce({} as any)
      .mockRejectedValueOnce(
        Object.assign(new Error('ENOENT: no such file or directory'), { code: 'ENOENT' }),
      );

    const response = await POST(makeRequest({ path: '/repos/not-a-git-repo' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Path exists but has no .git directory');
  });

  it('AC7: returns HTTP 400 with "Path must be absolute" for a relative path', async () => {
    const response = await POST(makeRequest({ path: 'relative/path/to/repo' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Path must be absolute');
  });

  it('AC8: returns HTTP 400 with "Missing or invalid path field" when path field is absent', async () => {
    const response = await POST(makeRequest({}));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Missing or invalid path field');
  });

  it('AC9: invalidates the projects cache after a successful POST', async () => {
    // Pre-populate cache to confirm deletion, not just absence
    cache.set('projects', [fakeProject]);

    await POST(makeRequest({ path: '/repos/my-repo' }));

    expect(cache.get('projects')).toBeNull();
  });

  it('AC10: returns HTTP 500 with "Config file write failed:" prefix when config file write fails', async () => {
    vi.mocked(discoverProjects).mockResolvedValue([]);
    vi.mocked(readConfigFile).mockResolvedValue({ projectPaths: [] });
    vi.mocked(writeConfigFile).mockRejectedValue(new Error('disk full'));

    const response = await POST(makeRequest({ path: '/repos/my-repo' }));
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toMatch(/^Config file write failed:/);
  });
});
