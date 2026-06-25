# Roadmap: project-discovery-v1

Sprint: DDR-003 + DDR-011 combined.

---

## Dependency Map

| Unit | Depends On |
|------|------------|
| `ProjectsConfig` type (`src/types/index.ts`) | — |
| `InMemoryCache.delete` (`src/lib/cache.ts`) | — |
| `src/lib/config.ts` | `ProjectsConfig` (Slice 1) |
| `src/lib/discovery.ts` (config source) | `src/lib/config.ts` (Slice 2) |
| `src/app/api/projects/paths/route.ts` | `cache.delete` (Slice 1), `src/lib/config.ts` (Slice 2), `src/lib/discovery.ts` (Slice 3) |
| `src/components/cards/PendingSetupCard.tsx` | — (uses existing `ProjectCardData` type; no sprint dependency) |
| `ProjectCardsPanel` partition + `PendingSetupCard` render | `PendingSetupCard` (Slice 5) |
| `src/components/panels/AddProjectInput.tsx` | shadcn Input/Button (existing); POST route (Slice 4) for integration |
| `ProjectCardsPanel` embed `AddProjectInput` | `AddProjectInput` (Slice 6), panel partition already in place (Slice 5) |

---

## Slice Overview

| Slice | Goal | Depends On | Files Changed |
|-------|------|------------|---------------|
| 1 | Types + cache foundation | — | `src/types/index.ts`, `src/lib/cache.ts` |
| 2 | Config file read/write helpers | Slice 1 | `src/lib/config.ts` (new) |
| 3 | Discovery: config file as third source | Slice 2 | `src/lib/discovery.ts` |
| 4 | POST /api/projects/paths route | Slices 1, 2, 3 | `src/app/api/projects/paths/route.ts` (new) |
| 5 | PendingSetupCard + panel partition (no Add input) | — | `src/components/cards/PendingSetupCard.tsx` (new), `src/components/panels/ProjectCardsPanel.tsx` |
| 6 | AddProjectInput + panel embed (feature complete) | Slices 4, 5 | `src/components/panels/AddProjectInput.tsx` (new), `src/components/panels/ProjectCardsPanel.tsx` |

Slice 5 has no dependency on Slice 4 — the UI partition and pending card are purely display logic. Slice 4 and Slice 5 can proceed in parallel if bandwidth allows, but sequential delivery in the order listed is safe and simplifies review.

---

## Slice 1: Types + Cache Foundation

**Goal:** Add `ProjectsConfig` to the type index and add `delete(key)` to `InMemoryCache`. No other changes.

**Depends On:** —

**Files:**
- `src/types/index.ts` — add `ProjectsConfig` interface
- `src/lib/cache.ts` — add `delete(key: string): void` method to `InMemoryCache`

**Implementation Notes:**
- `ProjectsConfig` interface placed in the config file section of `src/types/index.ts`:
  ```typescript
  export interface ProjectsConfig {
    projectPaths: string[];
  }
  ```
- `delete` method on `InMemoryCache` removes a key from `this.store`; no-op if key is absent:
  ```typescript
  delete(key: string): void {
    this.store.delete(key);
  }
  ```
- Do not alter `clear()`, `get()`, `set()`, or `isValid()`. No changes to `CACHE_TTL_MS` or the exported `cache` singleton.

**Tests:**
- [ ] `cache.delete('projects')` removes a previously-set key so `cache.get('projects')` returns `null`.
- [ ] `cache.delete('nonexistent')` is a no-op (no error thrown).
- [ ] `cache.delete('projects')` does not affect other keys in the store.
- [ ] TypeScript compiles with `ProjectsConfig` imported from `@/types`.

**Done When:**
- [ ] `ProjectsConfig` is exported from `src/types/index.ts`.
- [ ] `InMemoryCache.delete(key)` exists and passes the three cache tests above.
- [ ] `tsc --noEmit` passes with no new errors.
- [ ] No other files are changed.

---

## Slice 2: Config File Helpers

**Goal:** Implement `readConfigFile` and `writeConfigFile` in a new `src/lib/config.ts`. No callers yet.

**Depends On:** Slice 1 (`ProjectsConfig` type)

**Files:**
- `src/lib/config.ts` — create

**Implementation Notes:**
- Fixed constants (not configurable):
  ```typescript
  const CONFIG_DIR  = path.join(os.homedir(), '.config', 'agent-dashboard');
  const CONFIG_FILE = path.join(CONFIG_DIR, 'projects.json');
  ```
