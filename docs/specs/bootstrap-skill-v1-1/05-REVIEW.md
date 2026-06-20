# Spec Review: bootstrap-skill-v1-1 (Re-Review — Fix Verification)

**Sprint:** bootstrap-skill-v1-1
**DDR:** DDR-009-bootstrap-skill-v1-1-fixes.md
**Reviewer:** spec-reviewer
**Date:** 2026-06-20
**Target file:** `.claude/commands/new-project.md`
**Status:** COMPLETE — **APPROVED**

---

## Re-Review Scope

This is the second pass on the bootstrap-skill-v1-1 spec set. The initial review (prior 05-REVIEW.md) flagged three items. Two fixes were applied; this pass verifies them and re-checks the full document set for newly introduced gaps.

| Item | Initial finding | Disposition | This pass |
|---|---|---|---|
| Gap-1 | 01 Out-of-Scope contradicted AC-2.3 / CHANGE-12 (added a fifth Validation Loops row vs "no new validation loops beyond the existing four") | Reworded in 01 | **VERIFIED RESOLVED** |
| Gap-2 | AC-1.5 literal mechanism ("git add returns non-zero") differs from implemented `ls` pre-check HALT | Accepted as-is (pre-check is strictly better) | **CONFIRMED — accepted, no contradiction** |
| Gap-3 | "Token unknown at spec time" framing drift | No action required (already reconciled) | **CONFIRMED — no action** |
| Prose-token spot-check | (new mitigation) Slice 1 must confirm the prose token is absent from the edited file before Slice 2 | Added to 04 Slice 1 Done-When | **VERIFIED PRESENT + CORRECTLY PLACED** |

---

## Fix Verification

### Fix 1 — Gap-1 resolution (01-REQUIREMENTS.md line 87)

**New text:** "NOT: New structured or format validation loops (word count, sentence detection, etc.) — the only new validation added is the empty-string re-prompt for `projectContext`"

- The prior count-anchored phrasing ("beyond the existing four documented in the Error Reference") is removed. That phrasing was the source of the literal contradiction with CHANGE-12, which adds a fifth row to the Error Reference Validation Loops table (Step 1 / `projectContext` empty-or-whitespace).
- The new clause explicitly carves out the one validation that *is* added (the empty-string re-prompt), so it is consistent with:
  - AC-2.3 (re-prompt for `projectContext` only on empty/whitespace)
  - CHANGE-5 (Substep 1.1 re-prompt instruction) and CHANGE-12 (Error Reference row)
  - Edge-cases table line 70 (empty string → re-prompt, retain other fields)
  - Out-of-Scope line 88 ("Format validation of `projectContext` beyond requiring a non-empty value") and line 91 Deferred (structured validation)
- **Verdict: contradiction removed. No residual inconsistency.**

### Fix 2 — Prose-token spot-check (04-ROADMAP.md line 115)

**New checklist item (Slice 1 "Done When"):** "**Prose-token spot-check (mandatory):** Open the edited `.claude/commands/new-project.md` and read Substep 4.2. Confirm that the prose token `<One paragraph: what does this project own, what stack layer is it, how does it relate to the broader system.>` does not appear anywhere in the file. If the token is still present, CHANGE-7 was not applied correctly — send back to @code-executor before Slice 2 begins."

- **Placement:** Inside the Slice 1 "Done When (Slice 1 exit criteria)" block, immediately before the final Frank-gate item (line 116). Correct section and correct position — it gates Slice 2 entry.
- **Correctness of mechanism:** This is the right safety net. The `projectContext` token is a prose string, not `<ALL-CAPS-WITH-HYPHENS>`, so Substep 4.3's zero-placeholder check does not cover it (confirmed against live skill line 310 and 02 CHANGE-7). An explicit human/Frank-readable spot-check is the appropriate compensating control. It complements — does not modify — Substep 4.3, consistent with the scope constraint that 4.3 is untouched.
- The exact token string in the spot-check matches the token resolved by the architect (02 line 35 / CHANGE-7) and the live template reference (per 02 "Resolved" section). Consistent across 01, 02, and 04.
- **Verdict: present, correctly placed, mechanically sound.**

---

## New-Gap Sweep (post-edit)

Both edits are additive (Fix 2) or reword-only (Fix 1). Full re-cross-check performed:

- **01 internal consistency:** Out-of-Scope (lines 82–91), Constraints (97–106), AC set, and Edge Cases are mutually consistent after the reword. No new contradiction.
- **01 ↔ 02 ↔ 04 traceability:** All 12 changes (CHANGE-1..12) remain mapped to the correct slice (Slice 1 = 7 Fix B, Slice 2 = 5 Fix A). The verbatim "before" anchors verified in the initial pass are unaffected by these doc-only edits. No change orphaned or duplicated.
- **04 Slice 1 Done-When integrity:** Adding the spot-check item did not displace or alter any other exit-criterion item; the Frank-gate item remains last. PROGRESS.md template (04 lines 244–281) is unaffected (the spot-check is an exit-criterion check, not a numbered CHANGE, so no PROGRESS row is required).
- **Minor observation (non-blocking, not a gap):** The Fix-1 clause says "the only new validation added is the empty-string re-prompt." The Fix A DDR-index existence pre-check (CHANGE-9) is also technically a new check, but it is an error-handling HALT pre-check documented under Error Reference → Halt Conditions, not an input "validation loop." The line's scope ("validation loops") makes this unambiguous in context. No action required.

**No new gaps introduced.**

---

## Requirements → Architecture Coverage (re-confirmed)

