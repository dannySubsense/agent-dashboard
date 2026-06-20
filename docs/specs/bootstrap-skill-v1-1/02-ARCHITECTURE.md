# Architecture: bootstrap-skill-v1-1

**Sprint:** bootstrap-skill-v1-1
**DDR:** DDR-009-bootstrap-skill-v1-1-fixes.md
**Author:** architect
**Date:** 2026-06-20
**Target file:** `.claude/commands/new-project.md`

---

## Overview

This document specifies exact edits to `.claude/commands/new-project.md` to close two correctness gaps identified in DDR-009. There is no application code, database schema, API, or UI. The artifact is a procedural Markdown document read and executed by a Claude Code agent.

Two fix sets, 12 discrete changes:

- **Fix A (5 changes):** Stage the DDR index file created in Step 11 in Step 12's bootstrap commit.
- **Fix B (7 changes):** Collect `projectContext` from Danny at Step 1, surface it in the confirmation gate, thread it into the Step 4 HOMELAB-CLAUDE.md.template substitution.

---

## Target File

Single file modified: `.claude/commands/new-project.md`

No other files in this repo or in `~/runtime/agent-lore/` are written, moved, or deleted by this sprint.

---

## Resolved: projectContext Placeholder Token

The HOMELAB-CLAUDE.md.template at `~/runtime/agent-lore/HOMELAB-CLAUDE.md.template` was read during architecture. The placeholder token for project context is confirmed as the following exact string (located in the `## Project Context` section, line 50 of the template as of 2026-06-20):

```
<One paragraph: what does this project own, what stack layer is it, how does it relate to the broader system.>
```

This is NOT a `<ALL-CAPS-WITH-HYPHENS>` pattern. Substep 4.3's zero-placeholder verification regex does not match it. The safety gate for the projectContext substitution is therefore distinct from the gates used for `<PROJECT-NAME>`, `<AGENT-NAME>`, `<REPO-NAME>`, and `<PROJECT-ID>`. Details in CHANGE-7 below.

DDR-009 §4 Risk A ("token unknown at spec time") is resolved. The implementation agent does not need to read the template to discover the token — it is specified here. The implementation agent must still verify the token exists in the Substep 4.1 read output before running the substitution (per the pre-check in CHANGE-7).

---

## Change Inventory

| ID | Section | Description | Fix |
|---|---|---|---|
| CHANGE-1 | Fixed Decision Table | Update "Bootstrap staged files" row to list four items | A |
| CHANGE-2 | Variable Inputs | Add `projectContext` Danny-supplied row | B |
| CHANGE-3 | Step 1 intro | "four InputBundle fields" → "five InputBundle fields" | B |
| CHANGE-4 | Substep 1.1 | Add `projectContext` bullet to prompt list | B |
| CHANGE-5 | Substep 1.1 | Add empty-string re-prompt instruction for `projectContext` | B |
| CHANGE-6 | Substep 1.4 | Add `projectContext` row to confirmation gate display block | B |
| CHANGE-7 | Substep 4.2 | Add `projectContext` substitution row and pre/post existence checks | B |
| CHANGE-8 | Step 12 preamble | "three items" → "four items" | A |
| CHANGE-9 | Step 12 | Add DDR index existence pre-check with HALT before git add | A |
| CHANGE-10 | Step 12 | Add DDR index path to git add command | A |
| CHANGE-11 | Error Reference — Halt Conditions | Add Step 12 DDR index missing entry | A |
| CHANGE-12 | Error Reference — Validation Loops | Add projectContext empty-string re-prompt entry | B |

---

## Detailed Change Specifications

Each change specifies: section heading path to locate the text, verbatim before content, verbatim after content. Make changes in ID order. Do not reorder sections, steps, or substeps.

---

### CHANGE-1 — Fixed Decision Table: Bootstrap staged files row

**Section path:** `## Fixed Decision Table`

**Locate:** The row whose first cell is `Bootstrap staged files`.

**Before:**
```
| Bootstrap staged files | `.gitignore`, `HOMELAB-CLAUDE.md.template`, `.claude/commands/relay.md` |
```

**After:**
```
| Bootstrap staged files | `.gitignore`, `HOMELAB-CLAUDE.md.template`, `.claude/commands/relay.md`, `docs/specs/<InputBundle.projectId>-ddrs/00-DDR-INDEX.md` (path is variable — `<InputBundle.projectId>` is resolved at runtime) |
```

