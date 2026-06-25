# Roadmap: Dashboard Framework v1

- **Sprint:** dashboard-framework-v1
- **Source DDR:** DDR-002 (ACCEPTED 2026-06-20)
- **Author:** planner
- **Date:** 2026-06-20

---

## Summary

10 ordered slices. Greenfield Next.js 15 app — no existing code. Slices group by dependency tier: scaffold → data layers → API routes → panel components → deployment. Each slice is independently testable before the next begins.

---

## Dependency Map

| Unit | Depends On |
|---|---|
| `src/types/index.ts` | — |
| `src/lib/env.ts` | — |
| `src/lib/cache.ts` | `types/index.ts` |
| `src/components/shared/*` | `types/index.ts`, shadcn/ui |
| `src/app/layout.tsx` | `globals.css`, shadcn/ui |
| `src/app/page.tsx` (stub) | `layout.tsx`, shared components |
| `src/lib/claude-md.ts` | `types/index.ts` |
| `src/lib/progress.ts` | `types/index.ts` |
| `src/lib/ddr-index.ts` | `types/index.ts` |
| `src/lib/git.ts` | `types/index.ts`, `simple-git` |
| `src/lib/discovery.ts` | `claude-md.ts`, `git.ts`, `types/index.ts` |
| `src/lib/lore.ts` | `types/index.ts`, `env.ts`, `pg` |
| `src/lib/github.ts` | `types/index.ts`, `env.ts`, `@octokit/rest` |
| `src/lib/switchboard.ts` | `types/index.ts` |
| `/api/projects` route | `discovery`, `git`, `lore`, `github`, `progress`, `cache` |
| `/api/ddr-pipeline` route | `discovery`, `ddr-index`, `cache` |
| `/api/session-closes` route | `discovery`, `lore`, `cache` |
| `/api/activity-feed` route | `discovery`, `lore`, `github`, `git`, `cache` |
| `/api/agents` route | `lore`, `switchboard`, `cache` |
| `/api/open-work` route | `discovery`, `lore`, `github`, `ddr-index`, `cache` |
| `ProjectCard` | `types/index.ts`, shadcn/ui |
| `ProjectCardsPanel` | `ProjectCard`, `PanelShell`, `lib/projects` |
| `DdrPipelinePanel` | `PanelShell`, `lib/discovery`, `lib/ddr-index` |
| `SessionClosePanel` | `PanelShell`, `lib/lore` |
| `ActivityFeedLoader` | `PanelShell`, `lib/lore`, `lib/git`, `lib/github`, `lib/discovery`, `ActivityFeedPanel` |
| `ActivityFeedPanel` | `types/index.ts`, shadcn Select, shadcn Button |
| `AgentStatusPanel` | `PanelShell`, `lib/lore`, `lib/switchboard` |
| `OpenWorkPanel` | `PanelShell`, `lib/discovery`, `lib/lore`, `lib/github`, `lib/ddr-index` |
| `ecosystem.config.js` | `npm run build` succeeds, all panels rendered |

Note: `/api` routes and panel RSCs are parallel consumers of the same lib layer. Panel RSCs call lib functions directly; they do not depend on the API routes. The API routes exist for external consumers (curl tests, future clients).

---

## Slice Overview

| Slice | Goal | Depends On | Key Files |
|---|---|---|---|
| 1 | Next.js scaffold + types + shared infrastructure | — | `package.json`, `src/types/index.ts`, `src/lib/env.ts`, `src/lib/cache.ts`, shared components, layout |
| 2 | Filesystem + git data layer | Slice 1 | `src/lib/claude-md.ts`, `progress.ts`, `ddr-index.ts`, `git.ts`, `discovery.ts` |
| 3 | LORE data layer | Slice 1 | `src/lib/lore.ts` |
| 4 | GitHub data layer | Slice 1 | `src/lib/github.ts` |
| 5 | Switchboard data layer | Slice 1 | `src/lib/switchboard.ts` |
| 6 | All six API routes | Slices 1–5 | `src/app/api/*/route.ts` (all six) |
| 7 | Project Cards panel | Slices 1–5 | `ProjectCard.tsx`, `ProjectCardsPanel.tsx`, `src/lib/projects.ts`, `page.tsx` update |
| 8 | DDR Pipeline + Session Close panels | Slices 1–5 | `DdrPipelinePanel.tsx`, `SessionClosePanel.tsx`, `page.tsx` update |
| 9 | Activity Feed panel | Slices 1–5 | `ActivityFeedLoader.tsx`, `ActivityFeedPanel.tsx`, `page.tsx` update |
| 10 | Agent Status + Open Work panels + PM2 + deployment | Slices 6, 7, 8, 9 | `AgentStatusPanel.tsx`, `OpenWorkPanel.tsx`, `page.tsx` final, `ecosystem.config.js`, `PROGRESS.md` |

---

## Slice Definitions

### Slice 1: Next.js Scaffold + Types + Shared Infrastructure

**Goal:** A running Next.js 15 app with Tailwind v4, shadcn/ui, all shared types, env handling, the cache singleton, and shared panel components. The page renders six placeholder panel boxes — no real data.

**Depends On:** —

**Files:**
- `package.json` — create; all dependencies from 02-ARCHITECTURE.md §Dependencies; devDependencies include `vitest`, `@vitejs/plugin-react`, and `@testing-library/react` for the test suite
- `tsconfig.json` — create; strict mode, path alias `@/` → `./src/`
- `next.config.ts` — create; minimal config for App Router
- `tailwind.config.ts` — create; Tailwind v4 configuration
- `vitest.config.ts` — create; Vitest configuration targeting jsdom environment; references `@testing-library/react` for component tests; must resolve the `@/` path alias consistent with `tsconfig.json`
- `src/app/globals.css` — create; Tailwind v4 directives + CSS custom properties
- `src/app/layout.tsx` — create; HTML shell, ThemeProvider if needed, page header (title + server render timestamp), `DashboardGrid` 12-column CSS grid wrapper
- `src/app/error.tsx` — create; app-level error boundary; renders full-page error; Must include `'use client'` directive — Next.js requires error boundaries to be Client Components.
- `src/app/page.tsx` — create (stub); six `<Suspense fallback={<PanelSkeleton />}>` wrappers around placeholder `<div>` elements labelled by panel name; no real panel components yet
- `src/types/index.ts` — create; all interfaces and types verbatim from 02-ARCHITECTURE.md §Data Schemas
- `src/lib/env.ts` — create; `requireEnv(name)` logs a console warning and returns `""` if missing (does not throw; panels degrade gracefully); `optionalEnv(name, defaultValue)` returns env var or default
- `src/lib/cache.ts` — create; `InMemoryCache` class with `get`, `set`, `isValid`, `clear`; `export const cache = new InMemoryCache()` module-level singleton; default TTL 60 000 ms
- `src/components/shared/PanelShell.tsx` — create; accepts `title: string`, `response: ApiResponse<unknown>`, `children: React.ReactNode`; renders panel border + title bar; renders `<StaleNotice>` if `response.stale === true`; renders `<PanelUnavailable>` if `response.data === null`; otherwise renders `children`
- `src/components/shared/PanelUnavailable.tsx` — create; renders "Data unavailable" heading + optional `error` string; accepts `error?: string | null` prop
- `src/components/shared/PanelSkeleton.tsx` — create; synchronous component; animated skeleton placeholder occupying full panel body dimensions; used as Suspense fallback
- `src/components/ui/` — generate via shadcn CLI: `badge`, `button`, `card`, `select`, `skeleton`, `table`
- `.env.example` — create; documents `GITHUB_TOKEN`, `LORE_DATABASE_URL`, `PROJECTS_ROOT` with comments

