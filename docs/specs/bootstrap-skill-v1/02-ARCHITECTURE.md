# Architecture: /new-project Slash Command (bootstrap-skill-v1)

- **Status:** DRAFT
- **Author:** lumen (architect)
- **Date:** 2026-06-20
- **Source DDR:** DDR-001 (ACCEPTED)
- **Sprint:** bootstrap-skill-v1

---

## 1. Overview

The deliverable is a single Markdown slash command file that encodes the canonical 13-step homelab project bootstrap sequence. When invoked in Claude Code (`/new-project`), the executing producer agent reads the command text and follows it procedurally — gathering inputs, performing a vision quest, registering with Cairn, generating files, initializing git, creating the GitHub repo, and capturing the bootstrap record to LORE. The architecture describes the command document's internal structure, the protocols encoded in each step, the data that flows between steps, and the error handling rules that govern when to halt versus proceed.

This is not a software module. There is no compilation, no runtime, no test framework. The "architecture" is the specification of what the command document must contain and how an executing agent must behave when following it.

---

## 2. Deliverable

| Property | Value |
|---|---|
| File | `.claude/commands/new-project.md` |
| Source of record | `agent-dashboard` repo at `.claude/commands/new-project.md` |
| Deployed location | `~/.claude/commands/new-project.md` (global, manual install) |
| Invocation | `/new-project` in any Claude Code session on the host machine |
| Build step | None |
| Format | Markdown; frontmatter `description:` block supported by Claude Code |

---

## 3. Command File Structure

The command file contains these top-level sections in order:

```
1. Frontmatter block     — description: field (displayed in /command picker)
2. Preamble              — one paragraph declaring what this command does
3. Fixed Decision Table  — locked values the agent must never ask Danny about
4. Variable Inputs       — the four fields the agent must collect from Danny
5. Pre-flight Validation — checks to run after inputs confirmed, before any write
6. Step 1–13            — the canonical bootstrap sequence with substeps, tool calls,
                           halt conditions, and non-blocking error rules
7. Error Reference       — halt codes with exact messages and resolution instructions
```

Each step section contains:
- **What to do** — the action in plain language
- **Tool calls** — exact MCP tools or Bash commands to invoke
- **Validation** — what to verify after the action
- **Halt conditions** — `HALT:` tags with error messages for blocking failures
- **Non-blocking errors** — `SURFACE:` tags for failures that must not stop execution

---

## 4. Data Structures

These structures represent the context the executing agent must maintain across all 13 steps. They are not compiled; they describe what the agent tracks in its working context.

### 4.1 InputBundle (populated during Step 1)

```
projectName:     string   — human-readable, e.g. "Agent Dashboard"
projectId:       string   — kebab-case, e.g. "agent-dashboard"; becomes LORE projectId and DDR path prefix
repoDescription: string   — one sentence; passed verbatim to gh repo create --description
visibility:      "public" | "private"
repoName:        string   — derived from projectId (same value unless Danny overrides at Step 9 conflict)
```

Validation rules encoded in the command:
- `projectId` must match `/^[a-z][a-z0-9-]+[a-z0-9]$/` (kebab-case). Re-prompt on failure.
- `visibility` must be exactly `public` or `private`. Re-prompt on any other value.
- All four fields must be confirmed by Danny before any action proceeds.

### 4.2 AgentIdentity (populated during Step 2, confirmed during Step 2)

```
name:        string   — proposed agent name, e.g. "lumen"
slug:        string   — lowercase form of name; same value; permanent author identifier
relayHandle: string   — same as slug; case-sensitive on Switchboard
etymology:   string   — explanation of the name's meaning and rationale
confirmed:   boolean  — set true only after Danny's explicit approval in Step 2 confirmation substep
```

### 4.3 CairnRegistrationPayload (constructed during Step 3)

```
name:        string   — AgentIdentity.name (capitalized form acceptable in message content)
authorSlug:  string   — AgentIdentity.slug
relayHandle: string   — AgentIdentity.relayHandle
projectId:   string   — InputBundle.projectId
repo:        string   — "dannySubsense/" + InputBundle.repoName
host:        string   — "vm101"
status:      string   — "active"
role:        string   — "producer"
etymology:   string   — AgentIdentity.etymology
```

### 4.4 BootstrapCapturePayload (constructed during Step 13)

