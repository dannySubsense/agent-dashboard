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
import { readConfigFile } from './config';
import type { DiscoveredProject } from '@/types';

// Re-export for caller convenience (api routes, panels, projects.ts)
export { parseCLAUDEMd };

async function probeRepo(repoPath: string): Promise<DiscoveredProject | null> {
  try {
    await fs.stat(path.join(repoPath, '.git'));
  } catch {
    return null;
  }

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
    // CLAUDE.md missing or unreadable
  }

  return {
    repoPath,
    repoName: path.basename(repoPath),
    projectId,
    agentName,
    githubRemote: await getGitHubRemote(repoPath),
  };
}

/**
 * Discovers projects from two env vars:
 *
 * PROJECTS_ROOT — colon-separated parent directories scanned one level deep
 *                 for git repos. Defaults to ~/projects if neither var is set.
 * PROJECT_PATHS — colon-separated explicit repo paths added directly.
 *
 * Results are deduplicated by repoPath.
 */
export async function discoverProjects(overrideRoot?: string): Promise<DiscoveredProject[]> {
  const seen = new Set<string>();
  const results: DiscoveredProject[] = [];

  async function add(repoPath: string) {
    const resolved = path.resolve(repoPath);
    if (seen.has(resolved)) return;
    seen.add(resolved);
    const project = await probeRepo(resolved);
    if (project) results.push(project);
  }

  // Scan parent directories one level deep
  const rootsEnv = overrideRoot ?? optionalEnv('PROJECTS_ROOT', path.join(os.homedir(), 'projects'));
  for (const root of rootsEnv.split(':').map(p => p.trim()).filter(Boolean)) {
    let dirents: import('fs').Dirent[];
    try {
      dirents = await fs.readdir(root, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const dirent of dirents) {
      if (dirent.isDirectory()) await add(path.join(root, dirent.name));
    }
  }

  // Add explicit individual repo paths
  const pathsEnv = optionalEnv('PROJECT_PATHS', '');
  for (const p of pathsEnv.split(':').map(s => s.trim()).filter(Boolean)) {
    await add(p);
  }

  // Source 3: config file (~/.config/agent-dashboard/projects.json)
  const config = await readConfigFile();
  for (const p of config.projectPaths) {
    await add(p);
  }

  return results;
}
