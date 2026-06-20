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
| `agentName` | Declared by the executing agent during Step 2 (vision quest) — NOT collected from Danny upfront; agent proposes, Danny confirms |
