# Requirements: project-discovery-v1

Sprint covering DDR-003 + DDR-011 folded into one delivery.

## Summary

Extend the agent-dashboard's project discovery to support a persistent UI-managed config file alongside the existing env vars. Add a POST endpoint to register project paths, an "Add Project" input on the Project Cards panel, and a "Pending Setup" section for repos without a declared LORE project identity.

---

## Open Question Resolutions

These were deferred to spec phase in DDR-003 §6. Decisions are final for this sprint.

**Q1 — Source-path provenance on card:** NO. Cards do not indicate which `PROJECTS_ROOT` entry a project was discovered from. repoName is sufficient for a single-user homelab. No card changes required for this concern.

**Q2 — Card enhancements beyond DDR-002 baseline:** NO new data fields for active project cards. The existing fields (repoName, projectId, agentName, lastCommit, lastLoreCapture, currentSprint, openPrCount, HALT badge) are sufficient. The only card variant change this sprint is the Pending Setup card style (see US-05).

**Q3 — Ordering across roots:** last-touched wins. Active projects are sorted by `lastTouchedAt DESC` (already implemented). Pending Setup projects are sorted by `repoName ASC` (alphabetical) as stated in DDR-011 §5.

---

## User Stories

### US-01 — Config file persistence in discovery

As Danny,
I want project paths added via the dashboard to persist in a local config file,
so that manually-added repos survive server restarts without editing env files.

### US-02 — POST /api/projects/paths

As Danny,
I want an API endpoint that accepts an absolute filesystem path and registers it as a project,
so that the UI can add repos programmatically and get back a refreshed project list.

### US-03 — Add Project UI (happy path)

As Danny,
I want a text input on the Project Cards panel where I can paste an absolute path and submit it,
so that I can onboard a scattered repo directly from the dashboard without editing .env.local.

### US-04 — Add Project UI (error path)

As Danny,
I want an inline error message when I submit an invalid or unrecognised path,
so that I know immediately why the path was rejected and can correct it.

### US-05 — Pending Setup section

As Danny,
I want repos that lack a declared projectId rendered in a distinct muted section below active projects,
so that I can see my full repo inventory while keeping the active project view uncluttered.

### US-06 — Panel revalidation after add

As Danny,
I want the Project Cards panel to refresh immediately after a successful path submission,
so that the new project card appears without a manual page reload.

---

## Acceptance Criteria

### US-01 — Config file persistence

- [ ] Given `~/.config/agent-dashboard/projects.json` exists with a valid `projectPaths` array, those paths are merged into discovered projects on every discovery pass.
- [ ] Given the config file is absent, `discoverProjects()` proceeds using env vars only with no error or warning surfaced to the caller.
- [ ] Given the config file contains malformed JSON, `discoverProjects()` proceeds using env vars only with no error thrown (read failure is silently skipped).
- [ ] Given the same path appears in both env vars and the config file, it appears in the results exactly once (dedup by resolved absolute path).
- [ ] Given a config file entry that does not exist on the filesystem or lacks a `.git` directory, it is silently skipped and does not produce an error card.
- [ ] Given `~/.config/agent-dashboard/` does not exist, it is created on the first write (POST request); read-only discovery before any write does not create the directory.

### US-02 — POST /api/projects/paths

- [ ] Given a POST to `/api/projects/paths` with `{ "path": "/absolute/path/to/repo" }` where the path contains a `.git` directory, the route returns HTTP 200 with the updated `ProjectCardData[]` in `ApiResponse.data`.
- [ ] Given a successful POST, the path is appended to `~/.config/agent-dashboard/projects.json` under `projectPaths`; the file is created with correct structure if it does not exist.
- [ ] Given a path already present in the config file (by resolved absolute path), it is not duplicated — the config file is unchanged and the response still returns HTTP 200.
- [ ] Given a POST with a path that exists but has no `.git` directory, the route returns HTTP 400 with a descriptive error string in `ApiResponse.error` and does not write to the config file.
- [ ] Given a POST with a path that does not exist or is unreadable, the route returns HTTP 400 with a descriptive error string in `ApiResponse.error` and does not write to the config file.
- [ ] Given a POST with a missing or non-string `path` field in the request body, the route returns HTTP 400.
- [ ] Given a successful POST, the server-side projects cache (`CACHE_KEY = 'projects'`) is invalidated so the next GET `/api/projects` performs a fresh fetch.

### US-03 — Add Project UI (happy path)

- [ ] Given the Project Cards panel is rendered, an "Add project" input and submit control are visible (position: bottom of active section, above Pending Setup section; exact layout is UI-spec scope).
- [ ] Given a valid absolute path is submitted, the panel revalidates and a new project card appears without a full page reload.
- [ ] Given a successful submission, the text input is cleared.

