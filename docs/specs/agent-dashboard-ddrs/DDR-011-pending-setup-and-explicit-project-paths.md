# DDR-011 — Pending Setup Projects and Explicit Project Paths

- **Status:** ACCEPTED (shipped, commits 998dbb1–fe6ecc5)
- **Author:** lumen
- **Date:** 2026-06-21
- **Sprint:** project-discovery-v1
- **Supersedes:** —

---

## §1 Context

Two gaps surfaced during the first deployment session (2026-06-21):

1. **`PROJECTS_ROOT` alone is insufficient.** Danny's repos span multiple top-level directories AND individual scattered locations not under any common parent. Scanning a parent directory one level deep (DDR-003) covers the `~/projects/` cluster but not isolated repos like `/home/d-tuned/kv-trading-system`, `/home/d-tuned/Gap Research`, etc.

2. **Not all discovered repos are stood up.** Many repos exist on the filesystem but haven't yet been initialised with a CLAUDE.md / LORE projectId / agent identity. These are "in the queue." The dashboard currently renders them as regular project cards with mostly null fields — confusing and noisy.

---

## §2 Principle

Discovery configuration must cover Danny's actual project spread without requiring code changes. A second env var for explicit repo paths handles the long-tail cases that don't fit under any common parent.

Projects without a declared LORE identity are still part of the inventory — hiding them loses visibility into what's queued for bootstrapping. Separating them from active projects keeps the active view clean.

---

## §3 Decision

### §3.1 — `PROJECT_PATHS` env var

Add `PROJECT_PATHS` as a second discovery env var alongside `PROJECTS_ROOT`:

- `PROJECTS_ROOT` — colon-separated list of parent directories scanned one level deep (existing DDR-003 behaviour, updated delimiter from comma to colon)
- `PROJECT_PATHS` — colon-separated list of explicit repo paths added directly (each entry IS a repo, not a parent to scan)

Both vars are optional. Results are deduplicated by resolved absolute path. Unreadable/missing paths are skipped silently.

This is implemented: `src/lib/discovery.ts` updated 2026-06-21.

### §3.2 — Pending Setup section on Project Cards Panel

Projects where `projectId` is null (no CLAUDE.md or CLAUDE.md doesn't declare a project ID) are treated as "pending setup" — not yet stood up with a Claude Code agent and LORE.

The ProjectCardsPanel splits discovered projects into two groups:

- **Active** — `projectId` non-null; rendered as today
- **Pending Setup** — `projectId` null; rendered in a distinct section below active projects, with a lighter/muted card style and a "Needs setup" badge instead of LORE data

This gives Danny visibility into the full project inventory including repos queued for bootstrapping.

### §3.3 — Updated env var inventory

```
GITHUB_TOKEN=          # gh CLI oauth token (repo scope)
LORE_DATABASE_URL=     # postgres://lore:<pw>@100.127.177.103:5432/lore?sslmode=disable
PROJECTS_ROOT=         # colon-separated parent dirs scanned one level deep; default ~/projects
PROJECT_PATHS=         # colon-separated explicit repo paths (not parent dirs)
```

---

## §4 Trade-offs Rejected

| Option | Reason Rejected |
|---|---|
| Symlink umbrella directory | Requires ongoing maintenance as repos are added; config-only is lower friction |
| Single PROJECTS_ROOT with glob | Glob adds complexity; explicit paths are clearer and less error-prone |
| Hide pending repos entirely | Loses inventory visibility — Danny needs to see what's in the queue |
| Show pending repos inline with active | Pollutes the active project view with noise; separate section is cleaner |

---

## §5 Risks

| Risk | Mitigation |
|---|---|
| Paths with spaces in PROJECT_PATHS | Colon delimiter handles spaces fine; paths like `/home/d-tuned/Gap Research` work correctly |
| Pending section grows large | Ordered by repo name; collapses naturally as repos are stood up |
| DDR-003 spec says comma-separated | DDR-011 supersedes that detail — colon delimiter is now canonical |
