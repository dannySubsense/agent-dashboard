# Roadmap: dark-mode-v1

**Source DDR:** DDR-010
**Sprint:** dark-mode-v1
**Date:** 2026-06-21
**Author:** planner

---

## Overview

4 slices. 2 source files changed. No new components, no new libraries, no new TypeScript types. Implementation is purely CSS structural surgery plus one class replacement, followed by contrast and visual verification gates.

Total affected files (source changes): `src/app/globals.css`, `src/components/panels/AgentStatusPanel.tsx`.

---

## Dependency Map

| Slice | Depends On |
|-------|------------|
| 1 — CSS Foundation | — |
| 2 — Component Class Replacement | Slice 1 (token `--color-status-online` must exist before `text-status-online` utility resolves) |
| 3 — Dot Badge Contrast Verification | Slice 1 (dark mode must be active in the browser) |
| 4 — Full Visual Verification | Slices 1, 2, 3 |

No circular dependencies. Slices 2 and 3 are independent of each other and may be executed in parallel after Slice 1; sequence below is 1→2→3→4 for single-implementer clarity.

---

## Slice Overview

| Slice | Goal | Depends On | Files Changed |
|-------|------|------------|---------------|
| 1 | Migrate dark mode selector in globals.css; add status-online token | — | `src/app/globals.css` |
| 2 | Replace `text-green-600` with `text-status-online` in AgentStatusPanel | Slice 1 | `src/components/panels/AgentStatusPanel.tsx` |
| 3 | Verify contrast of 5 dot badge classes against dark background; replace any that fail | Slice 1 | `src/app/globals.css` (conditional), `src/components/panels/ActivityFeedPanel.tsx` (conditional), `src/components/panels/AgentStatusPanel.tsx` (conditional), `src/components/panels/OpenWorkPanel.tsx` (conditional) |
| 4 | Full visual verification: all 6 panels + shared states in dark mode; light mode regression check | Slices 1, 2, 3 | None (read-only verification gate) |

---

## Slice 1: CSS Foundation

**Goal:** Restructure `globals.css` so dark mode activates via `@media (prefers-color-scheme: dark)` and the `--status-online` semantic token is registered in both modes.

**Depends On:** —

**Files:**
- `src/app/globals.css` — modify

**Implementation Notes:**

Three operations on this file, applied together:

1. **Remove line 3** — delete `@custom-variant dark (&:is(.dark *));` and the blank line that follows it. This line must be absent from the final file.

2. **Migrate dark selector** — replace the current `.dark { ... }` block (currently lines 80–112, containing 27 token declarations) with:
   ```css
   @media (prefers-color-scheme: dark) {
     :root {
       /* 27 token declarations, values copied verbatim */
     }
   }
   ```
   All 27 token values are copied without modification. Only the wrapping selector changes from `.dark { ... }` to `@media (prefers-color-scheme: dark) { :root { ... } }`.

3. **Add `--status-online` token** — three insertion points:
   - In `@theme inline {}`: add `--color-status-online: var(--status-online);` (following the `--color-*` pattern of existing entries)
   - In `:root {}` (light mode): add `--status-online: oklch(0.627 0.194 149.214);`
   - In `@media (prefers-color-scheme: dark) { :root { ... } }`: add `--status-online: oklch(0.723 0.193 148.347);`
   - Note: Confirm the exact oklch values against `node_modules/tailwindcss` source before writing. The architecture specifies these as the green-600 and green-500 values from Tailwind v4's built-in palette — verify byte-for-byte.

**Tests:**
- [ ] `grep -n "@custom-variant dark" src/app/globals.css` returns no matches
- [ ] `grep -n "\.dark" src/app/globals.css` returns no matches (no top-level `.dark` selector block)
- [ ] `grep -n "prefers-color-scheme: dark" src/app/globals.css` returns exactly one match
- [ ] `grep -n "\-\-status-online" src/app/globals.css` returns exactly 3 matches (one in `@theme inline`, one in `:root`, one inside the `@media` block)
- [ ] `next build` completes without error

**Done When:**
- [ ] `@custom-variant dark (&:is(.dark *))` is absent from `globals.css`
- [ ] No top-level `.dark {}` selector block exists in `globals.css`
- [ ] All 27 dark token overrides appear inside `@media (prefers-color-scheme: dark) { :root { ... } }` with values unchanged
- [ ] `--color-status-online: var(--status-online)` is present in the `@theme inline` block
- [ ] `--status-online` has a light-mode value in `:root` and a dark-mode value inside the `@media` block
- [ ] `next build` passes

---