**Implementation Notes:**
- `CACHE_TTL_MS = 60_000` is the only shared constant; define in `cache.ts`
- `requireEnv` is called at module import time in `lore.ts` and `github.ts`; missing vars must not crash the server process — log warning, return `""`, let the calling lib function return null/[]
- `PanelShell` is not a React error boundary; it is a conditional render on `ApiResponse.error` and `ApiResponse.data`
- `page.tsx` stub must have the exact grid positions per 03-UI-SPEC.md §Layout Structure: ProjectCards cols 1–8 row 1; AgentStatus cols 9–12 row 1; DdrPipeline cols 1–12 row 2; SessionClose cols 1–6 row 3; OpenWork cols 7–12 row 3; ActivityFeed cols 1–12 row 4
- No `Promise.allSettled` at the page level — each panel is independently wrapped in its own `<Suspense>` boundary per 02-ARCHITECTURE.md §`src/app/page.tsx`

**Tests:**
- [ ] `npm run dev` starts without error
- [ ] `npm run build` completes without TypeScript errors
- [ ] Browser loads `/`; six labelled placeholder boxes visible in correct grid positions
- [ ] `PanelShell` renders `PanelUnavailable` when passed `{ data: null, error: "test error", stale: false, cachedAt: null }`
- [ ] `PanelShell` renders stale notice when passed `{ data: [], error: "test", stale: true, cachedAt: Date.now() }`
- [ ] `cache.get("x")` returns `null` on empty cache; `cache.set("x", 42)`; `cache.isValid(cache.get("x"))` returns `true`; after mocking `Date.now()` past TTL, `cache.isValid(entry)` returns `false`
- [ ] `requireEnv("MISSING_VAR")` logs a warning and returns `""`; does not throw
- [ ] `npx vitest run` exits 0 (no tests yet; confirms test runner configuration is valid)

**Done When:**
- [ ] `npm run dev` starts and serves `/` without uncaught errors
- [ ] TypeScript compiles clean (`npm run build` exits 0)
- [ ] Six panel placeholders visible in correct positions at 1440px viewport
- [ ] `PanelShell` unavailable/stale conditional render verified manually or via Vitest
- [ ] `cache.ts` unit tests pass
- [ ] `env.ts` unit tests pass (warn, no throw, on missing var)
- [ ] `src/types/index.ts` matches all interfaces in 02-ARCHITECTURE.md §Data Schemas exactly
- [ ] `npx vitest run` exits 0 (even with no tests yet)

---

### Slice 2: Filesystem + Git Data Layer

**Goal:** All local filesystem parsers and the git wrapper implemented and unit-tested. No API routes yet. No network calls.

**Depends On:** Slice 1

**Files:**
- `src/lib/claude-md.ts` — create; `parseCLAUDEMd(content: string): { projectId: string | null; agentName: string | null }`; regex patterns from 02-ARCHITECTURE.md §`src/lib/discovery.ts`; returns `{ projectId: null, agentName: null }` on any error; does not throw
- `src/lib/progress.ts` — create; `parseProgressMd(content: string): SprintInfo | null`; regex patterns from 02-ARCHITECTURE.md §`src/lib/progress.ts`; returns `null` if either sprint slug or status field absent; does not throw
- `src/lib/ddr-index.ts` — create; `parseDdrIndex(content, repoName, projectId)` and `normalizeDdrStatus(rawStatus)`; parsing rules from 02-ARCHITECTURE.md §`src/lib/ddr-index.ts`; skip `|---` rows and header row; skip rows with fewer than 4 pipe-delimited fields and log; does not throw
- `src/lib/git.ts` — create; `getLastCommit(repoPath: string): Promise<GitCommit | null>`; `getCommitsSince(repoPath: string, since: Date): Promise<GitCommit[]>`; `getGitHubRemote(repoPath: string): Promise<{ owner: string; repo: string } | null>`; uses `simple-git`; all functions return `null` / `[]` on any error (no `.git`, zero commits, permission denied); `getGitHubRemote` parses both HTTPS (`https://github.com/owner/repo.git`) and SSH (`git@github.com:owner/repo.git`) remote formats; returns `null` for non-GitHub remotes and missing remotes; does not throw
- `src/lib/discovery.ts` — create; `discoverProjects(projectsRoot: string): Promise<DiscoveredProject[]>`; scans one level of `projectsRoot` for directories with a `.git` subdirectory using `fs.readdir` + `fs.stat`; reads `CLAUDE.md` if present and calls `parseCLAUDEMd`; calls `getGitHubRemote()` per repo to populate `DiscoveredProject.githubRemote`; returns `[]` (not throws) if `projectsRoot` is unreadable; does not recurse

**Implementation Notes:**
- `parseCLAUDEMd` regex order: try `projectId` patterns first; fall back to null if no match
- `normalizeDdrStatus`: `'ACCEPTED'` → `'ACCEPTED'`; `'IN SPRINT'` → `'IN SPRINT'`; `'SHIPPED'` → `'SHIPPED'`; `'PROPOSED' | 'BACKLOG' | 'DRAFT'` → `'PROPOSED'`; anything else → `'UNKNOWN'`
- `discoverProjects` shallow scan only: one `fs.readdir` call on `projectsRoot`, one `fs.stat` call per entry — no recursive walk per requirements edge case
- `PROJECTS_ROOT` resolution: `optionalEnv('PROJECTS_ROOT', path.join(os.homedir(), 'projects'))` in `discovery.ts`; caller passes resolved path

