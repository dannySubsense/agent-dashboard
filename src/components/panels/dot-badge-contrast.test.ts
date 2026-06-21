/**
 * Acceptance criteria covered (dark-mode-v1 Slice 3 — Dot Badge Contrast):
 * - AC1 (US-3): --color-status-lore-capture appears in @theme inline (token registered)
 * - AC2 (US-3): --color-status-halt appears in @theme inline (token registered)
 * - AC3 (Slice 3 structural): --status-lore-capture appears exactly 3 times (theme alias + light :root + dark @media)
 * - AC4 (Slice 3 structural): --status-halt appears exactly 3 times (theme alias + light :root + dark @media)
 * - AC5 (US-3): bg-violet-500 is absent from ActivityFeedPanel.tsx (failed 3:1 at 2.26:1 — replaced)
 * - AC6 (US-3): bg-status-lore-capture is present in ActivityFeedPanel.tsx (semantic replacement)
 * - AC7 (US-3): bg-sky-500 is retained in ActivityFeedPanel.tsx (passed 3:1 at 7.33:1 — must not regress)
 * - AC8 (US-3): bg-emerald-500 is retained in ActivityFeedPanel.tsx (passed 3:1 at 9.47:1 — must not regress)
 * - AC9 (US-3): bg-red-500 is absent from OpenWorkPanel.tsx (failed 3:1 at 1.28:1 — replaced)
 * - AC10 (US-3): bg-status-halt is present in OpenWorkPanel.tsx (semantic replacement)
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const CSS_PATH = resolve(process.cwd(), 'src/app/globals.css');
const ACTIVITY_FEED_PATH = resolve(process.cwd(), 'src/components/panels/ActivityFeedPanel.tsx');
const OPEN_WORK_PATH = resolve(process.cwd(), 'src/components/panels/OpenWorkPanel.tsx');

let css: string;
let activityFeed: string;
let openWork: string;

beforeAll(() => {
  css = readFileSync(CSS_PATH, 'utf-8');
  activityFeed = readFileSync(ACTIVITY_FEED_PATH, 'utf-8');
  openWork = readFileSync(OPEN_WORK_PATH, 'utf-8');
});

describe('globals.css — Slice 3: Dot Badge Contrast Tokens', () => {
  it('--color-status-lore-capture appears in @theme inline', () => {
    expect(css).toContain('--color-status-lore-capture');
  });

  it('--color-status-halt appears in @theme inline', () => {
    expect(css).toContain('--color-status-halt');
  });

  it('--status-lore-capture appears exactly 3 times (theme alias + light :root + dark @media)', () => {
    const matches = css.match(/--status-lore-capture/g);
    expect(matches).toHaveLength(3);
  });

  it('--status-halt appears exactly 3 times (theme alias + light :root + dark @media)', () => {
    const matches = css.match(/--status-halt/g);
    expect(matches).toHaveLength(3);
  });
});

describe('ActivityFeedPanel.tsx — Slice 3: Dot Badge Contrast', () => {
  it('bg-violet-500 is absent (failed contrast at 2.26:1 — replaced with semantic token)', () => {
    expect(activityFeed).not.toContain('bg-violet-500');
  });

  it('bg-status-lore-capture is present (semantic replacement for lore-capture dot)', () => {
    expect(activityFeed).toContain('bg-status-lore-capture');
  });

  it('bg-sky-500 is retained (git-commit dot passed contrast at 7.33:1)', () => {
    expect(activityFeed).toContain('bg-sky-500');
  });

  it('bg-emerald-500 is retained (pr-merge dot passed contrast at 9.47:1)', () => {
    expect(activityFeed).toContain('bg-emerald-500');
  });
});

describe('OpenWorkPanel.tsx — Slice 3: Dot Badge Contrast', () => {
  it('bg-red-500 is absent (failed contrast at 1.28:1 — replaced with semantic token)', () => {
    expect(openWork).not.toContain('bg-red-500');
  });

  it('bg-status-halt is present (semantic replacement for HALT indicator dot)', () => {
    expect(openWork).toContain('bg-status-halt');
  });
});