## Slice 2: Component Class Replacement

**Goal:** Replace the hardcoded `text-green-600` on the online status label in `AgentStatusPanel.tsx` with the semantic token `text-status-online`.

**Depends On:** Slice 1 (`--color-status-online` must be registered in `@theme inline` for `text-status-online` to resolve as a Tailwind utility)

**Files:**
- `src/components/panels/AgentStatusPanel.tsx` — modify

**Implementation Notes:**

Locate `SwitchboardStatusBadge` (line 11 in current file). Change the single `className` attribute on the outer `<span>`:

Current:
```tsx
<span className="inline-flex items-center gap-1.5 text-xs text-green-600">
```

Replace with:
```tsx
<span className="inline-flex items-center gap-1.5 text-xs text-status-online">
```

No other lines in the file change. The `bg-green-500` dot on the inner `<span>` (line 12) is retained — its contrast is verified in Slice 3, not changed here.

**Tests:**
- [ ] `grep -n "text-green-600" src/components/panels/AgentStatusPanel.tsx` returns no matches
- [ ] `grep -n "text-status-online" src/components/panels/AgentStatusPanel.tsx` returns exactly one match
- [ ] `next build` passes

**Done When:**
- [ ] `text-green-600` is absent from `AgentStatusPanel.tsx`
- [ ] `text-status-online` appears on the online state `<span>` in `SwitchboardStatusBadge`
- [ ] No other lines in `AgentStatusPanel.tsx` are changed
- [ ] `next build` passes

---

## Slice 3: Dot Badge Contrast Verification

**Goal:** Confirm all 5 hardcoded dot badge classes meet the 3:1 UI component contrast threshold against the dark card background (`oklch(0.205 0 0)`). Replace any that fail using the semantic token pattern.

**Depends On:** Slice 1 (dark mode must be active in browser for measurement)

**Files (all conditional — only modified if a dot fails):**
- `src/app/globals.css` — modify if any dot requires a new semantic token
- `src/components/panels/ActivityFeedPanel.tsx` — modify if any ActivityFeed dot fails
- `src/components/panels/AgentStatusPanel.tsx` — modify if `bg-green-500` fails
- `src/components/panels/OpenWorkPanel.tsx` — modify if `bg-red-500` fails

**Implementation Notes:**

Verification method: Load the dashboard in a Chromium-based browser with OS set to dark preference. Use DevTools accessibility panel (Elements → Accessibility) or the browser's built-in contrast checker on each rendered dot element. Record the contrast ratio for each.

Dots to verify (all against `oklch(0.205 0 0)` — the dark `--card` value):

| Class | Panel | Threshold | Expected outcome |
|-------|-------|-----------|-----------------|
| `bg-violet-500` | ActivityFeedPanel | 3:1 UI component | Expected pass (high-chroma, mid lightness) |
| `bg-sky-500` | ActivityFeedPanel | 3:1 UI component | Expected pass |
| `bg-emerald-500` | ActivityFeedPanel | 3:1 UI component | Expected pass |
| `bg-green-500` | AgentStatusPanel | 3:1 UI component | Expected pass |
| `bg-red-500` | OpenWorkPanel | 3:1 UI component | Expected pass |

If a dot fails 3:1: add a new semantic token to `globals.css` following the `--status-online` pattern (light value = current palette class value; dark value = adjusted value that achieves 3:1), add `--color-*` alias to `@theme inline`, and replace the failing class in the component. Token naming per 03-UI-SPEC.md §4: `bg-status-lore-capture`, `bg-status-git-commit`, `bg-status-pr-merge`, `bg-status-halt` for the ActivityFeed and OpenWork dots.

Architecture expectation (02-ARCHITECTURE.md §Primary Architecture Decision): all 5 dots are expected to pass without replacement. If none fail, this slice produces no file changes — only the verified pass record.

**Tests:**
- [ ] Measured contrast ratio for `bg-violet-500` against `oklch(0.205 0 0)` is documented
- [ ] Measured contrast ratio for `bg-sky-500` against `oklch(0.205 0 0)` is documented
- [ ] Measured contrast ratio for `bg-emerald-500` against `oklch(0.205 0 0)` is documented
- [ ] Measured contrast ratio for `bg-green-500` against `oklch(0.205 0 0)` is documented
- [ ] Measured contrast ratio for `bg-red-500` against `oklch(0.205 0 0)` is documented
- [ ] All 5 ratios are >= 3:1, OR any failing dots have been replaced and their replacements are verified >= 3:1
- [ ] If any files were modified: `next build` passes