- `readConfigFile()` must never throw. Return `{ projectPaths: [] }` for every failure mode: file absent, unreadable, malformed JSON, `projectPaths` not an array.
- `writeConfigFile(config)` must create `CONFIG_DIR` via `fs.mkdir({ recursive: true })` before writing. Write JSON with 2-space indent. Allow errors to propagate — caller (POST route) handles them and returns HTTP 500.
- Imports: `fs/promises`, `path`, `os`, `type { ProjectsConfig } from '@/types'`.

**Tests:**
- [ ] `readConfigFile()` returns `{ projectPaths: [] }` when the file does not exist.
- [ ] `readConfigFile()` returns `{ projectPaths: [] }` when the file contains malformed JSON.
- [ ] `readConfigFile()` returns `{ projectPaths: [] }` when `projectPaths` is not an array (e.g., `{ "projectPaths": "string" }`).
- [ ] `readConfigFile()` returns `{ projectPaths: ['/a', '/b'] }` when the file contains a valid array.
- [ ] `writeConfigFile({ projectPaths: ['/a'] })` creates the config directory if absent and writes valid JSON.
- [ ] A round-trip `writeConfigFile` → `readConfigFile` returns the same `projectPaths` array.

**Done When:**
- [ ] `src/lib/config.ts` exists and exports `readConfigFile` and `writeConfigFile`.
- [ ] All six tests above pass.
- [ ] `readConfigFile` is verified to never throw under any of the failure conditions listed.
- [ ] `tsc --noEmit` passes with no new errors.

---

## Slice 3: Discovery — Config File as Third Source

**Goal:** Extend `discoverProjects()` to read `~/.config/agent-dashboard/projects.json` as a third path source after env vars.

**Depends On:** Slice 2 (`readConfigFile`)

**Files:**
- `src/lib/discovery.ts` — modify

**Implementation Notes:**
- Add `import { readConfigFile } from './config';` at the top.
- After the `PROJECT_PATHS` loop (Source 2), add Source 3:
  ```
  const config = await readConfigFile();
  for (const p of config.projectPaths) {
    await add(p);
  }
  ```
- The existing `add()` inner function handles deduplication via the `seen` Set — no change needed there.
- `discoverProjects()` signature is unchanged. `overrideRoot` parameter is unchanged.
- `readConfigFile()` absorbs all failure modes — `discovery.ts` never needs a try/catch around it.
- Paths from the config file that do not exist or lack `.git` are silently skipped by the existing `probeRepo()` null-return behavior.
- The config directory is NOT created here. Only `writeConfigFile` creates it.

**Tests:**
- [ ] Given a config file with `projectPaths: ['/path/to/valid-repo']` where `/path/to/valid-repo/.git` exists, `discoverProjects()` includes that repo in results.
- [ ] Given a config file path that also appears in `PROJECT_PATHS`, the result contains exactly one entry for that repo (dedup).
- [ ] Given a config file path with no `.git` directory, it is silently excluded from results.
- [ ] Given no config file exists, `discoverProjects()` returns the same results as the pre-sprint baseline (env vars only).
- [ ] Given a malformed config file, `discoverProjects()` proceeds normally using env-var sources.

**Done When:**
- [ ] All five tests above pass.
- [ ] `discoverProjects()` signature and return type are unchanged.
- [ ] The `overrideRoot` parameter continues to work as before.
- [ ] `tsc --noEmit` passes with no new errors.
- [ ] No changes to `src/lib/cache.ts`, `src/lib/config.ts`, or any file other than `src/lib/discovery.ts`.

---

## Slice 4: POST /api/projects/paths Route

**Goal:** Implement the POST endpoint that validates a path, writes to config if needed, invalidates the projects cache, and returns a fresh `ProjectCardData[]`.

**Depends On:** Slices 1, 2, 3 (cache.delete, readConfigFile/writeConfigFile, updated discoverProjects)

**Files:**
- `src/app/api/projects/paths/route.ts` — create (new Next.js API route)

