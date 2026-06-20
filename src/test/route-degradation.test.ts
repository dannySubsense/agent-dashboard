/**
 * src/test/route-degradation.test.ts
 *
 * Verifies the degradation contract for pure-LORE API routes:
 *   { data: null, error: <non-null string>, stale: false, cachedAt: null }
 * when LORE is unreachable, and { data: <array>, error: null } when healthy.
 *
 * Acceptance criteria: ROADMAP line 328 — degradation contract for
 * /api/session-closes and /api/agents.
 *
 * All cases use HTTP 200; error state is expressed in the JSON body only.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { cache } from '@/lib/cache'
import { GET as sessionClosesGET } from '@/app/api/session-closes/route'
import { GET as agentsGET } from '@/app/api/agents/route'

// ── Hoisted mock factories ─────────────────────────────────────────────────
// vi.hoisted ensures these refs are available inside vi.mock() factory callbacks,
// which are themselves hoisted before imports resolve.

const mocks = vi.hoisted(() => ({
  getSessionCloses: vi.fn(),
  getAgentRegistry: vi.fn(),
  discoverProjects: vi.fn(),
  readSwitchboardSessions: vi.fn(),
  isAgentOnline: vi.fn(),
}))

// ── Module mocks ───────────────────────────────────────────────────────────

vi.mock('@/lib/lore', () => ({
  getSessionCloses: mocks.getSessionCloses,
  getAgentRegistry: mocks.getAgentRegistry,
}))

vi.mock('@/lib/discovery', () => ({
  discoverProjects: mocks.discoverProjects,
}))

vi.mock('@/lib/switchboard', () => ({
  readSwitchboardSessions: mocks.readSwitchboardSessions,
  isAgentOnline: mocks.isAgentOnline,
}))

// Minimal NextResponse mock — avoids server-side Next.js initialisation in jsdom.
// response.json() returns the body that was passed to NextResponse.json(body).
vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown) => ({
      json: async () => body,
    }),
  },
}))

// ── Test suite ─────────────────────────────────────────────────────────────

describe('Route degradation — pure-LORE routes', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Clear in-memory cache so routes do not serve a cached response
    cache.clear()
    // Default: discoverProjects returns one project so getSessionCloses is called
    mocks.discoverProjects.mockResolvedValue([
      {
        projectId: 'test-project',
        repoName: 'test-project',
        repoPath: '/projects/test-project',
        agentName: null,
        githubRemote: null,
      },
    ])
    // Default: isAgentOnline returns 'unknown' for any agent
    mocks.isAgentOnline.mockReturnValue('unknown')
  })

  // ── /api/session-closes ──────────────────────────────────────────────────

  describe('GET /api/session-closes', () => {
    it('degrades to { data: null, error: string, stale: false } when LORE is unreachable', async () => {
      mocks.getSessionCloses.mockRejectedValue(new Error('connect ECONNREFUSED'))

      const response = await sessionClosesGET()
      const body = await response.json()

      expect(body.data).toBeNull()
      expect(body.error).not.toBeNull()
      expect(typeof body.error).toBe('string')
      expect(body.stale).toBe(false)
    })

    it('returns { data: array, error: null } when LORE is reachable (empty array is valid)', async () => {
      mocks.getSessionCloses.mockResolvedValue([])

      const response = await sessionClosesGET()
      const body = await response.json()

      expect(Array.isArray(body.data)).toBe(true)
      expect(body.error).toBeNull()
    })
  })

  // ── /api/agents ──────────────────────────────────────────────────────────

  describe('GET /api/agents', () => {
    it('degrades to { data: null, error: string, stale: false } when LORE is unreachable', async () => {
      mocks.getAgentRegistry.mockRejectedValue(new Error('connect ECONNREFUSED'))

      const response = await agentsGET()
      const body = await response.json()

      expect(body.data).toBeNull()
      expect(body.error).not.toBeNull()
      expect(typeof body.error).toBe('string')
      expect(body.stale).toBe(false)
    })

    it('returns { data: array, error: null } when LORE is reachable', async () => {
      mocks.getAgentRegistry.mockResolvedValue([])
      mocks.readSwitchboardSessions.mockResolvedValue(null)

      const response = await agentsGET()
      const body = await response.json()

      expect(Array.isArray(body.data)).toBe(true)
      expect(body.error).toBeNull()
    })
  })
})