```
projectId:     string   — InputBundle.projectId
author:        string   — AgentIdentity.slug
documentType:  "decision"
epistemicType: "FACT"
status:        "locked"
content:       string   — narrative covering: agent name, slug, relay handle, etymology,
                          workflow pattern (DDR → spec → forge), roles (Composer/Producer/Frank),
                          and creation date
```

### 4.5 Template Placeholder Maps

**HOMELAB-CLAUDE.md.template → CLAUDE.md:**

| Placeholder | Resolved value |
|---|---|
| `<PROJECT-NAME>` | InputBundle.projectName |
| `<AGENT-NAME>` | AgentIdentity.slug |
| `<REPO-NAME>` | InputBundle.repoName |
| `<PROJECT-ID>` | InputBundle.projectId |

After substitution: zero placeholder strings of the form `<ALL-CAPS-WITH-HYPHENS>` may remain in the output file. The agent must verify this before writing.

**MACHINE-SETUP.md.template → MACHINE-SETUP.md:**

| Placeholder | Resolved value |
|---|---|
| `<REPO-NAME>` | InputBundle.repoName |

Same zero-placeholder post-condition applies.

**Scope note (Gap B resolution):** DDR-001 §3.5 mentions that new projects adapt the MACHINE-SETUP.md "repo table, env vars, and dev server commands." For bootstrap-skill-v1, only `<REPO-NAME>` is substituted. The env-vars table and dev-server commands sections are left as template defaults — these are stack-specific and unknown at bootstrap time. Adaptation of those sections is the responsibility of the project's first sprint spec (per DDR-001 §6.3: "stack init is left to the project's first sprint spec"). This reduction is intentional for v1.

**relay.md (inline template — no external file):**

The relay.md content is defined inline in the command using `<AGENT-SLUG>` as the single placeholder:

```
Check the Switchboard relay for messages.

1. Call `read_messages({ agent_id: "<AGENT-SLUG>" })` — primary handle
2. If messages are waiting, read them and respond via `send_message({ from: "<AGENT-SLUG>", to: "<sender>", message: "..." })`
3. If inbox is empty, report: "No messages."

Keep responses concise and on-topic.
```

`<AGENT-SLUG>` is replaced with `AgentIdentity.slug` before writing to `.claude/commands/relay.md`.

---

## 5. Step Architecture

### Step 1 — Input Gathering

**Substeps:**
1. Prompt Danny for all four InputBundle fields.
2. Validate `projectId` is kebab-case; re-prompt on failure.
3. Validate `visibility` is `public` or `private`; re-prompt on any other value.
4. Present the complete InputBundle to Danny and await explicit confirmation.
5. Check LORE for an existing projectId collision: call `search_knowledge({ query: InputBundle.projectId, projectId: "lore-personal", minSimilarity: 0.1 })`. If results reference the same projectId in an existing project record, warn Danny and require confirmation or alternate ID before proceeding.

**No irreversible actions occur in this step.** No files are written, no commands run.

---

### Pre-flight Validation (after Step 1 confirmation, before Step 2)

Run all four checks before any write or system operation. If any blocking check fails, do not proceed to Step 2.

| Check | Command / Tool | Pass condition | On failure |
|---|---|---|---|
| git installed | `git --version` | Exit code 0 | HALT: git not found |
| gh CLI authenticated as dannySubsense | `gh auth status` | Output contains `dannySubsense` | HALT: gh CLI not authenticated or wrong account |
| LORE gateway reachable | `mcp__lore-gateway__check_health` | Returns healthy status | HALT: LORE gateway unreachable |
| SSH alias configured | `grep -c "github.com-danny" ~/.ssh/config` | Returns ≥ 1 | WARN: SSH alias missing; note that Step 12 push will fail; direct Danny to MACHINE-SETUP.md SSH section |
| Switchboard available | `send_message` dry-run or `relay_status` | Responds without error | NOTE: non-blocking; Step 3 Cairn registration will proceed with failure surfaced |

---

### Step 2 — Vision Quest + Agent Name Confirmation

