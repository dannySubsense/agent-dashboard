# Architecture: Dashboard Framework v1

- **Sprint:** dashboard-framework-v1
- **Source DDR:** DDR-002 (ACCEPTED 2026-06-20)
- **Author:** architect
- **Date:** 2026-06-20

---

## Open Assumptions — Resolved

### Assumption 1: PROGRESS.md Sprint Slug Format

**Resolution:** Two format variants observed across two real files in this repo.

`docs/specs/bootstrap-skill-v1/PROGRESS.md`:
```
# PROGRESS.md — bootstrap-skill-v1
Sprint: bootstrap-skill-v1
Status: COMPLETE
Current Slice: 6 — Global install + diff verification
```

`docs/specs/bootstrap-skill-v1-1/PROGRESS.md`:
```
# PROGRESS.md — bootstrap-skill-v1-1
**Sprint:** bootstrap-skill-v1-1
**Status:** COMPLETE
```

**Parsing contract:**
- Sprint slug: capture group 1 from `^#\s+PROGRESS\.md\s+[-—]\s+(.+)$` on the H1 line
- Sprint status: capture group 1 from `^\*{0,2}Status:\*{0,2}\s+(.+)$` (handles both plain and bold variants)
- Both fields must be present for a valid parse; missing either → `SprintInfo = null`

**Observed status values:** `COMPLETE`, `IN PROGRESS`, `BLOCKED`, `HALTED`, `TODO` (from the legend in the first file)

---

### Assumption 2: 00-DDR-INDEX.md Status Format

**Resolution:** Pipe-delimited Markdown table with a fixed column schema observed in `docs/specs/agent-dashboard-ddrs/00-DDR-INDEX.md`.

Table header: `| # | Title | Status | Sprint | Depends On | Scope |`

Status column is index 2 (zero-indexed after splitting on `|` and trimming whitespace).

**Observed raw status values:** `ACCEPTED`, `BACKLOG`, `DRAFT`

**Critical discrepancy:** The requirements specify Kanban columns `PROPOSED | ACCEPTED | IN SPRINT | SHIPPED`, but the actual DDR index uses `BACKLOG` and `DRAFT` — not `PROPOSED`. The following normalization is the architectural contract:

| Raw status in file | Normalized kanban column |
|---|---|
| `PROPOSED` | `PROPOSED` |
| `BACKLOG` | `PROPOSED` |
| `DRAFT` | `PROPOSED` |
| `ACCEPTED` | `ACCEPTED` |
| `IN SPRINT` | `IN SPRINT` |
| `SHIPPED` | `SHIPPED` |
| anything else | `UNKNOWN` |

**Open Work Tracker "unaccepted DDRs"** = any DDR where `kanbanColumn === 'PROPOSED'` (covers `BACKLOG`, `DRAFT`, and `PROPOSED` raw values).

**Parser:** Skip lines that start with `|---` (separator rows) and the header row (contains the word "Status" in column 2). Parse all remaining `|`-delimited rows with at least 4 fields.

---

## Codebase Survey

The repo at `/home/d-tuned/projects/agent-dashboard` contains only `docs/`, `CLAUDE.md`, `HOMELAB-CLAUDE.md.template`, and `MACHINE-SETUP.md`. No Next.js scaffold exists yet. This sprint creates the app from scratch — no existing patterns to follow or conflict with.

---

## Directory Structure

```
/home/d-tuned/projects/agent-dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout: HTML shell, Tailwind globals, ThemeProvider, persistent header
│   │   ├── page.tsx                      # Dashboard page: thin layout; composes 6 Suspense-wrapped panel components
│   │   ├── globals.css                   # Tailwind v4 base styles + CSS variables
│   │   ├── error.tsx                     # App-level error boundary (catches layout failures)
│   │   └── api/
│   │       ├── projects/
│   │       │   └── route.ts              # GET /api/projects → ProjectCardData[]
│   │       ├── ddr-pipeline/
│   │       │   └── route.ts              # GET /api/ddr-pipeline → DdrEntry[]
│   │       ├── activity-feed/
│   │       │   └── route.ts              # GET /api/activity-feed?days=&project=&type=
│   │       ├── agents/
│   │       │   └── route.ts              # GET /api/agents → AgentRecord[]
│   │       ├── open-work/
│   │       │   └── route.ts              # GET /api/open-work → OpenWorkItem[]
│   │       └── session-closes/
│   │           └── route.ts              # GET /api/session-closes → SessionClose[]
│   ├── components/
│   │   ├── layout/
│   │   │   └── DashboardGrid.tsx         # Six-panel CSS grid wrapper; no data fetching; imported by page.tsx
│   │   ├── panels/
│   │   │   ├── ProjectCardsPanel.tsx     # Async Server Component; calls src/lib/projects.ts directly; renders ProjectCard list
│   │   │   ├── DdrPipelinePanel.tsx      # Async Server Component; calls src/lib directly; renders 4+1 Kanban columns
│   │   │   ├── SessionClosePanel.tsx     # Async Server Component; calls src/lib/lore.ts directly; most recent session-close per project
│   │   │   ├── ActivityFeedLoader.tsx    # Async Server Component; calls src/lib directly; passes data to ActivityFeedPanel
│   │   │   ├── ActivityFeedPanel.tsx     # Client Component; holds filter state; receives initial data as props from ActivityFeedLoader
│   │   │   ├── AgentStatusPanel.tsx      # Async Server Component; calls src/lib/lore.ts directly; lists agents with status badges
│   │   │   └── OpenWorkPanel.tsx         # Async Server Component; calls src/lib directly; grouped halt/PR/issue/DDR list
│   │   ├── cards/
│   │   │   └── ProjectCard.tsx           # Pure display component; no data fetching
│   │   ├── shared/
│   │   │   ├── PanelShell.tsx            # Wrapper: title bar + error/unavailable state slot
│   │   │   ├── PanelUnavailable.tsx      # Renders "unavailable" + optional error message
│   │   │   └── PanelSkeleton.tsx         # Suspense fallback: animated skeleton for any panel
│   │   └── ui/                           # shadcn/ui generated components (do not hand-edit)
│   ├── lib/
│   │   ├── cache.ts                      # Module-level InMemoryCache singleton (60s TTL)
│   │   ├── discovery.ts                  # Scan PROJECTS_ROOT for .git dirs; parse CLAUDE.md; resolve GitHub remote per repo
│   │   ├── lore.ts                       # All direct Postgres queries to LORE DB
│   │   ├── github.ts                     # @octokit/rest wrapper; all GitHub API calls
│   │   ├── git.ts                        # simple-git wrapper; last commit, commit window, GitHub remote parsing
│   │   ├── switchboard.ts                # Read ~/.switchboard/ JSON/JSONL files
│   │   ├── ddr-index.ts                  # Parse 00-DDR-INDEX.md → DdrEntry[]
│   │   ├── progress.ts                   # Parse PROGRESS.md → SprintInfo | null
│   │   ├── claude-md.ts                  # Parse CLAUDE.md → { projectId, agentName }
│   │   ├── projects.ts                   # Aggregate discovery + git + LORE + GitHub → ProjectCardData[]
│   │   ├── utils.ts                      # Shared utilities: relative-time formatter
│   │   └── env.ts                        # Env var accessors; returns "" on missing vars; logs warning; no crash
│   └── types/
│       └── index.ts                      # All shared TypeScript interfaces (single source of truth)
├── ecosystem.config.js                   # PM2 configuration
├── .env.local                            # Runtime secrets (gitignored)
├── next.config.ts
├── package.json
├── tsconfig.json
└── tailwind.config.ts
```

