/**
 * GET /api/ddr-pipeline
 *
 * Returns a flat DdrEntry[] from all discovered repos.
 * Follows cache-then-fetch-then-stale-fallback pattern.
 * Always returns HTTP 200; errors are expressed in ApiResponse.error.
 */

import { NextResponse } from 'next/server'
import { cache } from '@/lib/cache'
import { discoverProjects } from '@/lib/discovery'
import { getDdrEntries } from '@/lib/ddr-index'
import type { ApiResponse, DdrEntry } from '@/types'

const CACHE_KEY = 'ddr-pipeline'

export async function GET(): Promise<NextResponse<ApiResponse<DdrEntry[]>>> {
  const cached = cache.get<DdrEntry[]>(CACHE_KEY)
  if (cached && cache.isValid(cached)) {
    return NextResponse.json({
      data: cached.data,
      error: null,
      stale: false,
      cachedAt: cached.fetchedAt,
    })
  }

  try {
    const data = await fetchDdrPipeline()
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

async function fetchDdrPipeline(): Promise<DdrEntry[]> {
  const projects = await discoverProjects()

  // Per-project DDR index reads in parallel — failure for one project does not
  // block others (Promise.allSettled for failure isolation).
  const results = await Promise.allSettled(
    projects.map((project) => getDdrEntries(project.repoPath)),
  )

  const allEntries: DdrEntry[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allEntries.push(...result.value)
    }
  }

  return allEntries
}
