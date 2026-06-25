# DDR-009 — Bootstrap Skill v1.1 Fixes

- **Status:** ACCEPTED (shipped, PR #— commit 07f5fb5)
- **Author:** lumen
- **Date:** 2026-06-20
- **Sprint (on approval):** bootstrap-skill-v1-1
- **Supersedes:** DDR-001 (partial — two omissions corrected)
- **GitHub issue:** #1

---

## §1 Context

Two omissions were discovered during the smoke test of bootstrap-skill-v1 (run by Flint on 2026-06-20):

1. `00-DDR-INDEX.md` is created in Step 11 but not staged in Step 12's initial commit. The Fixed Decision Table specifies exactly three staged files (`.gitignore`, `HOMELAB-CLAUDE.md.template`, `.claude/commands/relay.md`). The DDR index is the canonical starting point for the project's DDR backlog — its absence from the initial commit means a fresh clone of any bootstrapped repo has no DDR directory at all.

2. `CLAUDE.md` is generated from `HOMELAB-CLAUDE.md.template` in Step 4, but the template contains a placeholder paragraph for what the project owns and does. This placeholder is not resolved during bootstrap because no corresponding input is collected from Danny. The result is a CLAUDE.md that is partially complete at project birth — the project context paragraph must be filled in manually.

Both are correctness gaps in v1, not design choices.

---

## §2 Principle

Bootstrap is complete or it isn't. A freshly cloned repo with no DDR directory, and a CLAUDE.md with a placeholder paragraph, is not a fully bootstrapped project. These fixes close the two remaining gaps without adding complexity — they extend Step 1 by one field and Step 12 by one staged file.

---

## §3 Decision

### 3.1 Fix A — Stage 00-DDR-INDEX.md in the bootstrap commit

Add `docs/specs/<InputBundle.projectId>-ddrs/00-DDR-INDEX.md` to the staged files list in Step 12.

Updated Fixed Decision Table entry:
- Bootstrap staged files: `.gitignore`, `HOMELAB-CLAUDE.md.template`, `.claude/commands/relay.md`, `docs/specs/<InputBundle.projectId>-ddrs/00-DDR-INDEX.md`

The `git add` command in Step 12 becomes:

```bash
git add .gitignore HOMELAB-CLAUDE.md.template .claude/commands/relay.md docs/specs/<InputBundle.projectId>-ddrs/00-DDR-INDEX.md
```

Note: the DDR index path is variable (contains `InputBundle.projectId`), so the staged files entry in the Fixed Decision Table must document the pattern, not a literal path.

### 3.2 Fix B — Collect projectContext in Step 1

Add a 5th Danny-supplied field to Step 1 input gathering:

| Field | Format |
|---|---|
| `projectContext` | One paragraph: what does this project own, build, or solve? Passed verbatim into the HOMELAB-CLAUDE.md.template placeholder. |

This field is collected alongside the existing four fields in Substep 1.1, displayed in the Substep 1.4 confirmation gate, and threaded into the HOMELAB template substitution in Step 4.

The HOMELAB-CLAUDE.md.template placeholder token for this field is to be confirmed at implementation time by reading the actual template (same Risk A resolution pattern used in v1 — read the template, confirm the token, document it).

### 3.3 Scope

- Modifies: `.claude/commands/new-project.md` (Steps 1, 4, 12; Fixed Decision Table; Variable Inputs)
- Modifies: `docs/specs/bootstrap-skill-v1-1/` (new sprint spec directory)
- Does not modify: any template file in `~/runtime/agent-lore/` (read-only from this skill)
- Does not reorder the 13 canonical steps

### 3.4 Fixed Decisions (inherited from DDR-001 §3.3, no changes)

All fixed decisions from DDR-001 carry forward unchanged.

| Decision | Value | Reason |
|---|---|---|
| GitHub account | `dannySubsense` | Only personal account used for homelab |
| Git email | `danny@subsense.art` | Personal identity; `islandef` is work-only |
| Git name | `dannySubsense` | Matches GitHub account |
| Branch name | `main` | Standard |
| SSH remote alias | `github.com-danny` | Required on this shared machine |
| git config scope | per-repo only | `~/.gitconfig` belongs to Major Tom |
| LORE DB | `<lore-db-host>:5432/lore` | Tailscale Postgres on VM 103 |

---

## §4 Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| HOMELAB template placeholder token for projectContext unknown | M | Read template at Slice 1 implementation; confirm token before authoring Step 4 substitution map |
| DDR index path in git add is variable — agent must substitute projectId at runtime | L | Step 12 must clearly state the resolved path form; verification via `git status` post-add |

---

## §5 Open Questions

All questions pre-resolved:
- Fix A staging addition: confirmed correct (DDR index belongs in founding commit)
- Fix B input field: confirmed correct (projectContext fills the only remaining CLAUDE.md placeholder)
- Sprint name: bootstrap-skill-v1-1
- No new fixed decisions required