---

### CHANGE-2 — Variable Inputs: add projectContext row

**Section path:** `## Variable Inputs`

**Locate:** The row whose first cell is `` `repoName` `` (the derived row).

**Insert the following row immediately before the `repoName` row:**
```
| `projectContext` | One paragraph: what does this project own, build, or solve? Passed verbatim into the HOMELAB-CLAUDE.md.template project context placeholder. |
```

**Full Variable Inputs table after this change (for verification):**

```
| Field | Format constraint |
|---|---|
| `projectName` | Human-readable display name, e.g. `"Agent Dashboard"` |
| `projectId` | Kebab-case; must match `/^[a-z][a-z0-9-]+[a-z0-9]$/`; becomes LORE `projectId` and DDR path prefix |
| `repoDescription` | One sentence; passed verbatim to `gh repo create --description` |
| `visibility` | Exactly `public` or `private` — no other values accepted |
| `projectContext` | One paragraph: what does this project own, build, or solve? Passed verbatim into the HOMELAB-CLAUDE.md.template project context placeholder. |
| `repoName` | Derived: equals `projectId` — the GitHub repository name under `dannySubsense/`. Not collected from Danny. |
| `agentName` | Declared by the executing agent during Step 2 (vision quest) — NOT collected from Danny upfront; agent proposes, Danny confirms |
```

---

### CHANGE-3 — Step 1 intro: "four" → "five"

**Section path:** `## Step 1 — Input Gathering` (opening paragraph, before Substep 1.1)

**Before:**
```
Prompt Danny for the four InputBundle fields, validate each, confirm the bundle, and run a LORE collision check. No files are written and no commands run during this step.
```

**After:**
```
Prompt Danny for the five InputBundle fields, validate each, confirm the bundle, and run a LORE collision check. No files are written and no commands run during this step.
```

---

### CHANGE-4 — Substep 1.1: add projectContext to prompt list

**Section path:** `## Step 1 — Input Gathering` → `### Substep 1.1 — Prompt for fields`

**Before (the full bullet list under Substep 1.1):**
```
- `projectName` — human-readable display name (e.g. `"Agent Dashboard"`)
- `projectId` — kebab-case identifier (e.g. `"agent-dashboard"`); becomes the LORE `projectId` and DDR path prefix
- `repoDescription` — one sentence; passed verbatim to `gh repo create --description`
- `visibility` — exactly `public` or `private`
```

**After (fifth bullet added):**
```
- `projectName` — human-readable display name (e.g. `"Agent Dashboard"`)
- `projectId` — kebab-case identifier (e.g. `"agent-dashboard"`); becomes the LORE `projectId` and DDR path prefix
- `repoDescription` — one sentence; passed verbatim to `gh repo create --description`
- `visibility` — exactly `public` or `private`
- `projectContext` — one paragraph describing what this project owns, builds, or solves; passed verbatim into the HOMELAB-CLAUDE.md.template project context placeholder
```

---

### CHANGE-5 — Substep 1.1: empty-string validation for projectContext

**Section path:** `## Step 1 — Input Gathering` → `### Substep 1.1 — Prompt for fields`

**Location:** Append the following paragraph immediately after the bullet list modified in CHANGE-4, before the `### Substep 1.2` heading.

**Add:**
```
If Danny provides an empty string or whitespace-only value for `projectContext`, re-prompt for `projectContext` only. All other previously collected fields are retained. Repeat until a non-empty value is provided.
```

---

### CHANGE-6 — Substep 1.4: add projectContext row to confirmation gate

**Section path:** `## Step 1 — Input Gathering` → `### Substep 1.4 — Confirmation gate`

**Locate:** The fenced code block displaying the InputBundle to Danny.

**Before:**
```
projectName:     <value>
projectId:       <value>
repoName:        <value>  (derived from projectId)
repoDescription: <value>
visibility:      <value>
```

**After (add projectContext as final row):**
```
projectName:     <value>
projectId:       <value>
repoName:        <value>  (derived from projectId)
repoDescription: <value>
visibility:      <value>
projectContext:  <value>
```

The surrounding fence markers, the sentence "Present the complete InputBundle to Danny:", and the sentence "Await Danny's explicit confirmation..." are unchanged.

---

### CHANGE-7 — Substep 4.2: add projectContext substitution row and existence checks

**Section path:** `## Step 4 — CLAUDE.md Generation` → `### Substep 4.2 — Resolve placeholders`

