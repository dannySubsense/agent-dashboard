# Requirements: /new-project Slash Command (bootstrap-skill-v1)

- **Status:** DRAFT
- **Author:** lumen (requirements-analyst)
- **Date:** 2026-06-20
- **Source DDR:** DDR-001 (ACCEPTED)
- **Sprint:** bootstrap-skill-v1

---

## Summary

A Claude Code slash command file (`.claude/commands/new-project.md`) that encodes the canonical 13-step homelab project bootstrap sequence. Authored in the `agent-dashboard` repo and deployed globally to `~/.claude/commands/new-project.md`. When invoked, the command guides the executing producer agent through input gathering, agent identity declaration, Cairn registration, file generation, git initialization, GitHub repo creation, DDR directory setup, initial commit, and LORE capture — producing a fully bootstrapped project with a consistent, repeatable repo shape.

---

## User Stories

### US-01 — Input Gathering
As Danny,
I want the command to collect project-name, project-id, repo-description, and visibility before any action is taken,
so that all variable inputs are confirmed before irreversible steps execute.

### US-00 — Pre-flight Validation
As Danny,
I want the command to verify that git, gh CLI (authenticated as dannySubsense), and the LORE gateway are all available before any write or system operation executes,
so that the bootstrap does not proceed into an irreversible state when a required dependency is missing.

### US-02 — Vision Quest
As Danny,
I want the executing agent to search the Agent Registry via search_knowledge (lore-personal) before declaring its agent name,
so that the declared name is provably unique across all registered homelab agents.

### US-03 — Agent Name Confirmation
As Danny,
I want the agent to present its proposed name and etymology for my approval before the sequence continues,
so that I have final say on agent identity before it is registered with Cairn.

### US-04 — Cairn Registration
As Danny,
I want the agent to send a registration message to cairn on thread `registration` containing the full agent record,
so that the new agent appears in the Agent Registry and can participate in Switchboard relay.

### US-05 — CLAUDE.md Generation
As Danny,
I want CLAUDE.md written from `~/runtime/agent-lore/HOMELAB-CLAUDE.md.template` with all placeholders resolved to project-specific values,
so that the repo has correct agent configuration from the first session.

### US-06 — Relay Skill
As Danny,
I want `.claude/commands/relay.md` written with the new agent's relay handle pre-filled,
so that the agent can use Switchboard relay immediately without manual editing.

### US-07 — MACHINE-SETUP.md Generation
As Danny,
I want MACHINE-SETUP.md written from `~/runtime/agent-lore/MACHINE-SETUP.md.template`,
so that any developer can reproduce the machine environment required for the project.

### US-08 — .gitignore Creation
As Danny,
I want a .gitignore created containing the full standard homelab ignore list,
so that sensitive files (CLAUDE.md, MACHINE-SETUP.md, .env) and build artifacts are never accidentally committed.

### US-09 — Git Initialization
As Danny,
I want the git repository initialized with branch name `main` and per-repo identity set to danny@subsense.art / dannySubsense,
so that commits are correctly attributed and the local repo is ready for the GitHub remote.

### US-10 — GitHub Repo Creation
As Danny,
I want the GitHub repository created under the dannySubsense account with the specified visibility and description,
so that the project has remote version control under the correct identity.

### US-11 — SSH Remote Configuration
As Danny,
I want the git remote `origin` added using the SSH alias `github.com-danny`,
so that git push/pull uses the correct SSH key without modifying global git configuration.

### US-12 — DDR Directory Bootstrap
As Danny,
I want `docs/specs/<project-id>-ddrs/` created with a `00-DDR-INDEX.md` stub,
so that the project is immediately ready for the DDR workflow without manual directory setup.

### US-13 — Initial Commit and Push
As Danny,
I want `.gitignore`, `HOMELAB-CLAUDE.md.template` (reference copy), and `.claude/commands/relay.md` staged and committed as "chore: project bootstrap" then pushed to origin main,
so that the bootstrap state is captured in git history on the GitHub remote.

### US-14 — LORE Bootstrap Capture
As Danny,
I want a capture_memory call made with projectId, author (agent slug), documentType=decision, status=locked, recording agent identity, stack, workflow, and roles,
so that a future agent session can fully reconstruct the project's founding context from LORE without consulting prior transcripts.

---

## Acceptance Criteria

