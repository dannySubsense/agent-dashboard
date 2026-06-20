# Roadmap: /new-project Slash Command (bootstrap-skill-v1)

- **Status:** DRAFT
- **Author:** lumen (planner)
- **Date:** 2026-06-20
- **Source DDR:** DDR-001 (ACCEPTED)
- **Sprint:** bootstrap-skill-v1

---

## Overview

Six ordered slices producing a single deliverable: `.claude/commands/new-project.md` in the `agent-dashboard` repo, installed globally to `~/.claude/commands/new-project.md`. Slices 1–5 author the command document section by section. Slice 6 installs it and verifies byte-identical sync.

This is not a software module. "Implementation" means: write the document, verify its structure matches the architecture spec, and install it. Test strategy is acceptance-based throughout — invoke and inspect artifacts.

No circular dependencies. No file ownership conflicts. Slices 1–5 all write to one file; Slice 6 reads the installed copy at `~/.claude/commands/new-project.md`.

---

## Dependency Map

| Slice | Depends On |
|-------|------------|
| 1 — Scaffold | — |
| 2 — Pre-flight | Slice 1 |
| 3 — Steps 1–6 | Slice 2 |
| 4 — Steps 7–10 | Slice 3 |
| 5 — Steps 11–13 + Error Reference | Slice 4 |
| 6 — Install + Verify | Slice 5 |

---

## Slice Overview

| Slice | Goal | Depends On | File(s) |
|-------|------|------------|---------|
| 1 | Command scaffold | — | `.claude/commands/new-project.md` (create) |
| 2 | Pre-flight validation section | Slice 1 | `.claude/commands/new-project.md` (extend) |
| 3 | Steps 1–6 content | Slice 2 | `.claude/commands/new-project.md` (extend) |
| 4 | Steps 7–10 content | Slice 3 | `.claude/commands/new-project.md` (extend) |
| 5 | Steps 11–13 + error reference | Slice 4 | `.claude/commands/new-project.md` (extend) |
| 6 | Global install + diff verification | Slice 5 | `~/.claude/commands/new-project.md` (write via cp) |

---

## Slice Detail

### Slice 1: Command Scaffold

**Goal:** Create the command file with its four structural header sections — frontmatter, preamble, fixed decision table, and variable inputs — establishing the file and its non-procedural reference content.

**Depends On:** —

**Files:**
- `.claude/commands/new-project.md` — create

**Implementation Notes:**
- Create `.claude/commands/` directory if it does not exist in the repo.
- Frontmatter: YAML block with exactly one key: `description:` — value is a one-line summary displayed in the Claude Code `/` command picker.
- Preamble: One paragraph stating what the command does (encodes the canonical 13-step homelab bootstrap sequence), who executes it (the producing agent), and what it produces (a fully bootstrapped project with consistent repo shape).
- Fixed Decision Table: All locked values from Architecture §8. Include a lead-in sentence: "These values are locked. Never ask Danny about them." Encode all 21 entries: GitHub account, git email, git name, branch name, SSH remote alias, git config scope, LORE DB, template source dir, both template filenames, commit message, staged files, LORE documentType, LORE epistemicType, LORE status, Cairn relay handle, Cairn thread, relay.md send identity, Cairn registration host, Cairn registration status, and Cairn registration role.
- Variable Inputs: Five fields from Architecture §4.1 and §4.2: `projectName` (human-readable), `projectId` (kebab-case, becomes LORE projectId and DDR path prefix), `repoDescription` (one sentence), `visibility` (`public` or `private`), `agentName` (declared by the agent in Step 2, not asked of Danny upfront). Include format constraints for each field.
- No step content, no pre-flight section, no error reference in this slice.

**Done When:**
- [ ] `.claude/commands/new-project.md` exists
- [ ] File opens with `---` (YAML frontmatter)
- [ ] `description:` field is present in frontmatter with a non-empty value
- [ ] Preamble section heading and body paragraph present
- [ ] Fixed decision table section present; `grep` for each of the 21 values from Architecture §8 returns a match
- [ ] Variable inputs section present with all 5 fields (projectName, projectId, repoDescription, visibility, agentName) documented with format constraints

