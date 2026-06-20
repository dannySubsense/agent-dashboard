/**
 * GET /api/session-closes
 *
 * Returns SessionClose[] sorted by timestamp DESC, one per project.
 * Follows cache-then-fetch-then-stale-fallback pattern.
 * Always returns HTTP 200; errors are expressed in ApiResponse.error.
 */

import { NextResponse } from 'next/server'
import { cache } from '@/lib/cache'
import { discoverProjects } from '@/lib/discovery'
import { getSessionCloses } from '@/lib/lore'
import type { ApiResponse, SessionClose } from '@/types'

const CACHE_KEY = 'session-closes'

export async function GET(): Promise<NextResponse<ApiResponse<SessionClose[]>>> {
  const cached = cache.get<SessionClose[]>(CACHE_KEY)
  if (cached && cache.isValid(cached)) {
    return NextResponse.json({
      data: cached.data,
      error: null,
      stale: false,
      cachedAt: cached.fetchedAt,
    })
  }

  try {
    const data = await fetchSessionCloses()
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

async function fetchSessionCloses(): Promise<SessionClose[]> {
  const projects = await discoverProjects()

  const projectIds = projects
    .map((p) => p.projectId)
    .filter((id): id is string => id !== null)

  const sessionMap = await getSessionCloses(projectIds)

  const closes = Array.from(sessionMap.values())

  // Sort by timestamp DESC
  closes.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

  return closes
}
