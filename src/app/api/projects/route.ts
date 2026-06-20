/**
 * GET /api/projects
 *
 * Returns ProjectCardData[] for all discovered repos, sorted by lastTouchedAt DESC.
 * Follows cache-then-fetch-then-stale-fallback pattern.
 * Always returns HTTP 200; errors are expressed in ApiResponse.error.
 */

import { NextResponse } from 'next/server'
import { cache } from '@/lib/cache'
import { discoverProjects } from '@/lib/discovery'
import { getLastCommit } from '@/lib/git'
import { getLastCapturePerProject, getActiveHaltsByProject } from '@/lib/lore'
import { getOpenPrCount } from '@/lib/github'
import { getLatestSprint } from '@/lib/progress'
import type { ApiResponse, ProjectCardData, LoreCaptureSummary } from '@/types'

const CACHE_KEY = 'projects'

const EPOCH = new Date(0)

export async function GET(): Promise<NextResponse<ApiResponse<ProjectCardData[]>>> {
  const cached = cache.get<ProjectCardData[]>(CACHE_KEY)
  if (cached && cache.isValid(cached)) {
    return NextResponse.json({
      data: cached.data,
      error: null,
      stale: false,
      cachedAt: cached.fetchedAt,
    })
  }

  try {
    const data = await fetchProjects()
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

async function fetchProjects(): Promise<ProjectCardData[]> {
  const projects = await discoverProjects()

  // Batch LORE capture lookup for all projects with a projectId
  const projectIds = projects
    .map((p) => p.projectId)
    .filter((id): id is string => id !== null)

  const captureMap = await getLastCapturePerProject(projectIds)

  // Per-project parallel fetches using Promise.allSettled for failure isolation
  const results = await Promise.allSettled(
    projects.map(async (project) => {
      const [lastCommit, currentSprint, halts, openPrCount] = await Promise.allSettled([
        getLastCommit(project.repoPath),
        getLatestSprint(project.repoPath),
        project.projectId !== null
          ? getActiveHaltsByProject(project.projectId)
          : Promise.resolve([] as import('@/types').LoreCaptureSummary[]),
        project.githubRemote !== null
          ? getOpenPrCount(project.githubRemote.owner, project.githubRemote.repo)
          : Promise.resolve(0),
      ])

      const commit =
        lastCommit.status === 'fulfilled' ? lastCommit.value : null
      const sprint =
        currentSprint.status === 'fulfilled' ? currentSprint.value : null
      const haltList =
        halts.status === 'fulfilled' ? halts.value : ([] as LoreCaptureSummary[])
      const prCount =
        openPrCount.status === 'fulfilled' ? openPrCount.value : 0

      const lastLoreCapture =
        project.projectId !== null
          ? (captureMap.get(project.projectId) ?? null)
          : null

      const lastTouchedAt = new Date(
        Math.max(
          commit?.date.getTime() ?? EPOCH.getTime(),
          lastLoreCapture?.timestamp.getTime() ?? EPOCH.getTime(),
        ),
      )

      const card: ProjectCardData = {
        repoPath: project.repoPath,
        repoName: project.repoName,
        projectId: project.projectId,
        agentName: project.agentName,
        lastCommit: commit,
        lastLoreCapture,
        currentSprint: sprint,
        openPrCount: prCount,
        hasActiveHalt: haltList.length > 0,
        lastTouchedAt,
      }

      return card
    }),
  )

  const cards: ProjectCardData[] = results
    .filter(
      (r): r is PromiseFulfilledResult<ProjectCardData> => r.status === 'fulfilled',
    )
    .map((r) => r.value)

  // Sort by lastTouchedAt DESC (epoch-based nulls sort last naturally)
  cards.sort((a, b) => b.lastTouchedAt.getTime() - a.lastTouchedAt.getTime())

  return cards
}