**Tests:**
- [ ] `parseCLAUDEMd` extracts `projectId` and `agentName` from the real `CLAUDE.md` at `/home/d-tuned/projects/agent-dashboard/CLAUDE.md`
- [ ] `parseCLAUDEMd` returns `{ projectId: null, agentName: null }` on empty string input
- [ ] `parseCLAUDEMd` returns `{ projectId: null, agentName: null }` on malformed/arbitrary input without throwing
- [ ] `parseProgressMd` extracts slug and status from both format variants observed in `docs/specs/bootstrap-skill-v1/PROGRESS.md` (plain `Status:`) and `docs/specs/bootstrap-skill-v1-1/PROGRESS.md` (bold `**Status:**`)
- [ ] `parseProgressMd` returns `null` when Status field is absent
- [ ] `parseProgressMd` returns `null` when H1 slug line is absent
- [ ] `parseDdrIndex` parses the real `docs/specs/agent-dashboard-ddrs/00-DDR-INDEX.md` and returns entries with correct `kanbanColumn` values (BACKLOG/DRAFT → PROPOSED, ACCEPTED → ACCEPTED)
- [ ] `parseDdrIndex` returns `[]` on empty string input without throwing
- [ ] `parseDdrIndex` skips the header row (contains "Status") and separator rows
- [ ] `normalizeDdrStatus('BACKLOG')` returns `'PROPOSED'`; `normalizeDdrStatus('DRAFT')` returns `'PROPOSED'`; `normalizeDdrStatus('MYSTERY')` returns `'UNKNOWN'`
- [ ] `getLastCommit('/home/d-tuned/projects/agent-dashboard')` returns a `GitCommit` with non-null `hash`, `date`, `message`
- [ ] `getLastCommit('/tmp/not-a-repo')` returns `null` without throwing
- [ ] `getCommitsSince('/home/d-tuned/projects/agent-dashboard', new Date(Date.now() - 14 * 86400 * 1000))` returns an array of `GitCommit` objects
- [ ] `getCommitsSince('/tmp/not-a-repo', new Date())` returns `[]` without throwing
- [ ] `getGitHubRemote` correctly parses HTTPS remote `https://github.com/owner/repo.git` → `{ owner: 'owner', repo: 'repo' }`
- [ ] `getGitHubRemote` correctly parses SSH remote `git@github.com:owner/repo.git` → `{ owner: 'owner', repo: 'repo' }`
- [ ] `getGitHubRemote` returns `null` for a non-GitHub remote (e.g. GitLab URL or self-hosted); does not throw
- [ ] `getGitHubRemote('/tmp/not-a-repo')` returns `null` without throwing (no remote set)
- [ ] `discoverProjects('/home/d-tuned/projects')` returns at least one entry for `agent-dashboard`; each entry has `repoPath`, `repoName`, `projectId`, `agentName`
- [ ] `discoverProjects('/tmp/nonexistent')` returns `[]` without throwing

**Done When:**
- [ ] All unit tests above pass
- [ ] TypeScript compiles clean
- [ ] No test depends on network access or LORE Postgres

---

### Slice 3: LORE Data Layer

**Goal:** `src/lib/lore.ts` fully implemented; all five query functions verified against the live LORE Postgres instance on VM 103.

**Depends On:** Slice 1

**Files:**
- `src/lib/lore.ts` — create; single `pg.Pool` instance initialized at module load from `requireEnv('LORE_DATABASE_URL')`; all five query functions; all catch and return `null` / `new Map()` / `[]` on pool or query error; do not throw to caller; log errors to `console.error`

**API contracts (verbatim from 02-ARCHITECTURE.md):**
- `getLastCapturePerProject(projectIds: string[]): Promise<Map<string, LoreCaptureSummary>>`
- `getActiveHaltsByProject(projectId: string): Promise<LoreCaptureSummary[]>` — `WHERE project_id = $1 AND document_type = 'halt' AND (status IS NULL OR status != 'archived')`
- `getSessionCloses(projectIds: string[]): Promise<Map<string, SessionClose>>` — `document_type = 'decision' AND title ILIKE '%SESSION-CLOSE%'`; most recent per projectId
- `getAgentRegistry(): Promise<AgentRecord[]>` — `project_id = 'lore-personal' AND document_type = 'spec'`; `switchboardStatus` field is populated by caller (API route or panel), not by this function; return `'unknown'` as default
- `getLoreActivityEvents(projectIds: string[], since: Date): Promise<ActivityEvent[]>`

**Implementation Notes:**

> **Pre-implementation: LORE Schema Probe (mandatory — do before writing any SQL)**
> Before writing any SQL in `lore.ts`, connect to the live LORE Postgres instance on VM 103 and run:
> ```sql
> \d documents
> ```
> (or equivalent: `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'documents'`)
>
> Confirm the following assumed column names exist: `id`, `project_id`, `document_type`, `title`, `content`, `status`, `author`, `created_at`.
>
> Record the result in PROGRESS.md as: "Schema verified: table=documents, columns=[confirmed list]."
>
> If column names differ from the assumed schema, HALT immediately and route back to @architect with the actual schema — do not write SQL against unconfirmed column names.

- `pg.Pool` connection string comes from `LORE_DATABASE_URL`; include `sslmode=disable` as already present in the env var string
- `getAgentRegistry` returns `AgentRecord[]` with `switchboardStatus: 'unknown'` for all entries; the `/api/agents` route and `AgentStatusPanel` each enrich this with Switchboard data
- If `LORE_DATABASE_URL` is missing/empty (warning logged in Slice 1), pool creation should not throw; queries should return null/[] on connection failure
- Table name assumed: `documents`; column names per 02-ARCHITECTURE.md §Assumed LORE Schema

**Tests:**
- [ ] `LORE_DATABASE_URL` set in `.env.local`; `getLastCapturePerProject(['agent-dashboard'])` returns a Map with at least one entry
- [ ] `getSessionCloses(['agent-dashboard'])` returns a Map; if entries exist, each has non-null `projectId`, `title`, `content`
- [ ] `getAgentRegistry()` returns an array of `AgentRecord`; each has `name`, `projectId`, `relayHandle`, `registryStatus`; all `switchboardStatus` are `'unknown'`
- [ ] `getActiveHaltsByProject('agent-dashboard')` returns an array (may be empty if no active HALTs); does not throw
- [ ] `getLoreActivityEvents(['agent-dashboard'], new Date(Date.now() - 14 * 86400 * 1000))` returns an array of `ActivityEvent`
- [ ] With `LORE_DATABASE_URL` set to an invalid value, all functions return `null` / `[]` / empty Map without throwing

**Done When:**
- [ ] LORE schema probe complete; column names confirmed in PROGRESS.md before SQL was written
- [ ] All query functions return correct types or graceful fallbacks
- [ ] Connection failure returns null/[] not a thrown error
- [ ] TypeScript compiles clean
- [ ] No circular imports (lore.ts does not import from any API route or panel component)

---

### Slice 4: GitHub Data Layer

**Goal:** `src/lib/github.ts` fully implemented; all four public functions verified against GitHub API.

