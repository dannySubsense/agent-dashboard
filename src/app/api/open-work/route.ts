/**
 * GET /api/open-work
 *
 * Returns OpenWorkItem[] aggregated from active HALTs, open PRs, open issues,
 * and unaccepted DDRs across all discovered repos.
 * Follows cache-then-fetch-then-stale-fallback pattern.
 * Always returns HTTP 200; errors are expressed in ApiResponse.error.
 */

import { NextResponse } from 'next/server'
import { cache } from '@/lib/cache'
import { discoverProjects } from '@/lib/discovery'
import { getActiveHaltsByProject } from '@/lib/lore'
import { getOpenPrs, getOpenIssues } from '@/lib/github'
import { getDdrEntries } from '@/lib/ddr-index'
import type { ApiResponse, OpenWorkItem } from '@/types'

const CACHE_KEY = 'open-work'

export async function GET(): Promise<NextResponse<ApiResponse<OpenWorkItem[]>>> {
  const cached = cache.get<OpenWorkItem[]>(CACHE_KEY)
  if (cached && cache.isValid(cached)) {
    return NextResponse.json({
      data: cached.data,
      error: null,
      stale: false,
      cachedAt: cached.fetchedAt,
    })
  }

  try {
    const data = await fetchOpenWork()
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

async function fetchOpenWork(): Promise<OpenWorkItem[]> {
  const projects = await discoverProjects()

  // Per-project parallel fetches using Promise.allSettled for failure isolation
  const results = await Promise.allSettled(
    projects.map(async (project): Promise<OpenWorkItem[]> => {
      const [haltsResult, prsResult, issuesResult, ddrResult] =
        await Promise.allSettled([
          project.projectId !== null
            ? getActiveHaltsByProject(project.projectId)
            : Promise.resolve([]),
          project.githubRemote !== null
            ? getOpenPrs(project.githubRemote.owner, project.githubRemote.repo, 25)
            : Promise.resolve([]),
          project.githubRemote !== null
            ? getOpenIssues(project.githubRemote.owner, project.githubRemote.repo, 25)
            : Promise.resolve([]),
          getDdrEntries(project.repoPath),
        ])

      const items: OpenWorkItem[] = []

      // Active HALTs — severity: 'red'
      if (haltsResult.status === 'fulfilled') {
        for (const halt of haltsResult.value) {
          items.push({
            type: 'halt',
            projectId: project.projectId,
            repoName: project.repoName,
            title: halt.title,
            timestamp: halt.timestamp,
            severity: 'red',
          })
        }
      }

      // Open PRs — severity: 'normal', capped at 25
      if (prsResult.status === 'fulfilled') {
        for (const pr of prsResult.value) {
          items.push({
            type: 'pr',
            projectId: project.projectId,
            repoName: project.repoName,
            title: pr.title,
            url: pr.url,
            number: pr.number,
            severity: 'normal',
          })
        }
      }

      // Open Issues — severity: 'normal', capped at 25
      if (issuesResult.status === 'fulfilled') {
        for (const issue of issuesResult.value) {
          items.push({
            type: 'issue',
            projectId: project.projectId,
            repoName: project.repoName,
            title: issue.title,
            url: issue.url,
            number: issue.number,
            severity: 'normal',
          })
        }
      }

      // Unaccepted DDRs (kanbanColumn === 'PROPOSED') — severity: 'normal'
      if (ddrResult.status === 'fulfilled') {
        for (const ddr of ddrResult.value) {
          if (ddr.kanbanColumn === 'PROPOSED') {
            items.push({
              type: 'unaccepted-ddr',
              projectId: project.projectId,
              repoName: project.repoName,
              title: ddr.title,
              severity: 'normal',
            })
          }
        }
      }

      return items
    }),
  )

  const allItems: OpenWorkItem[] = results.flatMap((r) =>
    r.status === 'fulfilled' ? r.value : [],
  )

  return allItems
}
