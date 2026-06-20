/**
 * Acceptance criteria covered (Slice 2 — discovery.ts):
 * - discoverProjects returns at least one entry for agent-dashboard when given real projects root
 * - each DiscoveredProject entry has repoPath, repoName, projectId, agentName fields
 * - discoverProjects returns [] for a nonexistent path without throwing
 * - each DiscoveredProject has githubRemote field present (not undefined), confirming getGitHubRemote was called per repo
 */

import { describe, it, expect } from 'vitest';
import { discoverProjects } from './discovery';

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