**Depends On:** Slice 1

**Files:**
- `src/lib/github.ts` — create; `Octokit` instance initialized at module load from `requireEnv('GITHUB_TOKEN')`; all functions return `null` / `[]` on error; do not throw; includes internal `isRateLimited` check on response headers

**API contracts (verbatim from 02-ARCHITECTURE.md):**
- `getOpenPrCount(owner: string, repo: string): Promise<number>` — returns `0` on error
- `getOpenPrs(owner: string, repo: string, limit?: number): Promise<GitHubPr[]>` — default limit 25
- `getOpenIssues(owner: string, repo: string, limit?: number): Promise<GitHubIssue[]>` — default limit 25
- `getMergedPrs(owner: string, repo: string, since: Date): Promise<GitHubPr[]>`
- Internal: `isRateLimited(response)` detects 429/403 and `X-RateLimit-Remaining === 0`

**Implementation Notes:**
- `owner` and `repo` are resolved from `DiscoveredProject.githubRemote` (populated by `getGitHubRemote()` during discovery); when `githubRemote` is null, the caller skips GitHub calls and returns empty result (`0` / `[]`) — no crash
- `getOpenPrCount` can call `getOpenPrs` and return `.length`, or use a separate list call — either is acceptable
- Rate limit detection: check HTTP status 429 or 403 AND `X-RateLimit-Remaining === '0'` header; when detected, the function returns `null` / `[]` (not throws); the API route layer handles stale cache fallback
- Missing `GITHUB_TOKEN`: `Octokit` instantiated with empty token; all calls return 401; functions catch and return null/[]

**Tests:**
- [ ] `GITHUB_TOKEN` set in `.env.local`; `getOpenPrCount('dannySubsense', 'agent-dashboard')` returns a number (may be 0)
- [ ] `getOpenPrs('dannySubsense', 'agent-dashboard', 5)` returns an array; each item has `number`, `title`, `url`
- [ ] `getOpenIssues('dannySubsense', 'agent-dashboard', 5)` returns an array
- [ ] `getMergedPrs('dannySubsense', 'agent-dashboard', new Date(Date.now() - 14 * 86400 * 1000))` returns an array
- [ ] `getOpenPrs('dannySubsense', 'this-repo-does-not-exist-12345', 5)` returns `[]` without throwing
- [ ] When `DiscoveredProject.githubRemote` is null, callers skip GitHub functions; returned values are `0` / `[]` — callers must guard on `githubRemote` before invoking any GitHub lib function
- [ ] With `GITHUB_TOKEN` empty, all functions return `null` / `[]` without throwing

**Done When:**
- [ ] All functions verified against real GitHub API
- [ ] Error paths return null/[] not thrown errors
- [ ] TypeScript compiles clean
- [ ] No circular imports

---

### Slice 5: Switchboard Data Layer

**Goal:** `src/lib/switchboard.ts` fully implemented; handles all file states (present, missing, malformed, zero-byte).

**Depends On:** Slice 1

**Files:**
- `src/lib/switchboard.ts` — create; `SWITCHBOARD_DIR = path.join(os.homedir(), '.switchboard')`; `readSwitchboardSessions(): Promise<SwitchboardSessions | null>`; `isAgentOnline(relayHandle, sessions): SwitchboardStatus`

**API contracts (verbatim from 02-ARCHITECTURE.md):**
- `readSwitchboardSessions()`: reads `~/.switchboard/sessions.json`; JSON.parse; returns `null` on any `fs` error or parse error; zero-byte file → returns `{}`
- `isAgentOnline(relayHandle, sessions)`: `'online'` if `sessions[relayHandle]` exists and `lastActiveAt` within last 5 minutes; `'offline'` if entry exists but stale; `'unknown'` if sessions is null or handle not present

**Tests:**
- [ ] If `~/.switchboard/sessions.json` exists and is valid JSON, `readSwitchboardSessions()` returns the parsed object
- [ ] `readSwitchboardSessions()` returns `null` on a malformed JSON file without throwing
- [ ] `readSwitchboardSessions()` returns `{}` on a zero-byte file without throwing
- [ ] `readSwitchboardSessions()` returns `null` if `~/.switchboard/` directory does not exist, without throwing
- [ ] `isAgentOnline('lumen', sessions)` returns `'online'` when `sessions.lumen.lastActiveAt` is within 5 minutes of `Date.now()`
- [ ] `isAgentOnline('lumen', sessions)` returns `'offline'` when `sessions.lumen.lastActiveAt` is more than 5 minutes ago
- [ ] `isAgentOnline('nonexistent', sessions)` returns `'unknown'`
- [ ] `isAgentOnline('lumen', null)` returns `'unknown'`

**Done When:**
- [ ] All cases above verified
- [ ] TypeScript compiles clean
- [ ] No circular imports

---

### Slice 6: All Six API Routes

**Goal:** All six API routes implemented using the completed data layer. Each route follows the standard cache-then-fetch-then-stale-fallback pattern. All routes respond with `ApiResponse<T>` and HTTP 200 in all cases.

**Depends On:** Slices 1, 2, 3, 4, 5

**Files:**
- `src/app/api/projects/route.ts` — create; cache key `'projects'`; calls `discoverProjects`; for each project: `getLastCommit`, `parseProgressMd` (reads `PROGRESS.md` if exists), `getOpenPrCount`, `getLastCapturePerProject`, `getActiveHaltsByProject`; assembles `ProjectCardData[]`; `lastTouchedAt = max(lastCommit.date, lastLoreCapture.timestamp)`; sorts by `lastTouchedAt` descending
- `src/app/api/ddr-pipeline/route.ts` — create; cache key `'ddr-pipeline'`; calls `discoverProjects`; for each project reads `docs/specs/**/00-DDR-INDEX.md` (glob one level: `docs/specs/<slug>/00-DDR-INDEX.md` where slug contains 'ddr'); calls `parseDdrIndex`; returns flat `DdrEntry[]`
- `src/app/api/session-closes/route.ts` — create; cache key `'session-closes'`; calls `discoverProjects`; extracts `projectId` values; calls `getSessionCloses`; returns `SessionClose[]` sorted by `timestamp` descending
- `src/app/api/activity-feed/route.ts` — create; cache key `'activity-feed:${days}:${project}:${type}'`; query params `days` (default 14), `project`, `type`; calls `getLoreActivityEvents`, `getCommitsSince(repoPath, since)` per project (maps each `GitCommit` to `ActivityEvent` with `type='git-commit'`), `getMergedPrs` per project; merges and sorts by timestamp descending; `days` is the only server-side filter applied in v1; `type` and `project` params are accepted in the route signature but are not used for server-side filtering in v1 — reserved for v2; `ActivityFeedPanel` applies client-side type/project filtering to the full dataset
- `src/app/api/agents/route.ts` — create; cache key `'agents'`; calls `getAgentRegistry`; calls `readSwitchboardSessions`; enriches each `AgentRecord` with `isAgentOnline(record.relayHandle, sessions)`; returns `AgentRecord[]` sorted alphabetically by `name`
- `src/app/api/open-work/route.ts` — create; cache key `'open-work'`; calls `discoverProjects`; `getActiveHaltsByProject` per project; `getOpenPrs`, `getOpenIssues` per project; `parseDdrIndex` for each `00-DDR-INDEX.md`; filters DDRs to `kanbanColumn === 'PROPOSED'`; assembles `OpenWorkItem[]` with correct `type` and `severity` fields; HALTs have `severity: 'red'`; all others `severity: 'normal'`; PRs and issues capped at 25 per project