**Substeps:**
1. Call `search_knowledge({ query: "Agent Registry registered agents", projectId: "lore-personal", minSimilarity: 0.1 })`.
2. Review all returned results. Extract any existing agent names and slugs.
3. Propose a short, lowercase agent name with full etymology. The name must not match any entry found in 2.2.
4. If a collision is detected, discard the proposed name, choose an alternative with distinct etymology, and return to 2.3.
5. Present the proposed name and etymology to Danny. Include the registry search summary to demonstrate uniqueness.
6. Await Danny's explicit approval before proceeding.
7. If Danny rejects the name, return to 2.3 and propose a new name with distinct etymology.
8. On approval, set `AgentIdentity.confirmed = true`. This is the authoritative agent identity for all subsequent steps.

**No name may appear in any file, command, or payload until `AgentIdentity.confirmed = true`.**

---

### Step 3 — Cairn Registration

**Substeps:**
1. Construct `CairnRegistrationPayload` from `AgentIdentity` and `InputBundle`.
2. Call `send_message({ from: AgentIdentity.slug, to: "cairn", thread: "registration", message: <CairnRegistrationPayload as structured text> })`.
3. If `send_message` succeeds, log: "Cairn registration sent."
4. If `send_message` fails (Cairn unavailable, relay error, or timeout), **do not halt**. Surface to Danny: "Cairn registration pending — Switchboard unavailable. Send registration message manually at next relay session." Record the pending action in the session summary.

Registration is **non-blocking**. The bootstrap sequence continues regardless of Cairn's response.

---

### Step 4 — CLAUDE.md Generation

**Substeps:**
1. Read `~/runtime/agent-lore/HOMELAB-CLAUDE.md.template` using the Read tool.
   - HALT if file not found: "HALT: Template not found at ~/runtime/agent-lore/HOMELAB-CLAUDE.md.template. Verify agent-lore runtime is present on this machine."
2. Resolve all placeholders using the map in §4.5.
3. Verify zero placeholder strings remain in the resolved content.
4. Write the resolved content to `CLAUDE.md` in the project root using the Write tool.
5. Copy `~/runtime/agent-lore/HOMELAB-CLAUDE.md.template` to `HOMELAB-CLAUDE.md.template` in the project root (reference copy for the initial commit — see Step 12).

Note: `CLAUDE.md` will be gitignored by Step 7. The reference copy `HOMELAB-CLAUDE.md.template` is committed in Step 12.

---

### Step 5 — Relay Skill

**Substeps:**
1. Construct relay.md content by substituting `AgentIdentity.slug` for `<AGENT-SLUG>` in the inline template (see §4.5).
2. Create directory `.claude/commands/` in the project root if it does not exist.
3. Write the resolved content to `.claude/commands/relay.md` using the Write tool.
4. Verify no `<AGENT-SLUG>` placeholder remains in the written file.

---

### Step 6 — MACHINE-SETUP.md Generation

**Substeps:**
1. Read `~/runtime/agent-lore/MACHINE-SETUP.md.template` using the Read tool.
   - HALT if file not found: "HALT: Template not found at ~/runtime/agent-lore/MACHINE-SETUP.md.template. Verify agent-lore runtime is present on this machine."
2. Resolve `<REPO-NAME>` placeholder using the map in §4.5.
3. Verify zero placeholder strings remain.
4. Write the resolved content to `MACHINE-SETUP.md` in the project root using the Write tool.

Note: `MACHINE-SETUP.md` will be gitignored by Step 7. It must never appear in any commit.

---

### Step 7 — .gitignore Creation

Write `.gitignore` to the project root with exactly these entries (one per line, in this order):

```
CLAUDE.md
MACHINE-SETUP.md
.env
.env*.local
node_modules/
.next/
dist/
```

No entries may be omitted. Additional project-specific entries may follow but the seven above must appear first.

---

### Step 8 — Git Initialization

Execute in sequence:

```bash
git init
git branch -m main
git config user.email "danny@subsense.art"
git config user.name "dannySubsense"
```

All `git config` calls are per-repo scoped (no `--global`, no `--system` flags). This is an absolute constraint — these flags are prohibited by the skill text.

Verification: `git config --list | grep user` must show `danny@subsense.art` and `dannySubsense`.

---

### Step 9 — GitHub Repo Creation

```bash
gh repo create dannySubsense/<InputBundle.repoName> \
  --<InputBundle.visibility> \
  --description "<InputBundle.repoDescription>"
```

- HALT on non-zero exit code. Surface the exact error message from gh CLI to Danny.
- If the error indicates the repo name is already taken: present the error to Danny, accept an alternate repo name, update `InputBundle.repoName`, and retry this step once.
- On success: confirm the repo URL returned by gh CLI.

