# Spec Review: dark-mode-v1 (Pass 2)

**Source DDR:** DDR-010
**Sprint:** dark-mode-v1
**Date:** 2026-06-21
**Author:** spec-reviewer
**Pass:** 2 (re-review after Pass 1 fixes)
**Documents reviewed:** 01-REQUIREMENTS.md, 02-ARCHITECTURE.md, 03-UI-SPEC.md, 04-ROADMAP.md, DDR-010
**Source cross-checked:** `src/components/panels/AgentStatusPanel.tsx`, `src/**` (Nivo presence)

---

## Verdict

**PASS — ready for Frank gate / human approval**

All Pass 1 blocking and medium gaps are resolved or downgraded. G1 (High) is substantively
resolved; a Low residual remains (02 still labels the online-text contrast surface as
`--background`/`0.145` where the element actually renders on `bg-card`/`0.205`). G2 (Medium) is
resolved with an explicit fallback contract. G3 and G5 are resolved against source. G4 remains a
Low, accepted edge case. No remaining gap blocks implementation. No HALT condition met.

---

## Pass 1 Gap Disposition

| ID | Pass 1 Severity | Pass 2 Status | Evidence |
|----|-----------------|---------------|----------|
| G1 | High | **RESOLVED (partial)** — Low residual remains | 01 fully corrected to `0.205` (lines 39, 153; line 157 no longer cites a value). 02 line 20 (dot surface) corrected to `0.205`. **Residual:** 02 still cites `oklch(0.145 0 0)` (`--background`) as the online-**text** WCAG surface at lines 26, 28, 97, 173, contradicting 03 (lines 357, 492 → `bg-card` `0.205`) and source (online `<span>` renders inside PanelShell `bg-card`). See G6. |
| G2 | Medium | **RESOLVED** | Fallback contract added: 02 line 121 ("if `text-status-online` fails 4.5:1 … replace with `text-foreground`"), restated in Constraint Verification line 173. The single confirmed WCAG failure now has a specified remediation path. |
| G3 | Low | **RESOLVED (non-issue)** | Confirmed against `AgentStatusPanel.tsx`: thead row uses `border-b border-border` (line 39); tbody rows use `border-b border-border/50 last:border-0` (line 51). These are two distinct elements, both correctly described. Pass 1 conflated them. Only a cosmetic omission remains: 03 §6.5 hierarchy (line 326) does not list the tbody row's border class. No class changes this sprint; no impact. |
| G4 | Low | **OPEN (accepted)** | Roadmap Slice 4 still has no explicit verification step for a browser lacking `prefers-color-scheme`. Behavior is inherent to CSS (`:root` defaults apply; no code path to exercise). Accept as inherently covered, or @planner adds a one-line Slice 4 note. |
| G5 | Low | **RESOLVED** | Codebase grep for `nivo`/`Nivo`/`ResponsiveCalendar`/`ResponsiveFunnel`/`Calendar`/`Funnel` across `src/**` returns **zero matches**. No Nivo chart renders in any of the six panels in the current build. The deferred Nivo limitation is therefore not user-visible in v1 — the "if rendered" hedging in 01/03/04 is moot. Good news; no doc change required. |

---

## Residual Gap (new ID, carried from G1)

| ID | Severity | Gap | Impact | Recommended Fix / Owner |
|----|----------|-----|--------|-------------------------|
| G6 | **Low** | Online-text contrast surface mislabeled in 02. 02 (lines 26, 28, 97, 173) verifies `text-status-online` against `oklch(0.145 0 0)` (`--background`) and explicitly calls it "the page background". The online label is table-cell text inside PanelShell, which inherits `bg-card` (`oklch(0.205 0 0)`); 03 (lines 357, 492) correctly states `bg-card`. Separately, 03 line 72 says the dots are verified against `oklch(0.145 0 0)`, contradicting 03 §4 (line 61) and §7.5 (lines 476–478) which use `oklch(0.205 0 0)`. | Documentation accuracy only. Conclusion is unchanged: on the real `0.205` surface the green-500 label measures ~8.1:1 (vs the cited 8.69:1 on `0.145`), still far above the 4.5:1 minimum; the dots have large margin on either surface. No false-pass risk and the G2 fallback covers any real-world failure. | Route to @architect: change `oklch(0.145 0 0)` → `oklch(0.205 0 0)` in 02 lines 26, 28, 97, 173 and re-label `--background` → `--card` for the online-text verification. Route to @ui-spec-writer: fix 03 line 72 (`0.145` → `0.205`) and add the tbody `border-border/50` class to the §6.5 hierarchy. Both are optional cleanups; neither blocks forge. |