**Before (the substitution table only):**
```
| Placeholder | Resolved value |
|---|---|
| `<PROJECT-NAME>` | `InputBundle.projectName` |
| `<AGENT-NAME>` | `AgentIdentity.slug` |
| `<REPO-NAME>` | `InputBundle.repoName` |
| `<PROJECT-ID>` | `InputBundle.projectId` |
```

**After (table with fifth row, followed by implementation note):**
```
| Placeholder | Resolved value |
|---|---|
| `<PROJECT-NAME>` | `InputBundle.projectName` |
| `<AGENT-NAME>` | `AgentIdentity.slug` |
| `<REPO-NAME>` | `InputBundle.repoName` |
| `<PROJECT-ID>` | `InputBundle.projectId` |
| `<One paragraph: what does this project own, what stack layer is it, how does it relate to the broader system.>` | `InputBundle.projectContext` |

**Implementation note — projectContext placeholder safety gate:** The token in the row above is a prose string, not `<ALL-CAPS-WITH-HYPHENS>`. Substep 4.3's zero-placeholder check does not match it. Apply these two checks explicitly:

1. Before substitution: verify the exact token string `<One paragraph: what does this project own, what stack layer is it, how does it relate to the broader system.>` occurs at least once in the template content read in Substep 4.1. If zero occurrences are found, the template has changed — **HALT:** `projectContext placeholder token not found in HOMELAB-CLAUDE.md.template. Template may have changed. Verify token and update Substep 4.2 before proceeding.`
2. After substitution: verify the exact token string no longer appears in the resolved content. If it still appears, the substitution failed — do not proceed to Substep 4.3 or Substep 4.4.
```

---

### CHANGE-8 — Step 12 preamble: "three items" → "four items"

**Section path:** `## Step 12 — Initial Commit and Push`

**Locate:** The sentence immediately before the `git add` bash block.

**Before:**
```
Stage exactly these three items — no others:
```

**After:**
```
Stage exactly these four items — no others:
```

---

### CHANGE-9 — Step 12: DDR index existence pre-check

**Section path:** `## Step 12 — Initial Commit and Push`

**Location:** Insert the following block at the very beginning of Step 12's body, before the preamble sentence modified in CHANGE-8.

**Add (as the opening content of Step 12, before "Stage exactly these four items"):**
```
Before staging, verify that the DDR index file created in Step 11 exists:

```bash
ls docs/specs/<InputBundle.projectId>-ddrs/00-DDR-INDEX.md
```

**HALT if the file does not exist:** `DDR index file not found at docs/specs/<InputBundle.projectId>-ddrs/00-DDR-INDEX.md. Step 11 did not complete successfully. Resolve Step 11 before proceeding.`

`<InputBundle.projectId>` in the command above is a documentation placeholder — the executing agent substitutes the confirmed `projectId` value before running this command.
```

---

### CHANGE-10 — Step 12: update git add command

**Section path:** `## Step 12 — Initial Commit and Push`

**Locate:** The bash block containing the `git add` command.

**Before:**
```bash
git add .gitignore HOMELAB-CLAUDE.md.template .claude/commands/relay.md
```

**After:**
```bash
git add .gitignore HOMELAB-CLAUDE.md.template .claude/commands/relay.md docs/specs/<InputBundle.projectId>-ddrs/00-DDR-INDEX.md
```

`<InputBundle.projectId>` is a documentation placeholder — the executing agent substitutes the confirmed `projectId` value before running this command.

The `git status` verification block that follows (checking that `CLAUDE.md` and `MACHINE-SETUP.md` are excluded) is unchanged. It must remain intact.

---

### CHANGE-11 — Error Reference Halt Conditions: add Step 12 DDR index missing

**Section path:** `## Error Reference` → `### Halt Conditions`

**Locate:** The row whose Step column is `Step 12` and whose Condition column contains `git push fails`.

**Insert the following row immediately before that row:**
```
| Step 12 | DDR index file not found before git add | `DDR index file not found at docs/specs/<InputBundle.projectId>-ddrs/00-DDR-INDEX.md. Step 11 did not complete successfully. Resolve Step 11 before proceeding.` |
```

**The Step 12 block in the table after this change:**
```
| Step 12 | DDR index file not found before git add | `DDR index file not found at docs/specs/<InputBundle.projectId>-ddrs/00-DDR-INDEX.md. Step 11 did not complete successfully. Resolve Step 11 before proceeding.` |
| Step 12 | git push fails | Exact error surfaced. If SSH error: direct Danny to MACHINE-SETUP.md. Repo left in local-only valid state. No retry. |
```

