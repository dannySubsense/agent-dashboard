# DDR-002 — Dashboard Framework and Architecture

- **Status:** PROPOSED
- **Author:** lumen
- **Date:** 2026-06-20
- **Sprint (on approval):** dashboard-framework-v1
- **Supersedes:** —

---

## §1 Context

Danny runs ~10 active homelab projects simultaneously, each with a dedicated producer agent, ongoing DDRs, LORE captures, and GitHub activity. Context-switching between projects wipes mental state — two weeks away from a project means re-deriving what was decided, what's in flight, and what the next action is.

LORE already captures session-close summaries, decisions, and HALTs per project. Git and GitHub carry commit history and open PRs. Switchboard carries inter-agent relay activity. DDR index files carry roadmap state. PROGRESS.md files carry sprint state. The data exists — it is not surfaced.

The agent-dashboard project exists to aggregate this data into a single browser-accessible view so Danny can answer "where am I across all projects?" in under 10 seconds without opening a single terminal.

---

## §2 Principle

The dashboard is a read-only aggregation surface, not a control plane. It does not write to LORE, issue git commands, or trigger GitHub actions — it observes and displays. Every data source it taps has a well-defined read interface. Complexity lives in the data layer (fetching, caching, normalizing); the UI layer stays declarative and thin.

A project card should tell you enough to decide whether to open a terminal. That is the bar.

---

## §3 Decision

### 3.1 Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | SSR for fast initial load; API routes for backend aggregation; familiar ecosystem |
| UI components | shadcn/ui | Stable, composable, full control; avoids Tremor's API churn |
| Charts (general) | Recharts via shadcn `<Chart>` primitive | Covers time-series, bar, area; consistent styling with shadcn |
| Charts (specialized) | Nivo (`@nivo/calendar`, `@nivo/funnel`) | Calendar heatmap for activity, funnel for DDR pipeline — Recharts has no equivalent |
| Styling | Tailwind CSS v4 | Co-designed with shadcn/ui; no config overhead |
| Runtime | Node.js 20 LTS | Required by Next.js 15 |

### 3.2 Deployment

- Runs on **VM 101** as a persistent Node.js process (managed by PM2 or systemd — decided in sprint)
- Accessible at `http://localhost:3000` locally and over **Tailscale VPN** at the VM's Tailscale IP on port 3000
- No public internet exposure — Tailscale network only
- No auth layer — Tailscale network membership is the access control

### 3.3 Data Sources

| Source | What We Pull | Interface |
|---|---|---|
| **LORE** | Session-close summaries, decisions, HALTs, last capture per project | Direct Postgres query to VM 103 (`100.127.177.103:5432/lore`) over Tailscale |
| **Local git** | Last commit date/message, branch, uncommitted changes per repo | `simple-git` npm package; reads `~/projects/` directory |
| **GitHub API** | Open PRs, open issues, CI status per repo | GitHub REST API v3 via `@octokit/rest`; PAT auth |
| **Switchboard** | Recent relay messages, active locks, online agents | Read Switchboard data files directly or via MCP tools — decided in sprint |
| **Local filesystem** | DDR index status, PROGRESS.md sprint state, CLAUDE.md agent name + projectId | Node.js `fs` reads; parsed at request time |

All data fetching happens server-side in Next.js API routes or Server Components. No credentials in the browser.

### 3.4 Panel Inventory

Six panels in the initial release:

**1. Project Cards** (primary view)
- One card per repo under `~/projects/`
- Shows: agent name, projectId, last commit (date + message), last LORE capture (date + one-line summary), current sprint, open PR count, HALT flag if active HALTs exist
- Sorted by last-touched (most recent first)
- Click-through planned for v2

**2. DDR Pipeline**
- Kanban columns: `PROPOSED → ACCEPTED → IN SPRINT → SHIPPED`
- Sourced from `00-DDR-INDEX.md` files across all projects
- Lets Danny see which projects have pending design decisions

**3. "Where Did I Leave Off?" Panel**
- Pulls the most recent session-close LORE capture per project (documentType `decision`, title matching `SESSION-CLOSE` pattern)
- Surfaces carry-forward items and next actions
- Directly solves the two-weeks-away problem

**4. Unified Activity Feed**
- Merged timeline of: LORE captures, git commits, PR merges — across all projects
- Filterable by project and by type
- Default window: last 14 days

**5. Agent Status Panel**
- Sourced from Agent Registry (LORE search in `lore-personal`)
- Shows: agent name, project, relay handle, registry status
- Switchboard online/offline status if readable

**6. Open Work Tracker**
- HALTs from LORE (blocked items) — red badge
- Open GitHub PRs and issues — per project
- Unaccepted DDRs — from DDR index files

### 3.5 Data Refresh Strategy

- API routes fetch on request; no WebSocket or polling in v1
- Lightweight in-memory cache per API route (60-second TTL) to avoid hammering git and GitHub on every page load
- GitHub API rate limit: 5000 req/hour with PAT — well within budget for a single-user dashboard
- LORE queries: direct Postgres; low latency on Tailscale

### 3.6 Project Discovery

The dashboard discovers projects by scanning `~/projects/` for directories containing a `.git` folder. It reads `CLAUDE.md` (if present) to extract `projectId` and agent name. Projects without `CLAUDE.md` are shown with a "no agent configured" indicator rather than hidden.

### 3.7 Environment Variables

```
GITHUB_TOKEN=          # PAT with repo scope (dannySubsense)
LORE_DATABASE_URL=     # postgres://lore:<pw>@100.127.177.103:5432/lore?sslmode=disable
PROJECTS_ROOT=         # ~/projects (default)
```

---

## §4 Sequencing

DDR-002 is the architectural anchor. All feature DDRs reference it.

Proposed feature DDR sequence (each becomes its own spec sprint):
1. **DDR-003** — Project discovery and card panel (git + LORE + CLAUDE.md parsing)
2. **DDR-004** — DDR pipeline panel (00-DDR-INDEX.md parsing across repos)
3. **DDR-005** — Activity feed (unified git + LORE timeline)
4. **DDR-006** — Agent status panel (LORE registry + Switchboard)
5. **DDR-007** — Open work tracker (HALTs + GitHub issues/PRs)
6. **DDR-008** — "Where did I leave off?" panel (session-close LORE captures)

DDR-001 (`bootstrap-skill-v1`) runs in parallel — it is independent of the dashboard framework.

---

## §5 Risks

| Risk | Mitigation |
|---|---|
| LORE Postgres unreachable (VM 103 down or Tailscale drop) | Dashboard renders with LORE panels in "unavailable" state; other panels unaffected |
| GitHub API rate limit exhausted | 60s cache reduces calls; rate limit header monitoring in API route |
| `~/projects/` scan slow (large dirs) | Scan is shallow (one level); `.git` check is a single `stat` call |
| Switchboard data format changes | Switchboard panel isolated; failure degrades gracefully |
| CLAUDE.md not present in a project | Project card renders with defaults; no crash |

---

## §6 Open Questions for Danny

1. **Process manager** — PM2 or systemd for keeping the dashboard process alive on VM 101?
2. **Port** — 3000 is the Next.js default; any conflict with other services on VM 101?
3. **Switchboard interface** — read data files directly from the filesystem or use MCP tools from a server-side context? (MCP tools may not be available outside Claude Code sessions.)
4. **Dashboard DDRs as their own sprint each** — confirmed? Or batch the simpler panels (DDR pipeline + open work tracker) into one sprint?
