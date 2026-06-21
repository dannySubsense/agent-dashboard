/**
 * Acceptance criteria covered (dark-mode-v1 Slice 2 — Component Class Replacement):
 * - AC1 (Slice 2): text-green-600 is absent from AgentStatusPanel.tsx
 * - AC2 (Slice 2): text-status-online appears exactly once in AgentStatusPanel.tsx
 * - AC3 (Slice 2 guard): bg-green-500 is still present (retained per spec — not accidentally removed)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const COMPONENT_PATH = resolve(process.cwd(), 'src/components/panels/AgentStatusPanel.tsx');
let src: string;

beforeAll(() => {
  src = readFileSync(COMPONENT_PATH, 'utf-8');
});

describe('AgentStatusPanel — Slice 2: Component Class Replacement', () => {
  it('text-green-600 is absent', () => {
    expect(src).not.toContain('text-green-600');
  });

  it('text-status-online appears exactly once', () => {
    const matches = src.match(/text-status-online/g);
    expect(matches).toHaveLength(1);
  });

  it('bg-green-500 is still present', () => {
    expect(src).toContain('bg-green-500');
  });
});