---

### Slice 2: Pre-flight Validation Section

**Goal:** Add the pre-flight validation section covering all 4 checks that must pass after Danny confirms inputs and before any write or system operation begins.

**Depends On:** Slice 1

**Files:**
- `.claude/commands/new-project.md` — extend (append pre-flight section after variable inputs)

**Implementation Notes:**
- Pre-flight runs after Step 1 input confirmation, before Step 2 (vision quest). This ordering must be stated in the section heading or preamble sentence.
- Four checks in order (from Architecture §5 pre-flight table):
  1. `git --version` — exit code 0 required — HALT if non-zero: "git not found. Install git before running /new-project."
  2. `gh auth status` — output must contain `dannySubsense` — HALT if wrong account or unauthenticated: "gh CLI not authenticated as dannySubsense. Run `gh auth login` as dannySubsense."
  3. `mcp__lore-gateway__check_health` — healthy response required — HALT if unreachable: "LORE gateway unreachable. Verify lore-gateway MCP is registered and LORE DB is reachable over Tailscale."
  4. `grep -c "github.com-danny" ~/.ssh/config` — result ≥ 1 — WARN (non-blocking) if absent: "SSH alias github.com-danny not found in ~/.ssh/config. Step 12 git push will fail. See MACHINE-SETUP.md SSH section to configure the alias before proceeding."
- Checks 1–3 are HALT conditions. Check 4 is WARN only — bootstrap may continue with the warning acknowledged.
- Architecture also lists Switchboard availability as a NOTE (non-blocking). Include as check 5, marked NOTE.
- Each check entry must show: command/tool, pass condition, failure severity (HALT / WARN / NOTE), and exact failure message.

**Done When:**
- [ ] Pre-flight section heading present
- [ ] Section explicitly states it runs after Step 1 confirmation and before Step 2
- [ ] All 5 checks present (git HALT, gh CLI HALT, LORE gateway HALT, SSH alias WARN, Switchboard NOTE), each with command/tool, pass condition, and failure action
- [ ] Checks 1–3 are marked HALT; check 4 is marked WARN (not HALT); check 5 is marked NOTE (non-blocking)
- [ ] Exact HALT messages from Architecture §7 pre-flight entries are present verbatim

---

### Slice 3: Steps 1–6

**Goal:** Add the first six procedural steps covering input gathering, vision quest, Cairn registration, CLAUDE.md generation, relay skill, and MACHINE-SETUP.md generation.

**Depends On:** Slice 2

**Files:**
- `.claude/commands/new-project.md` — extend (append Steps 1–6 after pre-flight section)

**Implementation Notes:**

**Step 1 — Input Gathering:** 5 substeps (Architecture §5 Step 1). Substep 4 is an explicit confirmation gate — state: "No irreversible action proceeds until Danny confirms the full InputBundle." Substep 5 is a LORE projectId collision check: `search_knowledge({ query: InputBundle.projectId, projectId: "lore-personal", minSimilarity: 0.1 })`. If results reference the same projectId in an existing project record, warn Danny and require confirmation or alternate ID.

**Step 2 — Vision Quest:** 8 substeps from Architecture §5 Step 2. Registry search: `search_knowledge({ query: "Agent Registry registered agents", projectId: "lore-personal", minSimilarity: 0.1 })` with fallback to `minSimilarity: 0.05` if results are sparse. Include the full collision loop: propose → check → collision detected → discard → propose new name with distinct etymology → repeat. Include the `AgentIdentity.confirmed = true` gate with explicit statement: "No agent name may appear in any file, command, or payload until `AgentIdentity.confirmed = true`."

**Step 3 — Cairn Registration:** Construct `CairnRegistrationPayload` from Architecture §4.3. Call `send_message({ from: AgentIdentity.slug, to: "cairn", thread: "registration", message: ... })`. Include the exact message format from Architecture §6.2 verbatim. Mark send_message failure as SURFACE (non-blocking): "Cairn registration pending — Switchboard unavailable. Send registration message manually at next relay session."