**Implementation Notes:**
- All routes: check cache first; if valid cache entry exists return immediately with `stale: false`; on fetch failure serve stale entry if present (set `stale: true`, include error string); if no stale entry return `{ data: null, error: string, stale: false, cachedAt: null }` with HTTP 200
- `/api/projects` route must read `PROGRESS.md` path: `{repoPath}/docs/specs/{sprint-slug}/PROGRESS.md`; since sprint slug is not known a priori, scan `{repoPath}/docs/specs/` for directories and read the PROGRESS.md inside each; use the most recently modified one as the current sprint
- `/api/ddr-pipeline` DDR index path: `{repoPath}/docs/specs/agent-dashboard-ddrs/00-DDR-INDEX.md` AND any path matching `{repoPath}/docs/specs/*-ddrs/00-DDR-INDEX.md`; both formats observed
- `/api/activity-feed` must wire `getCommitsSince(repoPath, since)` from `git.ts` for each discovered project (not `getLastCommit`); map each returned `GitCommit` to an `ActivityEvent` object with `type='git-commit'`. This function is added to `git.ts` per the architect's update to 02-ARCHITECTURE.md.
- `/api/activity-feed` deduplicates on `ActivityEvent.id` (deterministic id: `${type}:${repoName}:${hash|uuid}`)
- Do not use `Promise.allSettled` at the page level — this is per-route, not per-page; within a route, `Promise.allSettled` across per-project calls is acceptable and desirable for failure isolation

**Tests:**
- [ ] `curl http://localhost:3000/api/projects` returns JSON with `data: ProjectCardData[]`, `error: null`, `stale: false`
- [ ] `curl http://localhost:3000/api/projects` called twice within 60 s returns identical `cachedAt` values (cache hit)
- [ ] `curl http://localhost:3000/api/ddr-pipeline` returns `data: DdrEntry[]`; entries include DDRs from `agent-dashboard` repo with correct `kanbanColumn`
- [ ] `curl http://localhost:3000/api/session-closes` returns `data: SessionClose[]` (may be empty if no session-close captures; must not error)
- [ ] `curl http://localhost:3000/api/activity-feed` returns `data: ActivityEvent[]`; events are sorted by timestamp descending
- [ ] `curl "http://localhost:3000/api/activity-feed?days=7&type=git-commit"` returns the full event list for the 7-day window (all event types); `type` param is accepted without error but does not filter server-side in v1; client-side filtering in `ActivityFeedPanel` handles type/project filtering
- [ ] `curl http://localhost:3000/api/agents` returns `data: AgentRecord[]`; each record has `switchboardStatus` set to `'online'`, `'offline'`, or `'unknown'` (not null)
- [ ] `curl http://localhost:3000/api/open-work` returns `data: OpenWorkItem[]`; HALTs have `severity: 'red'`; all others `severity: 'normal'`
- [ ] With `LORE_DATABASE_URL` unset: LORE-dependent routes return `{ data: null, error: "...", stale: false, cachedAt: null }`; other routes return data normally
- [ ] With `GITHUB_TOKEN` unset: GitHub-dependent routes return data with GitHub fields empty (`openPrCount: 0`, no PRs/issues); do not return `data: null`

**Done When:**
- [ ] All six `curl` tests above pass
- [ ] Cache behavior verified (two calls within 60 s; same `cachedAt`)
- [ ] Graceful degradation verified for missing env vars
- [ ] HTTP status is 200 in all cases (including error responses)
- [ ] TypeScript compiles clean

---

### Slice 7: Project Cards Panel

**Goal:** `ProjectCardsPanel` and `ProjectCard` implemented and rendering real data via direct lib calls. Page updated to use the real panel component.

**Depends On:** Slices 1–5

**Files:**
- `src/components/cards/ProjectCard.tsx` — create; pure display component; fields per 03-UI-SPEC.md §Panel 1; renders `CardHeader` (repoName bold + optional HaltBadge red), `ProjectMeta` (projectId + agentName muted; "no agent configured" italic when null), `CommitInfo` (message ellipsis + relative date; "No commits" muted when null), `LoreSummary` (title ellipsis + relative date; "No captures" muted when null), `SprintBadge` (slug + status; entire field omitted when `currentSprint === null`), `PrCountBadge` (numeric badge always shown)
- `src/lib/projects.ts` — create; `getProjectsData(): Promise<ProjectCardData[]>` aggregator; calls `discoverProjects`, `getLastCapturePerProject`, `getLastCommit`, `parseProgressMd`, `getActiveHaltsByProject`, `getOpenPrCount` per project; computes `lastTouchedAt = max(lastCommit?.date, lastLoreCapture?.timestamp)`; returns sorted by `lastTouchedAt` DESC; individual data source failures return null/0 for that field; never throws
- `src/components/panels/ProjectCardsPanel.tsx` — create; async Server Component; calls `getProjectsData()` from `src/lib/projects.ts` directly (no `fetch('/api/...')` in RSC); constructs `ApiResponse<ProjectCardData[]>` and passes to `PanelShell`; renders auto-fill card grid inside PanelShell body; handles empty state ("No projects discovered. Check `PROJECTS_ROOT` configuration.")
- `src/app/page.tsx` — update; replace Panel 1 placeholder with `<ProjectCardsPanel />`

**Implementation Notes:**
- Relative timestamp utility: `"Xm ago"` for < 60 min; `"Xh ago"` for < 24 h; `"Mon DD"` for within current year; `"Mon DD, YYYY"` for prior year — implement as a shared utility function in `src/lib/utils.ts` (create if not already generated by shadcn CLI)
- `ProjectCard` receives `ProjectCardData` as a single prop; no data fetching inside the card
- `HaltBadge` uses `severity: 'red'` styling; only rendered when `hasActiveHalt === true`
- `PrCountBadge` always shows a number; never omitted; `0` is valid

