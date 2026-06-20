# CADENCE.md — agent-dashboard

Workflow phases and rhythm for all Forge sessions in this project.

---

## Delivery Loop (per DDR)

```
DDR (design decision record)
  └── /spec-start → 5 spec docs + PROGRESS.md
        └── Frank gate (spec review)
              └── /forge-start → slice-by-slice implementation
                    └── Frank gate (implementation review)
                          └── PR → merge → DDR status: ACCEPTED (shipped, PR #N)
```

---

## Spec Phase Cadence

| Step | Agent | Output | Condition |
|------|-------|--------|-----------|
| 1 | @requirements-analyst | `01-REQUIREMENTS.md` | always |
| 2 | @architect | `02-ARCHITECTURE.md` | always |
| 3 | @ui-spec-writer | `03-UI-SPEC.md` | **UI sprints only** (DDRs 003–008 and any sprint with user-facing screens) |
| 4 | @planner | `04-ROADMAP.md` | always |
| 5 | @spec-reviewer | `05-REVIEW.md` | always |
| 6 | **Frank gate** | Verdict + any send-backs | always |
| 7 | **Lumen review** | Producer sign-off | always |

- Skip step 3 only when the deliverable is a slash command or CLI-only tool with no user-facing screens
- When in doubt, run step 3 — skipping it is the riskier call
- Every Frank note, warning, issue, and verdict → addressed and sent back
- No phase advance until Frank clears
- LORE capture after Frank gate passes

---

## Forge Phase Cadence

Per slice in `04-ROADMAP.md`:

```
@code-executor → @test-writer → @test-runner → @qc-agent → Frank gate → commit
```

**Frank gate frequency: per slice.** Every slice gets a Frank review before commit — not just at phase end. This is more expensive than a single end-of-phase gate and is a deliberate choice for this project. The CLAUDE.md phrase "one Frank gate per major phase" refers to the mandatory phase-level gates (spec complete, implementation complete); per-slice Frank is additive, not a contradiction.

- Any Frank note → fix and re-present (no exceptions)
- PROGRESS.md updated after every step
- LORE capture after each slice completes

---

## Session Start

1. Read `CLAUDE.md`, `docs/INVARIANTS.md`, `docs/CADENCE.md`
2. Check Switchboard inbox: `read_messages({ agent_id: "lumen" })`
3. Prime LORE: `search_knowledge({ query: "recent decisions architecture session context", projectId: "agent-dashboard", minSimilarity: 0.1 })`
4. Check `git log` to verify repo state matches LORE
5. Resume from `PROGRESS.md` if mid-sprint

---

## Session End

1. Update `PROGRESS.md` with current state
2. `lore-close` capture — session-close decision, status `locked`
3. Release any held Switchboard locks

---

## Frank Gate Protocol

- Invoke Frank (`/senior-qc`) at: spec complete, each forge slice before commit, implementation complete
- Present full context — Frank gets all docs + current state
- Every Frank note is a requirement, not a suggestion
- Send back for every: note, warning, issue, verdict, hard stop
- Frank provides final QC; Lumen provides producer sign-off after Frank clears

---

## HALT Protocol

Any agent may HALT. When a HALT occurs:

1. Stop all downstream delegation
2. Surface to Danny with exact reason and what's needed
3. Log to LORE as `documentType: "halt"`
4. Do not proceed without explicit Danny unblock

---

*Updated: 2026-06-20 | Author: lumen*
