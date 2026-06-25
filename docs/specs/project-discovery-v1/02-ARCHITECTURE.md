# Architecture: project-discovery-v1

Sprint: DDR-003 + DDR-011 combined.

---

## File Change Map

### New Files

| File | Purpose |
|------|---------|
| `src/lib/config.ts` | Read/write helpers for `~/.config/agent-dashboard/projects.json` |
| `src/app/api/projects/paths/route.ts` | POST /api/projects/paths endpoint |
| `src/components/panels/AddProjectInput.tsx` | Client component island for the "Add project" input |
| `src/components/cards/PendingSetupCard.tsx` | Muted card variant for repos without a projectId |

### Modified Files

| File | Change |
|------|--------|
| `src/lib/cache.ts` | Add `delete(key: string): void` method to `InMemoryCache` |
| `src/lib/discovery.ts` | Add config file as third path source in `discoverProjects()` |
| `src/components/panels/ProjectCardsPanel.tsx` | Partition active/pending, embed `AddProjectInput`, render `PendingSetupCard`s |
| `src/types/index.ts` | Add `ProjectsConfig` interface |

No changes to: `src/lib/projects.ts`, `src/app/api/projects/route.ts`, `src/components/cards/ProjectCard.tsx`, `DiscoveredProject`, `ProjectCardData`.

---

## Components

| Component | Responsibility | Location | Kind |
|-----------|----------------|----------|------|
| `config.ts` | Read and write `~/.config/agent-dashboard/projects.json`; never throws on read failure | `src/lib/config.ts` | lib module |
| `POST /api/projects/paths` | Validate path, write config if needed, invalidate cache, return fresh `ProjectCardData[]` | `src/app/api/projects/paths/route.ts` | API route |
| `AddProjectInput` | Controlled input, submits POST, calls `router.refresh()` on success, displays inline error on failure | `src/components/panels/AddProjectInput.tsx` | Client component |
| `PendingSetupCard` | Renders `repoName` + "Needs setup" badge in muted style; suppresses all other data sections | `src/components/cards/PendingSetupCard.tsx` | Server component |
| `InMemoryCache.delete` | Targeted single-key eviction without clearing other cache entries | `src/lib/cache.ts` | method addition |
| `ProjectCardsPanel` (modified) | Fetches data, partitions active/pending, orchestrates render tree | `src/components/panels/ProjectCardsPanel.tsx` | Async server component |

---

## Data Schemas

### Addition to `src/types/index.ts`

```typescript
// ── Config File ───────────────────────────────────────────────────────────

export interface ProjectsConfig {
  projectPaths: string[];   // absolute paths; written resolved, read as-is then resolved at use
}
```

No changes to `DiscoveredProject` or `ProjectCardData`. The existing `projectId: string | null` field encodes pending state. No new fields are needed on either type.

### POST request body (inline type — not exported)

```typescript
// Used only within src/app/api/projects/paths/route.ts
interface PostProjectsPathsBody {
  path: string;   // must be absolute (starts with '/'); validated before any fs access
}
```

---

## API Contracts

### `src/lib/config.ts`

```typescript
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import type { ProjectsConfig } from '@/types';

// Fixed paths — not configurable per constraint
const CONFIG_DIR: string  // path.join(os.homedir(), '.config', 'agent-dashboard')
const CONFIG_FILE: string // path.join(CONFIG_DIR, 'projects.json')

/**
 * Reads the config file and returns a valid ProjectsConfig.
 * Never throws. Returns { projectPaths: [] } on:
 *   - file absent
 *   - unreadable
 *   - malformed JSON
 *   - JSON valid but projectPaths is not an array
 */
export async function readConfigFile(): Promise<ProjectsConfig>

/**
 * Writes config to disk.
 * Creates CONFIG_DIR if absent via fs.mkdir({ recursive: true }).
 * Writes JSON with 2-space indent.
 * Throws on any fs error — caller must handle and return HTTP 500.
 */
export async function writeConfigFile(config: ProjectsConfig): Promise<void>
```