**Tests:**
- [ ] Browser loads `/`; Project Cards panel renders in cols 1–8 row 1 position
- [ ] Panel skeleton appears while fetch is in flight (verify by temporarily adding a 2 s delay to `getProjectsData()`)
- [ ] At least one `ProjectCard` is visible for the `agent-dashboard` repo
- [ ] Card shows: repoName, projectId, agentName, last commit message, last commit date relative time, sprint slug + status, PR count badge
- [ ] Card with `hasActiveHalt: true` shows red HALT badge
- [ ] Card with `projectId: null` shows "no agent configured" in muted italic
- [ ] Card with `lastCommit: null` shows "No commits" muted text
- [ ] Card with `currentSprint: null` omits sprint field entirely (no empty slot)
- [ ] `PanelShell` shows PanelUnavailable if `getProjectsData()` throws and error is surfaced via `ApiResponse<null>`

**Done When:**
- [ ] All visual tests above verified in browser
- [ ] No TypeScript errors
- [ ] Panel degrades to PanelUnavailable when data is null
- [ ] Skeleton appears on slow fetch (simulated delay test)

---

### Slice 8: DDR Pipeline Panel + Session Close Panel

**Goal:** `DdrPipelinePanel` and `SessionClosePanel` implemented and rendering real data.

**Depends On:** Slices 1–5

**Files:**
- `src/components/panels/DdrPipelinePanel.tsx` — create; async Server Component; calls `discoverProjects()` from `src/lib/discovery.ts` and `parseDdrIndex()` from `src/lib/ddr-index.ts` directly (no `fetch('/api/...')` in RSC); constructs `ApiResponse<DdrEntry[]>` and passes to `PanelShell`; renders `KanbanBoard` with 4 fixed columns (PROPOSED, ACCEPTED, IN SPRINT, SHIPPED) always visible; conditionally renders UNKNOWN column only when at least one entry has `kanbanColumn === 'UNKNOWN'`; each column header shows label + count; each `DdrCard` shows: DDR number, title (ellipsis), repoName (muted), sprint slug or "tbd" (muted); UNKNOWN cards additionally show raw status in parentheses
- `src/components/panels/SessionClosePanel.tsx` — create; async Server Component; calls `getSessionCloses()` from `src/lib/lore.ts` directly (no `fetch('/api/...')` in RSC); constructs `ApiResponse<SessionClose[]>` and passes to `PanelShell` with title "Where Did I Leave Off?"; renders `SessionCloseList`; each `SessionCloseCard` shows: repoName bold + timestamp right-aligned, capture title single line, content truncated at 300 characters with "..." appended; sorted by timestamp descending; empty state: "No session captures found across discovered projects."
- `src/app/page.tsx` — update; replace Panel 2 and Panel 3 placeholders with real components

**Implementation Notes:**
- Content truncation for SessionCloseCard: hard-truncate at 300 characters, not CSS; append "..." only if content was actually truncated; do not use CSS `text-overflow` for this field
- DDR Kanban columns: all four standard columns rendered regardless of item count; zero-item columns show header and empty column body — not hidden
- UNKNOWN column: rendered only when `entries.filter(e => e.kanbanColumn === 'UNKNOWN').length > 0`
- Column ordering (left to right): PROPOSED → ACCEPTED → IN SPRINT → SHIPPED → [UNKNOWN]
- Within each column: parse order from the source DDR index file (no secondary sort in v1)
- `DdrPipelinePanel` must call `discoverProjects` then read each repo's DDR index file path; same logic as `/api/ddr-pipeline` route but without the cache wrapper

**Tests:**
- [ ] Browser loads `/`; DDR Pipeline panel renders in cols 1–12 row 2 position
- [ ] All four standard columns visible; PROPOSED column has count in header
- [ ] UNKNOWN column is absent when no UNKNOWN entries exist
- [ ] UNKNOWN column appears when a test entry with unrecognized status is injected into the API route response
- [ ] Empty column (zero DDRs) renders with header label but no cards — column not hidden
- [ ] Session Close panel renders in cols 1–6 row 3 position
- [ ] Each session-close card shows repoName, relative timestamp, title, truncated content
- [ ] Content exactly at 301 characters is truncated to 300 + "..."
- [ ] Panel renders empty state message when data array is empty
- [ ] Both panels show skeleton on slow fetch; PanelUnavailable when data is null

**Done When:**
- [ ] All visual tests above verified in browser
- [ ] DDR column structure correct; UNKNOWN conditional correct
- [ ] Content truncation verified at 300-character boundary
- [ ] Both panels degrade correctly
- [ ] TypeScript compiles clean

---

### Slice 9: Activity Feed Panel

**Goal:** `ActivityFeedLoader` (Server Component) and `ActivityFeedPanel` (Client Component) implemented. Filter state works client-side without a network round-trip.

**Depends On:** Slices 1–5

**Files:**
- `src/components/panels/ActivityFeedLoader.tsx` — create; async Server Component; calls `getLoreActivityEvents()`, `getCommitsSince()`, and `getMergedPrs()` from `src/lib/*` directly (no `fetch('/api/...')` in RSC); discovers projects via `discoverProjects()`; assembles and sorts merged `ActivityEvent[]`; constructs `ApiResponse<ActivityEvent[]>` and passes as `initialData` prop to `ActivityFeedPanel`
- `src/components/panels/ActivityFeedPanel.tsx` — create; Client Component (`'use client'`); receives `initialData: ApiResponse<ActivityEvent[]>` as prop; holds `filterProject: string | null` and `filterType: ActivityEventType | null` state; renders `PanelShell` wrapping `FeedFilterBar` + `FeedTimeline`; filtering applied client-side to `initialData.data`; no network call on filter change; `FeedFilterBar` has Project Select (options: "All" + distinct repoNames from events), Type Select (options: "All", "LORE capture", "Git commit", "PR merge"), Clear Filters Button; `FeedTimeline` renders events sorted by timestamp descending using absolute timestamps; empty filtered result shows "No events match the current filters."; empty dataset shows "No activity in the last 14 days."
- `src/app/page.tsx` — update; replace Panel 4 placeholder with `<ActivityFeedLoader />`

**Implementation Notes:**
- `ActivityFeedPanel` is the only Client Component in the entire application; all others are Server Components
- Project dropdown options are derived from distinct `repoName` values in `initialData.data`; options are sorted alphabetically
- Filtering is combinatorial: both `filterProject` and `filterType` active simultaneously; an event must match both to be shown
- Activity Feed timestamps use absolute format ("2026-06-20 14:32"), not relative format; this differs from other panels per 03-UI-SPEC.md §Timestamp Format
- `PanelShell` inside a Client Component: pass the `ApiResponse` to `PanelShell` for stale/unavailable rendering; `PanelShell` itself can be a Server Component imported into the Client Component — this is valid in Next.js 15 App Router
- Filter bar is always visible, even when no events exist or when data is null
- `ActivityFeedLoader` implementation matches the code example in 02-ARCHITECTURE.md §`src/components/panels/ActivityFeedLoader.tsx` verbatim

