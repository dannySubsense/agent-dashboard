/**
 * GET /api/agents
 *
 * Returns AgentRecord[] sorted alphabetically by name, with switchboardStatus
 * enriched from ~/.switchboard/sessions.json.
 * Follows cache-then-fetch-then-stale-fallback pattern.
 * Always returns HTTP 200; errors are expressed in ApiResponse.error.
 */

import { NextResponse } from 'next/server'
import { cache } from '@/lib/cache'
import { getAgentRegistry } from '@/lib/lore'
import { readSwitchboardSessions, isAgentOnline } from '@/lib/switchboard'
import type { ApiResponse, AgentRecord } from '@/types'

const CACHE_KEY = 'agents'

export async function GET(): Promise<NextResponse<ApiResponse<AgentRecord[]>>> {
  const cached = cache.get<AgentRecord[]>(CACHE_KEY)
  if (cached && cache.isValid(cached)) {
    return NextResponse.json({
      data: cached.data,
      error: null,
      stale: false,
      cachedAt: cached.fetchedAt,
    })
  }

  try {
    const data = await fetchAgents()
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

async function fetchAgents(): Promise<AgentRecord[]> {
  const [records, sessions] = await Promise.all([
    getAgentRegistry(),
    readSwitchboardSessions(),
  ])

  // Enrich each agent record with live switchboard status
  const enriched: AgentRecord[] = records.map((record) => ({
    ...record,
    switchboardStatus: isAgentOnline(record.relayHandle, sessions),
  }))

  // Sort alphabetically by name
  enriched.sort((a, b) => a.name.localeCompare(b.name))

  return enriched
}
