/**
 * src/lib/discovery.ts
 *
 * Scans PROJECTS_ROOT one level deep for git repositories and collects
 * per-repo metadata (CLAUDE.md parsing, GitHub remote).
 *
 * parseCLAUDEMd is re-exported here for caller convenience.
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { parseCLAUDEMd } from './claude-md';
import { getGitHubRemote } from './git';
import { optionalEnv } from './env';
import type { DiscoveredProject } from '@/types';

// Re-export for caller convenience (api routes, panels, projects.ts)
export { parseCLAUDEMd };

/**
 * Scans one level of projectsRoot for directories containing a .git subdirectory.
 *
 * For each found repo:
 *   - Reads CLAUDE.md (if present) and calls parseCLAUDEMd
 *   - Calls getGitHubRemote() to populate githubRemote
 *
 * Default projectsRoot: PROJECTS_ROOT env var, falling back to ~/projects.
 * Returns [] (not throws) if projectsRoot is unreadable or does not exist.
 * Does not recurse.
 */
export async function discoverProjects(
  projectsRoot?: string
): Promise<DiscoveredProject[]> {
  const root =
    projectsRoot ??
    optionalEnv('PROJECTS_ROOT', path.join(os.homedir(), 'projects'));

  let dirents: import('fs').Dirent[];
  try {
    dirents = await fs.readdir(root, { withFileTypes: true });
  } catch {
    // Root directory is unreadable or does not exist
    return [];
  }

  const results: DiscoveredProject[] = [];

  for (const dirent of dirents) {
    if (!dirent.isDirectory()) continue;

    const repoPath = path.join(root, dirent.name);
    const gitDir = path.join(repoPath, '.git');

    // Confirm .git subdirectory exists
    try {
      await fs.stat(gitDir);
    } catch {
      continue; // Not a git repository
    }

    // Parse CLAUDE.md (best-effort)
    let projectId: string | null = null;
    let agentName: string | null = null;
    try {
      const claudeContent = await fs.readFile(
        path.join(repoPath, 'CLAUDE.md'),
        'utf-8'
      );
      const parsed = parseCLAUDEMd(claudeContent);
      projectId = parsed.projectId;
      agentName = parsed.agentName;
    } catch {
      // CLAUDE.md missing or unreadable — leave fields null
    }

    // Resolve GitHub remote (best-effort)
    const githubRemote = await getGitHubRemote(repoPath);

    results.push({
      repoPath,
      repoName: dirent.name,
      projectId,
      agentName,
      githubRemote,
    });
  }

  return results;
}
