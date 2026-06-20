---
description: Bootstrap a new homelab project: agent identity, CLAUDE.md, git, GitHub, LORE capture.
---

## Preamble

This command encodes the canonical 13-step homelab bootstrap sequence. The executing producer agent reads this document and follows it procedurally — gathering inputs from Danny, conducting a vision quest to name and register a new agent identity, registering with Cairn via the Switchboard relay, generating CLAUDE.md and MACHINE-SETUP.md from templates, creating the .gitignore, initializing git, creating the GitHub repo, configuring the SSH remote, bootstrapping the DDR directory, making the initial commit and push, and capturing the bootstrap record to LORE. The result is a fully bootstrapped project with a consistent repo shape ready for the first sprint.

---

## Fixed Decision Table

These values are locked. Never ask Danny about them.

| Decision | Fixed value |
|---|---|
| GitHub account | `dannySubsense` |
| Git email | `danny@subsense.art` |
| Git name | `dannySubsense` |
| Branch name | `main` |
| SSH remote alias | `github.com-danny` |
| git config scope | per-repo (global and system flags prohibited) |
| LORE DB | `100.127.177.103:5432/lore` |
| Template source dir | `~/runtime/agent-lore/` |
| HOMELAB-CLAUDE.md template filename | `HOMELAB-CLAUDE.md.template` |
| MACHINE-SETUP.md template filename | `MACHINE-SETUP.md.template` |
| Bootstrap commit message | `chore: project bootstrap` |
| Bootstrap staged files | `.gitignore`, `HOMELAB-CLAUDE.md.template`, `.claude/commands/relay.md` |
| LORE documentType (bootstrap) | `decision` |
| LORE epistemicType (bootstrap) | `FACT` |
| LORE status (bootstrap) | `locked` |
| Cairn relay handle | `cairn` |
| Cairn thread | `registration` |
| relay.md send identity | `from: AgentIdentity.slug` |
| Cairn registration host | `vm101` |
| Cairn registration status | `active` |
| Cairn registration role | `producer` |

---

## Variable Inputs

Danny must supply the following fields before any action proceeds. All fields must be confirmed before Step 1 completes.

| Field | Format constraint |
|---|---|
| `projectName` | Human-readable display name, e.g. `"Agent Dashboard"` |
| `projectId` | Kebab-case; must match `/^[a-z][a-z0-9-]+[a-z0-9]$/`; becomes LORE `projectId` and DDR path prefix |
| `repoDescription` | One sentence; passed verbatim to `gh repo create --description` |
| `visibility` | Exactly `public` or `private` — no other values accepted |
| `repoName` | Derived: equals `projectId` — the GitHub repository name under `dannySubsense/`. Not collected from Danny. |
| `agentName` | Declared by the executing agent during Step 2 (vision quest) — NOT collected from Danny upfront; agent proposes, Danny confirms |

---

## Pre-flight Validation

Pre-flight runs after Step 1 input confirmation and before Step 2 (vision quest). All five checks must complete before any write or system operation begins.

**HALT checks are blocking.** If any HALT check fails, execution stops immediately. No file is written, no command is run, and no step proceeds. Resolve the reported issue and re-invoke `/new-project`.

**WARN and NOTE checks are non-blocking.** Bootstrap may continue with the issue acknowledged.

---

### Check 1 — git installed

- **Command:** `git --version`
- **Pass condition:** Exit code 0
- **Severity:** HALT
- **Failure message:** `` `git --version` returned non-zero. Install git before running /new-project. ``

---

### Check 2 — gh CLI authenticated as dannySubsense

- **Command:** `gh auth status`
- **Pass condition:** Output contains `dannySubsense`
- **Severity:** HALT
- **Failure message:** `` `gh auth status` failed or shows account other than dannySubsense. Run `gh auth login` as dannySubsense. ``

---

### Check 3 — LORE gateway reachable

- **Tool:** `mcp__lore-gateway__check_health`
- **Pass condition:** Returns healthy status
- **Severity:** HALT
- **Failure message:** `` `check_health` failed. Verify lore-gateway MCP is registered and LORE DB is reachable over Tailscale. ``

---

### Check 4 — SSH alias configured

- **Command:** `grep -c "github.com-danny" ~/.ssh/config`
- **Pass condition:** Result ≥ 1
- **Severity:** WARN (non-blocking)
- **Failure message:** `SSH alias github.com-danny not found in ~/.ssh/config. Step 12 git push will fail. See MACHINE-SETUP.md SSH section to configure the alias before proceeding.`

---

### Check 5 — Switchboard available

- **Tool:** `relay_status` or `send_message` dry-run
- **Pass condition:** Responds without error
- **Severity:** NOTE (non-blocking)
- **Failure message:** `Switchboard unavailable. Step 3 Cairn registration will be surfaced as a pending action.`