### US-00 — Pre-flight Validation
- [ ] Given all four inputs are confirmed (US-01), then pre-flight runs before Step 2 (vision quest) and before any file write or system operation.
- [ ] Given pre-flight runs, then `git --version` is executed; if it returns non-zero exit code, the skill halts with message: "git not found. Install git before running /new-project."
- [ ] Given pre-flight runs, then `gh auth status` is executed; if the output does not contain `dannySubsense`, the skill halts with message: "gh CLI not authenticated as dannySubsense. Run `gh auth login` as dannySubsense."
- [ ] Given pre-flight runs, then `mcp__lore-gateway__check_health` is called; if the response is unhealthy or the tool is unavailable, the skill halts with message: "LORE gateway unreachable. Verify lore-gateway MCP is registered and LORE DB is reachable over Tailscale."
- [ ] Given pre-flight runs, then `~/.ssh/config` is checked for the `github.com-danny` alias; if absent, a WARN is issued (non-blocking) noting that Step 12 push will fail; bootstrap may continue with the warning acknowledged.
- [ ] Given any HALT condition fires in pre-flight, then no file is written and no system command is executed.

### US-01 — Input Gathering
- [ ] Given the command is invoked, when no inputs have been provided, then the agent prompts for project-name, project-id, repo-description, and visibility before executing any file or system operation.
- [ ] Given project-id is provided, then the agent validates it is kebab-case before accepting it.
- [ ] Given visibility is provided, then only "public" or "private" are accepted values; any other value triggers a re-prompt.
- [ ] Given all four inputs are collected, then the agent presents the full input set and waits for Danny's explicit confirmation before any irreversible action (git init, gh repo create, write operations).

### US-02 — Vision Quest
- [ ] Given the vision quest step executes, then search_knowledge is called against lore-personal with an Agent Registry query before any name is declared.
- [ ] Given the registry search returns results, then the agent verifies its proposed name does not match any existing registration record.
- [ ] Given a name collision is detected, then the agent selects a different name and repeats the registry check before presenting to Danny.
- [ ] Given the registry search returns no collision, then the agent declares its proposed name with full etymology before presenting it for confirmation.

### US-03 — Agent Name Confirmation
- [ ] Given the agent has completed vision quest, when it presents the proposed name and etymology, then the sequence does not proceed until Danny explicitly approves.
- [ ] Given Danny rejects the proposed name, then the skill returns to the vision quest step and proposes a new name with different etymology.

### US-04 — Cairn Registration
- [ ] Given the agent name is confirmed by Danny, when the registration step executes, then send_message is called with to=cairn and thread=registration.
- [ ] Given the registration message is sent, then it includes all required fields: name, author slug, relay handle, projectId, repo, host, status, role, and etymology.
- [ ] Given send_message fails (Cairn unavailable), then the bootstrap sequence proceeds without halting, and the failure is surfaced to Danny as a pending action.

### US-05 — CLAUDE.md Generation
- [ ] Given the CLAUDE.md step executes, then the template is read from `~/runtime/agent-lore/HOMELAB-CLAUDE.md.template`.
- [ ] Given the template is read, then all placeholders (agent name, projectId, relay handle, etymology, repo, author slug, creation date) are replaced with concrete values before the file is written.
- [ ] Given CLAUDE.md is written, then no placeholder strings remain in the file.
- [ ] Given the template file is not found at the expected path, then the skill halts with an explicit error referencing the missing file path.

### US-06 — Relay Skill
- [ ] Given the relay skill step executes, then `.claude/commands/relay.md` is created in the new project directory.
- [ ] Given the file is created, then the agent's relay handle (lowercase, as confirmed in US-03) is present in the file content.
- [ ] Given the file is created, then no placeholder handle strings remain in the file.

### US-07 — MACHINE-SETUP.md Generation
- [ ] Given the MACHINE-SETUP.md step executes, then the template is read from `~/runtime/agent-lore/MACHINE-SETUP.md.template`.
- [ ] Given the template is read, then project-specific sections (repo table, project name) are populated with values from US-01 inputs.
- [ ] Given the template file is not found at the expected path, then the skill halts with an explicit error referencing the missing file path.