**Implementation Notes:**
- Validation and execution sequence (each step must complete before the next):

  | Step | Operation | Failure |
  |------|-----------|---------|
  | 1 | Parse `request.json()`; assert `body.path` is a string | HTTP 400 `"Missing or invalid path field"` |
  | 2 | Assert `body.path` starts with `/` | HTTP 400 `"Path must be absolute"` |
  | 3 | `resolved = path.resolve(body.path)` | — |
  | 4a | `fs.stat(resolved)` — outer path must exist | HTTP 400 `"Path does not exist or is not readable"` |
  | 4b | `fs.stat(path.join(resolved, '.git'))` — `.git` must exist | HTTP 400 `"Path exists but has no .git directory"` |
  | 5 | `discoverProjects()` — collect all currently-known resolved paths | — |
  | 6 | If `resolved` not in discovered set: `readConfigFile()`, dedup `projectPaths`, `writeConfigFile(updated)` | HTTP 500 `"Config file write failed: <message>"` |
  | 7 | `cache.delete('projects')` — always executes, synchronous | — |
  | 8 | `getProjectsData()` — full aggregation including new path | — |
  | 9 | Return HTTP 200 `ApiResponse<ProjectCardData[]>` | — |

- Define `const CACHE_KEY = 'projects'` locally; no shared constant file.
- If `resolved` is already discoverable via env vars (found in step 5), skip step 6 (no config write) and proceed to step 7. Return HTTP 200 with the current project list.
- Imports: `fs/promises`, `path`, `next/server` (`NextResponse`), `@/lib/cache`, `@/lib/config`, `@/lib/discovery`, `@/lib/projects` (`getProjectsData`), `@/types`.

**Tests:**
- [ ] POST with a valid git repo path returns HTTP 200 with `data: ProjectCardData[]`.
- [ ] POST with a valid path appends it to `~/.config/agent-dashboard/projects.json`; file is created if absent.
- [ ] POST with a path already in the config file returns HTTP 200 without duplicating the entry in the config file.
- [ ] POST with a path already discoverable via `PROJECTS_ROOT`/`PROJECT_PATHS` env returns HTTP 200 and does not write to config file.
- [ ] POST with a non-existent path returns HTTP 400 with appropriate error string.
- [ ] POST with a path that exists but has no `.git` returns HTTP 400 with `"Path exists but has no .git directory"`.
- [ ] POST with a relative path returns HTTP 400 with `"Path must be absolute"`.
- [ ] POST with missing `path` field returns HTTP 400 with `"Missing or invalid path field"`.
- [ ] POST success: `cache.get('projects')` returns `null` immediately after the response (cache is invalidated).
- [ ] POST when config file write fails returns HTTP 500 with error string beginning `"Config file write failed:"`.

**Done When:**
- [ ] All ten tests above pass.
- [ ] `tsc --noEmit` passes with no new errors.
- [ ] Route file exports only `POST` (no GET, no other exports).
- [ ] No changes to `src/app/api/projects/route.ts`, `src/lib/projects.ts`, or any other file.

---

## Slice 5: PendingSetupCard + Panel Partition

**Goal:** Create the `PendingSetupCard` component and update `ProjectCardsPanel` to partition active/pending cards and render the Pending Setup section. `AddProjectInput` is not yet embedded — use a placeholder comment in the panel.

**Depends On:** — (none)

**Files:**
- `src/components/cards/PendingSetupCard.tsx` — create
- `src/components/panels/ProjectCardsPanel.tsx` — modify

**Implementation Notes for PendingSetupCard:**
- Server component (no `'use client'` directive).
- Props: `{ project: ProjectCardData }`. Only `project.repoName` is accessed.
- Layout exactly as specified in UI spec:
  ```tsx
  <Card className="flex flex-col bg-muted">
    <CardHeader className="px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-muted-foreground font-medium truncate">
          {project.repoName}
        </span>
        <Badge variant="outline" className="shrink-0 text-xs">
          Needs setup
        </Badge>
      </div>
    </CardHeader>
  </Card>
  ```
- Do NOT render `CardContent`. No `opacity` class. Muted background via `bg-muted` token only.
- Imports: `Card`, `CardHeader` from `@/components/ui/card`; `Badge` from `@/components/ui/badge`.

**Implementation Notes for ProjectCardsPanel:**
- Add partition logic immediately after `data` is available:
  ```typescript
  const activeCards  = data.filter(p => p.projectId !== null);
  const pendingCards = data
    .filter(p => p.projectId === null)
    .sort((a, b) => a.repoName.localeCompare(b.repoName));
  ```
