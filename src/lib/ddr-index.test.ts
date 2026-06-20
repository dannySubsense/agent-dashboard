/**
 * Acceptance criteria covered (Slice 2 — parseDdrIndex, normalizeDdrStatus):
 * - parseDdrIndex skips header row and separator rows; returns DdrEntry[] from data rows
 * - parseDdrIndex returns [] on empty string input
 * - normalizeDdrStatus maps BACKLOG, DRAFT, PROPOSED → 'PROPOSED'
 * - normalizeDdrStatus maps ACCEPTED → 'ACCEPTED'
 * - normalizeDdrStatus maps IN SPRINT → 'IN SPRINT'
 * - normalizeDdrStatus maps SHIPPED → 'SHIPPED'
 * - normalizeDdrStatus maps unknown values → 'UNKNOWN'
 * - parseDdrIndex parses the real 00-DDR-INDEX.md with correct kanbanColumn values
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parseDdrIndex, normalizeDdrStatus } from './ddr-index';

const MINIMAL_TABLE = `| # | Title | Status | Sprint | Depends On | Scope |
|---|---|---|---|---|---|
| 001 | Some DDR | ACCEPTED | sprint-v1 | — | Feature |
| 002 | Another DDR | BACKLOG | tbd | 001 | Feature |`;

describe('parseDdrIndex', () => {
  it('skips header row and separator rows and returns data entries', () => {
    const entries = parseDdrIndex(MINIMAL_TABLE, 'test-repo', null);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      number: '001',
      title: 'Some DDR',
      rawStatus: 'ACCEPTED',
      kanbanColumn: 'ACCEPTED',
      sprint: 'sprint-v1',
      repoName: 'test-repo',
      projectId: null,
    });
    expect(entries[1]).toEqual({
      number: '002',
      title: 'Another DDR',
      rawStatus: 'BACKLOG',
      kanbanColumn: 'PROPOSED',
      sprint: 'tbd',
      repoName: 'test-repo',
      projectId: null,
    });
  });

  it('returns [] on empty string input', () => {
    expect(parseDdrIndex('', 'test-repo', null)).toEqual([]);
  });

  it('parses the real 00-DDR-INDEX.md with correct kanbanColumn values', () => {
    const content = readFileSync(
      '/home/d-tuned/projects/agent-dashboard/docs/specs/agent-dashboard-ddrs/00-DDR-INDEX.md',
      'utf-8'
    );
    const entries = parseDdrIndex(content, 'agent-dashboard', 'agent-dashboard');

    const backlogEntries = entries.filter((e) => e.rawStatus === 'BACKLOG');
    const draftEntries = entries.filter((e) => e.rawStatus === 'DRAFT');
    const acceptedEntries = entries.filter((e) => e.rawStatus === 'ACCEPTED');

    expect(backlogEntries.length).toBeGreaterThan(0);
    expect(draftEntries.length).toBeGreaterThan(0);
    expect(acceptedEntries.length).toBeGreaterThan(0);

    for (const e of backlogEntries) {
      expect(e.kanbanColumn).toBe('PROPOSED');
    }
    for (const e of draftEntries) {
      expect(e.kanbanColumn).toBe('PROPOSED');
    }
    for (const e of acceptedEntries) {
      expect(e.kanbanColumn).toBe('ACCEPTED');
    }
  });
});

describe('normalizeDdrStatus', () => {
  it('maps BACKLOG to PROPOSED', () => {
    expect(normalizeDdrStatus('BACKLOG')).toBe('PROPOSED');
  });

  it('maps DRAFT to PROPOSED', () => {
    expect(normalizeDdrStatus('DRAFT')).toBe('PROPOSED');
  });

  it('maps PROPOSED to PROPOSED', () => {
    expect(normalizeDdrStatus('PROPOSED')).toBe('PROPOSED');
  });

  it('maps ACCEPTED to ACCEPTED', () => {
    expect(normalizeDdrStatus('ACCEPTED')).toBe('ACCEPTED');
  });

  it('maps IN SPRINT to IN SPRINT', () => {
    expect(normalizeDdrStatus('IN SPRINT')).toBe('IN SPRINT');
  });

  it('maps SHIPPED to SHIPPED', () => {
    expect(normalizeDdrStatus('SHIPPED')).toBe('SHIPPED');
  });

  it('maps an unknown value to UNKNOWN', () => {
    expect(normalizeDdrStatus('MYSTERY')).toBe('UNKNOWN');
  });
});
