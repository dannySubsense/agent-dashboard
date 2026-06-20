# Requirements: bootstrap-skill-v1-1

**Sprint:** bootstrap-skill-v1-1
**DDR:** DDR-009-bootstrap-skill-v1-1-fixes.md
**Author:** requirements-analyst
**Date:** 2026-06-20
**Target file:** `.claude/commands/new-project.md`

---

## Summary

Two correctness gaps in the v1 bootstrap skill are closed by modifying `.claude/commands/new-project.md` in three locations: Step 1 (input gathering), Step 4 (CLAUDE.md generation), and Step 12 (initial commit). Fix A ensures the DDR index file created in Step 11 is staged and committed in Step 12 so a fresh clone contains the DDR directory. Fix B adds `projectContext` as a fifth Danny-supplied input field, surfaces it in the Step 1 confirmation gate, and threads it into the Step 4 HOMELAB-CLAUDE.md.template substitution so the generated CLAUDE.md is fully resolved at project birth.

---

## User Stories

### US-1 — DDR index included in bootstrap commit (Fix A)

As Danny,
I want the DDR index file created during bootstrap to be included in the initial git commit,
so that a fresh clone of any bootstrapped repo contains the DDR directory and the project's DDR backlog is available from the first checkout.

### US-2 — Project context collected at bootstrap time (Fix B)

As Danny,
I want to provide a one-paragraph description of the project's purpose during bootstrap input gathering,
so that the generated CLAUDE.md is fully resolved at project birth without requiring manual edits.

---

## Acceptance Criteria

### US-1 — DDR index included in bootstrap commit

**AC-1.1** Given Step 12 executes, when `git add` runs, then `docs/specs/<InputBundle.projectId>-ddrs/00-DDR-INDEX.md` is included in the staged file set alongside the three previously staged files (`.gitignore`, `HOMELAB-CLAUDE.md.template`, `.claude/commands/relay.md`).

**AC-1.2** Given `git status` is run after `git add` in Step 12, then `docs/specs/<InputBundle.projectId>-ddrs/00-DDR-INDEX.md` appears in the staged (index) set, not in the untracked or unstaged set.

**AC-1.3** Given a successfully pushed bootstrap, when the resulting repo is cloned to a new location, then `docs/specs/<projectId>-ddrs/00-DDR-INDEX.md` exists in the clone.

**AC-1.4** Given the Fixed Decision Table in the updated `new-project.md`, when the "Bootstrap staged files" entry is read, then it lists four items: `.gitignore`, `HOMELAB-CLAUDE.md.template`, `.claude/commands/relay.md`, and `docs/specs/<InputBundle.projectId>-ddrs/00-DDR-INDEX.md` (documented as a pattern containing the `InputBundle.projectId` variable, not a literal path).

**AC-1.5** Given Step 12 runs before Step 11 has completed (Step 11 failed silently and `00-DDR-INDEX.md` was never written), when `git add` is executed, then git returns a non-zero exit code; the Step 12 error handler surfaces this error to Danny and halts.

### US-2 — Project context collected at bootstrap time

**AC-2.1** Given Substep 1.1 execution, when Danny is prompted for inputs, then `projectContext` is listed as a fifth required field with the format constraint: one paragraph describing what the project owns, builds, or solves.

**AC-2.2** Given Danny provides a non-empty `projectContext` value, when Substep 1.4 confirmation gate is presented, then `projectContext` and its value appear in the displayed InputBundle alongside the other four Danny-supplied fields.

**AC-2.3** Given Danny provides an empty string or whitespace-only value for `projectContext`, when Substep 1.1 or 1.4 processes it, then the skill re-prompts Danny for `projectContext` only; no other fields are re-collected.

**AC-2.4** Given the confirmed `InputBundle.projectContext` value, when Step 4 Substep 4.2 placeholder substitution executes, then the `projectContext` placeholder token in the HOMELAB-CLAUDE.md.template is replaced with the verbatim value of `InputBundle.projectContext`.

**AC-2.5** Given Step 4 Substep 4.3 zero-placeholder verification runs after Fix B substitution, when zero `<ALL-CAPS-WITH-HYPHENS>` patterns remain in the resolved content, then the verification passes and CLAUDE.md is written. If the `projectContext` token substitution was incomplete and the token pattern remains, the verification fails and CLAUDE.md is not written.