### `src/lib/cache.ts` — new method on `InMemoryCache`

```typescript
/**
 * Removes a single key from the cache store.
 * No-op if the key is not present.
 */
delete(key: string): void
```

### `src/app/api/projects/paths/route.ts`

```typescript
/**
 * POST /api/projects/paths
 *
 * Body:   { "path": "/absolute/path/to/repo" }
 * 200:    ApiResponse<ProjectCardData[]> — path registered (or already discoverable); fresh list
 * 400:    ApiResponse<null> — invalid/missing body field, relative path, no .git, path not found
 * 500:    ApiResponse<null> — config file write failure
 */
export async function POST(
  request: Request
): Promise<NextResponse<ApiResponse<ProjectCardData[]>>>
```

### `src/components/panels/AddProjectInput.tsx`

```typescript
'use client'

/**
 * No props. Fully self-contained client island.
 * Posts to /api/projects/paths. Calls router.refresh() on success.
 */
export function AddProjectInput(): JSX.Element

// Internal state shape (not exported):
interface AddProjectInputState {
  value: string          // controlled input; cleared on success, preserved on error
  error: string | null   // inline error text; null when clean or after successful resubmit
  isSubmitting: boolean  // disables submit button during in-flight request
}
```

### `src/components/cards/PendingSetupCard.tsx`

```typescript
interface PendingSetupCardProps {
  project: ProjectCardData   // full type for consistency; only repoName is rendered
}

export function PendingSetupCard({ project }: PendingSetupCardProps): JSX.Element
```

---

## discoverProjects() Modification

### Merge Order

Three sources are processed in this order, all feeding the existing `add(repoPath)` inner function:

1. **PROJECTS_ROOT scan** — unchanged; colon-split parent dirs, readdir one level deep
2. **PROJECT_PATHS explicit paths** — unchanged; colon-split individual repo paths
3. **Config file paths** — new; `readConfigFile()` called once, iterate `config.projectPaths`

Deduplication is unchanged: `add()` resolves each path via `path.resolve()` and checks a `Set<string>`. Source order determines which entry "wins" in the set (first seen), but since the same resolved path produces the same `probeRepo()` result regardless of source, order only matters for the set membership check — not for output data.

### Error Handling in Config Source

All failure modes are absorbed by `readConfigFile()`:

| Condition | Behavior |
|-----------|---------|
| File absent | Returns `{ projectPaths: [] }` — zero iterations |
| File unreadable (permissions) | Returns `{ projectPaths: [] }` — zero iterations |
| Malformed JSON | Returns `{ projectPaths: [] }` — zero iterations |
| `projectPaths` field not an array | Returns `{ projectPaths: [] }` — zero iterations |
| Config path absent on filesystem | `probeRepo()` returns null — silently skipped |
| Config path exists but lacks `.git` | `probeRepo()` returns null — silently skipped |

The directory `~/.config/agent-dashboard/` is NOT created by `discoverProjects()`. It is only created on the first `writeConfigFile()` call (triggered by POST).

### Implementation Sketch (not code — architecture only)

```
discoverProjects():
  seen = new Set<string>()
  results = []

  // Source 1: PROJECTS_ROOT scan (unchanged)
  for root in PROJECTS_ROOT.split(':'):
    for dirent in readdir(root):
      if dirent.isDirectory: add(join(root, dirent.name))

  // Source 2: PROJECT_PATHS (unchanged)
  for p in PROJECT_PATHS.split(':'):
    add(p)

  // Source 3: Config file (new)
  config = await readConfigFile()          // never throws
  for p in config.projectPaths:
    add(p)

  return results
```

---

## POST /api/projects/paths Route Design

### Validation and Execution Sequence

Each step must complete before the next. No partial execution.

