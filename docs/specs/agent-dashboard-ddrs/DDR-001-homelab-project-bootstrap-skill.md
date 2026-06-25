# DDR-001 — Homelab Project Bootstrap Skill

- **Status:** ACCEPTED
- **Author:** lumen
- **Date:** 2026-06-20
- **Sprint (on approval):** bootstrap-skill-v1
- **Supersedes:** —

---

## §1 Context

Every new homelab project requires the same sequence of setup steps: CLAUDE.md from template, agent naming and Cairn registration, LORE projectId, git init with correct identity, GitHub repo under dannySubsense, SSH remote alias, gitignore, MACHINE-SETUP.md, relay skill, and bootstrap LORE capture. This sequence currently lives only in institutional memory — re-derived manually each time.

The agent-dashboard project was bootstrapped this way on 2026-06-20 and exposed the gap clearly: the steps took significant session time, required back-and-forth clarification (GitHub account, git identity), and produced artifacts that were inconsistent until conventions were locked mid-session.

A generalized `/new-project` skill encodes the canonical sequence once, makes it reproducible by any producer agent, and establishes the consistent repo shape that the agent-dashboard itself will rely on when scanning homelab projects.

---

## §2 Principle

Bootstrap is infrastructure, not ceremony. The skill must be opinionated — it makes the safe decisions (dannySubsense, github.com-danny alias, .gitignore conventions) and asks the human only for the irreducible variables (project name, public vs private, agent name). A future session should be able to run `/new-project` and produce an identical repo shape without consulting prior session transcripts.

---

## §3 Decision

### 3.1 Deliverable

A single slash command file: `.claude/commands/new-project.md` authored and maintained in `agent-dashboard` (source of record). Installed to `~/.claude/commands/new-project.md` for global availability across all homelab Claude Code sessions. Author ≠ install location — agent-dashboard owns the source, the global commands directory gets the deployed artifact.

### 3.2 Skill Steps (canonical order)

The skill walks the producer agent through these steps in sequence:

1. **Gather inputs** — collect from Danny: `<project-name>`, `<project-id>`, `<repo-description>`, `public | private`
2. **Vision quest** — agent declares its name (short lowercase, unique, with etymology); checks Agent Registry via `search_knowledge` in `lore-personal` before declaring
3. **Register with Cairn** — `send_message` to `cairn` on thread `registration` with: name, author slug, relay handle, projectId, repo, host, status, role, etymology
4. **CLAUDE.md** — write from `HOMELAB-CLAUDE.md.template`, filling all placeholders; gitignore it
5. **Relay skill** — write `.claude/commands/relay.md` with agent's own handle
6. **MACHINE-SETUP.md** — write from canonical template (owned by agent-dashboard); gitignore it
7. **`.gitignore`** — write with standard homelab ignores: `CLAUDE.md`, `MACHINE-SETUP.md`, `.env`, `.env*.local`, `node_modules/`, `.next/`, `dist/`
8. **`git init`** — initialize repo; rename branch to `main`; set identity via: `git config user.email "danny@subsense.art" && git config user.name "dannySubsense"` (never `git config --global`)
9. **GitHub repo** — `gh repo create dannySubsense/<repo> --<visibility> --description "<desc>"`
10. **Remote** — `git remote add origin "git@github.com-danny:dannySubsense/<repo>.git"`
11. **DDR directory** — `mkdir -p docs/specs/<project-id>-ddrs/`; create `00-DDR-INDEX.md` stub
12. **Initial commit** — stage `.gitignore`, `HOMELAB-CLAUDE.md.template`, `.claude/commands/relay.md`; commit with message `chore: project bootstrap`; push to `origin main`
13. **LORE bootstrap capture** — `capture_memory` with projectId, author, documentType `decision`, status `locked`; record agent identity, stack, workflow, roles

### 3.3 Fixed Decisions (never ask Danny)

| Decision | Value | Reason |
|---|---|---|
| GitHub account | `dannySubsense` | Only personal account used for homelab |
| Git email | `danny@subsense.art` | Personal identity; `islandef` is work-only |
| Git name | `dannySubsense` | Matches GitHub account |
| Branch name | `main` | Standard |
| SSH remote alias | `github.com-danny` | Required on this shared machine |
| git config scope | per-repo only | `~/.gitconfig` belongs to Major Tom |
| LORE DB | `<lore-db-host>:5432/lore` | Tailscale Postgres on VM 103 |

### 3.4 Variable Inputs (ask Danny)

| Input | Notes |
|---|---|
| Project name | Human-readable, e.g. "Agent Dashboard" |
| Project ID / slug | kebab-case, becomes LORE `projectId` and DDR path prefix |
| Repo description | One sentence for GitHub |
| Visibility | `public` or `private` — agent may recommend based on content sensitivity |
| Agent name | Declared by the agent after vision quest; confirmed by Danny |

### 3.5 MACHINE-SETUP.md Template

The canonical MACHINE-SETUP.md template lives in `~/runtime/agent-lore/` as `MACHINE-SETUP.md.template`, co-located with `HOMELAB-CLAUDE.md.template`. Both are owned by agent-lore (Cairn), gitignored, and pull-proof. The bootstrap skill reads from this location when generating a new project's MACHINE-SETUP.md. New projects adapt the project-specific sections (repo table, env vars, dev server commands); shared-machine sections copy verbatim.

`HOMELAB-CLAUDE.md.template` ownership remains with agent-lore — not transferred to agent-dashboard.

---

## §4 Sequencing

This DDR is self-contained — no dependencies. It is the first DDR for agent-dashboard and is intended to be the first sprint. The bootstrap skill is foundational platform tooling; the dashboard UI DDRs follow it.

Build order rationale: a working bootstrap skill means every subsequent homelab project starts consistently, which means the dashboard can make strong assumptions about repo shape when it scans projects.

---

## §5 Risks

| Risk | Mitigation |
|---|---|
| Cairn unavailable at bootstrap time | Skill proceeds; registration message queued on relay, checked at next session |
| `github.com-danny` SSH alias missing on a new machine | MACHINE-SETUP.md documents the alias setup; skill halts with a clear error if push fails |
| Agent name collision (name already in registry) | Step 2 requires registry search before declaring; skill blocks if collision detected |
| `git config --global` accidentally called | Skill explicitly uses per-repo scope; fixed in the command text |

---

## §6 Resolved Questions

1. **Distribution** — skill authored in `agent-dashboard`, installed globally to `~/.claude/commands/`. No per-project copying needed. (Resolved 2026-06-20 via Cairn / Danny.)
2. **MACHINE-SETUP.md template ownership** — lives in `~/runtime/agent-lore/` alongside `HOMELAB-CLAUDE.md.template`, owned by agent-lore. agent-dashboard is a consumer, not the owner. No ownership transfer for either template. (Resolved 2026-06-20 via Cairn / Danny.)
3. **Scope boundary** — skill stops at the git/GitHub/LORE layer. Stack init (`npm init`, `uv init`, etc.) is left to the project's first sprint spec. The bootstrap skill's value is the invariant layer common to all projects. (Resolved 2026-06-20, Danny + Lumen.)