---

### CHANGE-12 — Error Reference Validation Loops: add projectContext empty-string entry

**Section path:** `## Error Reference` → `### Validation Loops`

**Locate:** The row whose Condition column is `` visibility is not `public` or `private` ``.

**Insert the following row immediately after that row:**
```
| Step 1 | `projectContext` is empty or whitespace-only | Re-prompt for `projectContext` only. All previously collected fields retained. |
```

---

## Acceptance Criteria Traceability

| AC | Satisfied by change(s) |
|---|---|
| AC-1.1 | CHANGE-10 (git add 4 paths) |
| AC-1.2 | No new change — git status block in Step 12 follows git add and is unchanged |
| AC-1.3 | AC-1.1 + AC-1.2 combined (no additional change) |
| AC-1.4 | CHANGE-1 (Fixed Decision Table, four-item pattern with variable note) |
| AC-1.5 | CHANGE-9 (pre-check before git add) + CHANGE-11 (Error Reference entry) |
| AC-2.1 | CHANGE-4 (Substep 1.1 fifth bullet) |
| AC-2.2 | CHANGE-6 (Substep 1.4 sixth row) |
| AC-2.3 | CHANGE-5 (empty re-prompt instruction) + CHANGE-12 (Error Reference entry) |
| AC-2.4 | CHANGE-7 (Substep 4.2 fifth row) |
| AC-2.5 | CHANGE-7 (pre/post substitution existence checks in implementation note) |
| AC-2.6 | CHANGE-2 (Variable Inputs table, Danny-supplied row) |
| AC-2.7 | CHANGE-7 (token confirmed at architecture phase; row authored with exact token string) |

---

## Implementation Agent Verification Checklist

After applying all 12 changes to `.claude/commands/new-project.md`, verify each item before reporting complete:

- [ ] Fixed Decision Table "Bootstrap staged files" row lists four items and documents the `<InputBundle.projectId>` variable note
- [ ] Variable Inputs table has `projectContext` as a Danny-supplied row positioned before the `repoName` derived row
- [ ] Step 1 intro paragraph says "five InputBundle fields"
- [ ] Substep 1.1 bullet list has five bullets; `projectContext` is the fifth
- [ ] Substep 1.1 has empty-string re-prompt instruction for `projectContext` immediately after the bullet list
- [ ] Substep 1.4 confirmation gate displays six rows; `projectContext` is the sixth
- [ ] Substep 4.2 table has five rows; the `projectContext` row uses the exact literal token string specified in CHANGE-7
- [ ] Substep 4.2 implementation note appears after the table and documents both pre/post existence checks and the Substep 4.3 non-coverage
- [ ] Step 12 opens with the DDR index existence pre-check (HALT block) before any staging instruction
- [ ] Step 12 preamble says "four items"
- [ ] Step 12 git add command contains four paths
- [ ] Step 12 `git status` verification block (CLAUDE.md/MACHINE-SETUP.md exclusion check) is intact and unchanged
- [ ] Error Reference Halt Conditions has the Step 12 DDR index missing entry positioned before the Step 12 push-failure entry
- [ ] Error Reference Validation Loops has the `projectContext` empty-string entry positioned after the `visibility` entry
- [ ] Steps 2, 3, 5, 6, 7, 8, 9, 10, 11, 13 and all Pre-flight checks are unmodified
- [ ] Substep 4.3 is unmodified
- [ ] No new Fixed Decision Table rows exist
- [ ] Step count remains 13; step numbering and ordering unchanged

---

## Out-of-Scope Assertions

- No files in `~/runtime/agent-lore/` are modified, created, or deleted
- No canonical steps are reordered or renumbered
- No new fixed decisions are introduced
- Pre-flight checks, Steps 2, 3, 5, 6, 7, 8, 9, 10, 11, and 13 are untouched
- Substep 4.3 zero-placeholder check is untouched (it continues to gate `<ALL-CAPS-WITH-HYPHENS>` tokens; projectContext's non-`<ALL-CAPS>` token is gated by CHANGE-7's explicit pre/post checks)
- `projectContext` format validation is non-empty only; no word count, sentence detection, or structural validation
- Step 13 `capture_memory` content narrative is unchanged