### US-04 — Add Project UI (error path)

- [ ] Given an invalid path is submitted, an inline error message is displayed adjacent to the input; no card is added.
- [ ] Given an error is displayed, the input retains the submitted value so the user can correct it without retyping.
- [ ] Given a subsequent valid submission after an error, the error message is cleared.

### US-05 — Pending Setup section

- [ ] Given the project list includes entries where `projectId !== null`, those entries are rendered in the active "Projects" section sorted by `lastTouchedAt DESC`.
- [ ] Given the project list includes entries where `projectId === null`, those entries are rendered in a "Pending Setup" section positioned below the active section and the Add Project input, sorted by `repoName ASC`.
- [ ] Given no projects have `projectId === null`, the Pending Setup section is omitted entirely from the DOM (not rendered as empty).
- [ ] Given a pending project card is rendered, it displays `repoName` and a "Needs setup" badge. LORE data, sprint data, PR count, and HALT badge are not shown. The card uses a visually muted style (exact styling is UI-spec scope).
- [ ] Given the active section has no projects (all discovered repos are pending), the active grid is empty and only the Pending Setup section is shown (plus the Add Project input).

### US-06 — Panel revalidation

- [ ] Given a successful POST response is received by the client, the Project Cards panel re-fetches project data (via Next.js `router.refresh()` or equivalent server action revalidation) before the loading state resolves.
- [ ] Given a failed POST, no revalidation occurs and the existing panel state is preserved.

---

## Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| Path with spaces (e.g., `/home/d-tuned/Gap Research`) submitted via UI | Accepted normally; colon delimiter in env vars already handles this; no special handling needed in UI path |
| Config file JSON has correct structure but `projectPaths` is not an array | Treat as empty; skip silently |
| Concurrent POST requests (two browser tabs) | Last write wins; dedup logic prevents duplicates if same path sent twice; race on file write is accepted for single-user context |
| PROJECTS_ROOT and PROJECT_PATHS both unset and config file absent | Falls back to `~/projects/` scan; behavior unchanged from pre-sprint baseline |
| Path submitted is a symlink to a git repo | Resolved absolute path used for dedup; symlink target is treated as canonical if `.git` exists |
| All discovered paths fail validation | Active section is empty; Pending Setup section is empty; "No projects discovered" message shown (existing behavior) |
| Config file write fails (permissions, disk full) | POST returns HTTP 500 with error; no partial write; UI shows error inline |
| Path already known via env var (not config file) | POST returns HTTP 200; path is not written to config file (it is already discoverable via env); response includes the project as already present |

---

## Out of Scope

- NOT: Removing a project path from the config file via UI
- NOT: Reordering or editing config file entries via UI
- NOT: Filesystem browser or path picker — paste input only
- NOT: Per-project configuration (agent identity, projectId assignment) via UI
- NOT: Multi-user or multi-instance config file synchronisation
- NOT: Recursive (multi-level) directory scanning
- NOT: Glob patterns in `PROJECTS_ROOT` or `PROJECT_PATHS`
- NOT: Exporting, importing, or backing up the config file
- NOT: Any changes to active project card data fields (repoName, agentName, lastCommit, lastLoreCapture, currentSprint, openPrCount, HALT badge remain as-is)
- NOT: Source-path provenance on card (Q1 — confirmed out of scope)
- Deferred: Bulk path import (multiple paths in one POST)
- Deferred: Removing individual paths added via UI

---

## Constraints

- Must: Config file path is fixed at `~/.config/agent-dashboard/projects.json`. Not configurable.
- Must: Deduplication uses resolved absolute path (`path.resolve()`). Symlinks to the same target deduplicate.
- Must: POST `/api/projects/paths` validates `.git` existence before writing; no partial validation.
- Must: All discovery source failures (unreadable env path, malformed config file, missing config file) are non-fatal — dashboard renders whatever it can.
- Must: Pending Setup projects are rendered below active projects and the Add Project input. Order within the Pending Setup section is `repoName ASC`.
- Must: Cache invalidation on POST is synchronous — the route must invalidate before returning the response body, so the next GET sees fresh data.
- Must not: POST `/api/projects/paths` accept relative paths. The request body `path` field must be absolute (starts with `/`); return 400 otherwise.
- Must not: Active card layout change for repos that already have a `projectId` (no new fields, no visual regressions).
- Assumes: Single-user homelab; no authentication or authorisation on the POST endpoint.
- Assumes: Next.js server runs with filesystem access to `~/.config/agent-dashboard/`. If the home directory is remapped, the path resolution must still work via `os.homedir()`.
- Assumes: `PROJECT_PATHS` delimiter is colon (`:`) — confirmed canonical per DDR-011 §3.1 superseding DDR-003's earlier comma reference.