---

### Step 10 — SSH Remote Configuration

```bash
git remote add origin "git@github.com-danny:dannySubsense/<InputBundle.repoName>.git"
```

Verification: `git remote -v` must show `origin` using `github.com-danny` SSH alias.

If the remote add fails (e.g., origin already exists), HALT with the error message.

---

### Step 11 — DDR Directory Bootstrap

```bash
mkdir -p docs/specs/<InputBundle.projectId>-ddrs/
```

Write `docs/specs/<InputBundle.projectId>-ddrs/00-DDR-INDEX.md` with this stub content:

```markdown
# DDR Index — <InputBundle.projectName>

| # | Title | Status |
|---|-------|--------|
```

---

### Step 12 — Initial Commit and Push

Stage exactly these three items (no others):

```bash
git add .gitignore HOMELAB-CLAUDE.md.template .claude/commands/relay.md
```

Verify that `git status` shows `CLAUDE.md` and `MACHINE-SETUP.md` as untracked and excluded (listed under `.gitignore`-excluded files, not in the staged set).

Commit:

```bash
git commit -m "chore: project bootstrap"
```

Push:

```bash
git push origin main
```

- HALT on push failure. Do not retry silently. Report the exact error to Danny. The repo remains in valid local-only state.
- If push fails with an SSH error, direct Danny to `MACHINE-SETUP.md` SSH alias setup section.

---

### Step 13 — LORE Bootstrap Capture

Construct and call:

```
capture_memory({
  projectId:     InputBundle.projectId,
  author:        AgentIdentity.slug,
  documentType:  "decision",
  epistemicType: "FACT",
  status:        "locked",
  content:       <narrative — see §4.4>
})
```

The content narrative must include at minimum: agent name, author slug, relay handle, etymology, workflow pattern (DDR → spec → forge), project roles (Composer: Danny, Producer: AgentIdentity.name, Frank: /senior-qc), and bootstrap date.

- If `capture_memory` fails, **do not halt**. Surface to Danny: "LORE bootstrap capture failed. Re-run capture_memory manually before closing this session." Record the pending action.

---

## 6. Protocol Specifications

### 6.1 Vision Quest Registry Check

```
Tool:      mcp__lore-gateway__search_knowledge
Arguments:
  query:          "Agent Registry registered agents"
  projectId:      "lore-personal"
  minSimilarity:  0.1
Fallback:         if results sparse, retry with minSimilarity: 0.05
```

The agent scans all returned documents for agent name strings. Any name that matches the proposed agent name (case-insensitive) constitutes a collision. The collision check is name-only — projectId is not a collision factor.

### 6.2 Cairn Registration Message

```
Tool:      send_message (Switchboard relay MCP)
Arguments:
  from:    AgentIdentity.slug
  to:      "cairn"
  thread:  "registration"
  message: structured text containing CairnRegistrationPayload fields (§4.3)
```

Message format for the `message` field:

```
New agent registration request:

Name: <name>
Author slug: <authorSlug>
Relay handle: <relayHandle>
Project ID: <projectId>
Repo: <repo>
Host: <host>
Status: <status>
Role: <role>
Etymology: <etymology>
```

### 6.3 LORE Bootstrap Capture

```
Tool:      mcp__lore-gateway__capture_memory
Arguments: BootstrapCapturePayload fields (§4.4)
```

Content is a narrative paragraph, not structured JSON. Minimum coverage: agent name, slug, relay handle, etymology, workflow, roles.

---

## 7. Error Handling Strategy

### Halt Conditions (execution stops, error reported to Danny)

| Step | Condition | HALT message |
|---|---|---|
| Pre-flight | git not found | `git --version` returned non-zero. Install git before running /new-project. |
| Pre-flight | gh CLI not authenticated or wrong account | `gh auth status` failed or shows account other than dannySubsense. Run `gh auth login` as dannySubsense. |
| Pre-flight | LORE gateway unreachable | `check_health` failed. Verify lore-gateway MCP is registered and LORE DB is reachable over Tailscale. |
| Step 4 | HOMELAB-CLAUDE.md.template missing | Template not found at `~/runtime/agent-lore/HOMELAB-CLAUDE.md.template`. Verify agent-lore runtime. |
| Step 6 | MACHINE-SETUP.md.template missing | Template not found at `~/runtime/agent-lore/MACHINE-SETUP.md.template`. Verify agent-lore runtime. |
| Step 9 | gh repo create fails | Exact gh CLI error surfaced. If name conflict: accept alternate name from Danny and retry. All other errors: HALT. |
| Step 10 | git remote add fails | Exact git error surfaced. |
| Step 12 | git push fails | Exact error surfaced. If SSH error: direct Danny to MACHINE-SETUP.md. Repo left in local-only valid state. No retry. |