**AC-2.6** Given the Variable Inputs table in the updated `new-project.md`, when it is read, then `projectContext` appears as a Danny-supplied field row with format constraint documented as: one paragraph; passed verbatim into the HOMELAB-CLAUDE.md.template placeholder.

**AC-2.7** Given Substep 4.2 substitution map in the updated `new-project.md`, when it is read, then a new row maps the `projectContext` placeholder token to `InputBundle.projectContext`. The exact token string must be confirmed by reading the live `~/runtime/agent-lore/HOMELAB-CLAUDE.md.template` at implementation time before authoring this row.

---

## Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| Danny supplies a multi-sentence or multi-line `projectContext` | Accepted and passed verbatim; no truncation or reformatting applied |
| Danny supplies an empty string for `projectContext` | Re-prompt for `projectContext` only; all previously confirmed fields are retained |
| `00-DDR-INDEX.md` does not exist at the time Step 12 runs (Step 11 incomplete) | `git add` returns non-zero; Step 12 surfaces the exact error and halts |
| The HOMELAB-CLAUDE.md.template has zero occurrences of the `projectContext` placeholder | Substep 4.3 zero-placeholder check passes (no `<ALL-CAPS>` token for projectContext remains because it was never present); CLAUDE.md is written without projectContext content — implementation must verify the token exists in the template before mapping it |
| The HOMELAB-CLAUDE.md.template has more than one occurrence of the `projectContext` placeholder | All occurrences must be substituted; Substep 4.3 confirms zero remain |
| `projectId` contains characters that make the DDR path unsafe for `git add` | Not possible — Substep 1.2 regex `/^[a-z][a-z0-9-]+[a-z0-9]$/` enforces safe kebab-case before Step 11 or 12 execute |
| Danny re-runs `/new-project` in a directory where Step 11 already ran (DDR index already exists) | `git add` on an already-existing untracked file succeeds normally; no special handling required |
| Danny provides `projectContext` containing double-quotes or backticks | Accepted verbatim; template substitution writes the value as-is; no escaping applied unless the template format requires it |

---

## Out of Scope

- NOT: Modifications to any file in `~/runtime/agent-lore/` (template files are read-only from this skill)
- NOT: Reordering of the 13 canonical steps
- NOT: New fixed decisions (all carry forward unchanged from DDR-001 §3.3 per DDR-009 §3.4)
- NOT: Changes to Steps 2, 3, 5, 6, 7, 8, 9, 10, 11, or 13
- NOT: Changes to any pre-flight check
- NOT: New structured or format validation loops (word count, sentence detection, etc.) — the only new validation added is the empty-string re-prompt for `projectContext`
- NOT: Format validation of `projectContext` beyond requiring a non-empty value
- NOT: UI or frontend components of any kind
- NOT: LORE capture changes — the Step 13 `capture_memory` content narrative is unchanged
- Deferred: Structured validation of `projectContext` content (word count minimum, sentence detection, etc.)

---

## Constraints

- Must: Only `.claude/commands/new-project.md` is modified by this sprint; no other files in this repo are touched
- Must: The 13 canonical steps retain their current numbering and ordering
- Must: The `projectContext` placeholder token in HOMELAB-CLAUDE.md.template must be confirmed by reading the live template at Slice 1 implementation time before the Substep 4.2 substitution map row is authored; the token is not known at spec time
- Must: The "Bootstrap staged files" Fixed Decision Table entry documents the DDR index path as a pattern (`docs/specs/<InputBundle.projectId>-ddrs/00-DDR-INDEX.md`) not as a literal string, because it contains the runtime-variable `projectId`
- Must: `projectContext` is added to the Variable Inputs table as a Danny-supplied field (not derived, not agent-proposed)
- Must: Substep 4.3 zero-placeholder verification continues to gate CLAUDE.md writes after Fix B; no bypass of this check is introduced
- Must not: Template files in `~/runtime/agent-lore/` be written, overwritten, or deleted
- Must not: `projectContext` be collected from a source other than Danny (it must not be inferred, derived, or generated by the agent)
- Assumes: HOMELAB-CLAUDE.md.template contains at least one placeholder token corresponding to project context; if the template contains none, Fix B cannot be completed and implementation must HALT and report
- Assumes: The existing four placeholder tokens in Substep 4.2 (`<PROJECT-NAME>`, `<AGENT-NAME>`, `<REPO-NAME>`, `<PROJECT-ID>`) are correct and unchanged