### US-08 — .gitignore Creation
- [ ] Given the .gitignore step executes, then the file is written to the project root.
- [ ] Given the file is written, then it contains each of the following entries on separate lines: `CLAUDE.md`, `MACHINE-SETUP.md`, `.env`, `.env*.local`, `node_modules/`, `.next/`, `dist/`.
- [ ] Given CLAUDE.md was written in US-05, then after .gitignore is written, running `git status` shows CLAUDE.md as untracked and excluded (not staged).
- [ ] Given MACHINE-SETUP.md was written in US-07, then after .gitignore is written, running `git status` shows MACHINE-SETUP.md as untracked and excluded (not staged).

### US-09 — Git Initialization
- [ ] Given the git init step executes, then `git init` is run in the project root.
- [ ] Given the repo is initialized, then the default branch is renamed to `main`.
- [ ] Given the branch exists, then `git config user.email "danny@subsense.art"` is run scoped to the repo (no `--global` flag).
- [ ] Given the branch exists, then `git config user.name "dannySubsense"` is run scoped to the repo (no `--global` flag).
- [ ] Given per-repo identity is set, then `git log` on the first commit shows author as `dannySubsense <danny@subsense.art>`.

### US-10 — GitHub Repo Creation
- [ ] Given the GitHub step executes, then the gh CLI is called as: `gh repo create dannySubsense/<repo-name> --<visibility> --description "<desc>"`.
- [ ] Given the repo is created, then it belongs to the dannySubsense account (not islandef or any other org).
- [ ] Given the gh CLI returns a non-zero exit code (e.g., name already taken, auth failure), then the skill halts and surfaces the exact error message to Danny.

### US-11 — SSH Remote Configuration
- [ ] Given the remote step executes, then `git remote add origin "git@github.com-danny:dannySubsense/<repo>.git"` is called.
- [ ] Given the remote is added, then `git remote -v` shows origin using the `github.com-danny` SSH alias.
- [ ] Given a subsequent git push fails due to SSH alias not configured, then the skill halts and directs Danny to MACHINE-SETUP.md for SSH alias setup instructions.

### US-12 — DDR Directory Bootstrap
- [ ] Given the DDR directory step executes, then the path `docs/specs/<project-id>-ddrs/` is created in the project root.
- [ ] Given the directory is created, then `00-DDR-INDEX.md` is written as a stub inside it.
- [ ] Given the stub is written, then it contains at minimum a title header referencing the project name.

### US-13 — Initial Commit and Push
- [ ] Given the commit step executes, then exactly these three items are staged: `.gitignore`, `HOMELAB-CLAUDE.md.template` (reference copy in project root), and `.claude/commands/relay.md`.
- [ ] Given the files are staged, then the commit message is exactly `chore: project bootstrap`.
- [ ] Given the commit is created, then `git push origin main` is called.
- [ ] Given the push fails for any reason, then the skill halts and reports the error to Danny; no silent retry occurs and the repo is left in its current local state.
- [ ] Given CLAUDE.md or MACHINE-SETUP.md exist in the project root, then neither file appears in the staged set or in the resulting commit.

### US-14 — LORE Bootstrap Capture
- [ ] Given the capture step executes, then `capture_memory` is called with `projectId` matching the project-id from US-01.
- [ ] Given capture_memory is called, then `author` is the agent's slug (lowercase, matching the declared name from US-02/US-03).
- [ ] Given capture_memory is called, then `documentType` is `decision`, `epistemicType` is `FACT`, and `status` is `locked`.
- [ ] Given capture_memory is called, then the content records: agent name, author slug, relay handle, etymology, workflow pattern, and project roles at minimum.

---

## Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| Cairn unavailable when send_message is called (US-04) | Bootstrap proceeds; failure is surfaced to Danny as a pending action; no halt |
| SSH alias `github.com-danny` not in `~/.ssh/config` | Push fails; skill halts with explicit message directing Danny to MACHINE-SETUP.md SSH setup section |
| Agent name proposed by vision quest matches an existing registry entry | Agent selects a different name and repeats registry search; loop continues until a unique name is found |
| Danny rejects agent name during confirmation (US-03) | Skill returns to vision quest; agent proposes a new name with distinct etymology |
| project-id provided in non-kebab-case format (e.g., "My Project") | Skill rejects and re-prompts; all downstream paths (DDR dir, LORE projectId) depend on valid kebab-case |
| GitHub repo name already taken under dannySubsense | gh CLI returns error; skill halts; Danny provides an alternate name and the gh step retries |
| Push to origin main fails (auth error, network, rejected) | Skill halts; repo remains in valid local-only state; exact error is reported |
| Template file missing at `~/runtime/agent-lore/` | Skill halts at the template-read step with an explicit file-not-found error citing the missing path |
| LORE capture_memory call fails (US-14) | Skill surfaces the failure to Danny but does not halt or roll back completed steps |
| `git config --global` invoked anywhere in execution | This is a command authoring defect; it must never appear in the skill text |
| Danny provides a project-id that conflicts with an existing LORE projectId | Skill warns Danny before proceeding; Danny must confirm or provide an alternate ID |

