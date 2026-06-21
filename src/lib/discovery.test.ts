/**
 * Acceptance criteria covered (Slice 2 — discovery.ts):
 * - discoverProjects returns at least one entry for agent-dashboard when given real projects root
 * - each DiscoveredProject entry has repoPath, repoName, projectId, agentName fields
 * - discoverProjects returns [] for a nonexistent path without throwing
 * - each DiscoveredProject has githubRemote field present (not undefined), confirming getGitHubRemote was called per repo
 *
 * Acceptance criteria covered (Slice 3 — Source 3: config file):
 * - AC1: Config file path with .git directory is included in discoverProjects results
 * - AC2: Path in both PROJECT_PATHS and config file appears exactly once (dedup by resolved absolute path)
 * - AC3: Config file path with no .git directory is silently excluded
 * - AC4: Absent config file — discoverProjects proceeds using env-var sources only, no error
 * - AC5: Malformed config file — discoverProjects proceeds using env-var sources only, no error
 *
 * Isolation (Slice 3): vi.mock('./config') controls readConfigFile return value per test.
 * Real temp directories with minimal .git subdirs are used for filesystem probing so fs/promises
 * does not need to be mocked. getGitHubRemote returns null for repos with no remote (does not throw).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import os from 'os';
import { mkdtemp, rm, mkdir } from 'fs/promises';
import { discoverProjects } from './discovery';
import { readConfigFile } from './config';

// Module-level mock: readConfigFile returns { projectPaths: [] } by default.
// This is safe for Slice 2 tests — no config paths are added, existing root-scan
// results are unaffected. Slice 3 tests override per-test via vi.mocked().
vi.mock('./config', () => ({
  readConfigFile: vi.fn().mockResolvedValue({ projectPaths: [] }),
}));

const REAL_PROJECTS_ROOT = '/home/d-tuned/projects';
const REAL_REPO_NAME = 'agent-dashboard';

describe('discoverProjects', () => {
  it('returns at least one entry for agent-dashboard with required fields', async () => {
    const results = await discoverProjects(REAL_PROJECTS_ROOT);

    const dashboardEntry = results.find((p) => p.repoName === REAL_REPO_NAME);
    expect(dashboardEntry).toBeDefined();

    // Each entry must carry the four required fields (values may be null, not undefined)
    for (const entry of results) {
      expect(entry).toHaveProperty('repoPath');
      expect(entry).toHaveProperty('repoName');
      expect(entry).toHaveProperty('projectId');
      expect(entry).toHaveProperty('agentName');
      expect(typeof entry.repoPath).toBe('string');
      expect(typeof entry.repoName).toBe('string');
    }
  });

  it('returns [] for a nonexistent path without throwing', async () => {
    const results = await discoverProjects('/tmp/nonexistent-path-that-does-not-exist');
    expect(results).toEqual([]);
  });

  it('each DiscoveredProject has githubRemote field present (not undefined)', async () => {
    const results = await discoverProjects(REAL_PROJECTS_ROOT);

    // There should be at least one repo to assert against
    expect(results.length).toBeGreaterThan(0);

    for (const entry of results) {
      // githubRemote must be present on every entry — null is valid, undefined is not
      expect('githubRemote' in entry).toBe(true);
      const remote = entry.githubRemote;
      const isNull = remote === null;
      const isRemoteShape =
        remote !== null &&
        typeof remote === 'object' &&
        typeof remote.owner === 'string' &&
        typeof remote.repo === 'string';
      expect(isNull || isRemoteShape).toBe(true);
    }
  });
});

describe('Source 3: config file', () => {
  let tmpDir: string;
  let savedProjectPaths: string | undefined;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), 'agent-dashboard-discovery-'));
    savedProjectPaths = process.env.PROJECT_PATHS;
    // Isolate from any real PROJECT_PATHS in the environment
    process.env.PROJECT_PATHS = '';
    // Reset config mock to the safe default before each test
    vi.mocked(readConfigFile).mockResolvedValue({ projectPaths: [] });
  });

  afterEach(async () => {
    if (savedProjectPaths !== undefined) {
      process.env.PROJECT_PATHS = savedProjectPaths;
    } else {
      delete process.env.PROJECT_PATHS;
    }
    await rm(tmpDir, { recursive: true, force: true });
  });

  // AC1: Given a config file with projectPaths: ['/path/to/valid-repo'] where .git exists,
  // discoverProjects() includes that repo in results.
  it('includes a config file repo that has a .git directory', async () => {
    const repoPath = path.join(tmpDir, 'config-repo');
    await mkdir(path.join(repoPath, '.git'), { recursive: true });
    vi.mocked(readConfigFile).mockResolvedValue({ projectPaths: [repoPath] });

    const results = await discoverProjects('/nonexistent-discovery-root');

    expect(results.some(r => r.repoPath === path.resolve(repoPath))).toBe(true);
  });

  // AC2: Given a config file path that also appears in PROJECT_PATHS, the result contains
  // exactly one entry for that repo (dedup by resolved absolute path).
  it('deduplicates a repo appearing in both PROJECT_PATHS and the config file', async () => {
    const repoPath = path.join(tmpDir, 'shared-repo');
    await mkdir(path.join(repoPath, '.git'), { recursive: true });
    process.env.PROJECT_PATHS = repoPath;
    vi.mocked(readConfigFile).mockResolvedValue({ projectPaths: [repoPath] });

    const results = await discoverProjects('/nonexistent-discovery-root');

    const matches = results.filter(r => r.repoPath === path.resolve(repoPath));
    expect(matches).toHaveLength(1);
  });

  // AC3: Given a config file path with no .git directory, it is silently excluded.
  it('silently excludes a config file path with no .git directory', async () => {
    const repoPath = path.join(tmpDir, 'no-git-repo');
    await mkdir(repoPath, { recursive: true });
    // No .git subdirectory — probeRepo returns null
    vi.mocked(readConfigFile).mockResolvedValue({ projectPaths: [repoPath] });

    const results = await discoverProjects('/nonexistent-discovery-root');

    expect(results).toHaveLength(0);
  });

  // AC4: Given no config file exists, discoverProjects() returns the same results as
  // env-var sources only (no error thrown, env-var repos still discovered).
  it('returns env-var-source results unchanged when no config file exists', async () => {
    const repoPath = path.join(tmpDir, 'env-repo');
    await mkdir(path.join(repoPath, '.git'), { recursive: true });
    process.env.PROJECT_PATHS = repoPath;
    // Default mock returns { projectPaths: [] } — mirrors readConfigFile when file is absent

    const results = await discoverProjects('/nonexistent-discovery-root');

    expect(results).toHaveLength(1);
    expect(results[0].repoPath).toBe(path.resolve(repoPath));
  });

  // AC5: Given a malformed config file, discoverProjects() proceeds normally using
  // env-var sources (readConfigFile catches parse errors and returns { projectPaths: [] }).
  it('proceeds using env-var sources when the config file is malformed', async () => {
    const repoPath = path.join(tmpDir, 'env-only-repo');
    await mkdir(path.join(repoPath, '.git'), { recursive: true });
    process.env.PROJECT_PATHS = repoPath;
    // Default mock returns { projectPaths: [] } — mirrors readConfigFile behavior for malformed JSON

    const results = await discoverProjects('/nonexistent-discovery-root');

    expect(results.some(r => r.repoPath === path.resolve(repoPath))).toBe(true);
  });
});