---

## Components

| Component | Responsibility | Location |
|---|---|---|
| `DashboardLayout` | Root layout: HTML shell, Tailwind globals, ThemeProvider, persistent page header; no data fetching | `src/app/layout.tsx` |
| `DashboardPage` | Thin layout; renders 6 panel Suspense wrappers; no data fetching | `src/app/page.tsx` |
| `DashboardGrid` | Six-panel CSS grid wrapper; provides panel slot layout; no data fetching | `src/components/layout/DashboardGrid.tsx` |
| `ProjectCardsPanel` | Async RSC; calls `src/lib/projects.ts` directly; renders sorted ProjectCard list; handles unavailable state via PanelShell | `src/components/panels/ProjectCardsPanel.tsx` |
| `ProjectCard` | Render single project card with all fields and HALT badge | `src/components/cards/ProjectCard.tsx` |
| `DdrPipelinePanel` | Async RSC; calls `src/lib` functions directly; renders 4 Kanban columns + Unknown catch-all | `src/components/panels/DdrPipelinePanel.tsx` |
| `SessionClosePanel` | Async RSC; calls `src/lib/lore.ts` directly; renders most-recent session-close card per project | `src/components/panels/SessionClosePanel.tsx` |
| `ActivityFeedLoader` | Async RSC; calls `src/lib` functions directly; passes `ApiResponse<ActivityEvent[]>` as props to ActivityFeedPanel | `src/components/panels/ActivityFeedLoader.tsx` |
| `ActivityFeedPanel` | Client Component; receives initial data as props from ActivityFeedLoader; holds filter state (project, type); renders filtered event timeline | `src/components/panels/ActivityFeedPanel.tsx` |
| `AgentStatusPanel` | Async RSC; calls `src/lib/lore.ts` directly; renders agent rows with online/offline badges | `src/components/panels/AgentStatusPanel.tsx` |
| `OpenWorkPanel` | Async RSC; calls `src/lib` functions directly; renders grouped halt/PR/issue/DDR work items | `src/components/panels/OpenWorkPanel.tsx` |
| `PanelShell` | Shared wrapper: heading, border, error slot | `src/components/shared/PanelShell.tsx` |
| `PanelUnavailable` | "Unavailable" state with optional error text and stale notice | `src/components/shared/PanelUnavailable.tsx` |
| `PanelSkeleton` | Suspense fallback; animated skeleton placeholder occupying full panel body area | `src/components/shared/PanelSkeleton.tsx` |
| `InMemoryCache` | Module-level singleton; get/set/isValid with TTL | `src/lib/cache.ts` |
| `discovery` | `discoverProjects()` and `parseCLAUDEMd()` | `src/lib/discovery.ts` |
| `lore` | All LORE Postgres query functions | `src/lib/lore.ts` |
| `github` | All Octokit call wrappers | `src/lib/github.ts` |
| `git` | `getLastCommit()`, `getCommitsSince()`, `getGitHubRemote()` via simple-git | `src/lib/git.ts` |
| `switchboard` | Read `~/.switchboard/` files; online status resolution | `src/lib/switchboard.ts` |
| `ddrIndex` | `parseDdrIndex()` + `normalizeDdrStatus()` | `src/lib/ddr-index.ts` |
| `progressMd` | `parseProgressMd()` | `src/lib/progress.ts` |
| `claudeMd` | `parseCLAUDEMd()` | `src/lib/claude-md.ts` |
| `projects` | `getProjectsData()` aggregator | `src/lib/projects.ts` |
| `utils` | `formatRelativeTime()` relative-time formatter | `src/lib/utils.ts` |
| `env` | `requireEnv()` and `optionalEnv()` | `src/lib/env.ts` |

---

## Data Schemas