**Done When:**
- [ ] All 5 dot badge classes have a documented contrast ratio
- [ ] Every dot meets the 3:1 UI component threshold — either the existing palette class confirmed passing, or a semantic token replacement has been applied and confirmed
- [ ] If any token was added: follows the `--status-online` pattern exactly (`:root` light value, `@media` dark value, `@theme inline` alias)

---

## Slice 4: Full Visual Verification

**Goal:** Confirm all 6 panels and shared component states render correctly in dark mode. Confirm light mode is unaffected (regression).

**Depends On:** Slices 1, 2, 3 (all source changes must be complete before this gate)

**Files:** None — read-only verification gate. No source changes expected. If a defect is found, halt and route back to the responsible slice.

**Implementation Notes:**

Load the dashboard at `http://localhost:3000` (or VM 101) with OS set to dark preference. Work through the verification checklist panel by panel. Record pass/fail for each item. If any item fails, halt this slice, identify which earlier slice is responsible, and route the fix contract back before re-running Slice 4.

Verification sequence:

1. CSS mechanism checks (03-UI-SPEC.md §7.1)
2. ProjectCardsPanel (§7.2)
3. DdrPipelinePanel (§7.3)
4. SessionClosePanel (§7.4)
5. ActivityFeedPanel (§7.5) — verify SelectContent popover in dark; filter active state; empty states
6. AgentStatusPanel (§7.6) — verify `text-status-online` meets 4.5:1 WCAG AA
7. OpenWorkPanel (§7.7) — all group states
8. Shared states (§7.8) — PanelUnavailable, stale notice banner
9. Switch OS preference to light; confirm light mode regression-free

**Tests:**
- [ ] `@custom-variant dark` absent — confirmed in Slice 1, re-verified here
- [ ] No `.dark {}` selector block — confirmed in Slice 1
- [ ] Dark mode activates with JS disabled (disable JS in browser, set OS dark, reload)
- [ ] Dashboard re-themes on live OS switch (change OS preference while tab is open)
- [ ] No toggle or theme control visible anywhere in rendered page
- [ ] ProjectCardsPanel: all states in 03-UI-SPEC.md §7.2 pass
- [ ] DdrPipelinePanel: all states in §7.3 pass
- [ ] SessionClosePanel: all states in §7.4 pass
- [ ] ActivityFeedPanel: all states in §7.5 pass, including Select dropdown
- [ ] AgentStatusPanel: `text-status-online` contrast >= 4.5:1 confirmed; all states in §7.6 pass
- [ ] OpenWorkPanel: all states in §7.7 pass
- [ ] PanelUnavailable and stale banner: §7.8 pass
- [ ] Light mode regression: all panels render correctly in light mode

**Done When:**
- [ ] Every acceptance criterion in 01-REQUIREMENTS.md §Acceptance Criteria is checked off
- [ ] Every item in 03-UI-SPEC.md §7 Visual Acceptance Criteria Summary is checked off
- [ ] No defects found, or all found defects have been routed, fixed, and re-verified
- [ ] Light mode is confirmed unaffected

---

## Sequence Rules

1. Complete each slice fully before starting the next. No partial slice work.
2. Slices 2 and 3 both depend only on Slice 1 and may be executed in parallel by a multi-agent forge setup. In single-implementer mode, run 1→2→3→4.
3. If Slice 3 discovers a failing dot: apply the fix within Slice 3 before marking Slice 3 complete. Do not defer failing dots to Slice 4.
4. If Slice 4 discovers a defect: halt Slice 4, route the fix contract back to the responsible slice (1, 2, or 3), apply the fix, re-run that slice's done criteria, then re-run Slice 4 from the top.
5. Slice 4 is a read-only gate — no direct file edits during Slice 4. All fixes route back.
6. No new slices without human approval.

---

## Deferred (Not This Roadmap)

- Manual light/dark toggle UI control — future DDR per DDR-010 §3.4
- Nivo chart dark mode theming (`@nivo/calendar`, `@nivo/funnel`) — open question in DDR-010 §6; pre-wired for a dedicated Nivo DDR
- `dark:` Tailwind utility prefix usage — variant is removed in this sprint; any future `dark:` usage requires a new DDR reinstating a toggle strategy
- Per-user theme preference (localStorage, cookies, LORE database) — out of scope per 01-REQUIREMENTS.md
- Mobile dark mode verification — dashboard is desktop-only
- Animated/cross-faded theme transitions on OS preference change
- Additional semantic tokens for dot indicators (pre-emptive) — add only if Slice 3 contrast check fails; follow the established pattern at that point