---

## Requirements -> Architecture Coverage

| Requirement | Architecture Coverage | Status |
|-------------|----------------------|--------|
| US-1 OS-driven activation (media-query, no JS) | `@media (prefers-color-scheme: dark)` migration; Constraint Verification table | OK |
| US-2 All panels legible | CSS-cascade propagation via globals.css; no per-panel change asserted | OK |
| US-3 Semantic indicators distinguishable | `--status-online` token (text); dot palette classes retained with 3:1 gate | OK |
| US-4 Zero interaction | No toggle, no JS, layout.tsx unchanged; Anti-Patterns list | OK |
| Prereq: class-toggling -> media-query migration | Removal + Selector migration (CSS Token Contract) | OK |
| Hardcoded color audit (6 classes) | Dot retain decision + green-600 -> token decision | OK |
| WCAG AA online label | `--status-online` per-mode value + `text-foreground` fallback | OK (G2 resolved; G6 surface-label residual) |

---

## Requirements -> UI Coverage

| User Story | Screen / Flow | Status |
|------------|---------------|--------|
| US-1 | §2 Mode Activation Mechanism; §7.1 CSS Mechanism checks | OK |
| US-2 | §6.1–6.6 per-panel visual state inventory; §5 shared states | OK |
| US-3 | §4 Hardcoded Color Inventory; §6.4/6.5/6.6 dot states | OK |
| US-4 | §2 (no toggle/transition state); §7.1 toggle-absent check | OK |
| Edge cases (01 §Edge Cases) | §5.1/5.2 stale + unavailable; §6.x empty states | OK (G4 fallback case has no explicit UI step — accepted) |

---

## Architecture -> Roadmap Coverage

| Component / Change | Slice | Status |
|--------------------|-------|--------|
| globals.css: remove `@custom-variant dark` | Slice 1 | OK |
| globals.css: migrate `.dark {}` -> `@media` block (27 tokens) | Slice 1 | OK |
| globals.css: add `--status-online` (3 insertion points) | Slice 1 | OK |
| AgentStatusPanel: `text-green-600` -> `text-status-online` | Slice 2 | OK |
| 5 dot classes contrast verification + conditional token fix | Slice 3 | OK |
| All 6 panels + shared states + light regression | Slice 4 | OK |

All architecture changes are slice-covered. No orphaned components. No circular dependencies
(1 -> {2,3} -> 4). Every slice has concrete file paths and explicit, testable "Done When" criteria.

---

## Identified Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Dark `--status-online` green-500 fails 4.5:1 on `bg-card` | L | M | Margin is ~8:1 on the real `0.205` surface; explicit `text-foreground` fallback now specified (G2) |
| Implementer measures dot contrast against wrong surface | L | L | 01/03 §4/§7.5/04 all specify `0.205`; only 03 line 72 still says `0.145` (G6, cosmetic) |
| Manual DevTools contrast checks non-reproducible | L | M | Slice 3 requires recorded numeric ratios as the verification record |
| oklch token values not byte-for-byte vs Tailwind v4 source -> light regression | L | L | 02/04 require confirming values against `node_modules/tailwindcss`; Slice 4 light regression check |
| Nivo chart renders light colors on dark page | — | — | **Eliminated** — no Nivo usage in `src` (G5); not present in v1 |

---

