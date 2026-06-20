// ActivityFeedLoader.tsx — Server Component
// Direct lib calls — no HTTP self-fetch.
import path from 'path';
import os from 'os';
import { getLoreActivityEvents } from '@/lib/lore';
import { getCommitsSince } from '@/lib/git';
import { getMergedPrs } from '@/lib/github';
import { discoverProjects } from '@/lib/discovery';
import { optionalEnv } from '@/lib/env';
import { ActivityFeedPanel } from './ActivityFeedPanel';
import type { ActivityEvent, ApiResponse } from '@/types';

export async function ActivityFeedLoader() {
  let data: ActivityEvent[] | null = null;
  let error: string | null = null;

  try {
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const projectsRoot = optionalEnv('PROJECTS_ROOT', path.join(os.homedir(), 'projects'));
    const projects = await discoverProjects(projectsRoot);
    const projectIds = projects.map(p => p.projectId).filter(Boolean) as string[];

    const [loreEvents, ...restEvents] = await Promise.all([
      getLoreActivityEvents(projectIds, since),
      ...projects.map(p =>
        getCommitsSince(p.repoPath, since).then(commits =>
          commits.map<ActivityEvent>(c => ({
            id: `git-commit:${p.repoName}:${c.hash}`,
            timestamp: c.date,
            type: 'git-commit',
            projectId: p.projectId,
            repoName: p.repoName,
            summary: c.message,
          }))
        )
      ),
      ...projects
        .filter(p => p.githubRemote !== null)
        .map(p =>
          getMergedPrs(p.githubRemote!.owner, p.githubRemote!.repo, since).then(prs =>
            prs.map<ActivityEvent>(pr => ({
              id: `pr-merge:${p.repoName}:${pr.number}`,
              timestamp: pr.mergedAt ?? new Date(),
              type: 'pr-merge',
              projectId: p.projectId,
              repoName: p.repoName,
              summary: pr.title,
            }))
          )
        ),
    ]);

    data = [...loreEvents, ...restEvents.flat()].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
  } catch (err) {
    error = String(err);
  }

  const res: ApiResponse<ActivityEvent[]> = { data, error, stale: false, cachedAt: null };
  return <ActivityFeedPanel initialData={res} />;
}
