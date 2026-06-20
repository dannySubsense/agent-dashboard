# Roadmap: bootstrap-skill-v1-1

**Sprint:** bootstrap-skill-v1-1
**DDR:** DDR-009-bootstrap-skill-v1-1-fixes.md
**Author:** planner
**Date:** 2026-06-20
**Target file:** `.claude/commands/new-project.md`

---

## Summary

Two-slice modification sprint. The single artifact is `.claude/commands/new-project.md`. No application code, tests, or UI. The implementation agent applies 12 discrete edits to one Markdown file in numeric change-ID order within each slice. A Frank gate (`/senior-qc`) is required between slices before work on the next slice begins.

---

## Slice Overview

| Slice | Fix Set | Changes | Depends On | Gate |
|---|---|---|---|---|
| 1 | Fix B — Input Gathering + CLAUDE.md Generation | CHANGE-2, 3, 4, 5, 6, 7, 12 | — | Frank gate before Slice 2 |
| 2 | Fix A — Step 12 + Fixed Decision Table | CHANGE-1, 8, 9, 10, 11 | Slice 1 Frank-cleared | Frank gate before install |
| Install | Copy to global command location | — | Slice 2 Frank-cleared | — |

---

## Dependency Map

| Unit | Depends On |
|---|---|
| Slice 1 — CHANGE-2, 3, 4, 5, 6, 7, 12 | — (Fix B sections are independent of Fix A sections) |
| Slice 2 — CHANGE-1, 8, 9, 10, 11 | Slice 1 Frank gate cleared |
| Installation step | Slice 2 Frank gate cleared and changes committed |

No circular dependencies detected.

---

## Slice 1 — Fix B: Input Gathering and CLAUDE.md Generation

**Goal:** Apply all 7 Fix B changes to `.claude/commands/new-project.md`, adding `projectContext` as the fifth Danny-supplied input field, threading it through the Step 1 confirmation gate, adding its substitution row to Substep 4.2, and adding the projectContext safety checks and validation loop entry.

**Depends On:** —

**Files:**
- `.claude/commands/new-project.md` — modify (7 changes)

### Change Sequence (apply in this order)

**CHANGE-2 — Variable Inputs table**

Insert the `projectContext` Danny-supplied row immediately before the `repoName` derived row. After this change the table has seven rows; `projectContext` is fifth, `repoName` is sixth.

**CHANGE-3 — Step 1 intro paragraph**

Locate the sentence beginning "Prompt Danny for the four InputBundle fields..." and change "four" to "five".

**CHANGE-4 — Substep 1.1 bullet list**

Add `projectContext` as a fifth bullet after the `visibility` bullet:

```
- `projectContext` — one paragraph describing what this project owns, builds, or solves; passed verbatim into the HOMELAB-CLAUDE.md.template project context placeholder
```

**CHANGE-5 — Substep 1.1 empty-string re-prompt**

Append the following paragraph immediately after the bullet list modified in CHANGE-4, before the `### Substep 1.2` heading:

```
If Danny provides an empty string or whitespace-only value for `projectContext`, re-prompt for `projectContext` only. All other previously collected fields are retained. Repeat until a non-empty value is provided.
```

**CHANGE-6 — Substep 1.4 confirmation gate**

Locate the fenced code block under "Present the complete InputBundle to Danny:". Add `projectContext: <value>` as a sixth row after `visibility: <value>`. The surrounding sentence and fence markers are unchanged.

**CHANGE-7 — Substep 4.2 substitution table and implementation note**

Pre-implementation requirement: Read `~/runtime/agent-lore/HOMELAB-CLAUDE.md.template` and confirm the exact token `<One paragraph: what does this project own, what stack layer is it, how does it relate to the broader system.>` is present. The architect confirmed this token on 2026-06-20 (line 50 of the template) — this read is a verification step, not discovery. If the token is absent, HALT: `projectContext placeholder token not found in HOMELAB-CLAUDE.md.template. Template may have changed. Verify token and update Substep 4.2 before proceeding.`

After confirming the token:

1. Add a fifth row to the substitution table in Substep 4.2:

   | `<One paragraph: what does this project own, what stack layer is it, how does it relate to the broader system.>` | `InputBundle.projectContext` |

2. Append the implementation note immediately after the table (verbatim from CHANGE-7 in 02-ARCHITECTURE.md), documenting the pre-substitution existence check, the post-substitution absence check, and the fact that Substep 4.3's `<ALL-CAPS-WITH-HYPHENS>` regex does not cover this token.

**CHANGE-12 — Error Reference Validation Loops**

Locate the row for `visibility is not 'public' or 'private'`. Insert the following row immediately after it:

```
| Step 1 | `projectContext` is empty or whitespace-only | Re-prompt for `projectContext` only. All previously collected fields retained. |
```

### Implementation Notes

- Changes must be applied in the order listed above (CHANGE-2 through CHANGE-12 Fix B IDs).
- Steps 2, 3, 5, 6, 7, 8, 9, 10, 11, 13, all Pre-flight checks, and Substep 4.3 must remain unmodified.
- CHANGE-7's implementation note is the safety gate for the projectContext token. Substep 4.3 (zero `<ALL-CAPS-WITH-HYPHENS>` check) does not cover this token by design — do not modify Substep 4.3.