**Tests:**
- [ ] Browser loads `/`; Activity Feed panel renders in cols 1–12 row 4 position
- [ ] Events appear in chronological order (newest first)
- [ ] LORE capture, git commit, and PR merge event types all visible in timeline when data exists
- [ ] Selecting a project from Project dropdown filters timeline to only that project's events; no network request fires (verify in DevTools Network tab)
- [ ] Selecting an event type from Type dropdown filters by type; combined with project filter, only events matching both criteria shown
- [ ] "Clear filters" button resets both dropdowns to "All" and restores full dataset
- [ ] "No events match the current filters." shown when filtered result is empty
- [ ] "No activity in the last 14 days." shown when data array is empty and no filters are active
- [ ] Filter bar visible even when `data: null` (PanelUnavailable replaces timeline but filter bar stays visible as per `FeedBody` structure)

**Done When:**
- [ ] All tests above verified in browser
- [ ] Zero network requests on filter change (confirmed in DevTools)
- [ ] `ActivityFeedPanel.tsx` has `'use client'` directive; `ActivityFeedLoader.tsx` does not
- [ ] TypeScript compiles clean; no `useEffect` or client-side fetch in codebase

---

### Slice 10: Agent Status + Open Work Panels + PM2 + Deployment

**Goal:** All six panels rendering. App builds for production and runs under PM2 on port 3000. Deployment smoke-tested.

**Depends On:** Slices 6, 7, 8, 9

**Files:**
- `src/components/panels/AgentStatusPanel.tsx` — create; async Server Component; calls `getAgentRegistry()` from `src/lib/lore.ts` and `readSwitchboardSessions()` from `src/lib/switchboard.ts` directly (no `fetch('/api/...')` in RSC); enriches each `AgentRecord` with `isAgentOnline(record.relayHandle, sessions)`; constructs `ApiResponse<AgentRecord[]>` and passes to `PanelShell` with title "Agent Status"; renders `AgentTable` with columns: Agent, Project, Handle, Registry, Status; one `AgentRow` per `AgentRecord`; agents sorted alphabetically by name (sort applied in render, not in route — route already sorts); `SwitchboardStatusBadge`: filled green dot + "online" for `'online'`; gray dot + "offline" for `'offline'`; "?" muted + "unknown" for `'unknown'`; empty state: "No agents registered."
- `src/components/panels/OpenWorkPanel.tsx` — create; async Server Component; calls `discoverProjects()` from `src/lib/discovery.ts`, `getActiveHaltsByProject()` from `src/lib/lore.ts`, `getOpenPrs()` / `getOpenIssues()` from `src/lib/github.ts`, and `parseDdrIndex()` from `src/lib/ddr-index.ts` directly (no `fetch('/api/...')` in RSC); constructs `ApiResponse<OpenWorkItem[]>` and passes to `PanelShell` with title "Open Work"; renders `OpenWorkList`; groups rendered in fixed order: HALTs → Open PRs → Open Issues → Unaccepted DDRs; group with zero items is omitted entirely; HALT items have red badge/indicator, repoName, title ellipsis, relative timestamp; PR items have repoName, number + title ellipsis; Issue items same as PR items; DDR items have repoName, number + title ellipsis; truncation label "Showing 25 of N" appended when PRs or issues exceed 25 per project; all groups empty → "No open work items found."
- `src/app/page.tsx` — update; replace Panel 5 and Panel 6 placeholders with `<AgentStatusPanel />` and `<OpenWorkPanel />`; final form matches the page.tsx pattern from 02-ARCHITECTURE.md §`src/app/page.tsx` exactly
- `ecosystem.config.js` — create; PM2 config verbatim from 02-ARCHITECTURE.md §PM2 Configuration; `exec_mode: 'fork'`, `instances: 1`, `PORT: 3000`, `max_memory_restart: '512M'`, log files at `logs/pm2-error.log` and `logs/pm2-out.log`
- `logs/.gitkeep` — create; ensures `logs/` directory exists in repo for PM2 log output
- `docs/specs/dashboard-framework-v1/PROGRESS.md` — create; per-slice checklist (template below)

**Implementation Notes:**
- Deploy sequence: `npm run build` → `pm2 start ecosystem.config.js` (or `pm2 reload agent-dashboard` if already running)
- PM2 reads `.env.local` automatically via Next.js `next start`; no `env_file` needed in ecosystem config
- `AgentStatusPanel` re-sorts alphabetically even though `/api/agents` already sorts — defensive, no harm
- `OpenWorkPanel` groups are conditionally rendered; do not render an empty group header

**Tests:**
- [ ] Browser loads `/`; Agent Status panel renders in cols 9–12 row 1 position; at least one agent row visible
- [ ] SwitchboardStatusBadge shows correct indicator for each status value
- [ ] Open Work panel renders in cols 7–12 row 3 position
- [ ] HALT group shows red indicator; rendered first
- [ ] Groups with zero items are absent from DOM
- [ ] "No open work items found." shown when all groups empty
- [ ] `npm run build` exits 0 with no TypeScript or build errors
- [ ] `pm2 start ecosystem.config.js` starts the process on port 3000
- [ ] `curl http://localhost:3000/` returns HTML (smoke test)
- [ ] `curl http://localhost:3000/api/projects` returns valid JSON response
- [ ] `pm2 logs agent-dashboard` shows no uncaught errors on startup
- [ ] All six panels visible at `http://localhost:3000/` in a browser over Tailscale

**Done When:**
- [ ] All six panels rendering in correct grid positions
- [ ] `npm run build` exits 0
- [ ] PM2 process running stable on port 3000
- [ ] Tailscale browser access confirmed
- [ ] `PROGRESS.md` updated to DONE for all slices

---

## Sequence Rules

1. Complete all "Done When" criteria for a slice before beginning the next.
2. Slices 2, 3, 4, and 5 have no dependencies on each other; they may be assigned to the forge in any order, but each must fully pass before Slice 6 begins.
3. Slices 7, 8, and 9 have no dependencies on each other (all depend on Slices 1–5; Slice 6 is a parallel deliverable targeting external API consumers and is not required by panel RSCs); they may be assigned in any order.
4. Slice 10 may not begin until Slices 7, 8, and 9 are all complete. Slice 6 must also be complete before Slice 10 (smoke tests curl the API routes).
5. No partial slice work — do not begin Slice N+1 if any "Done When" item for Slice N is unchecked.
6. If a "Done When" criterion cannot be satisfied, HALT and report; do not skip or defer it.
7. File ownership: `page.tsx` is updated incrementally in Slices 1, 7, 8, 9, and 10. Do not edit `page.tsx` outside of its assigned slice.