- Replace the existing `data.length === 0` empty-state check with `activeCards.length === 0 && pendingCards.length === 0`.
- Replace `data.map(...)` in the active grid with `activeCards.map(...)`.
- Add pending section after the active grid (and after the `{/* TODO: AddProjectInput */}` placeholder):
  ```tsx
  {pendingCards.length > 0 && (
    <>
      <h3 className="px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Pending Setup
      </h3>
      <div className="px-4 pb-4 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
        {pendingCards.map(project => (
          <PendingSetupCard key={project.repoPath} project={project} />
        ))}
      </div>
    </>
  )}
  ```
- Insert `{/* TODO Slice 6: <AddProjectInput /> */}` between the active grid block and the pending section.
- Do not add `'use client'` to `ProjectCardsPanel`.

**Tests:**
- [ ] `PendingSetupCard` renders `repoName` text content.
- [ ] `PendingSetupCard` renders a "Needs setup" badge.
- [ ] `PendingSetupCard` does not render `projectId`, `agentName`, `lastCommit`, `lastLoreCapture`, `currentSprint`, `openPrCount`, or HALT badge content.
- [ ] `PendingSetupCard` root element has class `bg-muted`.
- [ ] Panel with mixed active/pending data renders active cards in the top grid and pending cards in the Pending Setup section.
- [ ] Panel with zero pending projects does not render any "Pending Setup" heading or pending grid (absent from DOM).
- [ ] Panel with zero active projects and N pending projects renders no empty-state message and renders the pending section.
- [ ] Panel with zero active and zero pending renders the empty-state message.
- [ ] Pending cards are sorted `repoName ASC`; active cards preserve `lastTouchedAt DESC` order from `getProjectsData()`.

**Done When:**
- [ ] `PendingSetupCard` exists, all four component tests above pass.
- [ ] `ProjectCardsPanel` partition logic is in place and all five panel tests above pass.
- [ ] `{/* TODO Slice 6: <AddProjectInput /> */}` placeholder is present in the panel between active grid and pending section.
- [ ] `tsc --noEmit` passes with no new errors.
- [ ] No changes to `ProjectCard.tsx`, `src/types/index.ts`, or any lib file.

---

## Slice 6: AddProjectInput + Panel Embed (Feature Complete)

**Goal:** Implement the `AddProjectInput` client island and embed it in `ProjectCardsPanel`, replacing the Slice 5 placeholder. This slice completes the feature.

**Depends On:** Slices 4 (POST route must exist for integration tests), 5 (panel partition in place)

**Files:**
- `src/components/panels/AddProjectInput.tsx` — create
- `src/components/panels/ProjectCardsPanel.tsx` — modify (replace placeholder with `<AddProjectInput />`)

**Implementation Notes for AddProjectInput:**
- `'use client'` directive at top.
- No props. Fully self-contained.
- State shape:
  ```typescript
  const [value, setValue]           = useState('');
  const [error, setError]           = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  ```
- `router` from `useRouter()` (imported from `next/navigation`).
- Submit handler (shared by button click and Enter keydown):
  1. `setIsSubmitting(true)`, `setError(null)`.
  2. `fetch('/api/projects/paths', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: value }) })`.
  3. Parse response JSON.
  4. If `res.ok` and `!json.error`: `setValue('')`, `router.refresh()`.
  5. Else: `setError(json.error ?? 'An unexpected error occurred')`.
  6. `setIsSubmitting(false)` in `finally`.
- Steps 2–5 must be wrapped in a `try` block; a `catch` block must call `setError('An unexpected error occurred')` on any `fetch` rejection or `res.json()` parse failure; `setIsSubmitting(false)` belongs in `finally` (step 6 above).
- Button is `disabled` when `value.trim() === ''` or `isSubmitting`.
- Input has `onKeyDown`: fire submit when `e.key === 'Enter'` and `!isSubmitting && value.trim() !== ''`.
- Tailwind classes per UI spec:
  - Root: `px-4 py-3 border-t border-border flex flex-col gap-1.5`
  - Input row: `flex gap-2`
  - `<Input>`: `flex-1 font-mono text-sm`
  - `<Button>`: `shrink-0`
  - Error `<p>`: `text-sm text-destructive`
- Accessibility: `aria-label="Add project path"` on Input; `role="alert"` on error `<p>`.
- Imports: `Input` from `@/components/ui/input`; `Button` from `@/components/ui/button`; `useState` from `react`; `useRouter` from `next/navigation`.