### Done When (Slice 1 exit criteria)

- [ ] Variable Inputs table has `projectContext` as a Danny-supplied row positioned immediately before `repoName`
- [ ] Step 1 intro paragraph says "five InputBundle fields"
- [ ] Substep 1.1 bullet list has five bullets; `projectContext` is the fifth
- [ ] Substep 1.1 has empty-string re-prompt instruction immediately after the bullet list, before the `### Substep 1.2` heading
- [ ] Substep 1.4 confirmation gate fenced code block has six rows; `projectContext: <value>` is the sixth
- [ ] Substep 4.2 substitution table has five rows; the `projectContext` row uses the exact literal token string specified in CHANGE-7
- [ ] Substep 4.2 implementation note appears after the table, documents both pre/post existence checks, and notes Substep 4.3 non-coverage
- [ ] Error Reference Validation Loops has the `projectContext` empty-string entry immediately after the `visibility` entry
- [ ] Steps 2, 3, 5, 6, 7, 8, 9, 10, 11, 13, Pre-flight checks, and Substep 4.3 are unmodified
- [ ] **Prose-token spot-check (mandatory):** Open the edited `.claude/commands/new-project.md` and read Substep 4.2. Confirm that the prose token `<One paragraph: what does this project own, what stack layer is it, how does it relate to the broader system.>` does not appear anywhere in the file. If the token is still present, CHANGE-7 was not applied correctly — send back to @code-executor before Slice 2 begins.
- [ ] Frank gate (`/senior-qc`) run and cleared

**GATE: Run `/senior-qc` on Slice 1 changes. Slice 2 is blocked until Frank clears this gate.**

---

## Slice 2 — Fix A: Step 12 and Fixed Decision Table

**Goal:** Apply all 5 Fix A changes to `.claude/commands/new-project.md`, adding the DDR index file to the bootstrap commit's staged file set and inserting an existence pre-check before `git add`.

**Depends On:** Slice 1 Frank gate cleared

**Files:**
- `.claude/commands/new-project.md` — modify (5 changes)

### Change Sequence (apply in this order)

**CHANGE-1 — Fixed Decision Table: Bootstrap staged files row**

Locate the row whose first cell is `Bootstrap staged files`. Replace the three-item value with a four-item value that includes `docs/specs/<InputBundle.projectId>-ddrs/00-DDR-INDEX.md` and documents the `<InputBundle.projectId>` variable note (verbatim from CHANGE-1 in 02-ARCHITECTURE.md).

**CHANGE-8 — Step 12 preamble sentence**

Locate the sentence immediately before the `git add` bash block in Step 12. Change "three items" to "four items".

**CHANGE-9 — Step 12 DDR index existence pre-check**

Insert the following block at the very beginning of Step 12's body, before the preamble sentence updated in CHANGE-8:

```
Before staging, verify that the DDR index file created in Step 11 exists:

```bash
ls docs/specs/<InputBundle.projectId>-ddrs/00-DDR-INDEX.md
```

**HALT if the file does not exist:** `DDR index file not found at docs/specs/<InputBundle.projectId>-ddrs/00-DDR-INDEX.md. Step 11 did not complete successfully. Resolve Step 11 before proceeding.`

`<InputBundle.projectId>` in the command above is a documentation placeholder — the executing agent substitutes the confirmed `projectId` value before running this command.
```

**CHANGE-10 — Step 12 git add command**

Locate the bash block containing the `git add` command. Add the DDR index path as the fourth argument:

```bash
git add .gitignore HOMELAB-CLAUDE.md.template .claude/commands/relay.md docs/specs/<InputBundle.projectId>-ddrs/00-DDR-INDEX.md
```

The `git status` verification block that follows (checking CLAUDE.md and MACHINE-SETUP.md exclusion) must remain intact and unchanged.

**CHANGE-11 — Error Reference Halt Conditions: Step 12 DDR index missing entry**

Locate the row whose Step column is `Step 12` and Condition column contains `git push fails`. Insert the following row immediately before it:

```
| Step 12 | DDR index file not found before git add | `DDR index file not found at docs/specs/<InputBundle.projectId>-ddrs/00-DDR-INDEX.md. Step 11 did not complete successfully. Resolve Step 11 before proceeding.` |
```

### Implementation Notes

- Apply changes in the order listed (CHANGE-1, 8, 9, 10, 11).
- CHANGE-1 documents the DDR index path as a pattern with `<InputBundle.projectId>` — not a literal string — because the path is resolved at runtime from the confirmed `projectId` value.
- CHANGE-9 positions the pre-check before the preamble sentence. Apply CHANGE-8 first to update the sentence to "four items", then insert the CHANGE-9 block before it. This produces the correct ordering: pre-check block → "Stage exactly these four items" sentence → git add block.
- The `git status` verification block following `git add` must survive unchanged. Verify it is intact after CHANGE-10.
- No new Fixed Decision Table rows are introduced beyond CHANGE-1.