---

## Out of Scope

- NOT: Stack initialization — no `npm init`, `uv init`, `cargo init`, `poetry init`, or any language/framework bootstrap.
- NOT: Web UI, browser interface, or interactive dashboard element of any kind.
- NOT: Template file authoring or modification — `HOMELAB-CLAUDE.md.template` and `MACHINE-SETUP.md.template` are owned by agent-lore and live in `~/runtime/agent-lore/`; this skill is a consumer only.
- NOT: Per-project installation of the slash command — it is authored in agent-dashboard and deployed once globally to `~/.claude/commands/`; no per-project copying.
- NOT: CI/CD setup — no GitHub Actions workflows, branch protection rules, or deployment pipelines.
- NOT: GitHub issue creation — that step belongs to the DDR loop (one issue per DDR authored), not project bootstrap.
- NOT: Tailscale or network configuration — MACHINE-SETUP.md references it but the skill does not configure it.
- NOT: Updating the Agent Registry directly — registration is delegated to Cairn via send_message; the skill does not write to LORE registry tables.
- NOT: Automatic installation of the slash command itself (the `cp agent-dashboard/.claude/commands/new-project.md ~/.claude/commands/` step is currently manual).
- Deferred: Stack-specific bootstrap extensions (e.g., a `--stack=nextjs` flag that runs npm init after the invariant steps) — out of scope for v1.
- Deferred: Automated detection and setup of missing SSH alias — v1 halts with instructions; a future version may automate alias creation.

---

## Constraints

### Hard Requirements
- Must: The deliverable is a single Markdown slash command file (`.claude/commands/new-project.md`); it is not a script, binary, or API endpoint.
- Must: All `git config` calls must be scoped per-repo; the `--global` and `--system` flags are prohibited.
- Must: The git remote URL must use the SSH alias form `git@github.com-danny:dannySubsense/<repo>.git`.
- Must: The initial branch must be named `main`; no other branch name is acceptable.
- Must: GitHub repo creation must target the `dannySubsense` account exclusively.
- Must: Git commits produced during bootstrap must use identity `danny@subsense.art` / `dannySubsense`.
- Must: The .gitignore must include all seven standard homelab entries before the first commit.
- Must: CLAUDE.md and MACHINE-SETUP.md must be gitignored and must never appear in any commit.
- Must: The agent name must pass a registry uniqueness check (search_knowledge) before it is declared or used anywhere in the sequence.
- Must: The LORE bootstrap capture must use `status=locked`.
- Must: Step order must follow the canonical sequence from DDR-001 §3.2 (1 through 13); steps may not be reordered.

### Anti-Requirements
- Must not: Call `git config --global` or `git config --system` at any point.
- Must not: Create repos under any GitHub account other than `dannySubsense` (islandef is work-only).
- Must not: Modify or overwrite template files in `~/runtime/agent-lore/`.
- Must not: Proceed past input gathering (US-01) without Danny's explicit confirmation.
- Must not: Silently swallow a git push failure; all errors must surface to Danny.
- Must not: Declare agent name before completing the registry search.

### Assumptions
- Assumes: `~/runtime/agent-lore/HOMELAB-CLAUDE.md.template` and `~/runtime/agent-lore/MACHINE-SETUP.md.template` exist and are current on the machine running the command.
- Assumes: The `gh` CLI is installed and authenticated as `dannySubsense` on the executing machine.
- Assumes: The `lore-gateway` MCP is available in the Claude Code session (registered system-wide at `~/.claude.json`).
- Assumes: The `github.com-danny` SSH alias is configured in `~/.ssh/config`; if absent, MACHINE-SETUP.md documents the setup procedure.
- Assumes: Cairn is a known relay agent reachable via send_message; if not, bootstrap proceeds and registration is deferred.
- Assumes: LORE DB at `100.127.177.103:5432/lore` is reachable over Tailscale during the LORE capture step.
- Assumes: The machine's global `~/.gitconfig` is owned by another identity (Major Tom) and must not be modified.
