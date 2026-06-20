/**
 * Acceptance criteria covered (Slice 2 — parseProgressMd):
 * - Parses plain "Status:" format (observed in bootstrap-skill-v1/PROGRESS.md)
 * - Parses bold "**Status:**" format (observed in bootstrap-skill-v1-1/PROGRESS.md)
 * - Returns null when H1 slug line is absent
 * - Returns null when Status field is absent
 * - Handles all SprintStatus values: COMPLETE, IN PROGRESS, BLOCKED, HALTED, TODO
 * - Parses the real bootstrap-skill-v1/PROGRESS.md (plain format)
 * - Parses the real bootstrap-skill-v1-1/PROGRESS.md (bold format)
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { parseProgressMd } from './progress';
import type { SprintStatus } from '@/types';

describe('parseProgressMd', () => {
  it('parses plain "Status:" format and returns correct slug and status', () => {
    const content = `# PROGRESS.md — bootstrap-skill-v1\nSprint: bootstrap-skill-v1\nStatus: COMPLETE`;
    const result = parseProgressMd(content);
    expect(result).not.toBeNull();
    expect(result!.slug).toBe('bootstrap-skill-v1');
    expect(result!.status).toBe('COMPLETE');
  });

  it('parses bold "**Status:**" format and returns correct slug and status', () => {
    const content = `# PROGRESS.md — bootstrap-skill-v1-1\n**Sprint:** bootstrap-skill-v1-1\n**Status:** IN PROGRESS`;
    const result = parseProgressMd(content);
    expect(result).not.toBeNull();
    expect(result!.slug).toBe('bootstrap-skill-v1-1');
    expect(result!.status).toBe('IN PROGRESS');
  });

  it('returns null when H1 slug line is absent', () => {
    const content = `Sprint: some-sprint\nStatus: COMPLETE`;
    expect(parseProgressMd(content)).toBeNull();
  });

  it('returns null when Status field is absent', () => {
    const content = `# PROGRESS.md — some-sprint\nSprint: some-sprint`;
    expect(parseProgressMd(content)).toBeNull();
  });

  it.each(['COMPLETE', 'IN PROGRESS', 'BLOCKED', 'HALTED', 'TODO'])(
    'parses SprintStatus value "%s"',
    (statusValue) => {
      const content = `# PROGRESS.md — test-sprint\nStatus: ${statusValue}`;
      const result = parseProgressMd(content);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(statusValue as SprintStatus);
    }
  );

  it('parses the real bootstrap-skill-v1/PROGRESS.md (plain Status: format)', () => {
    const content = readFileSync(
      '/home/d-tuned/projects/agent-dashboard/docs/specs/bootstrap-skill-v1/PROGRESS.md',
      'utf-8'
    );
    const result = parseProgressMd(content);
    expect(result).not.toBeNull();
    expect(result!.slug).toBe('bootstrap-skill-v1');
    expect(result!.status).toBe('COMPLETE');
  });

  it('parses the real bootstrap-skill-v1-1/PROGRESS.md (bold **Status:** format)', () => {
    const content = readFileSync(
      '/home/d-tuned/projects/agent-dashboard/docs/specs/bootstrap-skill-v1-1/PROGRESS.md',
      'utf-8'
    );
    const result = parseProgressMd(content);
    expect(result).not.toBeNull();
    expect(result!.slug).toBe('bootstrap-skill-v1-1');
    expect(result!.status).toBe('COMPLETE');
  });
});
