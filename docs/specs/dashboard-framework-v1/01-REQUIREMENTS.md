# Requirements: Dashboard Framework v1

- **Sprint:** dashboard-framework-v1
- **Source DDR:** DDR-002 (ACCEPTED 2026-06-20)
- **Author:** requirements-analyst
- **Date:** 2026-06-20

---

## Summary

A read-only browser dashboard running on VM 101 that aggregates LORE captures, git activity, GitHub PRs/issues, DDR pipeline state, and Switchboard relay activity from all repos under `~/projects/` into six panels. Danny must be able to answer "where am I across all projects?" in under 10 seconds without opening a terminal.

---

## User Stories

### US-01 — Dashboard Orientation
As Danny,
I want a single browser URL that renders all six panels with current project state,
so that I can orient myself across all active projects in under 10 seconds without opening a terminal.

### US-02 — Project Cards Panel
As Danny,
I want one card per discovered repo showing agent name, projectId, last commit (date + message), last LORE capture (date + one-line summary), current sprint, open PR count, and HALT flag — sorted by last-touched,
so that I can identify the most recently active projects and their status at a glance.

### US-03 — DDR Pipeline Panel
As Danny,
I want a Kanban view of all DDRs across all projects organized into columns PROPOSED, ACCEPTED, IN SPRINT, and SHIPPED (sourced from each project's `00-DDR-INDEX.md`),
so that I can see which projects have pending or in-flight design decisions.

### US-04 — "Where Did I Leave Off?" Panel
As Danny,
I want the most recent session-close LORE capture per project displayed in a dedicated panel,
so that I can resume work on any project without re-reading terminal history or asking the agent to re-derive context.

### US-05 — Unified Activity Feed
As Danny,
I want a merged chronological timeline of LORE captures, git commits, and PR merges across all projects — filterable by project and by event type — defaulting to the last 14 days,
so that I can track cross-project activity in a single view.

### US-06 — Agent Status Panel
As Danny,
I want a panel listing all registered agents (from the LORE Agent Registry) with their project, relay handle, registry status, and Switchboard online/offline state,
so that I can see which agents are currently active across all projects.

### US-07 — Open Work Tracker
As Danny,
I want a panel aggregating unresolved HALTs (red badge), open GitHub PRs, open GitHub issues, and unaccepted DDRs across all projects,
so that I can identify blocking and pending items without switching context to individual repos or GitHub.

### US-08 — Automatic Project Discovery
As Danny,
I want the dashboard to automatically discover all repos under `~/projects/` (or `PROJECTS_ROOT`) by detecting `.git` directories and reading `CLAUDE.md` for projectId and agent name,
so that I never need to manually register a project with the dashboard.

### US-09 — Graceful Per-Panel Degradation
As Danny,
I want each panel to independently degrade to an "unavailable" state when its data source is unreachable or returns an error,
so that a single data source failure never takes down the entire dashboard.

### US-10 — In-Memory Response Caching
As Danny,
I want each API route to cache its response in memory for 60 seconds,
so that repeated page loads do not hammer GitHub rate limits or the LORE Postgres connection.

---

## Acceptance Criteria

### US-01 — Dashboard Orientation
- [ ] Given the dashboard URL is loaded over Tailscale, when the page fully renders, then all six panels are present in the DOM.
- [ ] Given the dashboard URL is loaded on a LAN connection, when measured from first byte to interactive, then time-to-interactive is under 5 seconds on a standard browser.

### US-02 — Project Cards Panel
- [ ] Given one or more repos exist under `PROJECTS_ROOT`, when the Project Cards panel loads, then exactly one card is rendered per discovered repo.
- [ ] Given a repo whose `CLAUDE.md` contains a `projectId` and agent name, when its card is rendered, then both values are displayed on the card.
- [ ] Given a repo with no `CLAUDE.md`, when its card is rendered, then the card displays "no agent configured" and is not hidden or omitted.
- [ ] Given a repo with at least one git commit, when its card is rendered, then the date and short message of the most recent commit are displayed.
- [ ] Given a repo with at least one LORE capture, when its card is rendered, then the timestamp and one-line summary of the most recent capture are displayed.
- [ ] Given a repo with an active PROGRESS.md containing a sprint slug, when its card is rendered, then the current sprint slug is displayed.
- [ ] Given a repo with open GitHub PRs, when its card is rendered, then the count of open PRs is displayed as a numeric value.
- [ ] Given a repo with at least one unresolved HALT in LORE (documentType=`halt`, status != `archived`), when its card is rendered, then a HALT flag with red styling is visible.
- [ ] Given multiple repo cards, when the panel renders, then cards are ordered by last-touched timestamp descending (most recent first).

### US-03 — DDR Pipeline Panel
- [ ] Given a project has a `00-DDR-INDEX.md` file, when the DDR Pipeline panel loads, then every DDR listed in that file appears in the column matching its status (PROPOSED, ACCEPTED, IN SPRINT, or SHIPPED).
- [ ] Given a DDR entry has a status that does not match PROPOSED, ACCEPTED, IN SPRINT, or SHIPPED, when the panel renders, then it is placed in an "Unknown" catch-all column and is not silently dropped.
- [ ] Given a project has no `00-DDR-INDEX.md` file, when the DDR Pipeline panel loads, then that project contributes no entries and no error is thrown.

### US-04 — "Where Did I Leave Off?" Panel
- [ ] Given a project has LORE captures with documentType=`decision` and a title matching the `SESSION-CLOSE` pattern, when the panel loads, then the single most recent such capture per project is displayed showing project name, capture timestamp, and content.
- [ ] Given a project has no session-close LORE captures (documentType=`decision`, `SESSION-CLOSE` title), when the panel loads, then that project is either omitted or shows a "no session capture" placeholder — not an error.
- [ ] Given LORE Postgres is unreachable, when the panel loads, then it displays "unavailable" and does not affect any other panel.

### US-05 — Unified Activity Feed
- [ ] Given the activity feed loads with default settings, when rendered, then it shows only events with a timestamp within the last 14 days.
- [ ] Given the activity feed loads, when rendered, then LORE captures, git commits, and PR merges appear interleaved in a single timeline sorted newest-first.
- [ ] Given a project filter is applied, when the filter is active, then only events associated with that project are displayed.
- [ ] Given an event type filter is applied (one of: LORE capture, git commit, PR merge), when the filter is active, then only events of that type are displayed.

### US-06 — Agent Status Panel
- [ ] Given the LORE Agent Registry (in the `lore-personal` projectId) contains agent records, when the panel loads, then all registered agents are listed with name, project, relay handle, and registry status.
- [ ] Given an agent has activity in `~/.switchboard/sessions.json`, when the panel loads, then that agent is shown as online.
- [ ] Given an agent has no activity in `~/.switchboard/sessions.json`, when the panel loads, then that agent is shown as offline.
- [ ] Given the `~/.switchboard/` directory is missing, unreadable, or its files are malformed, when the panel loads, then it displays "unavailable" without affecting any other panel.

### US-07 — Open Work Tracker
- [ ] Given a project has LORE captures with documentType=`halt` and status != `archived`, when the panel loads, then each such HALT is listed with project name, timestamp, and a red badge.
- [ ] Given a project has open GitHub PRs, when the panel loads, then each is listed with PR number, title, and repo name.
- [ ] Given a project has open GitHub issues, when the panel loads, then each is listed with issue number, title, and repo name.
- [ ] Given a project has DDRs with status `PROPOSED` in its `00-DDR-INDEX.md`, when the panel loads, then those DDRs appear as unaccepted items.

### US-08 — Automatic Project Discovery
- [ ] Given `PROJECTS_ROOT` (default: `~/projects/`) contains directories with a `.git` subdirectory, when discovery runs, then all such directories are recognized as projects.
- [ ] Given a discovered project has a `CLAUDE.md`, when discovery parses it, then projectId and agent name are extracted and associated with that project.
- [ ] Given a discovered project has no `CLAUDE.md`, when discovery runs, then the project is still included with `projectId` and agent name set to a "no agent configured" default.
- [ ] Given the `PROJECTS_ROOT` environment variable is explicitly set, when discovery runs, then it scans the specified path instead of `~/projects/`.

### US-09 — Graceful Per-Panel Degradation
- [ ] Given the LORE Postgres connection is unreachable, when any LORE-dependent panel's API route is called, then the route returns a structured error payload and the panel renders an "unavailable" message.
- [ ] Given the GitHub API returns a 429 or 403 rate-limit response, when a GitHub-dependent panel's API route is called, then it serves cached data if a cache entry exists; otherwise the panel renders a rate-limit warning.
- [ ] Given `~/.switchboard/` files are missing or malformed, when the Agent Status panel's API route is called, then the route returns a structured error payload and the panel renders "unavailable".
- [ ] Given a repo's `CLAUDE.md` is absent or malformed, when that repo's data is aggregated, then the dashboard uses default values and does not throw an uncaught exception.
- [ ] Given `PROJECTS_ROOT` is unreadable or missing, when the dashboard loads, then it renders an empty state with a descriptive error message and does not crash.

### US-10 — In-Memory Response Caching
- [ ] Given an API route has been called and a cache entry exists with age < 60 seconds, when the same route is called again, then the response is returned from cache without re-querying the data source.
- [ ] Given a cache entry exists with age >= 60 seconds, when the API route is called, then the data source is re-queried, the response is served, and the cache entry is refreshed.
- [ ] Given the Next.js server process has restarted, when the first request arrives at any API route, then the cache is empty and all data sources are queried fresh.

---

## Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| Repo in `~/projects/` has zero git commits | Card shows repo name; last commit field shows "no commits" |
| `CLAUDE.md` exists but contains no `projectId` field | Project shown with "no agent configured" default; no crash |
| `CLAUDE.md` is present but malformed Markdown/YAML | Parse error is logged server-side; project shown with defaults |
| Two repos contain identical `projectId` values in `CLAUDE.md` | Both repos shown as separate cards; no deduplication by projectId |
| LORE returns zero captures for a project | LORE-dependent panels show "no data" for that project |
| `GITHUB_TOKEN` env var is missing | GitHub-dependent panels show "unavailable"; error logged |
| `GITHUB_TOKEN` is expired or lacks `repo` scope | GitHub API returns 401/403; panels show "unavailable" |
| A project has more than 25 open PRs or issues | Results capped at 25 per project per panel; truncation is indicated |
| `00-DDR-INDEX.md` exists but contains no parseable DDR entries | DDR Pipeline shows project with zero cards; no error |
| A DDR entry has a status value not in the known set | DDR placed in "Unknown" catch-all column; not dropped silently |
| Activity feed filter selects a project with no events in the 14-day window | Feed shows empty state message; not an error or blank white space |
| Session-close capture body text is very long | Text is truncated with a visible indicator (e.g., "..."); no layout overflow |
| A Switchboard file (`sessions.json`, etc.) is zero bytes | Treated as empty; agent status shows "unknown" or "offline" |
| Cache entry is stale (>60 s) but data source is currently unreachable | Cache entry is not refreshed; panel renders "unavailable" with stale-data notice |
| Multiple unresolved HALTs exist for the same project | All are listed individually in Open Work Tracker; none are collapsed silently |
| `~/projects/` scan takes longer than expected on first load | Scan is shallow (one directory level, single `stat` call per entry); no recursive walk |

---

## Out of Scope

- NOT: Any write operation to LORE, git, GitHub, Switchboard, or any local filesystem path
- NOT: Real-time updates via WebSocket, Server-Sent Events, or any polling mechanism in v1
- NOT: Authentication or authorization layer (Tailscale membership is the sole access control)
- NOT: Public internet exposure of the dashboard
- NOT: User-configurable panel layout, ordering, or display preferences
- NOT: Mobile-optimized or responsive design beyond standard browser layout
- NOT: Export functionality (PDF, CSV, JSON dump)
- NOT: Push notifications or alerting (email, Slack, webhook)
- NOT: Multi-user support (Danny is the sole user in v1)
- NOT: Historical trend analytics or aggregation beyond the 14-day activity window
- NOT: Agent control plane actions (start, stop, restart agents)
- NOT: Editing DDRs, PROGRESS.md, or CLAUDE.md from the dashboard UI
- NOT: Full-text search across LORE captures beyond what is fetched for display
- NOT: Port inventory panel (referenced in DDR-002 §3.2 as a future first-class feature; no panel defined in v1 panel inventory)
- NOT: Click-through detail views per project card (noted as v2 in DDR-002 §3.4 Panel 1)
- NOT: Chart rendering of any kind in v1 — Recharts time-series and Nivo calendar heatmap/funnel visualizations are deferred to v2; Recharts and Nivo packages are installed as pre-wired dependencies only and no v1 acceptance criterion requires a chart to render
- Deferred: Persistent user preferences (theme, filter presets, saved views)
- Deferred: WebSocket or polling for live data updates (v2 consideration)
- Deferred: Per-panel detailed sub-DDRs (DDR-003 through DDR-008 will refine individual panels)

---

## Constraints

### Hard Requirements (Must)
- Must use Next.js 15 App Router with TypeScript
- Must use shadcn/ui for all UI components
- Must install Recharts (via shadcn `<Chart>` primitive) as a v2 dependency pre-wired in `package.json`; no chart rendering is required in v1
- Must install Nivo (`@nivo/calendar`, `@nivo/funnel`) as v2 dependencies pre-wired in `package.json`; no specialized visualization rendering is required in v1
- Must use Tailwind CSS v4 for all styling
- Must run on Node.js 20 LTS
- Must run on VM 101, managed by PM2, on port 3000
- Must be accessible only over Tailscale VPN (no public internet route)
- Must query LORE via direct Postgres connection to `<lore-db-host>:5432/lore` over Tailscale
- Must use `simple-git` npm package for all local git reads
- Must use `@octokit/rest` with a PAT (dannySubsense account, `repo` scope) for all GitHub API calls
- Must read Switchboard state from `~/.switchboard/` filesystem files directly (no MCP tool calls)
- Must read local filesystem paths (DDR index files, PROGRESS.md, CLAUDE.md) via Node.js `fs`
- Must perform all data fetching server-side (API routes or Server Components); no credentials in the browser
- Must implement per-route in-memory cache with 60-second TTL
- Must require `GITHUB_TOKEN` and `LORE_DATABASE_URL` environment variables; `PROJECTS_ROOT` is optional (default: `~/projects/`)

### Anti-Requirements (Must Not)
- Must not perform any write operation to any data source
- Must not use WebSocket or polling for data refresh in v1
- Must not expose any credential or API token to the browser
- Must not crash or return an unhandled 500 when a single data source is unavailable

### Assumptions
- Assumes LORE captures are queryable by `projectId` and `documentType` via the Postgres schema on VM 103
- Assumes session-close LORE captures are identified by `documentType = 'decision'` and a title matching the pattern `SESSION-CLOSE` (per DDR-002 §3.4 Panel 3)
- Assumes unresolved HALTs are LORE captures with `documentType = 'halt'` and `status != 'archived'`
- Assumes "unaccepted DDRs" in the Open Work Tracker means DDRs with status `PROPOSED` in the DDR index file
- Assumes the LORE Agent Registry lives in the `lore-personal` projectId (per DDR-002 §3.4 Panel 5)
- Assumes Switchboard filesystem layout: `~/.switchboard/sessions.json` (active agents), `~/.switchboard/messages.json` (pending counts), `~/.switchboard/history.jsonl` (event log), `~/.switchboard/locks.json` (active locks)
- Assumes the Switchboard file schema is stable in v1; format changes may break the Agent Status panel
- Assumes `~/projects/` is the canonical root for all active homelab repos
- Assumes a GitHub PAT with `repo` scope is sufficient to list open PRs and issues for all relevant repos
- Assumes the LORE Postgres schema exposes a `projectId` column or equivalent field for filtering captures by project
- Assumes `PROGRESS.md` files contain a parseable current sprint slug in a consistent format (specific format is a data contract for @architect)
- Assumes `00-DDR-INDEX.md` files list DDR status in a consistent parseable format across all projects (specific format is a data contract for @architect)
