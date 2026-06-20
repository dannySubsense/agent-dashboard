# Spec Review: /new-project Slash Command (bootstrap-skill-v1)

- **Status:** COMPLETE — no blocking gaps
- **Reviewer:** lumen (spec-reviewer)
- **Date:** 2026-06-20
- **Source DDR:** DDR-001 (ACCEPTED)
- **Documents reviewed:** 01-REQUIREMENTS, 02-ARCHITECTURE, 04-ROADMAP, DDR-001
- **Note:** No 03-UI-SPEC.md — correct for a slash-command sprint (no UI layer). Absence not flagged.

---

## Verdict

The spec set is internally consistent and faithful to DDR-001. All 13 canonical DDR
steps are traceable through requirements, architecture, and roadmap. **Zero blocking
gaps.** Four non-blocking gaps and four risks are documented below for human attention
before approval. The single most important item is **Risk A** (template placeholder maps
are unvalidated against the actual agent-lore template files).

---

## Traceability: DDR-001 §3.2 → Requirements → Architecture → Roadmap

| DDR Step | Requirement | Architecture | Roadmap | Status |
|---|---|---|---|---|
| 1 Gather inputs | US-01 | §5 Step 1, §4.1 | Slice 3 | OK |
| 2 Vision quest | US-02, US-03 | §5 Step 2, §6.1, §4.2 | Slice 3 | OK (split into 2 US) |
| 3 Register with Cairn | US-04 | §5 Step 3, §4.3, §6.2 | Slice 3 | OK |
| 4 CLAUDE.md | US-05 | §5 Step 4, §4.5 | Slice 3 | OK |
| 5 Relay skill | US-06 | §5 Step 5, §4.5 | Slice 3 | OK |
| 6 MACHINE-SETUP.md | US-07 | §5 Step 6, §4.5 | Slice 3 | OK (see Gap B) |
| 7 .gitignore | US-08 | §5 Step 7 | Slice 4 | OK |
| 8 git init | US-09 | §5 Step 8 | Slice 4 | OK |
| 9 GitHub repo | US-10 | §5 Step 9 | Slice 4 | OK |
| 10 Remote | US-11 | §5 Step 10 | Slice 4 | OK |
| 11 DDR directory | US-12 | §5 Step 11 | Slice 5 | OK |
| 12 Initial commit | US-13 | §5 Step 12 | Slice 5 | OK |
| 13 LORE capture | US-14 | §5 Step 13, §4.4, §6.3 | Slice 5 | OK |
| (added) Pre-flight | — (Assumptions only) | §5 Pre-flight, §7 | Slice 2 | See Gap D |

All 13 DDR steps fully covered. Pre-flight validation is an architecture-level addition
derived from DDR §5 Risks; it does not reorder the 13 canonical steps (it is interstitial
between Step 1 and Step 2), so it does not violate the "no reordering" constraint.

---

## Requirements → Architecture Coverage

Every user story (US-01 through US-14) maps to an architecture section per the §11
coverage table; spot-verified each mapping against §5 step content. All 14 covered.

## Architecture → Roadmap Coverage

| Architecture element | Slice | Status |
|---|---|---|
| Frontmatter / preamble / fixed-decision table / variable inputs | Slice 1 | OK |
| Pre-flight validation (§5, §7) | Slice 2 | OK |
| Steps 1–6 (§5) + data structures §4.1–4.3, §4.5 | Slice 3 | OK |
| Steps 7–10 (§5) | Slice 4 | OK |
| Steps 11–13 (§5) + Error Reference (§7) + §4.4 | Slice 5 | OK |
| Deployment / install / regression (§9) | Slice 6 | OK |

No orphaned architecture components. No circular dependencies (linear Slice 1→6).
Each slice has concrete file paths and a testable "Done When" checklist.

---

## Gaps

| # | Gap | Source doc | Severity | Recommended fix |
|---|-----|-----------|----------|-----------------|
| B | DDR §3.5 says new projects adapt MACHINE-SETUP.md "repo table, env vars, dev server commands"; architecture §4.5 defines only `<REPO-NAME>` and `<PROJECT-NAME>` placeholders. The env-vars/dev-server adaptation is unaddressed. | 02 vs DDR | Non-blocking | State explicitly that env-vars/dev-server sections are left as template defaults at bootstrap (stack is out of scope for v1) and adapted in the project's first sprint. Reconciles intentional scope reduction. |
| D | Pre-flight HALT checks (git missing, gh not authed, LORE unreachable) are new runtime behavior with no corresponding user story or acceptance criteria in 01; they appear only as Assumptions. | 01 | Non-blocking | Back-fill a brief US (or acceptance block) for pre-flight so the behavior is testable from requirements, not just architecture. |
| E | US-14 acceptance criteria omit `epistemicType`, but architecture §4.4/§8 and roadmap Slice 5 mandate `epistemicType: "FACT"`. | 01 | Non-blocking | Add `epistemicType=FACT` to US-14 acceptance criteria for full alignment. Architecture already covers it, so implementation is unaffected. |
| G | Roadmap Slice 2 "Done When" says "All 4 checks" while its implementation notes add a 5th (Switchboard NOTE). | 04 | Non-blocking (trivial) | Reword Done-When to "4 HALT/WARN checks + 1 NOTE" for precision. |