| Step | Operation | Failure response |
|------|-----------|-----------------|
| 1 | `request.json()` — parse body; assert `body.path` is a string | HTTP 400, `"Missing or invalid path field"` |
| 2 | Assert `body.path` starts with `/` | HTTP 400, `"Path must be absolute"` |
| 3 | `resolved = path.resolve(body.path)` | — |
| 4 | `fs.stat(path.join(resolved, '.git'))` | HTTP 400, `"Path does not exist or is not readable"` if outer stat fails; `"Path exists but has no .git directory"` if outer stat passes but .git stat fails |
| 5 | `discoverProjects()` — collect all currently-known resolved paths | — |
| 6 | If `resolved` not in discovered set: `readConfigFile()`, dedup against `config.projectPaths`, `writeConfigFile(updated)` | HTTP 500, `"Config file write failed: <message>"` |
| 7 | `cache.delete('projects')` — synchronous; executes regardless of whether step 6 wrote | — |
| 8 | `getProjectsData()` — full aggregation; includes new path if written | — |
| 9 | Return HTTP 200 with `ApiResponse<ProjectCardData[]>` | — |

> **Trim note:** The client sends `{ path: value.trim() }`. The route receives a pre-trimmed path; no server-side trim is required.

### Why `discoverProjects()` in Step 5

Step 5 runs `discoverProjects()` to check whether the submitted path is already reachable via any source (PROJECTS_ROOT scan, PROJECT_PATHS env, or existing config). This satisfies the edge case: "Path already known via env var — not written to config." Parsing env vars directly would be equivalent logic with more code and no performance benefit at homelab scale. Step 8 calls `getProjectsData()` which runs `discoverProjects()` again internally — two discovery passes total. Acceptable at this scale (sub-200ms per pass with ~20 repos).

### Request / Response Shapes

```typescript
// Request body
{ "path": "/home/d-tuned/projects/some-repo" }

// 200 response
{
  "data": ProjectCardData[],
  "error": null,
  "stale": false,
  "cachedAt": 1750000000000   // Date.now() at time of response
}

// 400 / 500 response
{
  "data": null,
  "error": "descriptive string",
  "stale": false,
  "cachedAt": null
}
```

> **Note:** The returned list is part of the US-02 API contract. The v1 UI (`AddProjectInput`) does not consume it — it calls `router.refresh()` instead, which re-runs `getProjectsData()` in the server component. The full aggregation in the response body is computed but discarded by the current client.

---

## ProjectCardsPanel: Interactive Panel Design

### Pattern: Client Island in Async Server Component

The existing `ProjectCardsPanel` is a pure async server component and must remain so — it calls `getProjectsData()` directly and benefits from server-side data fetching. The "Add project" input requires client-side state (controlled input, error, submit state). Adding `'use client'` to the panel would lose its server-component benefits.

Solution: embed `AddProjectInput` as a **client island** inside the server component. Next.js 15 supports this natively — server components can render client components as children.

### Render Tree

```
ProjectCardsPanel   (async server component — unchanged directive)
  PanelShell
    [active section]
      div.grid
        ProjectCard × n   (projectId !== null, sorted lastTouchedAt DESC)
    AddProjectInput       ('use client' island — no props needed)
    [pending section — omitted from DOM entirely when pendingCards.length === 0]
      div.grid
        PendingSetupCard × n   (projectId === null, sorted repoName ASC)
```

### Partition and Sort Logic (inside ProjectCardsPanel)

```typescript
// data is ProjectCardData[] returned by getProjectsData(), already sorted lastTouchedAt DESC
const activeCards  = data.filter(p => p.projectId !== null)
// activeCards sort is preserved from getProjectsData()

const pendingCards = data
  .filter(p => p.projectId === null)
  .sort((a, b) => a.repoName.localeCompare(b.repoName))
// pendingCards sorted repoName ASC as required
```

`getProjectsData()` is not changed — it continues to return all cards sorted `lastTouchedAt DESC`. The panel re-sorts the pending partition.

### AddProjectInput Behaviour

On submit:
1. `setIsSubmitting(true)`, `setError(null)`
2. `fetch('POST /api/projects/paths', { body: JSON.stringify({ path: value }) })`
3. On success (`res.ok && !json.error`): `setValue('')`, `router.refresh()`
4. On failure: `setError(json.error ?? 'Unknown error')` — input value preserved
5. `setIsSubmitting(false)` in finally

