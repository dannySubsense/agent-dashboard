/**
 * src/lib/projects.ts
 *
 * Aggregates discovery + git + LORE + GitHub → ProjectCardData[].
 * Used by both /api/projects/route.ts (wraps with cache) and ProjectCardsPanel (direct call).
 * Never throws — individual data source failures return null/0/false for that field.
 */

import { discoverProjects } from './discovery';
import { getLastCommit } from './git';
import { getLatestSprint } from './progress';
import { getLastCapturePerProject, getActiveHaltsByProject } from './lore';
import { getOpenPrCount } from './github';
import type { ProjectCardData } from '@/types';

/**
 * Aggregates per-project data from all available sources.
 *
 * 1. Discovers all repos under PROJECTS_ROOT
 * 2. Fetches last LORE capture for all non-null projectIds in one batch
 * 3. For each project in parallel: last commit, latest sprint, PR count, active HALTs
 * 4. Computes lastTouchedAt = max(lastCommit.date, lastLoreCapture.timestamp)
 *    Falls back to epoch (new Date(0)) when both are null — sorts to the bottom
 * 5. Returns sorted by lastTouchedAt DESC
 */
export async function getProjectsData(): Promise<ProjectCardData[]> {
  // Step 1: Discover all git repos in PROJECTS_ROOT
  const projects = await discoverProjects();

  // Step 2: Batch-fetch last LORE capture for all non-null projectIds
  const projectIds = projects
    .map((p) => p.projectId)
    .filter((id): id is string => id !== null);

  const lastCapturesMap = await getLastCapturePerProject(projectIds);

  // Step 3: Per-project parallel fetch (Promise.allSettled — individual failures isolated)
  const settled = await Promise.allSettled(
    projects.map(async (project) => {
      const [lastCommit, currentSprint, halts, openPrCount] = await Promise.all([
        getLastCommit(project.repoPath),
        getLatestSprint(project.repoPath),
        project.projectId !== null
          ? getActiveHaltsByProject(project.projectId)
          : Promise.resolve([]),
        project.githubRemote !== null
          ? getOpenPrCount(project.githubRemote.owner, project.githubRemote.repo)
          : Promise.resolve(0),
      ]);

      const lastLoreCapture =
        project.projectId !== null
          ? (lastCapturesMap.get(project.projectId) ?? null)
          : null;

      // Step 4: lastTouchedAt — max of the two timestamps; epoch when both absent
      const commitTime = lastCommit?.date?.getTime() ?? 0;
      const captureTime = lastLoreCapture?.timestamp?.getTime() ?? 0;
      const lastTouchedAt = new Date(Math.max(commitTime, captureTime));

      const card: ProjectCardData = {
        repoPath: project.repoPath,
        repoName: project.repoName,
        projectId: project.projectId,
        agentName: project.agentName,
        lastCommit,
        lastLoreCapture,
        currentSprint,
        openPrCount,
        hasActiveHalt: halts.length > 0,
        lastTouchedAt,
      };

      return card;
    }),
  );

  // Collect fulfilled results; log individual failures without throwing
  const cards: ProjectCardData[] = [];
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      cards.push(result.value);
    } else {
      console.error('[projects] Per-project data fetch failed:', result.reason);
    }
  }

  // Step 5: Sort by lastTouchedAt DESC — epoch entries naturally sort last
  cards.sort((a, b) => b.lastTouchedAt.getTime() - a.lastTouchedAt.getTime());

  return cards;
}
