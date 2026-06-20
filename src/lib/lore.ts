/**
 * src/lib/lore.ts
 *
 * All direct Postgres queries to the LORE database on VM 103.
 * Single pg.Pool instance initialized at module load from LORE_DATABASE_URL.
 * All functions catch errors and return null / [] / empty Map — never throw to caller.
 *
 * Schema probe result (2026-06-20):
 *   Table: documents
 *   Confirmed columns: id (uuid), project_id (text), document_type (text),
 *   title (text), content (text), author (text), status (text),
 *   created_at (timestamptz), updated_at (timestamptz)
 *   Additional columns present but unused by this module:
 *   file_path, git_sha, sprint_id, metadata, decay_rate, relevance_score,
 *   last_confirmed_at, review_flagged, expires_at, epistemic_type, tags, supersedes_id
 */

import { Pool } from 'pg'
import { requireEnv } from './env'
import type {
  LoreCaptureSummary,
  SessionClose,
  AgentRecord,
  ActivityEvent,
} from '@/types'

// Module-level singleton. If LORE_DATABASE_URL is missing, Pool is created with
// empty connectionString — it will not throw at creation but will fail on first query.
// All query functions catch that failure and return graceful fallbacks.
const pool = new Pool({
  connectionString: requireEnv('LORE_DATABASE_URL'),
})

// ── Internal document type ─────────────────────────────────────────────────

interface LoreAgentDocument {
  id: string
  author: string | null
  title: string | null
  content: string | null
  status: string | null
}

// ── parseAgentDocument ─────────────────────────────────────────────────────

/**
 * Parses a LORE agent registry document row into an AgentRecord.
 * Returns null if doc.author is null or empty.
 * switchboardStatus is always 'unknown' here — the caller enriches it.
 */