**Step 4 — CLAUDE.md Generation:** Template path `~/runtime/agent-lore/HOMELAB-CLAUDE.md.template`. HALT if template not found: "HALT: Template not found at ~/runtime/agent-lore/HOMELAB-CLAUDE.md.template. Verify agent-lore runtime is present on this machine." Resolve all 5 placeholders from Architecture §4.5 (`<PROJECT-NAME>`, `<AGENT-NAME>`, `<REPO-NAME>`, `<PROJECT-ID>`, `<CREATION-DATE>`). Post-write: verify zero `<ALL-CAPS-WITH-HYPHENS>` strings remain. Also copy the template file to project root as `HOMELAB-CLAUDE.md.template` (reference copy for Step 12 commit).

**Step 5 — Relay Skill:** Inline relay.md template from Architecture §4.5. Substitute `AgentIdentity.slug` for `<AGENT-SLUG>`. Create `.claude/commands/` directory if absent. Write to `.claude/commands/relay.md`. Post-write: verify no `<AGENT-SLUG>` placeholder remains.

**Step 6 — MACHINE-SETUP.md Generation:** Template path `~/runtime/agent-lore/MACHINE-SETUP.md.template`. HALT if not found: "HALT: Template not found at ~/runtime/agent-lore/MACHINE-SETUP.md.template. Verify agent-lore runtime is present on this machine." Resolve `<REPO-NAME>` and `<PROJECT-NAME>` from §4.5. Post-write: verify zero placeholder strings remain. Note: MACHINE-SETUP.md will be gitignored in Step 7 and must never appear in any commit.

**Done When:**
- [ ] Step 1 section present with all 5 substeps (prompt, projectId kebab-case validation, visibility validation, confirmation gate, projectId collision check via search_knowledge)
- [ ] Step 2 section present with all 8 substeps including collision loop, fallback minSimilarity, and `AgentIdentity.confirmed` gate statement
- [ ] Step 3 section present with CairnRegistrationPayload field list, send_message call, message format from Architecture §6.2 verbatim, and non-blocking failure SURFACE message
- [ ] Step 4 section present with correct template path, all 5 placeholder substitutions named, zero-placeholder post-condition, HALT message for missing template verbatim, and reference copy step
- [ ] Step 5 section present with inline relay.md template content (3-item numbered list), `<AGENT-SLUG>` substitution instruction, and post-write placeholder verification
- [ ] Step 6 section present with correct template path, `<REPO-NAME>` and `<PROJECT-NAME>` substitutions, zero-placeholder post-condition, and HALT message for missing template verbatim

---

### Slice 4: Steps 7–10

**Goal:** Add procedural steps for .gitignore creation, git initialization, GitHub repo creation, and SSH remote configuration.

**Depends On:** Slice 3

**Files:**
- `.claude/commands/new-project.md` — extend (append Steps 7–10 after Step 6)

**Implementation Notes:**

**Step 7 — .gitignore Creation:** Write `.gitignore` to project root with exactly 7 entries in the specified order from Architecture §5 Step 7: `CLAUDE.md`, `MACHINE-SETUP.md`, `.env`, `.env*.local`, `node_modules/`, `.next/`, `dist/`. State that no entries may be omitted and additional project-specific entries may follow.

**Step 8 — Git Initialization:** Four commands in sequence from Architecture §5 Step 8: `git init`, `git branch -m main`, `git config user.email "danny@subsense.art"`, `git config user.name "dannySubsense"`. No `--global` or `--system` flag is present anywhere in this step — this is an absolute prohibition and must be stated explicitly. Verification command: `git config --list | grep user`.

**Step 9 — GitHub Repo Creation:** Exact command form: `gh repo create dannySubsense/<InputBundle.repoName> --<InputBundle.visibility> --description "<InputBundle.repoDescription>"`. HALT on any non-zero exit — surface exact gh CLI error to Danny. Name conflict special case: accept alternate repo name from Danny, update `InputBundle.repoName`, retry this step once. All other errors: HALT without retry.

**Step 10 — SSH Remote Configuration:** Exact command: `git remote add origin "git@github.com-danny:dannySubsense/<InputBundle.repoName>.git"`. Verification: `git remote -v` must show origin using `github.com-danny` SSH alias. HALT if remote add fails — surface exact error.