```typescript
// src/types/index.ts

// ── Project Discovery ──────────────────────────────────────────────────────

export interface DiscoveredProject {
  repoPath: string;        // absolute path, e.g. /home/d-tuned/projects/agent-dashboard
  repoName: string;        // directory name, e.g. agent-dashboard
  projectId: string | null;
  agentName: string | null;
  githubRemote: { owner: string; repo: string } | null;
  // Resolved during discovery via getGitHubRemote(repoPath).
  // null if remote is absent, non-GitHub, or unreadable.
  // GitHub lib functions are skipped for this repo when null.
}

// ── Git ───────────────────────────────────────────────────────────────────

export interface GitCommit {
  hash: string;
  date: Date;
  message: string;         // first line only (short message)
  author: string;
}

// ── LORE ──────────────────────────────────────────────────────────────────

export interface LoreCaptureSummary {
  id: string;              // UUID
  timestamp: Date;
  title: string;
  documentType: string;
  projectId: string;
}

export interface SessionClose {
  projectId: string;
  repoName: string;
  timestamp: Date;
  title: string;
  content: string;         // full body; UI truncates display to ~300 chars
}

export interface AgentRecord {
  name: string;
  projectId: string;
  relayHandle: string;
  registryStatus: string;  // raw value from LORE registry capture status field
  switchboardStatus: SwitchboardStatus;
}

export type SwitchboardStatus = 'online' | 'offline' | 'unknown';

// ── Project Cards ─────────────────────────────────────────────────────────

export interface SprintInfo {
  slug: string;
  status: SprintStatus;
}

export type SprintStatus =
  | 'TODO'
  | 'IN PROGRESS'
  | 'COMPLETE'
  | 'BLOCKED'
  | 'HALTED';

export interface ProjectCardData {
  repoPath: string;
  repoName: string;
  projectId: string | null;
  agentName: string | null;
  lastCommit: GitCommit | null;
  lastLoreCapture: LoreCaptureSummary | null;
  currentSprint: SprintInfo | null;
  openPrCount: number;             // uncapped count; list rendering in Open Work Tracker caps display at 25
  hasActiveHalt: boolean;
  lastTouchedAt: Date;             // max(lastCommit.date, lastLoreCapture.timestamp)
}

// ── DDR Pipeline ──────────────────────────────────────────────────────────

export type KanbanColumn =
  | 'PROPOSED'
  | 'ACCEPTED'
  | 'IN SPRINT'
  | 'SHIPPED'
  | 'UNKNOWN';

export interface DdrEntry {
  number: string;          // e.g. "002"
  title: string;
  rawStatus: string;       // verbatim from 00-DDR-INDEX.md
  kanbanColumn: KanbanColumn;
  sprint: string;          // sprint slug or "tbd"
  repoName: string;
  projectId: string | null;
}

// ── Activity Feed ─────────────────────────────────────────────────────────

export type ActivityEventType = 'lore-capture' | 'git-commit' | 'pr-merge';

export interface ActivityEvent {
  id: string;              // deterministic: `${type}:${repoName}:${hash|uuid}`
  timestamp: Date;
  type: ActivityEventType;
  projectId: string | null;
  repoName: string;
  summary: string;         // one-line display string
}

// ── Open Work ─────────────────────────────────────────────────────────────

export type OpenWorkType = 'halt' | 'pr' | 'issue' | 'unaccepted-ddr';

export interface OpenWorkItem {
  type: OpenWorkType;
  projectId: string | null;
  repoName: string;
  title: string;
  timestamp?: Date;
  url?: string;
  number?: number;         // PR or issue number
  severity: 'red' | 'normal';
}

// ── GitHub ────────────────────────────────────────────────────────────────

export interface GitHubPr {
  number: number;
  title: string;
  url: string;
  mergedAt?: Date;
}

export interface GitHubIssue {
  number: number;
  title: string;
  url: string;
}

// ── Switchboard ───────────────────────────────────────────────────────────

export interface SwitchboardSession {
  agentId: string;
  startedAt: string;       // ISO string from JSON
  lastActiveAt: string;    // ISO string from JSON
}

export type SwitchboardSessions = Record<string, SwitchboardSession>;

// ── Cache ─────────────────────────────────────────────────────────────────

export interface CacheEntry<T> {
  data: T;
  fetchedAt: number;       // Date.now() at time of set
  ttlMs: number;
}

// ── API Response ──────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  stale: boolean;          // true when serving cached data after a re-fetch failure
  cachedAt: number | null; // Date.now() when cache entry was written
}
```

---

## Assumed LORE Schema

The dashboard queries LORE Postgres directly. The `agent-lore` service owns all migrations. The dashboard assumes the following columns exist on the primary captures table (name assumed `documents`):

```sql
-- Read-only query surface assumed by the dashboard
TABLE documents (
  id          UUID          PRIMARY KEY,
  project_id  TEXT          NOT NULL,
  author      TEXT,
  document_type TEXT        NOT NULL,   -- 'decision' | 'halt' | 'spec' | 'discovery' | etc.
  epistemic_type TEXT,
  status      TEXT,                     -- 'draft' | 'locked' | 'archived' | NULL
  title       TEXT,
  content     TEXT,
  created_at  TIMESTAMPTZ   NOT NULL,
  supersedes_id UUID
)
```

If the actual table name or column names differ, `src/lib/lore.ts` is the single file to update — no other module references SQL directly.

---

## API Contracts

### `src/lib/cache.ts`

```typescript
const CACHE_TTL_MS = 60_000;

class InMemoryCache {
  private store: Map<string, CacheEntry<unknown>>;

  get<T>(key: string): CacheEntry<T> | null;
  set<T>(key: string, data: T, ttlMs?: number): void; // default CACHE_TTL_MS
  isValid<T>(entry: CacheEntry<T>): boolean;           // Date.now() - fetchedAt < ttlMs
  clear(): void;
}

export const cache = new InMemoryCache(); // module-level singleton
```

### `src/lib/env.ts`

```typescript
export function requireEnv(name: string): string;
// Returns the env var value if present.
// Logs a warning and returns "" if the variable is missing or empty.
// Callers must handle "" returns — empty string signals an unavailable data source, not a crash.
// Called once per lib module at import time.

export function optionalEnv(name: string, defaultValue: string): string;
```