### Done When (Slice 2 exit criteria)

- [ ] Fixed Decision Table "Bootstrap staged files" row lists four items and includes the `<InputBundle.projectId>` variable note
- [ ] Step 12 opens with the DDR index existence pre-check (ls command + HALT block) before any staging instruction
- [ ] Step 12 preamble says "Stage exactly these four items"
- [ ] Step 12 `git add` command contains four paths
- [ ] Step 12 `git status` verification block (CLAUDE.md/MACHINE-SETUP.md exclusion) is intact and unchanged
- [ ] Error Reference Halt Conditions has the Step 12 DDR index missing entry positioned immediately before the Step 12 push-failure entry
- [ ] Step count remains 13; step numbering and ordering unchanged
- [ ] No new Fixed Decision Table rows exist beyond CHANGE-1
- [ ] Slice 1 changes verified still intact — no regressions
- [ ] Full Implementation Agent Verification Checklist from 02-ARCHITECTURE.md passes
- [ ] Frank gate (`/senior-qc`) run and cleared on the full file

**GATE: Run `/senior-qc` on the full updated file (both slices). Installation is blocked until Frank clears this gate.**

---

## Installation Step

**Goal:** Propagate the updated skill to the global Claude Code command location so the live `/new-project` command reflects v1.1 changes.

**Depends On:** Slice 2 Frank gate cleared and changes committed

**Command:**
```bash
cp /home/d-tuned/projects/agent-dashboard/.claude/commands/new-project.md ~/.claude/commands/new-project.md
```

**Done When:**
- [ ] `~/.claude/commands/new-project.md` reflects Slice 1 + Slice 2 changes (spot-check: "five InputBundle fields" in Step 1 intro; four-path `git add` in Step 12; DDR index pre-check present in Step 12)
- [ ] Live `/new-project` command is v1.1

---

## Sequence Rules

1. Complete each slice fully before starting the next.
2. Frank gate must clear before the next slice or the installation step begins.
3. If the implementation agent is blocked on any single change, HALT immediately — do not skip ahead or apply changes out of numeric order within a slice.
4. Only `.claude/commands/new-project.md` is modified during forge phase. No other files in this repo are touched.
5. No files in `~/runtime/agent-lore/` are written, moved, or deleted. The template is read-only.
6. If CHANGE-7's pre-implementation template read reveals the token is absent, HALT before any Slice 1 changes are applied and report to Lumen.

---

## Deferred (Not This Sprint)

- Structured validation of `projectContext` (word count minimum, sentence detection, structural checks)
- Any modification to Steps 2, 3, 5, 6, 7, 8, 9, 10, 11, or 13
- New fixed decisions beyond CHANGE-1
- Changes to Pre-flight checks
- Changes to Step 13 `capture_memory` content narrative
- Changes to Substep 4.3 zero-placeholder verification logic

---

## PROGRESS.md

Create `docs/specs/bootstrap-skill-v1-1/PROGRESS.md` with the following initial content. Update each task in-place as forge work completes.

```markdown
# PROGRESS.md — bootstrap-skill-v1-1

**Sprint:** bootstrap-skill-v1-1
**Target file:** `.claude/commands/new-project.md`
**Status:** NOT STARTED

---

## Slice 1 — Fix B: Input Gathering and CLAUDE.md Generation

- [ ] Pre-step: Read `~/runtime/agent-lore/HOMELAB-CLAUDE.md.template` and confirm projectContext token exists
- [ ] CHANGE-2: Variable Inputs — `projectContext` row inserted before `repoName`
- [ ] CHANGE-3: Step 1 intro — "five InputBundle fields"
- [ ] CHANGE-4: Substep 1.1 — fifth bullet (`projectContext`) added
- [ ] CHANGE-5: Substep 1.1 — empty-string re-prompt instruction added after bullet list
- [ ] CHANGE-6: Substep 1.4 — `projectContext` row added as sixth row in confirmation gate
- [ ] CHANGE-7: Substep 4.2 — `projectContext` substitution row + implementation note added
- [ ] CHANGE-12: Error Reference Validation Loops — `projectContext` entry added after `visibility` entry
- [ ] Slice 1 verification checklist passed
- [ ] Frank gate (Slice 1) — PENDING

## Slice 2 — Fix A: Step 12 and Fixed Decision Table

- [ ] CHANGE-1: Fixed Decision Table — "Bootstrap staged files" updated to four items with variable note
- [ ] CHANGE-8: Step 12 preamble — "four items"
- [ ] CHANGE-9: Step 12 — DDR index pre-check block inserted before preamble sentence
- [ ] CHANGE-10: Step 12 — four-path `git add` command; `git status` block verified intact
- [ ] CHANGE-11: Error Reference Halt Conditions — DDR index missing entry added before push-failure entry
- [ ] Full Implementation Agent Verification Checklist from 02-ARCHITECTURE.md passed
- [ ] Slice 1 regression check passed
- [ ] Frank gate (Slice 2) — PENDING

## Installation

- [ ] `~/.claude/commands/new-project.md` updated via `cp` command
- [ ] Spot-check passed (five fields / four-path git add / DDR pre-check)
```