**No blocking gaps.** A @code-executor has everything needed to author the command file:
exact tool calls, exact commands, exact HALT/SURFACE messages, placeholder maps, fixed
values, and per-slice acceptance gates are all present.

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **A.** Placeholder maps (§4.5) are assumed to match the real `HOMELAB-CLAUDE.md.template` and `MACHINE-SETUP.md.template`, which live in `~/runtime/agent-lore/` (owned by agent-lore, not inspectable from this repo). If the real templates use different or additional placeholder tokens, the zero-placeholder post-condition in Steps 4/6 will halt or emit broken output. | M | H | During implementation, read both templates and reconcile the §4.5 maps against their actual tokens before finalizing Steps 4/6. Treat the placeholder inventory as the source of truth. |
| **B.** `gh repo create` / push depend on gh CLI being authenticated as `dannySubsense` and the `github.com-danny` SSH alias being present. Pre-flight catches both (HALT / WARN), reducing blast radius. | M | M | Pre-flight checks already mitigate; ensure WARN-on-missing-SSH-alias is honored before Step 12. |
| **C.** `host: "vm101"`, `status: "active"`, `role: "producer"` are hardcoded in §4.3 but absent from the Fixed Decision Table §8. `host=vm101` assumes every bootstrapped project runs on VM 101. | L | L | Either add these three to the Fixed Decision Table, or derive `host` at runtime. Low impact for current homelab. |
| **D.** ProjectId collision check (Step 1.5) uses semantic `search_knowledge`, which is not an exact-match query; a true projectId collision could score below threshold and go undetected. | M | L | Acceptable for v1 (warn-only). Consider an exact-match check in a future version. Document as best-effort. |

---

## Assumptions (inherited from 01, validated as reasonable)

| Assumption | Impact if wrong |
|------------|-----------------|
| Both templates exist and are current at `~/runtime/agent-lore/` | Steps 4/6 HALT (handled explicitly) |
| gh CLI installed + authed as dannySubsense | Pre-flight HALT (handled) |
| lore-gateway MCP available in session | Pre-flight HALT (handled) |
| `github.com-danny` SSH alias configured | Pre-flight WARN; Step 12 push HALT (handled) |
| Switchboard relay reachable for Cairn | Non-blocking; registration deferred (handled) |
| `~/.gitconfig` owned by another identity (Major Tom) | Per-repo git config prohibition protects it (handled) |
| Templates use exactly the §4.5 placeholder tokens | See Risk A — the one assumption not yet validated |

---

## DDR Fidelity

Faithful. No scope creep: stack init, CI/CD, GitHub issue creation, Tailscale config,
template authoring, direct registry writes, and per-project install are all correctly
listed as out-of-scope/deferred — matching DDR §6.3 and §5. All fixed decisions (§3.3)
and variable inputs (§3.4) are reproduced verbatim. Two principled additions, both
defensible: (1) Pre-flight validation gate derived from DDR §5 Risks; (2) the
HOMELAB-CLAUDE.md.template reference-copy step in Step 4, required to satisfy DDR Step 12's
staged-files list. One reduction to note: MACHINE-SETUP.md adaptation narrowed from DDR
§3.5's three section types to two placeholders (Gap B).

---

## Open Questions

| Question | Status | For |
|----------|--------|-----|
| Do the real agent-lore templates use exactly the §4.5 placeholder tokens (Risk A)? | Open | Resolve at implementation by reading the templates |
| Is the MACHINE-SETUP env-vars/dev-server reduction (Gap B) intentional for v1? | Open | Composer / Lumen — confirm and document |
| Should `host`/`status`/`role` be promoted to the Fixed Decision Table (Risk C)? | Open | Composer — optional polish |

None of these block authoring the command file; all can be resolved during or just
before Frank's gate.

---

## Approval Checklist

### Requirements (01)
- [ ] Human-reviewed
- [ ] Acceptance criteria are testable (they are — Given/When/Then throughout)
- [ ] Decide on Gap D (pre-flight US) and Gap E (epistemicType in US-14)

### Architecture (02)
- [ ] Human-reviewed
- [ ] Confirm §4.5 placeholder maps against real templates (Risk A) — highest priority
- [ ] Decide on Risk C (host/status/role placement)

### Roadmap (04)
- [ ] Human-reviewed
- [ ] Slice sequencing correct (linear 1→6, verified)
- [ ] Fix Gap G wording (trivial)

### Overall
- [ ] Risk A has a concrete mitigation owner before /forge-start
- [ ] Open questions triaged
- [ ] Ready for Frank gate (/senior-qc)

---

## Summary

This is a high-quality, implementation-ready spec set. Cross-document consistency is
strong: error rules (HALT vs SURFACE vs validation-loop), step numbering, template paths,
fixed values, Cairn payload fields, and LORE capture fields all agree across 01/02/04.
Zero blocking gaps. The only finding that warrants action before implementation is
Risk A — validate the template placeholder inventory against the live agent-lore
templates. Everything else is polish.
