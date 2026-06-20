/**
 * src/lib/switchboard.ts
 *
 * Reads ~/.switchboard/sessions.json via Node.js fs.
 * No network calls, no MCP tools. Pure filesystem reads.
 * All functions degrade gracefully on missing, malformed, or zero-byte files.
 */

import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import type { SwitchboardSessions, SwitchboardStatus } from '@/types';

const SWITCHBOARD_DIR = path.join(os.homedir(), '.switchboard');
const SESSIONS_FILE = path.join(SWITCHBOARD_DIR, 'sessions.json');

/**
 * ONLINE_THRESHOLD_MS: 5 minutes.
 * An agent is considered online if its lastActiveAt timestamp is within this
 * window. Exported so tests and callers can reference the constant directly.
 */
export const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * readSwitchboardSessions
 *
 * Reads ~/.switchboard/sessions.json and returns the parsed record, or null on
 * any filesystem or parse error (including the directory not existing).
 * A zero-byte file is treated as an empty sessions record and returns {}.
 */
export async function readSwitchboardSessions(): Promise<SwitchboardSessions | null> {
  try {
    const raw = await fs.readFile(SESSIONS_FILE, 'utf-8');

    // Zero-byte or whitespace-only file → treat as empty
    if (raw.trim() === '') {
      return {};
    }

    // JSON.parse throws on malformed input; caught below → null
    const parsed = JSON.parse(raw) as SwitchboardSessions;
    return parsed;
  } catch {
    // ENOENT (dir or file absent), SyntaxError (bad JSON), or any other error
    return null;
  }
}

/**
 * isAgentOnline
 *
 * Resolves the online status for a given relay handle against a sessions
 * record. Accepts null sessions so callers can pass the result of
 * readSwitchboardSessions() directly without a null-guard.
 *
 * - 'online'  — entry exists and lastActiveAt is within ONLINE_THRESHOLD_MS
 * - 'offline' — entry exists but lastActiveAt is older than ONLINE_THRESHOLD_MS
 * - 'unknown' — sessions is null, handle not present, or lastActiveAt is absent
 *               or unparseable (covers real sessions.json entries that lack the
 *               lastActiveAt field)
 */
export function isAgentOnline(
  relayHandle: string,
  sessions: SwitchboardSessions | null
): SwitchboardStatus {
  if (sessions === null) {
    return 'unknown';
  }

  const session = sessions[relayHandle];
  if (!session) {
    return 'unknown';
  }

  // lastActiveAt may be absent in older session entries (the real ~/.switchboard/
  // sessions.json uses startedAt + cwd + pid without a heartbeat timestamp).
  // The type says string but runtime JSON may omit this field.
  const lastActiveAt = session.lastActiveAt;
  if (!lastActiveAt) {
    return 'unknown';
  }

  const lastActiveMs = new Date(lastActiveAt).getTime();
  if (isNaN(lastActiveMs)) {
    return 'unknown';
  }

  return Date.now() - lastActiveMs <= ONLINE_THRESHOLD_MS ? 'online' : 'offline';
}

/**
 * getSwitchboardStatus
 *
 * Convenience wrapper: reads sessions then resolves online status for a single
 * agent in one call. Returns 'unknown' on any error.
 */
export async function getSwitchboardStatus(agentId: string): Promise<SwitchboardStatus> {
  try {
    const sessions = await readSwitchboardSessions();
    return isAgentOnline(agentId, sessions);
  } catch {
    return 'unknown';
  }
}