`router.refresh()` (from `next/navigation`) instructs Next.js to re-fetch and re-render all server components in the current route segment, including `ProjectCardsPanel`. No full page reload. This satisfies US-06.

---

## PendingSetupCard Decision

**Decision: new component, not a variant of `ProjectCard`.**

Rationale: `PendingSetupCard` renders `repoName` and one badge. It suppresses 5 of the 7 data sections present in `ProjectCard` (ProjectMeta, CommitInfo, LoreSummary, SprintBadge, PrCountBadge). Encoding this as `variant="pending"` on `ProjectCard` would require a conditional branch in every section — making an already-complete component harder to read and test. A dedicated component is simpler, independently testable, and introduces zero conditional complexity to the active card path.

`PendingSetupCard` accepts `ProjectCardData` rather than a reduced interface. The full type is available at the call site (the panel maps over `ProjectCardData[]`), and using it avoids an unnecessary minimal-props interface. Only `repoName` is accessed.

---

## Cache Invalidation Strategy

### Mechanism

`InMemoryCache` in `src/lib/cache.ts` is a module-level singleton: `export const cache = new InMemoryCache()`. All route handlers in the same Next.js server process share this instance via Node module caching.

The POST route:
1. Imports `cache` from `@/lib/cache`
2. Calls `cache.delete('projects')` synchronously after writing the config file and before calling `getProjectsData()`
3. The next call to `GET /api/projects` finds no valid cache entry and performs a fresh fetch

### Why `delete()` Not `clear()`

`delete(key)` targets a single cache key. `clear()` would evict all keys — including cache entries used by other panels (activity feed, DDR pipeline, etc.) that have no relation to this write. Adding `delete()` is a minimal extension to the existing interface that keeps invalidation scoped.

### Why This Is Not an Anti-Pattern

The `cache` singleton already exists and is the established pattern in this codebase. Adding `delete()` extends the existing controlled interface — it does not introduce a new mutable global, bypass the class API, or create hidden coupling between modules. The POST route and GET route both operate through `cache`'s public methods, which is the correct access pattern.

### Key Literal Strategy

The string `'projects'` is defined as `const CACHE_KEY = 'projects'` in `src/app/api/projects/route.ts`. The POST route defines the same literal independently. No shared constant file is introduced — two files sharing a short string constant is an acceptable tradeoff at this scale. If a third consumer appears in a future sprint, promote it to a shared export at that time.

### Invariant: `getProjectsData()` Must Remain Uncached

**Invariant:** `getProjectsData()` must remain uncached. It is called directly by `ProjectCardsPanel` on every server-component render, which is what ensures `router.refresh()` always sees fresh data after a POST. If `getProjectsData()` is ever wrapped in the `'projects'` cache (e.g. to de-duplicate with `fetchProjects()`), the POST route and the `router.refresh()` panel path must both invalidate before re-render — failing to do so would silently serve stale data without any error.

---

## Integration Points

| Existing Component | Integration |
|--------------------|-------------|
| `src/lib/discovery.ts` | `discoverProjects()` gains a third source (config file) via `readConfigFile()` from `src/lib/config.ts` |
| `src/lib/cache.ts` | POST route imports `cache` and calls `cache.delete('projects')` |
| `src/lib/projects.ts` | POST route calls `getProjectsData()` to build the response body; no change to `getProjectsData()` itself |
| `src/components/panels/ProjectCardsPanel.tsx` | Receives `AddProjectInput` as a client island child; splits output of `getProjectsData()` into active and pending partitions |
| `src/types/index.ts` | `ProjectsConfig` added; all other types unchanged |

---

## Dependencies

No new dependencies. All modules used are:
- Node.js standard library: `fs/promises`, `path`, `os` (already used in `discovery.ts`)
- Next.js built-ins: `next/navigation` (`useRouter`), `next/server` (`NextResponse`) — already in stack
- React built-ins: `useState` — already in stack
