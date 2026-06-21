# DDR-003 — Project Discovery and Card Panel

- **Status:** ACCEPTED (shipped, commits 998dbb1–fe6ecc5)
- **Author:** lumen
- **Date:** 2026-06-21
- **Sprint:** project-discovery-v1
- **Supersedes:** —

---

## §1 Context

DDR-002 (§3.6) established project discovery as a shallow scan of `~/projects/` for directories containing a `.git` folder. Danny has active projects outside this directory — the hardcoded path is a day-one limitation, not a permanent constraint.

The ProjectCard panel (DDR-002 Slice 7) is live and shows the DDR-002 baseline: repoName, projectId, agentName, last commit date and message, last LORE capture date and one-line summary, current sprint status, open PR count, and a HALT badge when active HALTs exist.

LORE holds rich metadata per project (projectId, author, captures, HALTs) but does not store filesystem paths reliably — a project lives in LORE only after a capture is made, and the path is not a first-class field. Filesystem scan remains the authoritative discovery method. LORE enriches discovered projects (HALT status, capture data) but does not replace the scan.

---

## §2 Principle

Discovery is filesystem-first: scan git repos on the local filesystem, enrich with LORE and GitHub. LORE is a data source, not a project registry.

`PROJECTS_ROOT` must be flexible enough to cover Danny's full project spread without requiring changes to application code — configuration, not code. A comma-separated list of absolute paths covers the foreseeable cases without introducing glob complexity.

Failure in one configured path must not degrade discovery of others. The dashboard should always surface what it can. Project paths can also be added directly from the dashboard UI — no manual env file edits required after initial bootstrap.

---

## §3 Decision

### 3.1 Configurable Discovery via `PROJECTS_ROOT`

Add `PROJECTS_ROOT` to `.env.local` as a comma-separated list of absolute filesystem paths to scan:

```
PROJECTS_ROOT=/home/d-tuned/projects,/home/d-tuned/work
```

When `PROJECTS_ROOT` is unset, `discoverProjects()` falls back to `~/projects/` — matching DDR-002 baseline behaviour exactly.

### 3.2 Scan Behaviour

`discoverProjects()` in `src/lib/discovery.ts` is updated to:

1. Parse `PROJECTS_ROOT` into an ordered list of absolute paths (trim whitespace around commas; skip empty segments).
2. For each path, perform a **shallow one-level scan** — read immediate subdirectories and check for a `.git` entry. No recursion. Same depth as the current implementation.
3. If a configured path does not exist, is not accessible, or throws on read, log a warning (`[discovery] skipping <path>: <reason>`) and continue to the next path. Do not throw.
4. De-duplicate discovered repos by resolved absolute path — if the same `.git` directory appears via two configured roots, include it once.
5. After filesystem discovery, enrich each repo with LORE and GitHub data as today (unchanged).

### 3.3 Persistent Project Config File

A local config file `~/.config/agent-dashboard/projects.json` stores project paths added via the UI. The app reads this file on every discovery pass and merges its entries with `PROJECTS_ROOT` and `PROJECT_PATHS` env vars (deduplicated by resolved absolute path).

Format:
```json
{
  "projectPaths": [
    "/home/d-tuned/some/repo",
    "/opt/another/repo"
  ]
}
```

The file is created on first write if it does not exist. Read failures are silently skipped — env var discovery proceeds normally.

An API route `POST /api/projects/paths` accepts `{ path: string }` and appends it to the config file (after validating that a `.git` directory exists at the given path). The route returns the updated project list.

### 3.4 "Add Project" UI Input

The Project Cards panel includes an "Add project" input at the top (or bottom) of the panel. Danny pastes an absolute path, submits, and the panel refreshes to show the new project card. No filesystem browser — path entry only.

The input calls `POST /api/projects/paths`. On success, the project card appears immediately. On error (path not a git repo, path unreadable), an inline error message is shown.

This replaces the need to manually edit `.env.local` for scattered repos.

### 3.5 Card Enhancements

Card enhancements beyond the DDR-002 baseline are deferred to spec phase. The spec agent will assess whether any additional data fields are warranted given the updated discovery scope. No card changes are pre-committed in this DDR.

### 3.6 Environment Variable Inventory (updated)

```
GITHUB_TOKEN=          # PAT with repo scope (dannySubsense)
LORE_DATABASE_URL=     # postgres://lore:<pw>@100.127.177.103:5432/lore?sslmode=disable
PROJECTS_ROOT=         # comma-separated absolute paths; default ~/projects/

~/.config/agent-dashboard/projects.json   # UI-managed project paths; merged with env vars
```

This supersedes the `PROJECTS_ROOT` stub in DDR-002 §3.7.

---

## §4 Trade-offs Rejected

| Option | Reason Rejected |
|---|---|
| LORE-only discovery | LORE does not store filesystem paths; a project only enters LORE after its first capture; non-starter as primary discovery mechanism |
| Deep recursive scan | Prohibitively expensive on large directory trees; the value of surfacing deeply nested repos does not justify the latency cost |
| Glob patterns in `PROJECTS_ROOT` | Adds shell-expansion complexity and cross-platform inconsistency with minimal practical gain over comma-separated explicit paths |
| Single `PROJECTS_ROOT` path | Too restrictive; Danny's projects are spread across at least two top-level directories; multi-path is required on day one |
| LORE database for path storage | Overkill for a path list; adds DB dependency to a config concern; LORE is for knowledge captures, not app config |
| Filesystem browser/picker UI | Unnecessary complexity for a single-user homelab tool where paths are known; paste input is sufficient |

---

## §5 Risks

| Risk | Mitigation |
|---|---|
| Configured path unreachable (unmounted, permissions, typo) | Log warning and skip; other paths proceed normally; dashboard renders what it can |
| Same repo reachable via two configured paths | De-duplicate by resolved absolute path before enrichment; no duplicate cards |
| Large project count increases page load time | Each path is still shallow (one level); enrichment calls (LORE, GitHub) are parallelised per existing 60s cache strategy (DDR-002 §3.5) |
| `PROJECTS_ROOT` unset in a fresh deploy | Falls back to `~/projects/`; matches DDR-002 behaviour; no regression |

---

## §6 Open Questions

1. **Source-path provenance on card** — Should the card indicate which `PROJECTS_ROOT` entry a project was discovered from? Current position: no — repoName plus filesystem path tooltip (if any) is sufficient. Confirm during spec.
2. **Card enhancements** — Are any data fields beyond the DDR-002 baseline warranted? Left to spec phase (@requirements-analyst to assess during sprint).
3. **Ordering across roots** — When multiple paths are configured, should projects be sorted purely by last-touched (current behaviour) or grouped by root first? Current position: last-touched wins; grouping adds UI complexity with little benefit.