| AC | Architecture coverage | Status |
|---|---|---|
| AC-1.1 | CHANGE-10 (4-path git add) | ✅ |
| AC-1.2 | unchanged git status block | ✅ |
| AC-1.3 | AC-1.1 + AC-1.2 emergent | ✅ |
| AC-1.5 | CHANGE-9 (pre-check HALT) + CHANGE-11 | ✅ (mechanism accepted — Gap-2 closed) |
| AC-1.4 | CHANGE-1 (4-item pattern + variable note) | ✅ |
| AC-2.1 | CHANGE-4 (5th bullet) | ✅ |
| AC-2.2 | CHANGE-6 (6th confirmation row) | ✅ |
| AC-2.3 | CHANGE-5 + CHANGE-12 | ✅ (Gap-1 reworded — no contradiction) |
| AC-2.4 | CHANGE-7 (substitution row) | ✅ |
| AC-2.5 | CHANGE-7 (pre/post checks) + unchanged 4.3 + Slice 1 spot-check | ✅ |
| AC-2.6 | CHANGE-2 (Variable Inputs row) | ✅ |
| AC-2.7 | CHANGE-7 (token pre-confirmed; impl-time verify) | ✅ |

Every acceptance criterion remains addressed.

---

## Scope Conformance (DDR-009 §3.3) — unchanged

Single target file (`.claude/commands/new-project.md`); no `~/runtime/agent-lore/` writes; 13 steps not reordered; no new fixed decisions beyond CHANGE-1; Substep 4.3 untouched. Fully conformant. The doc-only edits in this pass do not affect scope.

---

## Gaps / Inconsistencies (current)

| ID | Gap | Severity | Status |
|---|---|---|---|
| Gap-1 | 01 Out-of-Scope contradicted AC-2.3 / CHANGE-12 | Low | **RESOLVED** — line 87 reworded; no count anchor; carve-out matches CHANGE-12 |
| Gap-2 | AC-1.5 literal "git add returns non-zero" vs `ls` pre-check HALT | Low | **ACCEPTED** — pre-check is an improvement; AC intent (halt + surface on missing DDR index) fully satisfied; no contradiction blocks forge |
| Gap-3 | "token unknown at spec time" framing drift | Low | **NO ACTION** — reconciled; verification-not-discovery is correct per DDR-009 §4 Risk A |

**No open gaps. No critical gaps. No fundamental inconsistencies. No HALT.**

---

## Identified Risks (carry-forward — unchanged by this pass)

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| HOMELAB template changes before forge, moving/altering the projectContext token | L | H | CHANGE-7 pre-check + 04 Sequence Rule 6 HALT-if-absent; verification read mandatory before any Slice 1 edit |
| CHANGE-7 misapplied, leaving the prose token in the file | L | M | **NEW: Slice 1 prose-token spot-check (04 line 115)** + Frank gate Slice 1 |
| CHANGE-9 nested ```bash fence authored incorrectly, breaking Markdown | L | M | Frank gate Slice 2 + 02 verification checklist |
| `git status` verification block altered during CHANGE-10 | L | M | 02 + 04 both flag "must remain intact"; checklist item confirms |
| Multi-line `projectContext` renders awkwardly in Substep 1.4 confirmation block | M | L | Cosmetic only; edge-cases table accepts multi-line verbatim |

---

## Assumptions (unchanged)

| Assumption | Impact if Wrong |
|---|---|
| Live `HOMELAB-CLAUDE.md.template` projectContext token matches the architect's 2026-06-20 capture exactly | CHANGE-7 pre-check HALTs Slice 1 (mitigated, not silent) |
| Substep 1.1 empty-string re-prompt guarantees non-empty `projectContext` before Substep 1.4 | If Danny could blank at 1.4, AC-2.3's "1.1 or 1.4" wording would need gate-side handling; current design relies on 1.1 — acceptable |
| `cp` to `~/.claude/commands/new-project.md` is the correct propagation path | Install Done-When spot-check mitigates |

---

## Approval Checklist

### Requirements (01)
- [x] Out-of-Scope line 87 reconciled with AC-2.3 / CHANGE-12 (Gap-1 RESOLVED — reviewer verified)
- [ ] Reviewed by human
- [ ] Acceptance criteria are testable (all 12 ACs observable against the edited file — reviewer: ✅)

### Architecture (02)
- [ ] Reviewed by human
- [x] All 12 "before" anchors confirmed against live skill (reviewer: ✅, unchanged this pass)
- [x] projectContext token treatment accepted (Gap-3)

### Roadmap (04)
- [ ] Reviewed by human
- [x] Slice mapping (7 + 5 = 12) and CHANGE-8→CHANGE-9 ordering confirmed (reviewer: ✅)
- [x] Slice 1 prose-token spot-check present and correctly placed (reviewer: ✅)
- [x] Install step sequencing after Slice 2 gate confirmed (reviewer: ✅)

### UI Spec (03)
- [x] N/A — no user-facing surface; intentionally absent

### Overall
- [x] Gap-1 resolved; Gap-2 accepted; Gap-3 no action
- [x] All risks have mitigations (reviewer: ✅)
- [x] Ready for forge phase

---

## Verdict

**APPROVED.** Both applied fixes are verified: Gap-1's contradiction is removed in 01 line 87 (the reword carves out the single new `projectContext` empty-string validation, eliminating the conflict with AC-2.3 / CHANGE-12), and the mandatory prose-token spot-check is present and correctly placed in 04 Slice 1 "Done When," immediately before the Frank gate. Gap-2 is confirmed accepted (the `ls` pre-check is an improvement over the AC's literal mechanism, with intent fully preserved), and Gap-3 requires no action. No new gaps were introduced by either edit. The four-document set is internally consistent, fully traceable, scope-conformant with DDR-009, and unambiguous for a code-executor on every change.

**Status: COMPLETE. Spec set is clean and ready for forge.**