### `src/lib/discovery.ts`

```typescript
export async function discoverProjects(projectsRoot: string): Promise<DiscoveredProject[]>;
// Scans one level of projectsRoot for directories containing a .git subdirectory.
// For each found repo: reads CLAUDE.md if present and calls parseCLAUDEMd.
// Calls getGitHubRemote(repoPath) for each repo to populate githubRemote.
// Returns [] (not throws) if projectsRoot is unreadable.

export function parseCLAUDEMd(content: string): { projectId: string | null; agentName: string | null };
// Extracts values from CLAUDE.md using these patterns:
//   projectId:  first match of /^[-*]\s*`?project[Ii][Dd]`?\s*:\s*[`']?([^`'\n]+)/m
//               or /^projectId\s*=\s*[`']?([^`'\n]+)/m
//   agentName:  first match of /^Conversational name:\s*\*{0,2}(.+?)\*{0,2}$/m
//               or /^You are\s+\*{0,2}(\w+)\*{0,2}/m
// Returns { projectId: null, agentName: null } on parse error; does not throw.
```

### `src/lib/progress.ts`

```typescript
export function parseProgressMd(content: string): SprintInfo | null;
// Parses sprint slug from: /^#\s+PROGRESS\.md\s+[-—]\s+(.+)$/m
// Parses status from: /^\*{0,2}Status:\*{0,2}\s+(.+)$/m (handles plain and bold variants)
// Returns null if either field is absent.
// Does not throw.
```

### `src/lib/ddr-index.ts`

```typescript
export function parseDdrIndex(
  content: string,
  repoName: string,
  projectId: string | null
): DdrEntry[];
// Parses pipe-delimited Markdown table; status is column index 2 after split on '|'.
// Skips header row (contains literal "Status") and separator rows (start with |---).
// Rows with fewer than 4 pipe-delimited fields are skipped and logged.
// Calls normalizeDdrStatus for each entry.
// Does not throw.

export function normalizeDdrStatus(rawStatus: string): KanbanColumn;
// 'ACCEPTED'              → 'ACCEPTED'
// 'IN SPRINT'             → 'IN SPRINT'
// 'SHIPPED'               → 'SHIPPED'
// 'PROPOSED'|'BACKLOG'|'DRAFT' → 'PROPOSED'
// anything else           → 'UNKNOWN'
```

### `src/lib/git.ts`

```typescript
export async function getLastCommit(repoPath: string): Promise<GitCommit | null>;
// Uses simple-git; returns null on any error (no .git dir, zero commits, etc.)

export async function getCommitsSince(repoPath: string, since: Date): Promise<GitCommit[]>;
// Uses simple-git .log({ from: since.toISOString() }).
// Returns [] on any error (no .git dir, empty log, parse failure, etc.). Does not throw.
// Used by the activity feed to build GitCommit[] over a 14-day window.

export async function getGitHubRemote(
  repoPath: string
): Promise<{ owner: string; repo: string } | null>;
// Uses simple-git .getConfig('remote.origin.url') to read the origin URL.
// Parses both HTTPS and SSH GitHub remote formats:
//   HTTPS: https://github.com/owner/repo.git
//   SSH:   git@github.com:owner/repo.git
// Parsing regex: /^(?:https?:\/\/github\.com\/|git@github\.com:)([^/]+)\/([^/\n.]+?)(?:\.git)?$/
// Returns null if the remote is absent, unreadable, or does not match a github.com URL.
// Non-GitHub remotes (GitLab, Bitbucket, self-hosted) return null — GitHub data is marked
// unavailable for that project; no crash.
// Does not throw.
```

### `src/lib/lore.ts`

```typescript
// Single pg.Pool instance; initialized at module load from LORE_DATABASE_URL.
// All functions return null / [] on connection failure; do not throw to caller.

export async function getLastCapturePerProject(
  projectIds: string[]
): Promise<Map<string, LoreCaptureSummary>>;

export async function getActiveHaltsByProject(
  projectId: string
): Promise<LoreCaptureSummary[]>;
// Queries: WHERE project_id = $1 AND document_type = 'halt' AND (status IS NULL OR status != 'archived')

export async function getSessionCloses(
  projectIds: string[]
): Promise<Map<string, SessionClose>>;
// Queries: document_type = 'decision' AND title ILIKE '%SESSION-CLOSE%'
// Returns the most recent per projectId.

export async function getLoreActivityEvents(
  projectIds: string[],
  since: Date
): Promise<ActivityEvent[]>;
// Returns all captures for the given projects with created_at >= since.

export async function getAgentRegistry(): Promise<AgentRecord[]>;
// Queries: project_id = 'lore-personal' AND document_type = 'spec'
// Agent Registry entries are spec-type documents in the lore-personal project.
// One document per agent is expected. If multiple docs share the same author value,
// the most recently created (ORDER BY created_at DESC) takes precedence.
// Calls parseAgentDocument() on each row; skips rows where parseAgentDocument returns null.
// Calls isAgentOnline(relayHandle, sessions) per agent to populate switchboardStatus.

// ── Agent registry document parsing ──────────────────────────────────────

// Internal shape of a row returned from the agent registry query:
interface LoreAgentDocument {
  id: string;
  author: string | null;    // agent slug, e.g. 'lumen' — same as relay handle by convention
  title: string | null;
  content: string | null;
  status: string | null;    // document status: 'draft' | 'locked' | 'archived' | null
}