**Implementation Notes for ProjectCardsPanel update:**
- Replace `{/* TODO Slice 6: <AddProjectInput /> */}` with `<AddProjectInput />`.
- Add `import { AddProjectInput } from '@/components/panels/AddProjectInput'` at the top.
- No other changes to `ProjectCardsPanel`.

**Tests:**
- [ ] `AddProjectInput` renders an input with `placeholder="/absolute/path/to/repo"` and `aria-label="Add project path"`.
- [ ] Button is disabled when input is empty.
- [ ] Button is enabled when input has a non-empty value.
- [ ] On submit, button shows "Adding..." and both controls are disabled during the in-flight request.
- [ ] On successful POST: input value is cleared; `router.refresh()` is called; no error message is shown.
- [ ] On failed POST: input value is retained; error message appears with `role="alert"` and the server's error string.
- [ ] On next submit after an error: error message clears immediately (`setError(null)` at submit start).
- [ ] Enter key while input is focused and non-empty triggers submission.
- [ ] Enter key while input is empty is a no-op.
- [ ] Integration: POST a valid path via the UI → panel refreshes → new card appears in appropriate section (active or pending).
- [ ] On `fetch` network rejection or non-JSON response from POST, an inline error message is shown (`'An unexpected error occurred'`) and the submit button re-enables (`isSubmitting` returns false).

**Done When:**
- [ ] `src/components/panels/AddProjectInput.tsx` exists and all eleven tests above pass.
- [ ] `ProjectCardsPanel` renders `<AddProjectInput />` between the active grid and the pending section.
- [ ] Placeholder comment is removed.
- [ ] Full end-to-end flow works: submit valid path → card appears without full page reload.
- [ ] `tsc --noEmit` passes with no new errors.
- [ ] Empty-state matrix from UI spec (all four combinations of activeCards/pendingCards) is verified in the browser.
- [ ] Cache invariant: `getProjectsData()` is NOT called via the `'projects'` cache key — verify by confirming `src/lib/projects.ts` imports `discoverProjects` directly and `src/lib/cache.ts` `get('projects')` is never called from `projects.ts` or `ProjectCardsPanel`.

---

## Sequence Rules

1. Complete each slice fully (all tests passing, `tsc` clean) before starting the next.
2. No partial slice work. A slice is either done or not started.
3. If blocked by a missing dependency or ambiguity → HALT. Do not skip ahead or work around.
4. Each slice must pass its "Done When" criteria before the next slice begins.
5. No scope additions to a slice without human approval.
6. Slice 5 has no blocking dependency and may begin immediately. If two implementors are available, Slices 1–4 and Slice 5 can proceed in parallel. Slice 6 waits for both Slice 4 and Slice 5 to be complete.

---

## Deferred (Not This Roadmap)

- Removing a project path from the config file via UI (explicitly out of scope per requirements).
- Reordering or editing config file entries via UI.
- Bulk path import (multiple paths in one POST) — deferred in requirements.
- Per-project configuration UI (projectId assignment, agent identity).
- Filesystem browser or path picker.
- Source-path provenance indicator on active cards (Q1 — confirmed out of scope).
- Shared `CACHE_KEY` constant across route files — deferred until a third consumer exists.
- Authentication or authorisation on POST endpoint — single-user homelab, not required.

---

## PROGRESS.md Template

The following template is to be written as a separate file at `docs/specs/project-discovery-v1/PROGRESS.md` at sprint start.

```markdown
# PROGRESS — project-discovery-v1

Last updated: [date]
Sprint: DDR-003 + DDR-011

## Status

| Slice | Name | Status | Notes |
|-------|------|--------|-------|
| 1 | Types + Cache Foundation | TODO | |
| 2 | Config File Helpers | TODO | |
| 3 | Discovery: Config Source | TODO | |
| 4 | POST /api/projects/paths | TODO | |
| 5 | PendingSetupCard + Panel Partition | TODO | |
| 6 | AddProjectInput + Panel Embed | TODO | |

## Status Legend

- TODO — not started
- IN PROGRESS — active
- BLOCKED — waiting on dependency or decision
- DONE — slice complete, all criteria met
- HALTED — escalated to Composer

## Frank Gates

- [ ] Spec gate (all 5 docs reviewed before forge starts)
- [ ] Implementation gate (all 6 slices DONE before PR)

## Notes

[Per-slice notes go here as sprint progresses]
```
