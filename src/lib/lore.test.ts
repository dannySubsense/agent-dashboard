/**
 * Acceptance criteria covered (lore.ts — parseAgentDocument):
 * - Returns null when author is null
 * - Returns null when author is empty string
 * - Returns AgentRecord with name = author, relayHandle = author, switchboardStatus = 'unknown'
 * - Extracts projectId from content matching "- projectId: `agent-dashboard`" pattern (pattern 1)
 * - Extracts projectId from content matching "MCP_DEFAULT_PROJECT_ID=agent-dashboard" pattern (pattern 3)
 * - Returns projectId: '' when no pattern matches
 * - registryStatus comes from doc.status; defaults to 'unknown' when status is null
 * - Module exports the expected async query function names
 */

import { describe, it, expect, vi } from 'vitest';

// Mock pg before lore.ts is imported so the module-level Pool() constructor does not
// attempt a real connection or hold the event loop open during unit tests.
vi.mock('pg', () => {
  return {
    Pool: vi.fn().mockImplementation(() => ({
      query: vi.fn(),
      end: vi.fn(),
    })),
  };
});

import {
  parseAgentDocument,
  getLastCapturePerProject,
  getActiveHaltsByProject,
  getSessionCloses,
  getAgentRegistry,
  getLoreActivityEvents,
} from './lore';

// ── parseAgentDocument ─────────────────────────────────────────────────────

describe('parseAgentDocument', () => {
  it('returns null when author is null', () => {
    const result = parseAgentDocument({ id: '1', author: null, title: null, content: null, status: null });
    expect(result).toBeNull();
  });

  it('returns null when author is empty string', () => {
    const result = parseAgentDocument({ id: '1', author: '', title: null, content: null, status: null });
    expect(result).toBeNull();
  });

  it('returns AgentRecord with name = author, relayHandle = author, switchboardStatus = "unknown"', () => {
    const result = parseAgentDocument({ id: '1', author: 'lumen', title: null, content: null, status: 'confirmed' });

    expect(result).not.toBeNull();
    expect(result!.name).toBe('lumen');
    expect(result!.relayHandle).toBe('lumen');
    expect(result!.switchboardStatus).toBe('unknown');
  });

  it('extracts projectId from content matching "- projectId: `agent-dashboard`" pattern (pattern 1)', () => {
    const content = '- projectId: `agent-dashboard`';
    const result = parseAgentDocument({ id: '1', author: 'lumen', title: null, content, status: null });

    expect(result).not.toBeNull();
    expect(result!.projectId).toBe('agent-dashboard');
  });

  it('extracts projectId from content matching "MCP_DEFAULT_PROJECT_ID=agent-dashboard" pattern (pattern 3)', () => {
    const content = 'MCP_DEFAULT_PROJECT_ID=agent-dashboard';
    const result = parseAgentDocument({ id: '1', author: 'cairn', title: null, content, status: null });

    expect(result).not.toBeNull();
    expect(result!.projectId).toBe('agent-dashboard');
  });

  it('returns projectId: "" when no pattern matches', () => {
    const content = 'some random content with no project id markers';
    const result = parseAgentDocument({ id: '1', author: 'lumen', title: null, content, status: null });

    expect(result).not.toBeNull();
    expect(result!.projectId).toBe('');
  });

  it('sets registryStatus from doc.status', () => {
    const result = parseAgentDocument({ id: '1', author: 'lumen', title: null, content: null, status: 'confirmed' });

    expect(result!.registryStatus).toBe('confirmed');
  });

  it('defaults registryStatus to "unknown" when doc.status is null', () => {
    const result = parseAgentDocument({ id: '1', author: 'lumen', title: null, content: null, status: null });

    expect(result!.registryStatus).toBe('unknown');
  });
});

// ── module exports ─────────────────────────────────────────────────────────

describe('lore module exports', () => {
  it('exports getLastCapturePerProject as a function', () => {
    expect(typeof getLastCapturePerProject).toBe('function');
  });

  it('exports getActiveHaltsByProject as a function', () => {
    expect(typeof getActiveHaltsByProject).toBe('function');
  });

  it('exports getSessionCloses as a function', () => {
    expect(typeof getSessionCloses).toBe('function');
  });

  it('exports getAgentRegistry as a function', () => {
    expect(typeof getAgentRegistry).toBe('function');
  });

  it('exports getLoreActivityEvents as a function', () => {
    expect(typeof getLoreActivityEvents).toBe('function');
  });
});