**Done When:**
- [ ] Step 7 section present with all 7 gitignore entries in the exact order from Architecture §5 Step 7
- [ ] Step 8 section present with all 4 git commands; the text `--global` and `--system` do not appear anywhere in Step 8; verification command included
- [ ] Step 9 section present with exact gh CLI command form using InputBundle variables, HALT on non-zero exit, and name-conflict one-retry case documented
- [ ] Step 10 section present with SSH alias form in the remote URL (`git@github.com-danny:`), `git remote -v` verification, and HALT on failure

---

### Slice 5: Steps 11–13 + Error Reference

**Goal:** Add the final three procedural steps (DDR directory bootstrap, initial commit and push, LORE bootstrap capture) and the complete error reference section.

**Depends On:** Slice 4

**Files:**
- `.claude/commands/new-project.md` — extend (append Steps 11–13 and error reference section)

**Implementation Notes:**

**Step 11 — DDR Directory Bootstrap:** Command: `mkdir -p docs/specs/<InputBundle.projectId>-ddrs/`. Write `docs/specs/<InputBundle.projectId>-ddrs/00-DDR-INDEX.md` with the stub from Architecture §5 Step 11: title header `# DDR Index — <InputBundle.projectName>` followed by an empty three-column table (`# | Title | Status`).

**Step 12 — Initial Commit and Push:** Stage exactly three items using `git add .gitignore HOMELAB-CLAUDE.md.template .claude/commands/relay.md` — no others. Include a `git status` check verifying `CLAUDE.md` and `MACHINE-SETUP.md` are shown as excluded (not in staged set). Commit with exact message `chore: project bootstrap` — no variation. Push with `git push origin main`. HALT on push failure — do not retry silently — surface exact error. If the error is SSH-related, direct Danny to MACHINE-SETUP.md SSH alias setup section. State: "The repo is left in a valid local-only state."

**Step 13 — LORE Bootstrap Capture:** Construct and call `capture_memory` with all fields from Architecture §4.4 BootstrapCapturePayload: `projectId`, `author` (AgentIdentity.slug), `documentType: "decision"`, `epistemicType: "FACT"`, `status: "locked"`, `content` (narrative). Content minimum coverage from Architecture §5 Step 13: agent name, author slug, relay handle, etymology, workflow pattern (DDR → spec → forge), project roles (Composer: Danny, Producer: AgentIdentity.name, Frank: /senior-qc), and bootstrap date. Failure is non-blocking — SURFACE: "LORE bootstrap capture failed. Re-run capture_memory manually before closing this session."

**Error Reference Section:** Three sub-tables from Architecture §7:
- Halt Conditions table (8 entries: pre-flight git, pre-flight gh CLI, pre-flight LORE gateway, Step 4 template missing, Step 6 template missing, Step 9 gh repo create fails, Step 10 remote add fails, Step 12 push fails) with exact HALT messages from §7.
- Non-blocking Failures table (2 entries: Step 3 Cairn send_message, Step 13 capture_memory) with exact SURFACE messages from §7.
- Validation Loops table (4 entries: Step 1 projectId, Step 1 visibility, Step 2 name collision, Step 2 Danny rejection) with re-prompt actions from §7.

**Done When:**
- [ ] Step 11 section present with mkdir command using `InputBundle.projectId` variable and exact DDR-INDEX stub content (title header + 3-column table)
- [ ] Step 12 section present with exactly 3 staged files named by path, git status exclusion check for CLAUDE.md and MACHINE-SETUP.md, commit message exactly `chore: project bootstrap` in backticks, push command, HALT on push failure, SSH-specific guidance referencing MACHINE-SETUP.md, and local-only-state note
- [ ] Step 13 section present with capture_memory call showing all 6 fields from §4.4, content narrative minimum coverage listed, and non-blocking SURFACE message
- [ ] Error reference section present with all 3 sub-tables: halt conditions (≥8 entries), non-blocking failures (2 entries), validation loops (4 entries)
- [ ] HALT messages in error reference match Architecture §7 verbatim

---

### Slice 6: Integration Verification + Global Install

