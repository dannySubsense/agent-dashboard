# INVARIANTS.md — agent-dashboard

Inviolable rules for all Forge sessions in this project. Any violation is a HALT condition.

---

## Git Identity

- `git config user.email` → `danny@subsense.art` (per-repo only)
- `git config user.name` → `dannySubsense` (per-repo only)
- **NEVER** `git config --global` — `~/.gitconfig` belongs to Major Tom
- Default branch: `main`
- SSH remote alias: `git@github.com-danny:dannySubsense/<repo>.git`

## GitHub

- All homelab repos under `dannySubsense` account only
- `islandef` org is work — never used for homelab
- `gh repo create` must use `dannySubsense/<name>` form
- User email for GitHub correspondence: `dclarke@islandef.com` (work) — not used in commits

## LORE Capture

- Every meaningful decision, deviation, or HALT → `capture_memory`
- Required fields: `projectId: "agent-dashboard"`, `author: "lumen"`
- `documentType` ∈ {`spec`, `decision`, `halt`, `discovery`, `test-result`, `review`}
- `epistemicType` ∈ {`FACT`, `EXPERIENCE`, `OPINION`, `OBSERVATION`} — required, no omissions
- `status: "locked"` for finalized decisions; `"draft"` for in-progress
- Use `supersedesId` when replacing a prior capture
- No silent session endings — close with a session-close decision capture

## Code Quality Gates (all slices)

- TypeScript strict mode — no `any` unless justified and commented
- No unused imports or variables
- Tailwind v4 only — no inline styles, no CSS modules unless Nivo forces it
- No hardcoded secrets or credentials in committed files

## Test Coverage

- Threshold: defined per-sprint in `04-ROADMAP.md` (architect sets it based on deliverable type)
- Slash command skills: integration/smoke tests; line coverage metric does not apply
- Next.js UI components: snapshot + interaction tests at minimum
- Business logic modules: line coverage threshold set in architecture doc for that sprint
- No skipping tests without a HALT + human approval

## Commits

- Author: `dannySubsense <danny@subsense.art>`
- Message format: `<type>: <description>` (conventional commits)
- No `--no-verify`
- Commit per slice, not per file

## Slash Command / Skill Files

- Source of record for all homelab skills: `agent-dashboard` repo under `.claude/commands/`
- Deployed artifact: `~/.claude/commands/<skill-name>.md` (global install)
- Templates (HOMELAB-CLAUDE.md.template, MACHINE-SETUP.md.template) consumed from `~/runtime/agent-lore/` — never copied into this repo
- agent-dashboard is a consumer of agent-lore templates, not their owner

## Agent Relay

- Relay handle: `lumen` (lowercase, exact)
- Always `release_lock` after `acquire_lock` — no held locks at session end
- Cairn is the registry authority — registration goes through `cairn` on thread `registration`

---

*Updated: 2026-06-20 | Author: lumen*