---

## Step 1 — Input Gathering

Prompt Danny for the four InputBundle fields, validate each, confirm the bundle, and run a LORE collision check. No files are written and no commands run during this step.

### Substep 1.1 — Prompt for fields

Ask Danny to provide:

- `projectName` — human-readable display name (e.g. `"Agent Dashboard"`)
- `projectId` — kebab-case identifier (e.g. `"agent-dashboard"`); becomes the LORE `projectId` and DDR path prefix
- `repoDescription` — one sentence; passed verbatim to `gh repo create --description`
- `visibility` — exactly `public` or `private`

### Substep 1.2 — Validate projectId

Validate `projectId` against the regex `/^[a-z][a-z0-9-]+[a-z0-9]$/`. If the value does not match, re-prompt Danny for `projectId` only. Repeat until the value passes.

### Substep 1.3 — Validate visibility

Validate that `visibility` is exactly `public` or `private`. Any other value is invalid. Re-prompt Danny for `visibility` only. Repeat until a valid value is provided.

### Substep 1.4 — Confirmation gate

Present the complete InputBundle to Danny:

```
projectName:     <value>
projectId:       <value>
repoName:        <value>  (derived from projectId)
repoDescription: <value>
visibility:      <value>
```

Await Danny's explicit confirmation before proceeding. **No irreversible action proceeds until Danny confirms the full InputBundle.**

### Substep 1.5 — LORE projectId collision check

Call:

```
search_knowledge({
  query: InputBundle.projectId,
  projectId: "lore-personal",
  minSimilarity: 0.1
})
```

If any returned result references the same `projectId` in an existing project record, warn Danny and require explicit confirmation or an alternate `projectId` before proceeding.

### Substep 1.6 — Derive repoName

Set `InputBundle.repoName = InputBundle.projectId`. This is the GitHub repository name. No additional input from Danny is required.

---

## Step 2 — Vision Quest + Agent Name Confirmation

Propose and confirm the agent identity for this project. **No agent name may appear in any file, command, or payload until `AgentIdentity.confirmed = true`.**

### Substep 2.1 — Query the Agent Registry

Call:

```
search_knowledge({
  query: "Agent Registry registered agents",
  projectId: "lore-personal",
  minSimilarity: 0.1
})
```

If results are sparse, retry with `minSimilarity: 0.05`.

### Substep 2.2 — Extract existing names

Review all returned documents. Extract every existing agent name and slug.

### Substep 2.3 — Propose a name

Propose a short, lowercase agent name with full etymology explaining the name's meaning and rationale. The proposed name must not match any entry found in substep 2.2 (case-insensitive comparison).

### Substep 2.4 — Collision check loop

If the proposed name matches any existing registry entry: discard it, choose an alternative with a distinct etymology, and return to substep 2.3. Repeat until a collision-free name is found.

### Substep 2.5 — Present to Danny

Present the proposed name and etymology to Danny. Include a summary of the registry search results demonstrating uniqueness.

### Substep 2.6 — Await approval

Await Danny's explicit approval. Do not proceed until approval is given.

### Substep 2.7 — Handle rejection

If Danny rejects the proposed name, return to substep 2.3 and propose a new name with a distinct etymology.

### Substep 2.8 — Confirm identity

On Danny's approval, set `AgentIdentity.confirmed = true` and record:

```
AgentIdentity.name:        <approved name>
AgentIdentity.slug:        <same lowercase value — permanent author identifier>
AgentIdentity.relayHandle: <same as slug — case-sensitive on Switchboard>
AgentIdentity.etymology:   <approved etymology text>
AgentIdentity.confirmed:   true
```

**No agent name may appear in any file, command, or payload until `AgentIdentity.confirmed = true`.**

---

## Step 3 — Cairn Registration

Register the new agent with Cairn via the Switchboard relay. Registration is **non-blocking** — the bootstrap sequence continues regardless of outcome.

### Construct CairnRegistrationPayload

Build from `AgentIdentity` and `InputBundle`:

```
name:        AgentIdentity.name
authorSlug:  AgentIdentity.slug
relayHandle: AgentIdentity.relayHandle
projectId:   InputBundle.projectId
repo:        "dannySubsense/" + InputBundle.repoName
host:        "vm101"
status:      "active"
role:        "producer"
etymology:   AgentIdentity.etymology
```

### Send registration message

Call:

```
send_message({
  from:    AgentIdentity.slug,
  to:      "cairn",
  thread:  "registration",
  message: <structured text — see format below>
})
```

**Message format** (substitute CairnRegistrationPayload values for each `<field>` token):

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

### On success