## Assumptions (carried, surfaced for human sign-off)

| Assumption | Impact if Wrong |
|------------|-----------------|
| The 27 existing `.dark {}` token values are correct and need only re-wrapping | If any value was wrong, the bug silently persists into media-query mode (no doc enumerates all 27 to verify) |
| All 5 bright dot classes pass 3:1 against `oklch(0.205 0 0)` | Each failure adds a token + component edit; Slice 3 is the gate but scope could expand |
| Danny's browser supports `prefers-color-scheme` | Falls back to light mode (accepted; G4) |
| No `dark:` utilities and no `.dark` references exist elsewhere in the codebase | Removing the variant could break an unaudited usage; audit claim (01 line 28) asserted, not exhaustively shown |

---

## Open Questions

| Question | Status | Resolution |
|----------|--------|------------|
| Will green-500 meet 4.5:1 on `bg-card`? | **Closed** | ~8.1:1 on `0.205`; far above minimum; `text-foreground` fallback covers any environment-specific failure |
| Is any `@nivo/*` chart rendered in the six panels? | **Closed** | No — zero Nivo usage in `src`; deferred limitation not user-visible in v1 |
| Clean up 02/03 `0.145` online-text surface labels before forge? | Open (human) | Recommend cleanup (G6) but non-blocking — values are conclusion-equivalent on both surfaces |

---

## Approval Checklist

### Requirements (01)
- [ ] Reviewed by human
- [x] Acceptance criteria testable (map to Slice 4 tests)
- [ ] Out of scope acceptable
- [x] G1 background value corrected (`0.145` -> `0.205`) in 01

### Architecture (02)
- [ ] Reviewed by human
- [x] Patterns appropriate (media-query + semantic token; consistent with shadcn)
- [x] Schemas correct (N/A — pure CSS, no new types)
- [x] G2 fallback contract added
- [ ] G6 online-text surface label cleanup (`0.145`/`--background` -> `0.205`/`--card`) — optional, non-blocking

### UI Spec (03)
- [ ] Reviewed by human
- [x] Flows complete (no new flows; per-panel states enumerated)
- [x] Layouts appropriate
- [x] G3 row-border classes confirmed correct against source
- [ ] G6 cleanup: line 72 `0.145` -> `0.205`; add tbody border class to §6.5 hierarchy — optional, non-blocking

### Roadmap (04)
- [ ] Reviewed by human
- [x] Sequence correct (1 -> {2,3} -> 4, no cycles)
- [x] Slices appropriately sized
- [x] Every "Done When" concrete and testable
- [ ] G4: optional one-line Slice 4 note for no-`prefers-color-scheme` browser — or accept as inherent

### Overall
- [x] G1 resolved (High) — Low residual (G6) documented
- [x] G2 resolved (Medium)
- [x] G5 resolved (no Nivo present)
- [ ] G4 accepted or noted (Low)
- [ ] G6 optional cleanup decided (Low)
- [ ] Ready for implementation (pending human approval)

---

## Reviewer Notes

- The two blocking-class gaps from Pass 1 (G1, G2) are addressed. The remaining items (G4, G6, the
  03 §6.5 hierarchy omission) are all Low and documentation-level; none changes an implementation
  decision or a pass/fail outcome.
- G5 is decisively closed by source inspection: there is no Nivo chart in the current build, so the
  spec's recurring "if rendered" Nivo hedging describes a non-existent surface in v1. Harmless, but
  the docs could drop the conditional for clarity.
- Recommendation: approve for forge. The G6 surface-label cleanup and the G4 note can be folded into
  the forge phase or accepted as-is, at the Composer's / Frank's discretion — they do not gate
  implementation because the underlying contrast conclusions hold on the real `bg-card` surface and
  the `text-foreground` fallback backstops the only WCAG-critical element.
- No HALT condition: documents are consistent in intent and operative direction; the residual is a
  surface-label inaccuracy in a non-operative narrative, not a fundamental conflict.
</content>
</invoke>