---

## Deferred Work

The following items are explicitly out of scope for this sprint and must not be implemented:

- Click-through per-project detail views (v2, per DDR-002 §3.4 Panel 1)
- Real-time data refresh via WebSocket or polling (v2)
- Activity Feed date range picker (fixed at 14 days in v1)
- Per-panel manual refresh controls
- Mobile or responsive layout
- User-configurable panel ordering or preferences
- Authentication or authorization beyond Tailscale membership
- Export functionality (PDF, CSV, JSON)
- Port inventory panel (DDR-002 §3.2 footnote; no panel defined in v1 spec)
- Per-panel sub-DDRs (DDR-003 through DDR-008 will refine individual panels post-v1)
- Full-text search across LORE captures
- Agent control plane actions (start/stop/restart)
- Persistent user preferences or saved filter views
- Nivo calendar or funnel charts (referenced in DDR-002 §3.1 but no panel in v1 uses them; install the packages but do not implement chart components)
- Server-side `type` and `project` filtering in `/api/activity-feed` (v2; client-side only in v1)

---

## File Ownership by Slice

| File | Created In | Modified In |
|---|---|---|
| `package.json` | Slice 1 | — |
| `tsconfig.json` | Slice 1 | — |
| `next.config.ts` | Slice 1 | — |
| `tailwind.config.ts` | Slice 1 | — |
| `vitest.config.ts` | Slice 1 | — |
| `src/app/globals.css` | Slice 1 | — |
| `src/app/layout.tsx` | Slice 1 | — |
| `src/app/error.tsx` | Slice 1 | — |
| `src/app/page.tsx` | Slice 1 (stub) | Slices 7, 8, 9, 10 |
| `src/types/index.ts` | Slice 1 | — |
| `src/lib/env.ts` | Slice 1 | — |
| `src/lib/cache.ts` | Slice 1 | — |
| `src/components/shared/PanelShell.tsx` | Slice 1 | — |
| `src/components/shared/PanelUnavailable.tsx` | Slice 1 | — |
| `src/components/shared/PanelSkeleton.tsx` | Slice 1 | — |
| `src/components/ui/*` | Slice 1 (shadcn CLI) | — |
| `.env.example` | Slice 1 | — |
| `src/lib/claude-md.ts` | Slice 2 | — |
| `src/lib/progress.ts` | Slice 2 | — |
| `src/lib/ddr-index.ts` | Slice 2 | — |
| `src/lib/git.ts` | Slice 2 | — |
| `src/lib/discovery.ts` | Slice 2 | — |
| `src/lib/lore.ts` | Slice 3 | — |
| `src/lib/github.ts` | Slice 4 | — |
| `src/lib/switchboard.ts` | Slice 5 | — |
| `src/app/api/projects/route.ts` | Slice 6 | — |
| `src/app/api/ddr-pipeline/route.ts` | Slice 6 | — |
| `src/app/api/session-closes/route.ts` | Slice 6 | — |
| `src/app/api/activity-feed/route.ts` | Slice 6 | — |
| `src/app/api/agents/route.ts` | Slice 6 | — |
| `src/app/api/open-work/route.ts` | Slice 6 | — |
| `src/components/cards/ProjectCard.tsx` | Slice 7 | — |
| `src/lib/projects.ts` | Slice 7 | — |
| `src/components/panels/ProjectCardsPanel.tsx` | Slice 7 | — |
| `src/components/panels/DdrPipelinePanel.tsx` | Slice 8 | — |
| `src/components/panels/SessionClosePanel.tsx` | Slice 8 | — |
| `src/components/panels/ActivityFeedLoader.tsx` | Slice 9 | — |
| `src/components/panels/ActivityFeedPanel.tsx` | Slice 9 | — |
| `src/components/panels/AgentStatusPanel.tsx` | Slice 10 | — |
| `src/components/panels/OpenWorkPanel.tsx` | Slice 10 | — |
| `ecosystem.config.js` | Slice 10 | — |
| `logs/.gitkeep` | Slice 10 | — |
| `docs/specs/dashboard-framework-v1/PROGRESS.md` | Slice 10 | — |

---

## PROGRESS.md Template

The following is the initial content for `docs/specs/dashboard-framework-v1/PROGRESS.md`. Create this file in Slice 10 after all slices complete.

```
# PROGRESS.md — dashboard-framework-v1

**Sprint:** dashboard-framework-v1
**Deliverable:** Next.js 15 dashboard app; 6 panels; PM2 deployment on VM 101 port 3000
**Last updated:** (fill in date)
**Current Slice:** (fill in current slice number and name)
**Status:** IN PROGRESS

---

## Slice Status

| Slice | Description | Status |
|-------|-------------|--------|
| 1 | Next.js scaffold + types + shared infrastructure (env, cache, PanelShell) | TODO |
| 2 | Filesystem + git data layer (discovery, claude-md, progress, ddr-index, git) | TODO |
| 3 | LORE data layer (pg.Pool, all 5 query functions) | TODO |
| 4 | GitHub data layer (Octokit wrapper, all 4 functions) | TODO |
| 5 | Switchboard data layer (sessions.json reader, isAgentOnline) | TODO |
| 6 | All six API routes with cache + stale-on-failure pattern | TODO |
| 7 | Project Cards panel (ProjectCard + ProjectCardsPanel + lib/projects.ts aggregator) | TODO |
| 8 | DDR Pipeline panel + Session Close panel | TODO |
| 9 | Activity Feed panel (ActivityFeedLoader RSC + ActivityFeedPanel Client Component) | TODO |
| 10 | Agent Status + Open Work panels + PM2 config + deployment smoke test | TODO |

---

## Status Legend

| Value | Meaning |
|-------|---------|
| `TODO` | Not started |
| `IN PROGRESS` | Actively being worked |
| `DONE` | All "Done When" criteria satisfied |
| `BLOCKED` | Cannot proceed; reason noted below |
| `HALTED` | Unexpected problem; requires Composer decision |

---

## Pending Actions

None.

---

## Decisions and Deviations

None recorded yet.

---

## Notes

- Each slice must pass its full "Done When" checklist before the next slice begins. See `04-ROADMAP.md` for criteria.
- Slices 2–5 are independent of each other; each must complete before Slice 6 begins.
- Slices 7, 8, 9 are independent of each other; all must complete before Slice 10 begins.
- Panel RSCs call lib functions directly — no fetch('/api/...') in RSC context. API routes and panels are parallel consumers of the same lib layer.
- Source root: `/home/d-tuned/projects/agent-dashboard/src/`
- Production URL: `http://<vm101-tailscale-ip>:3000`
```