export function parseAgentDocument(doc: LoreAgentDocument): AgentRecord | null;
// Returns null if doc.author is null or empty (cannot identify the agent).
//
// Field mapping:
//   name:           doc.author
//                   (agent slug; by naming convention, slug = relay handle = conversational name lowercase)
//   relayHandle:    doc.author
//                   (one-to-one with author slug; no separate relay handle field in the registry doc)
//   registryStatus: doc.status ?? 'unknown'
//                   ('locked' conventionally indicates a confirmed/accepted registration;
//                    'draft' indicates pending; 'archived' indicates retired)
//   projectId:      extracted from doc.content via
//                   /^[-*]\s*`?project[Ii][Dd]`?\s*:\s*[`']?([^`'\n]+)/m
//                   or /^projectId\s*=\s*[`']?([^`'\n]+)/m
//                   null if the pattern is absent or doc.content is null
//                   (same regex as parseCLAUDEMd; content body follows CLAUDE.md conventions)
//
// switchboardStatus is NOT set by parseAgentDocument; getAgentRegistry() resolves it
// after calling isAgentOnline(relayHandle, sessions).
// Does not throw.
```

### `src/lib/github.ts`

```typescript
// Octokit instance initialized at module load from GITHUB_TOKEN.
// requireEnv('GITHUB_TOKEN') returns "" if missing; all functions return 0 / [] on empty token.
// All functions return null / 0 / [] on error; do not throw.
// owner and repo are resolved via getGitHubRemote() during discovery; callers skip
// GitHub calls when DiscoveredProject.githubRemote is null.

export async function getOpenPrCount(owner: string, repo: string): Promise<number>;

export async function getOpenPrs(
  owner: string,
  repo: string,
  limit?: number   // default 25
): Promise<GitHubPr[]>;

export async function getOpenIssues(
  owner: string,
  repo: string,
  limit?: number   // default 25
): Promise<GitHubIssue[]>;

export async function getMergedPrs(
  owner: string,
  repo: string,
  since: Date
): Promise<GitHubPr[]>;

// Internal: checks X-RateLimit-Remaining header; returns true if limit hit
function isRateLimited(response: OctokitResponse): boolean;
```

### `src/lib/switchboard.ts`

```typescript
const SWITCHBOARD_DIR = path.join(os.homedir(), '.switchboard');

export async function readSwitchboardSessions(): Promise<SwitchboardSessions | null>;
// Reads ~/.switchboard/sessions.json; returns null on any fs or parse error.
// Zero-byte file treated as empty → returns {}.

export function isAgentOnline(
  relayHandle: string,
  sessions: SwitchboardSessions
): SwitchboardStatus;
// 'online'  if sessions[relayHandle] exists and lastActiveAt is within ONLINE_THRESHOLD_MS
// 'offline' if sessions[relayHandle] exists but lastActiveAt is older than ONLINE_THRESHOLD_MS
// 'unknown' if sessions is null or relayHandle not present in sessions
//
// Decision: ONLINE_THRESHOLD_MS = 5 * 60 * 1000 (5 minutes).
// Rationale: balances freshness against the Switchboard dispatcher heartbeat interval.
// If a relay process crashes without writing a final lastActiveAt, it appears offline
// within one 5-minute window — acceptable staleness for a homelab status panel.
// The constant is named and exported so it can be adjusted without hunting magic numbers.

export const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;
```

### `src/lib/projects.ts`

```typescript
// Aggregates discovery + git + LORE + GitHub → ProjectCardData[].
// Used by both /api/projects/route.ts (wraps with cache) and ProjectCardsPanel (direct call).

export async function getProjectsData(): Promise<ProjectCardData[]>;
// 1. Calls discoverProjects(PROJECTS_ROOT) → DiscoveredProject[]
// 2. Collects all non-null projectIds; calls getLastCapturePerProject(projectIds)
// 3. For each project in parallel:
//      - getLastCommit(repoPath)
//      - parseProgressMd() on the most recent PROGRESS.md found under docs/specs/
//      - getActiveHaltsByProject(projectId) if projectId != null
//      - getOpenPrCount(owner, repo) if githubRemote != null
// 4. Computes lastTouchedAt = max(lastCommit?.date ?? epoch, lastLoreCapture?.timestamp ?? epoch)
// 5. Returns sorted by lastTouchedAt DESC
// Individual data source failures return null/0 for that field; never throws.
```

### `src/lib/utils.ts`

```typescript
export function formatRelativeTime(date: Date): string;
// Returns a human-readable relative time string, e.g. "3 hours ago", "2 days ago".
// Uses Intl.RelativeTimeFormat with { numeric: 'auto', style: 'long', locale: 'en' }.
// Unit selection: seconds (<60s), minutes (<60m), hours (<24h), days (else, up to 30).
// For dates older than 30 days, returns the date formatted as locale string via Intl.DateTimeFormat.
// No external dependencies — uses Node.js / browser built-ins only.
// Returns "" on null or invalid Date input. Does not throw.
```

### API Route Contracts

All routes follow this shape:

```typescript
// Standard route handler pattern
export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<T>>> {
  const cached = cache.get<T>(CACHE_KEY);
  if (cached && cache.isValid(cached)) {
    return NextResponse.json({
      data: cached.data,
      error: null,
      stale: false,
      cachedAt: cached.fetchedAt,
    });
  }

  try {
    const data = await fetchData(); // calls lib functions
    cache.set(CACHE_KEY, data);
    return NextResponse.json({ data, error: null, stale: false, cachedAt: Date.now() });
  } catch (err) {
    // On failure: serve stale cache if available; otherwise return null data
    if (cached) {
      return NextResponse.json({
        data: cached.data,
        error: String(err),
        stale: true,
        cachedAt: cached.fetchedAt,
      });
    }
    return NextResponse.json({ data: null, error: String(err), stale: false, cachedAt: null });
  }
}
```

Individual route cache keys and params:

| Route | Cache key | Query params |
|---|---|---|
| `GET /api/projects` | `'projects'` | none |
| `GET /api/ddr-pipeline` | `'ddr-pipeline'` | none |
| `GET /api/activity-feed` | `'activity-feed'` | `days` (default 14), `project`, `type` |
| `GET /api/agents` | `'agents'` | none |
| `GET /api/open-work` | `'open-work'` | none |
| `GET /api/session-closes` | `'session-closes'` | none |

Note: The `activity-feed` cache key includes all params: `activity-feed:${days}:${project}:${type}`. `days` is active in v1 (controls the lookback window passed to `getCommitsSince` and `getLoreActivityEvents`). `project` and `type` params are pre-wired in the route signature but unused for server-side filtering in v1 — `ActivityFeedPanel` applies client-side filtering to the full dataset. These params are reserved for v2 server-side filtering.

### `src/app/page.tsx`

`page.tsx` is a thin synchronous Server Component with no data fetching. Each panel is an async Server Component wrapped in its own `<Suspense>` boundary. This produces per-panel progressive rendering: each panel's skeleton appears immediately on page load and resolves independently as its fetch completes. One panel fetch failure does not delay or block any other panel.

```typescript
// Server Component — thin layout; no data fetching
import { Suspense } from 'react';
import { DashboardGrid } from '@/components/layout/DashboardGrid';
import { PanelSkeleton } from '@/components/shared/PanelSkeleton';
import { ProjectCardsPanel } from '@/components/panels/ProjectCardsPanel';
import { AgentStatusPanel } from '@/components/panels/AgentStatusPanel';
import { DdrPipelinePanel } from '@/components/panels/DdrPipelinePanel';
import { SessionClosePanel } from '@/components/panels/SessionClosePanel';
import { OpenWorkPanel } from '@/components/panels/OpenWorkPanel';
import { ActivityFeedLoader } from '@/components/panels/ActivityFeedLoader';

