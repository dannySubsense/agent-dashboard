/**
 * Acceptance criteria covered (Slice 5 — Switchboard utilities):
 * - ONLINE_THRESHOLD_MS is exported and equals 5 * 60 * 1000 (300000)
 * - isAgentOnline returns 'online' when agent lastActiveAt is within ONLINE_THRESHOLD_MS
 * - isAgentOnline returns 'unknown' when agent handle is not found in sessions
 * - isAgentOnline returns 'offline' when agent lastActiveAt is older than ONLINE_THRESHOLD_MS
 * - isAgentOnline returns 'unknown' when sessions record is empty
 * - readSwitchboardSessions returns null when sessions.json does not exist
 * - readSwitchboardSessions returns null on malformed JSON
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import type { SwitchboardSessions } from '@/types';

const { mockReadFile } = vi.hoisted(() => {
  return { mockReadFile: vi.fn() };
});

vi.mock('fs/promises', () => ({
  default: {
    readFile: mockReadFile,
  },
}));

import { ONLINE_THRESHOLD_MS, isAgentOnline, readSwitchboardSessions } from './switchboard';

afterEach(() => {
  vi.clearAllMocks();
});

// ── ONLINE_THRESHOLD_MS ────────────────────────────────────────────────────

describe('ONLINE_THRESHOLD_MS', () => {
  it('is exported and equals 5 * 60 * 1000', () => {
    expect(ONLINE_THRESHOLD_MS).toBe(300_000);
  });
});

// ── isAgentOnline ──────────────────────────────────────────────────────────

describe('isAgentOnline', () => {
  it('returns online when agent lastActiveAt is within ONLINE_THRESHOLD_MS', () => {
    const recentTimestamp = new Date(Date.now() - 60_000).toISOString(); // 1 minute ago
    const sessions: SwitchboardSessions = {
      lumen: {
        agentId: 'lumen',
        startedAt: recentTimestamp,
        lastActiveAt: recentTimestamp,
      },
    };

    expect(isAgentOnline('lumen', sessions)).toBe('online');
  });

  it('returns unknown when agent handle is not found in sessions', () => {
    const sessions: SwitchboardSessions = {
      lumen: {
        agentId: 'lumen',
        startedAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      },
    };

    expect(isAgentOnline('ghost', sessions)).toBe('unknown');
  });

  it('returns offline when agent lastActiveAt is older than ONLINE_THRESHOLD_MS', () => {
    const staleTimestamp = new Date(Date.now() - 6 * 60 * 1000).toISOString(); // 6 minutes ago
    const sessions: SwitchboardSessions = {
      lumen: {
        agentId: 'lumen',
        startedAt: staleTimestamp,
        lastActiveAt: staleTimestamp,
      },
    };

    expect(isAgentOnline('lumen', sessions)).toBe('offline');
  });

  it('returns unknown when sessions record is empty', () => {
    const sessions: SwitchboardSessions = {};

    expect(isAgentOnline('lumen', sessions)).toBe('unknown');
  });
});

// ── readSwitchboardSessions ────────────────────────────────────────────────

describe('readSwitchboardSessions', () => {
  it('returns null when sessions.json does not exist', async () => {
    const enoent = Object.assign(new Error('ENOENT: no such file or directory'), {
      code: 'ENOENT',
    });
    mockReadFile.mockRejectedValue(enoent);

    const result = await readSwitchboardSessions();

    expect(result).toBeNull();
  });

  it('returns null on malformed JSON', async () => {
    mockReadFile.mockResolvedValue('{ not: valid json :::');

    const result = await readSwitchboardSessions();

    expect(result).toBeNull();
  });
});
