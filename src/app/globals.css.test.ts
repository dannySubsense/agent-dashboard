/**
 * Acceptance criteria covered (dark-mode-v1 Slice 1 — CSS Foundation):
 * - AC1 (US-1): @custom-variant dark is absent from globals.css
 * - AC2 (US-1): No top-level .dark selector block exists; dark tokens live inside @media (prefers-color-scheme: dark) { :root { ... } }
 * - AC3 (Slice 1 structural): prefers-color-scheme: dark appears exactly once
 * - AC4 (Slice 1 structural): --status-online appears exactly 3 times (in @theme inline, :root, and @media dark block)
 * - AC5 (build smoke): globals.css is readable with expected structure
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const CSS_PATH = resolve(process.cwd(), 'src/app/globals.css');
let css: string;

beforeAll(() => {
  css = readFileSync(CSS_PATH, 'utf-8');
});

describe('globals.css — Slice 1: CSS Foundation', () => {
  it('@custom-variant dark is absent', () => {
    expect(css).not.toContain('@custom-variant dark');
  });

  it('no top-level .dark selector block exists', () => {
    expect(css).not.toContain('.dark');
  });

  it('prefers-color-scheme: dark appears exactly once', () => {
    const matches = css.match(/prefers-color-scheme:\s*dark/g);
    expect(matches).toHaveLength(1);
  });

  it('--status-online appears exactly 3 times', () => {
    const matches = css.match(/--status-online/g);
    expect(matches).toHaveLength(3);
  });

  it('globals.css is readable and contains expected Tailwind import (build smoke)', () => {
    expect(css.length).toBeGreaterThan(0);
    expect(css).toContain('@import "tailwindcss"');
  });
});