### Non-blocking Failures (execution continues, pending action surfaced)

| Step | Condition | Surface message |
|---|---|---|
| Step 3 | Cairn send_message fails | Cairn registration pending — Switchboard unavailable. Send registration manually at next relay session. |
| Step 13 | capture_memory fails | LORE bootstrap capture failed. Re-run capture_memory manually before closing this session. |

### Validation Loops (not errors — re-prompt until resolved)

| Step | Condition | Action |
|---|---|---|
| Step 1 | projectId is not kebab-case | Re-prompt for projectId only. |
| Step 1 | visibility is not `public` or `private` | Re-prompt for visibility only. |
| Step 2 | Proposed name collides with registry entry | Discard name; propose new name with distinct etymology; repeat registry check. |
| Step 2 | Danny rejects proposed name | Propose new name with distinct etymology; repeat from Step 2.3. |

---

## 8. Fixed Decision Table

These values are encoded directly in the command text. The agent must never ask Danny about them.

| Decision | Fixed value | Rationale |
|---|---|---|
| GitHub account | `dannySubsense` | Only personal account used for homelab; islandef is work-only |
| Git email | `danny@subsense.art` | Personal identity |
| Git name | `dannySubsense` | Matches GitHub account |
| Branch name | `main` | Standard |
| SSH remote alias | `github.com-danny` | Required on this shared machine (another identity owns default ssh config) |
| git config scope | per-repo (no `--global`, no `--system`) | `~/.gitconfig` belongs to Major Tom |
| LORE DB | `100.127.177.103:5432/lore` | Tailscale Postgres on VM 103 |
| Template source dir | `~/runtime/agent-lore/` | Owned by agent-lore; read-only from this skill |
| HOMELAB-CLAUDE.md template filename | `HOMELAB-CLAUDE.md.template` | Established filename |
| MACHINE-SETUP.md template filename | `MACHINE-SETUP.md.template` | Established filename |
| Bootstrap commit message | `chore: project bootstrap` | Exact string; no variation |
| Bootstrap staged files | `.gitignore`, `HOMELAB-CLAUDE.md.template`, `.claude/commands/relay.md` | Exactly these three; CLAUDE.md and MACHINE-SETUP.md are gitignored and excluded |
| LORE documentType (bootstrap) | `decision` | Bootstrap establishes founding decisions |
| LORE epistemicType (bootstrap) | `FACT` | Agent identity and project config are facts |
| LORE status (bootstrap) | `locked` | Bootstrap capture is authoritative and permanent |
| Cairn relay handle | `cairn` | Agent Registry registrar handle |
| Cairn thread | `registration` | Fixed thread for all registration messages |
| relay.md send identity | `from: AgentIdentity.slug` | Agent sends from its own handle |
| Cairn registration host | `vm101` | This homelab runs on VM 101 |
| Cairn registration status | `active` | All registered agents are active at registration time |
| Cairn registration role | `producer` | All lorekeeper agents registered via this skill have the producer role |

---

## 9. Deployment Model

| Property | Value |
|---|---|
| Source | `/home/d-tuned/projects/agent-dashboard/.claude/commands/new-project.md` |
| Installed path | `~/.claude/commands/new-project.md` |
| Install command | `cp /home/d-tuned/projects/agent-dashboard/.claude/commands/new-project.md ~/.claude/commands/new-project.md` |
| Build step | None |
| CI/CD | None |
| Install trigger | Manual — run after any update to the source file |
| Version tracking | `diff ~/.claude/commands/new-project.md /home/d-tuned/projects/agent-dashboard/.claude/commands/new-project.md` — zero diff means in sync |

The installed file and the source file are byte-identical when up to date. If they diverge, the source (agent-dashboard repo) is authoritative.

---

## 10. Test Strategy

### What "testing" means for a slash command

The command is not executable code. There is no unit test framework. Verification is acceptance-based: invoke the command and inspect artifacts.