Log: "Cairn registration sent."

### On failure (non-blocking)

If `send_message` fails for any reason, do not halt. Surface to Danny:

> SURFACE: Cairn registration pending — Switchboard unavailable. Send registration manually at next relay session.

Record this as a pending action in the session summary.

---

## Step 4 — CLAUDE.md Generation

Read the HOMELAB-CLAUDE.md.template, resolve placeholders, and write CLAUDE.md to the project root.

### Substep 4.1 — Read template

Read `~/runtime/agent-lore/HOMELAB-CLAUDE.md.template` using the Read tool.

- **HALT if not found:** `Template not found at ~/runtime/agent-lore/HOMELAB-CLAUDE.md.template. Verify agent-lore runtime.`

### Substep 4.2 — Resolve placeholders

Substitute all placeholders using the following map:

| Placeholder | Resolved value |
|---|---|
| `<PROJECT-NAME>` | `InputBundle.projectName` |
| `<AGENT-NAME>` | `AgentIdentity.slug` |
| `<REPO-NAME>` | `InputBundle.repoName` |
| `<PROJECT-ID>` | `InputBundle.projectId` |

### Substep 4.3 — Zero-placeholder verification

Before writing, verify that zero placeholder strings of the form `<ALL-CAPS-WITH-HYPHENS>` remain in the resolved content. If any remain, the substitution is incomplete — do not write the file.

### Substep 4.4 — Write CLAUDE.md

Write the resolved content to `CLAUDE.md` in the project root using the Write tool.

### Substep 4.5 — Copy reference template

Copy `~/runtime/agent-lore/HOMELAB-CLAUDE.md.template` to `HOMELAB-CLAUDE.md.template` in the project root. This reference copy is staged and committed in Step 12. Note: `CLAUDE.md` is gitignored by Step 7 and excluded from all commits.

---

## Step 5 — Relay Skill

Create the `/relay` slash command for the new project using the inline template below. This file is staged and committed in Step 12.

### Inline relay.md template

Construct the content of `.claude/commands/relay.md` by substituting `AgentIdentity.slug` for every instance of `<AGENT-SLUG>` in this template:

```
Check the Switchboard relay for messages.

1. Call `read_messages({ agent_id: "<AGENT-SLUG>" })` — primary handle
2. If messages are waiting, read them and respond via `send_message({ from: "<AGENT-SLUG>", to: "<sender>", message: "..." })`
3. If inbox is empty, report: "No messages."

Keep responses concise and on-topic.
```

### Write

1. Create `.claude/commands/` directory in the project root if it does not exist.
2. Write the resolved content to `.claude/commands/relay.md` using the Write tool.

### Verify

Confirm no `<AGENT-SLUG>` placeholder remains in the written file. If any placeholder remains, the substitution failed — do not proceed.

---

## Step 6 — MACHINE-SETUP.md Generation

Read the MACHINE-SETUP.md.template, resolve placeholders, and write MACHINE-SETUP.md to the project root.

### Substep 6.1 — Read template

Read `~/runtime/agent-lore/MACHINE-SETUP.md.template` using the Read tool.

- **HALT if not found:** `Template not found at ~/runtime/agent-lore/MACHINE-SETUP.md.template. Verify agent-lore runtime.`

### Substep 6.2 — Resolve placeholders

Substitute all placeholders using the following map:

| Placeholder | Resolved value |
|---|---|
| `<REPO-NAME>` | `InputBundle.repoName` |

### Substep 6.3 — Zero-placeholder verification

Before writing, verify that zero placeholder strings of the form `<ALL-CAPS-WITH-HYPHENS>` remain in the resolved content. If any remain, the substitution is incomplete — do not write the file.

### Substep 6.4 — Write MACHINE-SETUP.md

Write the resolved content to `MACHINE-SETUP.md` in the project root using the Write tool.

Note: `MACHINE-SETUP.md` is gitignored by Step 7 and must never appear in any commit.

---

## Step 7 — .gitignore Creation

Write `.gitignore` to the project root with exactly these 7 entries in this order, one per line:

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

## Step 8 — Git Initialization

Execute the following 4 commands in sequence:

```bash
git init
git branch -m main
git config user.email "danny@subsense.art"
git config user.name "dannySubsense"
```

The `--global` and `--system` flags are prohibited in this step and in all git config calls throughout this command. git config must always be scoped per-repo.

Verification: run `git config --list | grep user` — output must show `danny@subsense.art` and `dannySubsense`.

---

## Step 9 — GitHub Repo Creation

Run:

```bash
gh repo create dannySubsense/<InputBundle.repoName> \
  --<InputBundle.visibility> \
  --description "<InputBundle.repoDescription>"
```

Error handling:

- HALT on any non-zero exit code — surface the exact gh CLI error to Danny.
- Name conflict special case: if the error indicates the repo name is already taken, present the error to Danny, accept an alternate repo name, update `InputBundle.repoName`, and retry this step once. All other errors: HALT without retry.
- On success: confirm the repo URL returned by gh CLI to Danny.

---

## Step 10 — SSH Remote Configuration

Run:

```bash
git remote add origin "git@github.com-danny:dannySubsense/<InputBundle.repoName>.git"
```

Verification: run `git remote -v` — output must show `origin` using the `github.com-danny` SSH alias.

If the remote add fails for any reason, HALT and surface the exact error to Danny.

---

## Step 11 — DDR Directory Bootstrap

Run:

```bash
mkdir -p docs/specs/<InputBundle.projectId>-ddrs/
```

Write `docs/specs/<InputBundle.projectId>-ddrs/00-DDR-INDEX.md` with this exact stub content (resolving `InputBundle.projectId` and `InputBundle.projectName` from the values confirmed in Step 1):

```markdown
# DDR Index — <InputBundle.projectName>

| # | Title | Status |
|---|-------|--------|
```

---

## Step 12 — Initial Commit and Push

Stage exactly these three items — no others:

```bash
git add .gitignore HOMELAB-CLAUDE.md.template .claude/commands/relay.md
```

Run `git status` and verify that `CLAUDE.md` and `MACHINE-SETUP.md` appear as excluded (listed under gitignore-excluded files, not in the staged set). If either file appears in the staged set, do not commit — investigate and resolve before proceeding.

Commit with this exact message — no variation:

```bash
git commit -m "chore: project bootstrap"
```

Push:

```bash
git push origin main
```

Error handling:

- HALT on push failure. Do not retry silently. Report the exact error to Danny.
- If push fails with an SSH error, direct Danny to `MACHINE-SETUP.md` SSH alias setup section.
- The repo is left in a valid local-only state.

---

## Step 13 — LORE Bootstrap Capture

Construct and call:

```
capture_memory({
  projectId:     InputBundle.projectId,
  author:        AgentIdentity.slug,
  documentType:  "decision",
  epistemicType: "FACT",
  status:        "locked",
  content:       <narrative>
})
```

The content narrative must include at minimum: agent name, author slug, relay handle, etymology, workflow pattern (DDR → spec → forge), project roles (Composer: Danny, Producer: AgentIdentity.name, Frank: /senior-qc), and bootstrap date.

If `capture_memory` fails, do not halt. Surface to Danny:

> LORE bootstrap capture failed. Re-run capture_memory manually before closing this session.

Record the pending action.

---

## Error Reference

### Halt Conditions

| Step | Condition | HALT message |
|------|-----------|--------------|
| Pre-flight | git not found | `git --version` returned non-zero. Install git before running /new-project. |
| Pre-flight | gh CLI not authenticated or wrong account | `gh auth status` failed or shows account other than dannySubsense. Run `gh auth login` as dannySubsense. |
| Pre-flight | LORE gateway unreachable | `check_health` failed. Verify lore-gateway MCP is registered and LORE DB is reachable over Tailscale. |
| Step 4 | HOMELAB-CLAUDE.md.template missing | Template not found at `~/runtime/agent-lore/HOMELAB-CLAUDE.md.template`. Verify agent-lore runtime. |
| Step 6 | MACHINE-SETUP.md.template missing | Template not found at `~/runtime/agent-lore/MACHINE-SETUP.md.template`. Verify agent-lore runtime. |
| Step 9 | gh repo create fails | Exact gh CLI error surfaced. If name conflict: accept alternate name from Danny and retry. All other errors: HALT. |
| Step 10 | git remote add fails | Exact git error surfaced. |
| Step 12 | git push fails | Exact error surfaced. If SSH error: direct Danny to MACHINE-SETUP.md. Repo left in local-only valid state. No retry. |

### Non-blocking Failures

| Step | Condition | Surface message |
|------|-----------|-----------------|
| Step 3 | Cairn send_message fails | Cairn registration pending — Switchboard unavailable. Send registration manually at next relay session. |
| Step 13 | capture_memory fails | LORE bootstrap capture failed. Re-run capture_memory manually before closing this session. |

### Validation Loops

| Step | Condition | Action |
|------|-----------|--------|
| Step 1 | projectId is not kebab-case | Re-prompt for projectId only. |
| Step 1 | visibility is not `public` or `private` | Re-prompt for visibility only. |
| Step 2 | Proposed name collides with registry entry | Discard name; propose new name with distinct etymology; repeat registry check. |
| Step 2 | Danny rejects proposed name | Propose new name with distinct etymology; repeat from Step 2.3. |
