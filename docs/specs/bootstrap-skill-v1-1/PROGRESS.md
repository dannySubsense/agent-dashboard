# PROGRESS.md — bootstrap-skill-v1-1

**Sprint:** bootstrap-skill-v1-1
**Target file:** `.claude/commands/new-project.md`
**Status:** COMPLETE

---

## Slice 1 — Fix B: Input Gathering and CLAUDE.md Generation

- [x] Pre-step: Read `~/runtime/agent-lore/HOMELAB-CLAUDE.md.template` and confirm projectContext token exists
- [x] CHANGE-2: Variable Inputs — `projectContext` row inserted before `repoName`
- [x] CHANGE-3: Step 1 intro — "five InputBundle fields"
- [x] CHANGE-4: Substep 1.1 — fifth bullet (`projectContext`) added
- [x] CHANGE-5: Substep 1.1 — empty-string re-prompt instruction added after bullet list
- [x] CHANGE-6: Substep 1.4 — `projectContext` row added as sixth row in confirmation gate
- [x] CHANGE-7: Substep 4.2 — `projectContext` substitution row + implementation note added
- [x] CHANGE-12: Error Reference Validation Loops — `projectContext` entry added after `visibility` entry
- [x] Slice 1 verification checklist passed
- [x] Frank gate (Slice 1) — PENDING

## Slice 2 — Fix A: Step 12 and Fixed Decision Table

- [x] CHANGE-1: Fixed Decision Table — "Bootstrap staged files" updated to four items with variable note
- [x] CHANGE-8: Step 12 preamble — "four items"
- [x] CHANGE-9: Step 12 — DDR index pre-check block inserted before preamble sentence
- [x] CHANGE-10: Step 12 — four-path `git add` command; `git status` block verified intact
- [x] CHANGE-11: Error Reference Halt Conditions — DDR index missing entry added before push-failure entry
- [x] Full Implementation Agent Verification Checklist from 02-ARCHITECTURE.md passed
- [x] Slice 1 regression check passed
- [x] Frank gate (Slice 2) — PENDING

## Installation

- [x] `~/.claude/commands/new-project.md` updated via `cp` command
- [x] Spot-check passed (five fields / four-path git add / DDR pre-check)