export default function DashboardPage() {
  return (
    <DashboardGrid>
      <Suspense fallback={<PanelSkeleton />}>
        <ProjectCardsPanel />
      </Suspense>
      <Suspense fallback={<PanelSkeleton />}>
        <AgentStatusPanel />
      </Suspense>
      <Suspense fallback={<PanelSkeleton />}>
        <DdrPipelinePanel />
      </Suspense>
      <Suspense fallback={<PanelSkeleton />}>
        <SessionClosePanel />
      </Suspense>
      <Suspense fallback={<PanelSkeleton />}>
        <OpenWorkPanel />
      </Suspense>
      <Suspense fallback={<PanelSkeleton />}>
        <ActivityFeedLoader />
      </Suspense>
    </DashboardGrid>
  );
}
```

### Panel Component Fetch Pattern

Panel Server Components call `src/lib/*` functions directly. HTTP self-fetch (`fetch('/api/...')`) is not supported in RSC — relative URLs have no implicit base URL in the server context and will throw. Direct lib calls are required.

Each async Server Component panel follows this shape:

```typescript
// e.g. ProjectCardsPanel.tsx
// Direct lib call — no HTTP self-fetch.
import { getProjectsData } from '@/lib/projects';

export async function ProjectCardsPanel() {
  let data: ProjectCardData[] | null = null;
  let error: string | null = null;

  try {
    data = await getProjectsData();
  } catch (err) {
    error = String(err);
  }

  const res: ApiResponse<ProjectCardData[]> = {
    data,
    error,
    stale: false,
    cachedAt: null,
  };
  return (
    <PanelShell title="Project Cards" response={res}>
      {res.data && <ProjectCardGrid cards={res.data} />}
    </PanelShell>
  );
}
```

`PanelShell` inspects `response.error` and `response.data` to render `PanelUnavailable` or a stale-data notice as appropriate. The panel component itself does not throw — lib errors are expressed via `ApiResponse<null>`.

Note: Panel RSCs call lib functions directly and do not use the module-level `InMemoryCache`. The cache is used by API routes when those routes are called by external consumers. Panel RSCs are rendered once per server request; the server-side render is the caching boundary at the HTTP layer (Next.js handles page-level caching independently of the module cache).

### `src/components/panels/ActivityFeedLoader.tsx`

`ActivityFeedLoader` is an async Server Component. Its sole responsibility is fetching activity data via direct lib calls and passing the result as props to the Client Component `ActivityFeedPanel`. This keeps data fetching server-side while allowing `ActivityFeedPanel` to hold client-side filter state.

```typescript
// ActivityFeedLoader.tsx — Server Component
// Direct lib calls — no HTTP self-fetch.
import { getLoreActivityEvents } from '@/lib/lore';
import { getCommitsSince } from '@/lib/git';
import { getMergedPrs } from '@/lib/github';
import { discoverProjects } from '@/lib/discovery';
import { optionalEnv } from '@/lib/env';

export async function ActivityFeedLoader() {
  let data: ActivityEvent[] | null = null;
  let error: string | null = null;

  try {
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const projectsRoot = optionalEnv('PROJECTS_ROOT', path.join(os.homedir(), 'projects'));
    const projects = await discoverProjects(projectsRoot);
    const projectIds = projects.map(p => p.projectId).filter(Boolean) as string[];

    const [loreEvents, ...gitEvents] = await Promise.all([
      getLoreActivityEvents(projectIds, since),
      ...projects.map(p => getCommitsSince(p.repoPath, since).then(commits =>
        commits.map<ActivityEvent>(c => ({
          id: `git-commit:${p.repoName}:${c.hash}`,
          timestamp: c.date,
          type: 'git-commit',
          projectId: p.projectId,
          repoName: p.repoName,
          summary: c.message,
        }))
      )),
    ]);

    data = [...loreEvents, ...gitEvents.flat()]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  } catch (err) {
    error = String(err);
  }

  const res: ApiResponse<ActivityEvent[]> = { data, error, stale: false, cachedAt: null };
  return <ActivityFeedPanel initialData={res} />;
}
```

```typescript
// ActivityFeedPanel.tsx — Client Component ('use client')
interface ActivityFeedPanelProps {
  initialData: ApiResponse<ActivityEvent[]>;
}

export function ActivityFeedPanel({ initialData }: ActivityFeedPanelProps) {
  const [filterProject, setFilterProject] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<ActivityEventType | null>(null);
  // ... filter logic applied to initialData.data
}
```

### `src/components/shared/PanelSkeleton.tsx`

```typescript
// Synchronous Server Component (or Client Component — no state needed)
// Renders an animated placeholder block occupying the full panel body area.
// Used as the Suspense fallback for every panel in page.tsx.
export function PanelSkeleton() {
  // Renders: panel border + title bar placeholder + animated content blocks
  // Matches approximate dimensions of the real panel to prevent layout shift on resolve
}
```

---

## Caching Layer Design

```
Module: src/lib/cache.ts
Singleton: const cache = new InMemoryCache()

Lifetime: Node.js process lifetime (PM2-managed)
- Cache is empty on process start (US-10 AC3 satisfied)
- Cache persists across requests within the same process
- PM2 restart clears cache

TTL enforcement:
- isValid(): Date.now() - entry.fetchedAt < entry.ttlMs
- Expired entries are not proactively evicted; they are replaced on next cache miss

Stale-on-failure behavior:
- If re-fetch fails and a stale entry exists: serve stale, set stale:true in response
- If re-fetch fails and no entry exists: return data:null, error:message
- This satisfies the edge case: "Cache entry is stale but data source is unreachable"

No max-size limit in v1 (6 keys maximum; memory impact is negligible).
```

---

## Patterns

| Pattern | Usage | Rationale |
|---|---|---|
| Module-level singleton cache | `src/lib/cache.ts` exports `cache` instance | Persists across requests in Node.js process; simpler than Redis for single-user dashboard |
| Per-panel React Suspense boundaries | `src/app/page.tsx` wraps each panel RSC in `<Suspense fallback={<PanelSkeleton />}>` | Each panel skeleton appears immediately and resolves independently; one panel fetch failure does not delay other panels |
| Try/catch per data source | Every `lib/*.ts` function | Isolates failures; returns null instead of throwing; enables panel degradation |
| Structured `ApiResponse<T>` wrapper | All API routes and panel RSC data shapes | Uniform shape for data, error, stale flag; client never has to check HTTP status |
| Server Components for data rendering | All panel components; `ActivityFeedLoader` RSC wraps `ActivityFeedPanel` Client Component | Zero client JS for data fetching; no credential exposure |
| Client Component for filter state | `ActivityFeedPanel.tsx` | Filter interactivity (project/type) requires client-side state; initial data passed as props from ActivityFeedLoader |
| Named exports only | All `lib/*.ts` modules | Enables tree-shaking and explicit import contracts; no default exports |
| Single types file | `src/types/index.ts` | One source of truth for all interfaces; prevents drift between producer and consumer |
| `normalizeDdrStatus` as pure function | `src/lib/ddr-index.ts` | Isolates the raw-to-kanban mapping; trivially testable; easy to extend when new statuses appear |
| `getGitHubRemote` resolved at discovery | `src/lib/discovery.ts` calls `getGitHubRemote()` per repo | GitHub owner/repo is derived from git remote, not assumed from directory name; avoids silent wrong-repo API calls |

**Anti-patterns — do not use:**

- `fetch('/api/...')` in Server Components — relative URLs have no implicit base in RSC context; use direct lib function calls instead
- Batching all panel fetches with `Promise.all` or `Promise.allSettled` at the page level — collapses independent Suspense boundaries into a single page-level wait; eliminates per-panel progressive loading and per-panel skeleton behavior
- `useEffect` for data fetching — all data fetching is server-side only
- Client-side `fetch` to external APIs — credentials would be exposed in browser
- Direct SQL in API route handlers — all Postgres access is through `src/lib/lore.ts` only
- `getServerSideProps` — App Router only; no Pages Router patterns
- Shared mutable state outside `cache.ts` — only the cache singleton is shared across requests
- Assuming GitHub `owner/repo` from directory name — use `getGitHubRemote()` to parse from git remote URL

---

## Error Boundary Strategy

```
Level 1: app/error.tsx
  Catches unhandled errors in the root layout (should never fire in normal operation).
  Renders a full-page error message.

Level 2: PanelShell.tsx
  Each panel RSC fetches its own data and passes the ApiResponse to PanelShell.
  If ApiResponse.error != null or ApiResponse.data == null, PanelShell renders
  <PanelUnavailable> in place of the panel body.
  This is not a React error boundary — it's a data-driven conditional render.
  Panel RSCs are designed not to throw: lib functions always return null/[] on failure,
  so uncaught throws from panels are not expected in normal operation and fall through
  to Level 1. No panel error propagates to the layout.

Level 3: API route try/catch
  Each API route catches all errors from lib functions.
  Returns ApiResponse<null> with error string; HTTP status is always 200
  (prevents Next.js from treating data errors as page errors).

Level 4: lib function try/catch
  Each lib function catches its own data source errors.
  Returns null / [] on failure; logs error to server console.
  Never throws to the API route layer.

GitHub rate limit handling (edge case):
  lib/github.ts detects 429/403 responses.
  Returns null from the specific call.
  API route falls through to stale cache if available.
  ApiResponse.stale = true; ApiResponse.error = "GitHub rate limit".
  Panel renders PanelUnavailable with stale-data notice.
```

---

## Environment Variables

```bash
# Required — process will log warnings and individual panels will show "unavailable"
# if missing, but will not crash on startup.
GITHUB_TOKEN=          # PAT, dannySubsense account, repo scope
LORE_DATABASE_URL=     # postgres://lore:<pw>@<lore-db-host>:5432/lore?sslmode=disable

# Optional
PROJECTS_ROOT=         # Default: ~/projects (resolved to absolute path via os.homedir())
```

`src/lib/env.ts` `requireEnv()` logs a warning (does not throw) when called at import time if the variable is missing. This is a deliberate choice: if `GITHUB_TOKEN` is absent, only GitHub-dependent panels degrade; the rest of the dashboard operates normally.

---

## PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'agent-dashboard',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/home/d-tuned/projects/agent-dashboard',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        NODE_OPTIONS: '--max-old-space-size=512',
      },
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
```

`exec_mode: 'fork'` (not `cluster`) — single instance is correct for this dashboard; cluster mode would create multiple cache singletons with no shared state, defeating the 60s cache.

`.env.local` is read by Next.js automatically in both `next dev` and `next start`. PM2 does not need to inject variables; `env_file` is intentionally omitted (`.env.local` is the canonical source).

Deploy sequence:
1. `npm run build` (produces `.next/`)
2. `pm2 start ecosystem.config.js` (or `pm2 reload agent-dashboard` for zero-downtime reload)

---

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| `next` | `^15.0.0` | App Router framework; API routes; Server Components |
| `react` | `^19.0.0` | Required by Next.js 15 |
| `react-dom` | `^19.0.0` | Required by Next.js 15 |
| `typescript` | `^5.4.0` | Type checking |
| `tailwindcss` | `^4.0.0` | Utility CSS (locked by DDR-002) |
| `@shadcn/ui` | via CLI | Component library (installed per-component via `npx shadcn@latest add`) |
| `recharts` | `^2.12.0` | General charts via shadcn `<Chart>` primitive |
| `@nivo/calendar` | `^0.87.0` | Calendar heatmap for activity feed |
| `@nivo/funnel` | `^0.87.0` | DDR pipeline funnel visualization |
| `@octokit/rest` | `^21.0.0` | GitHub REST API v3 |
| `simple-git` | `^3.27.0` | Local git reads |
| `pg` | `^8.13.0` | Direct Postgres client for LORE |
| `@types/pg` | `^8.11.0` | TypeScript types for pg |
| `@types/node` | `^20.0.0` | Node.js types |
| `@types/react` | `^19.0.0` | React types |
| `@types/react-dom` | `^19.0.0` | React DOM types |
| `pm2` | `^5.4.0` | Process manager (installed globally on VM 101, not in package.json) |

All versions are minimum bounds (`^`); exact versions are pinned in `package-lock.json` at install time.

---

## Integration Points

| External System | Integration Method | Failure Behavior |
|---|---|---|
| LORE Postgres (VM 103) | `pg.Pool` in `src/lib/lore.ts`; single connection pool | Pool throws → catch → `data: null`; LORE panels show "unavailable" |
| GitHub API | `@octokit/rest` in `src/lib/github.ts`; PAT from `GITHUB_TOKEN` | 4xx/5xx → catch → `null`; rate limit → stale cache served |
| Local git repos under `PROJECTS_ROOT` | `simple-git` in `src/lib/git.ts` | No `.git` or zero commits → `null`; card shows "no commits" |
| `~/.switchboard/sessions.json` | `fs.readFile` in `src/lib/switchboard.ts` | Missing, malformed, zero-byte → `null`; agent shown as "unknown" |
| `PROJECTS_ROOT/*/CLAUDE.md` | `fs.readFile` + `parseCLAUDEMd` in `src/lib/discovery.ts` | Missing or malformed → `{ projectId: null, agentName: null }`; card shows defaults |
| `PROJECTS_ROOT/*/docs/specs/<slug>/PROGRESS.md` | `fs.readFile` + `parseProgressMd` in `src/lib/progress.ts` | Missing or malformed → `null`; card shows no sprint |
| `PROJECTS_ROOT/*/docs/specs/agent-dashboard-ddrs/00-DDR-INDEX.md` | `fs.readFile` + `parseDdrIndex` in `src/lib/ddr-index.ts` | Missing → empty array; malformed rows → skipped individually |

---

## Requirements Coverage

| US | Coverage |
|---|---|
| US-01 | Per-panel `<Suspense fallback={<PanelSkeleton />}>` in `app/page.tsx`; each panel skeleton appears immediately and resolves independently; 5s target met via parallel RSC fetch + 60s cache warmth |
| US-02 | `src/lib/projects.ts` `getProjectsData()` aggregates discovery + git + LORE + PROGRESS.md + GitHub PR count + HALT flag; `ProjectCardsPanel` sorts by `lastTouchedAt` desc |
| US-03 | `/api/ddr-pipeline` reads `00-DDR-INDEX.md` from all discovered repos; `normalizeDdrStatus` maps to 4+1 Kanban columns |
| US-04 | `/api/session-closes` queries LORE for `document_type='decision'` + title ILIKE `%SESSION-CLOSE%`; most recent per project |
| US-05 | `ActivityFeedLoader` merges LORE captures + `getCommitsSince()` git commits + PR merges over 14-day window; `ActivityFeedPanel` holds client-side filter state |
| US-06 | `getAgentRegistry()` reads LORE `lore-personal` registry; `parseAgentDocument()` maps doc fields to `AgentRecord`; `isAgentOnline()` reads `~/.switchboard/sessions.json` for online status |
| US-07 | `/api/open-work` aggregates LORE HALTs + GitHub PRs + GitHub issues + PROPOSED DDRs |
| US-08 | `discoverProjects()` scans `PROJECTS_ROOT` one level deep via `fs.readdir` + `stat`; reads `CLAUDE.md` per repo; calls `getGitHubRemote()` per repo |
| US-09 | `PanelShell` + `PanelUnavailable` pattern; per-panel Suspense isolation; `ApiResponse<null>` on error; one panel failure does not affect others |
| US-10 | `InMemoryCache` singleton with 60s TTL in `src/lib/cache.ts`; all 6 API routes use it; cleared on PM2 restart |