### Smoke Test

Invoke `/new-project` with a throwaway project name (e.g., `smoke-bootstrap-test`, projectId `smoke-bootstrap-test`, private, description "Smoke test for /new-project skill"). Verify each artifact after its step completes:

| Step | Artifact to verify |
|---|---|
| 1 | InputBundle displayed and Danny confirmed it |
| Pre-flight | All checks reported pass (or SSH warning acknowledged) |
| 2 | Agent proposed a name; `search_knowledge` result shown; Danny confirmed |
| 3 | Cairn message sent (or pending action surfaced) |
| 4 | `CLAUDE.md` exists in project root; `grep "<" CLAUDE.md` returns zero matches |
| 5 | `.claude/commands/relay.md` exists; contains `AgentIdentity.slug`; no `<AGENT-SLUG>` remains |
| 6 | `MACHINE-SETUP.md` exists; `grep "<" MACHINE-SETUP.md` returns zero matches |
| 7 | `.gitignore` exists; contains all 7 required entries |
| 8 | `git log` shows `dannySubsense <danny@subsense.art>`; `git config --list \| grep user` shows per-repo identity; `git config --global user.email` does NOT match danny@subsense.art (Major Tom's identity preserved) |
| 9 | `gh repo view dannySubsense/smoke-bootstrap-test` returns repo details |
| 10 | `git remote -v` shows `origin git@github.com-danny:dannySubsense/smoke-bootstrap-test.git` |
| 11 | `docs/specs/smoke-bootstrap-test-ddrs/00-DDR-INDEX.md` exists; contains project name header |
| 12 | `git log --oneline` shows `chore: project bootstrap`; `git show --name-only HEAD` lists exactly `.gitignore`, `HOMELAB-CLAUDE.md.template`, `.claude/commands/relay.md` and no other files |
| 13 | `capture_memory` returned a UUID; `mcp__lore-gateway__get_document` on that UUID shows correct fields |

Clean up after smoke test: delete the throwaway GitHub repo (`gh repo delete dannySubsense/smoke-bootstrap-test --yes`) and local directory.

### Integration Test

Full run on a real project. Verify the resulting repo shape matches the DDR-001 §3.2 expected layout. Spot-check: open a new Claude Code session in the new repo, confirm `/relay` command works, confirm `search_knowledge` priming in CLAUDE.md executes without error.

### Regression Check

After any update to the source file in agent-dashboard, verify the installed copy matches:

```bash
diff ~/.claude/commands/new-project.md \
     /home/d-tuned/projects/agent-dashboard/.claude/commands/new-project.md
```

Zero diff is the passing condition.

---

## 11. Requirements Coverage

| User Story | Architecture coverage |
|---|---|
| US-01 Input Gathering | §5 Step 1 (substeps 1–5); §4.1 InputBundle validation rules |
| US-02 Vision Quest | §5 Step 2 (substeps 1–5); §6.1 registry check protocol |
| US-03 Agent Name Confirmation | §5 Step 2 (substeps 5–8); §4.2 AgentIdentity.confirmed gate |
| US-04 Cairn Registration | §5 Step 3; §4.3 CairnRegistrationPayload; §6.2 registration message format |
| US-05 CLAUDE.md Generation | §5 Step 4; §4.5 HOMELAB-CLAUDE.md.template placeholder map |
| US-06 Relay Skill | §5 Step 5; §4.5 relay.md inline template |
| US-07 MACHINE-SETUP.md Generation | §5 Step 6; §4.5 MACHINE-SETUP.md.template placeholder map |
| US-08 .gitignore Creation | §5 Step 7; seven required entries listed verbatim |
| US-09 Git Initialization | §5 Step 8; per-repo config commands; `--global` prohibition encoded in Fixed Decision Table |
| US-10 GitHub Repo Creation | §5 Step 9; exact gh CLI command; halt on non-zero exit |
| US-11 SSH Remote Configuration | §5 Step 10; SSH alias form locked in Fixed Decision Table |
| US-12 DDR Directory Bootstrap | §5 Step 11; DDR-INDEX stub content specified |
| US-13 Initial Commit and Push | §5 Step 12; staged files enumerated exactly; halt on push failure |
| US-14 LORE Bootstrap Capture | §5 Step 13; §4.4 BootstrapCapturePayload; §6.3 protocol |