export function parseAgentDocument(doc: LoreAgentDocument): AgentRecord | null {
  try {
    if (!doc.author) return null

    let projectId = ''
    if (doc.content) {
      // Pattern 1: matches "- projectId: 'agent-dashboard'" style (CLAUDE.md convention)
      const m1 = doc.content.match(
        /^[-*]\s*`?project[Ii][Dd]`?\s*:\s*[`']?([^`'\n]+)/m,
      )
      if (m1) {
        projectId = m1[1].trim()
      } else {
        // Pattern 2: matches "projectId='agent-dashboard'" or "projectId=agent-dashboard"
        const m2 = doc.content.match(/^projectId\s*=\s*[`']?([^`'\n]+)/m)
        if (m2) {
          projectId = m2[1].trim()
        } else {
          // Pattern 3: matches relay dispatcher env var "MCP_DEFAULT_PROJECT_ID=agent-dashboard"
          const m3 = doc.content.match(/^MCP_DEFAULT_PROJECT_ID=(\S+)/m)
          if (m3) projectId = m3[1].trim()
        }
      }
    }

    return {
      name: doc.author,
      relayHandle: doc.author,
      registryStatus: doc.status ?? 'unknown',
      projectId,
      switchboardStatus: 'unknown',
    }
  } catch {
    return null
  }
}

// ── getLastCapturePerProject ───────────────────────────────────────────────

/**
 * Returns the most recent LORE capture summary for each given projectId.
 * Queries all documents for the given projects ordered by created_at DESC,
 * then keeps the first (most recent) row per project_id.
 */
export async function getLastCapturePerProject(
  projectIds: string[],
): Promise<Map<string, LoreCaptureSummary>> {
  if (projectIds.length === 0) return new Map()
  try {
    const result = await pool.query<{
      id: string
      project_id: string
      document_type: string
      title: string | null
      created_at: Date
    }>(
      `SELECT id, project_id, document_type, title, created_at
       FROM documents
       WHERE project_id = ANY($1)
       ORDER BY created_at DESC`,
      [projectIds],
    )

    const map = new Map<string, LoreCaptureSummary>()
    for (const row of result.rows) {
      if (!map.has(row.project_id)) {
        map.set(row.project_id, {
          id: row.id,
          timestamp: new Date(row.created_at),
          title: row.title ?? '',
          documentType: row.document_type,
          projectId: row.project_id,
        })
      }
    }
    return map
  } catch (err) {
    console.error('[lore] getLastCapturePerProject error:', err)
    return new Map()
  }
}

// ── getActiveHaltsByProject ────────────────────────────────────────────────

/**
 * Returns all non-archived HALT documents for the given projectId.
 * A halt is active if status IS NULL or status != 'archived'.
 */
export async function getActiveHaltsByProject(
  projectId: string,
): Promise<LoreCaptureSummary[]> {
  try {
    const result = await pool.query<{
      id: string
      project_id: string
      document_type: string
      title: string | null
      created_at: Date
    }>(
      `SELECT id, project_id, document_type, title, created_at
       FROM documents
       WHERE project_id = $1
         AND document_type = 'halt'
         AND (status IS NULL OR status != 'archived')
       ORDER BY created_at DESC`,
      [projectId],
    )

    return result.rows.map(row => ({
      id: row.id,
      timestamp: new Date(row.created_at),
      title: row.title ?? '',
      documentType: row.document_type,
      projectId: row.project_id,
    }))
  } catch (err) {
    console.error('[lore] getActiveHaltsByProject error:', err)
    return []
  }
}

// ── getSessionCloses ───────────────────────────────────────────────────────

/**
 * Returns the most recent SESSION-CLOSE decision capture per project.
 * repoName is set to project_id — callers that have the real directory name
 * may override it after the fact.
 */
export async function getSessionCloses(
  projectIds: string[],
): Promise<Map<string, SessionClose>> {
  if (projectIds.length === 0) return new Map()
  try {
    const result = await pool.query<{
      id: string
      project_id: string
      title: string | null
      content: string | null
      created_at: Date
    }>(
      `SELECT id, project_id, title, content, created_at
       FROM documents
       WHERE project_id = ANY($1)
         AND document_type = 'decision'
         AND title ILIKE '%SESSION-CLOSE%'
       ORDER BY created_at DESC`,
      [projectIds],
    )

    const map = new Map<string, SessionClose>()
    for (const row of result.rows) {
      // ORDER BY created_at DESC — first occurrence per project_id is the most recent
      if (!map.has(row.project_id)) {
        map.set(row.project_id, {
          projectId: row.project_id,
          repoName: row.project_id, // LORE DB has no repoName; use projectId as proxy
          timestamp: new Date(row.created_at),
          title: row.title ?? '',
          content: row.content ?? '',
        })
      }
    }
    return map
  } catch (err) {
    console.error('[lore] getSessionCloses error:', err)
    return new Map()
  }
}

// ── getAgentRegistry ──────────────────────────────────────────────────────

/**
 * Returns all agent registry documents from the lore-personal project.
 * Deduplicates by author slug (most recent per author wins — ORDER BY created_at DESC).
 * switchboardStatus is 'unknown' for all entries; the caller enriches it via isAgentOnline.
 */
export async function getAgentRegistry(): Promise<AgentRecord[]> {
  try {
    const result = await pool.query<LoreAgentDocument>(
      `SELECT id, author, title, content, status
       FROM documents
       WHERE project_id = 'lore-personal'
         AND document_type = 'spec'
       ORDER BY created_at DESC`,
    )

    const seen = new Set<string>()
    const records: AgentRecord[] = []

    for (const row of result.rows) {
      const record = parseAgentDocument(row)
      if (!record) continue
      // First seen = most recent (ORDER BY created_at DESC)
      if (seen.has(record.name)) continue
      seen.add(record.name)
      records.push(record)
    }

    records.sort((a, b) => a.name.localeCompare(b.name))
    return records
  } catch (err) {
    console.error('[lore] getAgentRegistry error:', err)
    return []
  }
}

// ── getLoreActivityEvents ─────────────────────────────────────────────────

/**
 * Returns all LORE captures for the given projects created after `since`.
 * Maps each row to an ActivityEvent with type 'lore-capture'.
 * repoName is set to project_id — consistent with getSessionCloses convention.
 */
export async function getLoreActivityEvents(
  projectIds: string[],
  since: Date,
): Promise<ActivityEvent[]> {
  if (projectIds.length === 0) return []
  try {
    const result = await pool.query<{
      id: string
      project_id: string
      title: string | null
      created_at: Date
    }>(
      `SELECT id, project_id, title, created_at
       FROM documents
       WHERE project_id = ANY($1)
         AND created_at >= $2
       ORDER BY created_at DESC`,
      [projectIds, since],
    )

    return result.rows.map(row => ({
      id: `lore-capture:${row.project_id}:${row.id}`,
      timestamp: new Date(row.created_at),
      type: 'lore-capture' as const,
      projectId: row.project_id,
      repoName: row.project_id, // LORE DB has no repoName; use projectId as proxy
      summary: row.title ?? '',
    }))
  } catch (err) {
    console.error('[lore] getLoreActivityEvents error:', err)
    return []
  }
}
