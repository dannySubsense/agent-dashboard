/**
 * GET /api/activity-feed
 *
 * Query params:
 *   days    — lookback window in days (default 14); used server-side
 *   project — accepted but NOT used for server-side filtering in v1
 *   type    — accepted but NOT used for server-side filtering in v1
 *
 * Returns ActivityEvent[] merged from LORE captures, git commits, and merged PRs,
 * sorted by timestamp DESC, deduplicated by id.
 * Follows cache-then-fetch-then-stale-fallback pattern.
 * Always returns HTTP 200; errors are expressed in ApiResponse.error.
 */

import { NextResponse } from 'next/server'
import { cache } from '@/lib/cache'
import { discoverProjects } from '@/lib/discovery'
import { getLoreActivityEvents } from '@/lib/lore'
import { getCommitsSince } from '@/lib/git'
import { getMergedPrs } from '@/lib/github'
import type { ApiResponse, ActivityEvent } from '@/types'

export async function GET(
  request: Request,
): Promise<NextResponse<ApiResponse<ActivityEvent[]>>> {
  const { searchParams } = new URL(request.url)
  const days = Math.max(1, parseInt(searchParams.get('days') ?? '14', 10) || 14)
  // project and type are accepted in the route signature but unused for server-side
  // filtering in v1 — ActivityFeedPanel applies client-side filtering to the full dataset.
  const project = searchParams.get('project') ?? ''
  const type = searchParams.get('type') ?? ''

  const CACHE_KEY = `activity-feed:${days}:${project}:${type}`

  const cached = cache.get<ActivityEvent[]>(CACHE_KEY)
  if (cached && cache.isValid(cached)) {
    return NextResponse.json({
      data: cached.data,
      error: null,
      stale: false,
      cachedAt: cached.fetchedAt,
    })
  }

  try {
    const data = await fetchActivityFeed(days)
    cache.set(CACHE_KEY, data)
    return NextResponse.json({ data, error: null, stale: false, cachedAt: Date.now() })
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    if (cached) {
      return NextResponse.json({
        data: cached.data,
        error,
        stale: true,
        cachedAt: cached.fetchedAt,
      })
    }
    return NextResponse.json({ data: null, error, stale: false, cachedAt: null })
  }
}

async function fetchActivityFeed(days: number): Promise<ActivityEvent[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const projects = await discoverProjects()

  const projectIds = projects
    .map((p) => p.projectId)
    .filter((id): id is string => id !== null)

  // Parallel fetch: LORE events + per-project git commits + per-project merged PRs
  // Promise.allSettled across per-project calls for failure isolation
  const [loreResult, ...perProjectResults] = await Promise.allSettled([
    getLoreActivityEvents(projectIds, since),
    ...projects.map(async (project): Promise<ActivityEvent[]> => {
      const [commitsResult, prsResult] = await Promise.allSettled([
        getCommitsSince(project.repoPath, since),
        project.githubRemote !== null
          ? getMergedPrs(project.githubRemote.owner, project.githubRemote.repo, since)
          : Promise.resolve([]),
      ])

      const commitEvents: ActivityEvent[] =
        commitsResult.status === 'fulfilled'
          ? commitsResult.value.map((commit) => ({
              id: `git-commit:${project.repoName}:${commit.hash}`,
              timestamp: commit.date,
              type: 'git-commit' as const,
              projectId: project.projectId,
              repoName: project.repoName,
              summary: commit.message,
            }))
          : []

      const prEvents: ActivityEvent[] =
        prsResult.status === 'fulfilled'
          ? prsResult.value.map((pr) => ({
              id: `pr-merge:${project.repoName}:${pr.number}`,
              timestamp: pr.mergedAt ?? since, // mergedAt is always set for merged PRs
              type: 'pr-merge' as const,
              projectId: project.projectId,
              repoName: project.repoName,
              summary: pr.title,
            }))
          : []

      return [...commitEvents, ...prEvents]
    }),
  ])

  const loreEvents: ActivityEvent[] =
    loreResult.status === 'fulfilled' ? loreResult.value : []

  const perProjectEvents: ActivityEvent[] = perProjectResults.flatMap((r) =>
    r.status === 'fulfilled' ? r.value : [],
  )

  // Merge, deduplicate by id, sort by timestamp DESC
  const allEvents = [...loreEvents, ...perProjectEvents]
  const seen = new Map<string, ActivityEvent>()
  for (const event of allEvents) {
    if (!seen.has(event.id)) {
      seen.set(event.id, event)
    }
  }

  return Array.from(seen.values()).sort(
    (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
  )
}