**Goal:** Install the completed command file to `~/.claude/commands/new-project.md` and verify it is byte-identical to the source. Confirm structural integrity of the installed file.

**Depends On:** Slice 5 (source file complete)

**Files:**
- `~/.claude/commands/new-project.md` — write (via cp; not a direct file edit)

**Implementation Notes:**
- Pre-install check: confirm `.claude/commands/new-project.md` in the repo exists and is non-empty.
- Create `~/.claude/commands/` directory if absent.
- Install command: `cp /home/d-tuned/projects/agent-dashboard/.claude/commands/new-project.md ~/.claude/commands/new-project.md`
- Regression check: `diff ~/.claude/commands/new-project.md /home/d-tuned/projects/agent-dashboard/.claude/commands/new-project.md` — zero output is the sole passing condition.
- Structural integrity checks on the installed file (these are the acceptance gates):
  - YAML frontmatter with `description:` present
  - All 13 step headings present (`grep "Step 1"` through `grep "Step 13"`)
  - `grep -c "\-\-global" ~/.claude/commands/new-project.md` returns 0 (prohibition enforced)
  - All 7 gitignore entries present in the file
  - Pre-flight section present
  - Error reference section present

**Done When:**
- [ ] `~/.claude/commands/new-project.md` exists
- [ ] `diff` between installed copy and source produces zero output
- [ ] Installed file has `description:` in frontmatter
- [ ] `grep -c "## Step" ~/.claude/commands/new-project.md` returns 13
- [ ] `grep -c "\-\-global" ~/.claude/commands/new-project.md` returns 0
- [ ] All 7 gitignore entries (`CLAUDE.md`, `MACHINE-SETUP.md`, `.env`, `.env*.local`, `node_modules/`, `.next/`, `dist/`) present in file

---

## Sequence Rules

1. Complete each slice fully before starting the next.
2. A slice is complete only when every item in its "Done When" checklist is satisfied.
3. If blocked on any item: HALT and report. Do not skip ahead or work on a later slice.
4. Slice 6 may not begin until the source file is structurally complete (all of Slices 1–5 done).
5. No new slices without explicit Composer approval.
6. All architecture decisions from `02-ARCHITECTURE.md` are locked. Do not reopen them during implementation.

---

## Test Strategy

Acceptance-based. No unit test framework applies to a slash command document.

| Verification Type | When | Method |
|---|---|---|
| Slice-level structural checks | After each slice | grep/cat to confirm section presence and content |
| Anti-requirement check | After Slice 5 | `grep -c "\-\-global"` on source file returns 0 |
| Regression check | After Slice 6 | `diff` source vs installed — zero output required |
| Smoke test | After Slice 6 (manual) | Invoke `/new-project` with throwaway project per Architecture §10 smoke test table; verify each artifact |
| Integration test | After smoke test passes | Real project invocation; spot-check `/relay` command works in new session |

Smoke test cleanup after verification: `gh repo delete dannySubsense/<throwaway-name> --yes` and remove local directory.

---

## Deferred (Not This Roadmap)

- Stack initialization extensions (`--stack=nextjs`, `--stack=python`, etc.) — deferred to bootstrap-skill-v2.
- Automated SSH alias detection and setup — v1 halts with instructions; automation deferred.
- Automated install trigger on source file change — v1 is manual `cp`; automation deferred.
- CI/CD for slash command validation — not in scope for v1.
- GitHub issue creation — belongs to the DDR loop, not project bootstrap.
- Template file authoring or modification — owned by agent-lore at `~/runtime/agent-lore/`; read-only from this skill.
- Updating Agent Registry directly — delegated to Cairn via send_message; skill never writes registry tables.

---

## Source of Truth Reference

| Topic | Authoritative Section |
|---|---|
| Step substeps and ordering | Architecture §5 |
| Protocol specifications (tool call arguments) | Architecture §6 |
| Error handling (exact HALT/SURFACE messages) | Architecture §7 |
| Fixed decision table (all locked values) | Architecture §8 |
| Deployment model and regression check | Architecture §9 |
| Smoke test artifact checklist | Architecture §10 |
| Anti-requirements enforced in command text | Requirements §Constraints |
