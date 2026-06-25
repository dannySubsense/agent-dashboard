# UI Spec: project-discovery-v1

Sprint: DDR-003 + DDR-011 combined.

---

## Overview

This sprint modifies one existing panel (`ProjectCardsPanel`) and introduces two new components (`AddProjectInput`, `PendingSetupCard`). No new screens are added. All UI changes are contained within the Project Cards panel on the main dashboard.

---

## Screens

| Screen | Purpose | Entry Point |
|--------|---------|-------------|
| Main Dashboard — Project Cards Panel | Display all discovered repos; allow adding new repos by path | Always-visible panel in main dashboard layout |

The panel is a single view with multiple layout states depending on active/pending card counts. These are not separate screens — they are states of the same panel.

---

## User Flows

### Flow 1: Add Project — Happy Path (US-03, US-06)

1. User is on main dashboard, Project Cards panel is visible.
2. User sees `AddProjectInput` — a text input with placeholder `/absolute/path/to/repo` and an "Add" button.
3. User pastes or types an absolute path into the input.
4. User clicks "Add" or presses Enter.
5. Button becomes disabled and shows "Adding..." — input is also disabled.
6. POST `/api/projects/paths` succeeds.
7. `router.refresh()` fires — panel re-fetches data server-side.
8. Input clears. Button re-enables showing "Add". No error message visible.
9. The new project card appears in the active grid (if `projectId !== null`) or the Pending Setup section (if `projectId === null`).

**Success path:** Submit → loading state → panel refresh → input cleared → card appears.

**Empty-input guard:** If the input is empty, the "Add" button remains disabled. Form cannot be submitted. No error message shown — the disabled state is the signal.

---

### Flow 2: Add Project — Error Path (US-04)

1. User types a path and clicks "Add".
2. Button shows "Adding..." and both controls are disabled.
3. POST returns 4xx or 5xx (e.g. "Path exists but has no .git directory").
4. Button re-enables showing "Add". Input re-enables retaining the submitted value.
5. An inline error message appears below the input row showing the server's error string (e.g. "Path exists but has no .git directory" / "Path does not exist or is not readable" / "Path must be absolute").
6. User corrects the path in the input.
7. User clicks "Add" again — error message clears immediately on next submit (`setError(null)` fires at submit start).
8. If this second submission succeeds, go to Flow 1 step 7.

**Error persistence:** The error message remains visible until the next submission attempt. It does not auto-dismiss.

---

### Flow 3: View Pending Setup Section (US-05)

1. Panel loads. `getProjectsData()` returns entries where some have `projectId === null`.
2. Entries with `projectId !== null` appear in the active cards grid (sorted `lastTouchedAt DESC`).
3. Entries with `projectId === null` appear below `AddProjectInput` in the "Pending Setup" section (sorted `repoName ASC`).
4. Each pending entry renders as a compact muted card showing only `repoName` and a "Needs setup" badge.
5. No LORE data, sprint data, PR count, agent name, or HALT badge appears on pending cards.
6. If no pending entries exist, the entire Pending Setup section is absent from the DOM.

---

## Screen: Project Cards Panel

### Layout Structure (updated)

```
┌─────────────────────────────────────────────────────────────┐
│ PanelShell — "Project Cards"                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Active cards grid — p-4]                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ProjectCard│  │ProjectCard│  │ProjectCard│  ...           │
│  └──────────┘  └──────────┘  └──────────┘                  │
│                                                             │
├── border-t ─────────────────────────────────────────────────┤
│  AddProjectInput — px-4 py-3                                │
│  [ /absolute/path/to/repo                    ] [ Add ]      │
│  [error message if any]                                     │
│                                                             │
│  [Pending Setup section — only when pendingCards.length > 0]│
│  Pending Setup                    ← h3, text-xs uppercase   │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │PendingSetup  │  │PendingSetup  │  ...                    │
│  │Card          │  │Card          │                         │
│  └──────────────┘  └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

### Sections

| Section | Content | Condition | Data Source |
|---------|---------|-----------|-------------|
| Active cards grid | `ProjectCard` × n, sorted `lastTouchedAt DESC` | `activeCards.length > 0` | `getProjectsData()` filtered to `projectId !== null` |
| Empty state message | "No projects discovered. Check PROJECTS_ROOT configuration." | `activeCards.length === 0 && pendingCards.length === 0` | Static text |
| AddProjectInput | Controlled input + submit button + optional error row | Always rendered when `response.data !== null` | Client state only |
| Pending Setup heading | "Pending Setup" label (h3) | `pendingCards.length > 0` | Static text |
| Pending cards grid | `PendingSetupCard` × n, sorted `repoName ASC` | `pendingCards.length > 0` | `getProjectsData()` filtered to `projectId === null` |

### Empty State Matrix

| activeCards | pendingCards | Active grid | Empty message | AddProjectInput | Pending section |
|-------------|--------------|-------------|---------------|-----------------|-----------------|
| 0 | 0 | absent | shown | shown | absent |
| 0 | N | absent | absent | shown | shown |
| N | 0 | shown | absent | shown | absent |
| N | N | shown | absent | shown | shown |

The empty state message is the existing text: `"No projects discovered. Check PROJECTS_ROOT configuration."` — rendered as `<div className="p-4 text-sm text-muted-foreground">`.

**Note on 0-active + N-pending:** No empty-state message is shown for the active section. The pending cards provide visual confirmation that the panel is working; the absence of active cards is self-evident.

---

## Component: AddProjectInput

`src/components/panels/AddProjectInput.tsx` — `'use client'`

### Purpose

Self-contained client island. Posts submitted path to `/api/projects/paths`, handles all three submission states (idle, loading, error), calls `router.refresh()` on success.

### Layout

```
<div>                          ← root; border-t, px-4, py-3, flex flex-col, gap-1.5
  <div>                        ← input row; flex, gap-2
    <Input />                  ← flex-1, font-mono, text-sm
    <Button />                 ← shrink-0
  </div>
  <p>                          ← error text; conditional; text-sm, text-destructive
    {error}
  </p>
</div>
```

### States

#### Idle (no error, input empty)

- Input: enabled, empty, placeholder visible.
- Button: **disabled** (`disabled={value.trim() === ''}`), label "Add".
- Error row: absent.

#### Idle (no error, input has value)

- Input: enabled, value shown.
- Button: **enabled**, label "Add".
- Error row: absent.

#### Loading (submission in flight)

- Input: `disabled={true}`.
- Button: `disabled={true}`, label "Adding...".
- Error row: absent (cleared at submission start).

#### Error (submission returned 4xx or 5xx)

- Input: **enabled**, retains the submitted value so user can correct without retyping.
- Button: **enabled**, label "Add".
- Error row: **visible** — `<p className="text-sm text-destructive">{error}</p>`.
- Error text is the `json.error` string from the API response. Examples: `"Path does not exist or is not readable"`, `"Path exists but has no .git directory"`, `"Path must be absolute"`.

#### Success (transition — not a stable state)

- `setValue('')` fires immediately.
- `router.refresh()` fires immediately after.
- Panel re-renders via server component refresh — new card appears.
- `isSubmitting` returns to `false`.
- Component lands in idle-empty state after refresh completes.

### Interaction Patterns

**Submit triggers:**
- Click the "Add" button.
- Press Enter while input is focused (attach `onKeyDown` handler on `<Input>`; fire submit when `e.key === 'Enter'` and `!isSubmitting && value.trim() !== ''`).

**Submission sequence (matches architecture §AddProjectInput Behaviour):**
1. `setIsSubmitting(true)`, `setError(null)`.
2. The path is trimmed client-side (`path: value.trim()`) before the fetch. Trim happens in the client, not in the route. The server always receives a clean path with no leading or trailing whitespace.
3. Execute the following try/catch/finally block:

```ts
try {
  const res = await fetch('/api/projects/paths', { method: 'POST', body: JSON.stringify({ path: value.trim() }) })
  const json = await res.json()
  if (res.ok && !json.error) {
    setError(null)
    setValue('')
    router.refresh()
  } else {
    setError(json.error ?? 'An unexpected error occurred')
  }
} catch {
  setError('An unexpected error occurred')
} finally {
  setIsSubmitting(false)
}
```

The `catch` branch handles both `fetch` network rejections (e.g., server unreachable) AND `res.json()` parse failures (e.g., a non-JSON HTML 500 error page from the server). Without the catch, either failure leaves the user with no visible error and a possible unhandled rejection.

### Tailwind Class Specification

| Element | Classes |
|---------|---------|
| Root container | `px-4 py-3 border-t border-border flex flex-col gap-1.5` |
| Input row div | `flex gap-2` |
| `<Input>` | `flex-1 font-mono text-sm` |
| `<Button>` | `shrink-0` (no additional classes beyond shadcn defaults) |
| Error `<p>` | `text-sm text-destructive` |

### shadcn/ui Components

| Element | Component | Import Path |
|---------|-----------|-------------|
| Text field | `Input` | `@/components/ui/input` |
| Submit control | `Button` | `@/components/ui/button` |

### Accessibility

- Input `placeholder="/absolute/path/to/repo"`.
- Input `aria-label="Add project path"`.
- Error `<p>` should have `role="alert"` so screen readers announce it on appearance.
- Button `aria-disabled` should match the `disabled` prop state.

### Component Hierarchy

```
AddProjectInput ('use client')
├── div (root container)
│   ├── div (input row)
│   │   ├── Input (shadcn — flex-1, font-mono, text-sm)
│   │   └── Button (shadcn — "Add" / "Adding...")
│   └── p (error text — conditional)
```

---

## Component: PendingSetupCard

`src/components/cards/PendingSetupCard.tsx` — server component (no directive)

### Purpose

Renders a compact, visually muted card for a repo that has been discovered but has no declared `projectId`. Suppresses all data sections present in `ProjectCard` (ProjectMeta, CommitInfo, LoreSummary, SprintBadge, PrCountBadge, HALT badge). Renders only `repoName` and a "Needs setup" badge.

### What is Rendered

- `repoName` — always present; the only text content.
- "Needs setup" badge.

### What is Suppressed

- `projectId`
- `agentName`
- `lastCommit`
- `lastLoreCapture`
- `currentSprint`
- `openPrCount`
- `hasActiveHalt` / HALT badge

### Visual Style

The card uses the `--muted` background token instead of `--card`. This creates a recessed visual appearance against the panel background in both light and dark mode without reducing text contrast (text uses `text-muted-foreground` which is calibrated against `--muted` backgrounds).

Do NOT use `opacity-60` or any global opacity reduction — it makes text and badges harder to read. Apply muted styling at the token level instead.

| Element | Classes | Rationale |
|---------|---------|-----------|
| `<Card>` root | `flex flex-col bg-muted` | Replaces `--card` bg with `--muted`; recessed appearance |
| `<CardHeader>` | `px-3 py-2.5` | Matches `ProjectCard` CardHeader padding |
| Inner flex div | `flex items-center justify-between gap-2` | Matches `ProjectCard` header row layout |
| `repoName` span | `text-sm text-muted-foreground font-medium truncate` | Muted foreground (dimmer than active card's `font-bold`); same size |
| "Needs setup" `<Badge>` | `variant="outline"` with `className="shrink-0 text-xs"` | Outline variant: neutral/informational; visible in both modes; consistent with `ProjectCard` badge sizing |

No `CardContent` is rendered. The card contains only `CardHeader`.

### Layout

```
<Card className="flex flex-col bg-muted">
  <CardHeader className="px-3 py-2.5">
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-muted-foreground font-medium truncate">
        {repoName}
      </span>
      <Badge variant="outline" className="shrink-0 text-xs">
        Needs setup
      </Badge>
    </div>
  </CardHeader>
</Card>
```

### shadcn/ui Components

| Element | Component | Import Path |
|---------|-----------|-------------|
| Card shell | `Card`, `CardHeader` | `@/components/ui/card` |
| Status badge | `Badge` | `@/components/ui/badge` |

### Component Hierarchy

```
PendingSetupCard (server component)
└── Card (shadcn — bg-muted)
    └── CardHeader (px-3 py-2.5)
        └── div (flex row)
            ├── span (repoName — text-muted-foreground)
            └── Badge (outline — "Needs setup")
```

---

## Component: ProjectCardsPanel (updated)

`src/components/panels/ProjectCardsPanel.tsx` — async server component (no directive change)

### What Changes

1. After `data` is fetched, partition into `activeCards` and `pendingCards`.
2. Render `activeCards` in the existing grid (only when `activeCards.length > 0`).
3. Render empty-state message when both arrays are empty (replaces current `data.length === 0` check).
4. Always render `<AddProjectInput />` when `response.data !== null`.
5. Render pending section (heading + grid) only when `pendingCards.length > 0`.

### Partition Logic (display, not data)

```
activeCards  = data.filter(p => p.projectId !== null)
// sort preserved from getProjectsData() — lastTouchedAt DESC

pendingCards = data
  .filter(p => p.projectId === null)
  .sort((a, b) => a.repoName.localeCompare(b.repoName))
// sorted repoName ASC per DDR-011 §5
```

### Updated Render Tree (full)

```
ProjectCardsPanel (async server component)
└── PanelShell title="Project Cards" response={response}
    └── [only when response.data !== null]
        ├── [when activeCards.length === 0 && pendingCards.length === 0]
        │   └── div.p-4.text-sm.text-muted-foreground
        │       "No projects discovered. Check PROJECTS_ROOT configuration."
        ├── [when activeCards.length > 0]
        │   └── div.p-4.grid.grid-cols-[repeat(auto-fill,minmax(280px,1fr))].gap-4
        │       └── ProjectCard × n (key={project.repoPath})
        ├── AddProjectInput   ← always rendered when data !== null
        └── [when pendingCards.length > 0]
            ├── h3.px-4.pt-2.pb-1.text-xs.font-semibold.uppercase.tracking-wide.text-muted-foreground
            │   "Pending Setup"
            └── div.px-4.pb-4.grid.grid-cols-[repeat(auto-fill,minmax(280px,1fr))].gap-4
                └── PendingSetupCard × n (key={project.repoPath})
```

### Section Tailwind Classes

| Section | Element | Classes |
|---------|---------|---------|
| Active cards grid | `div` | `p-4 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4` (unchanged) |
| Empty state | `div` | `p-4 text-sm text-muted-foreground` (unchanged) |
| AddProjectInput | (component handles its own root) | See AddProjectInput spec above |
| Pending section heading | `h3` | `px-4 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground` |
| Pending cards grid | `div` | `px-4 pb-4 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4` |

The pending grid uses `px-4 pb-4` (not `p-4`) to avoid double-spacing with the heading above it.

### No Active-Section Heading

The active cards section has no heading element. `PanelShell` already titles the panel "Project Cards". Adding a redundant "Projects" subheading would be noise. Only the Pending Setup section requires a heading because it is a distinct secondary tier within the same panel.

---

## Interaction Patterns

### Pattern: Submit Add Project

**Trigger:** Click "Add" button, or press Enter while `AddProjectInput` input is focused.

**Component:** `AddProjectInput`

**Behavior:**
1. Guard: if `value.trim() === ''`, do nothing — button is disabled and Enter handler is a no-op.
2. Immediate: set `isSubmitting = true`, `error = null`.
3. UI: button shows "Adding..." and is disabled; input is disabled.
4. Async: POST `/api/projects/paths` with `{ "path": value.trim() }`. The path is trimmed client-side before the fetch.
5a. On HTTP 200 with no error: `value = ''`, `router.refresh()`, then `isSubmitting = false`.
5b. On HTTP 4xx/5xx, `fetch` network rejection, or non-JSON response: `error = json.error ?? 'An unexpected error occurred'`, `isSubmitting = false`. Input value retained.

**Loading state:** Button label "Adding...", both controls disabled.

**Error state:** Inline `<p role="alert" className="text-sm text-destructive">` below input row. Input retains value.

**Success state:** Input cleared, panel re-renders via `router.refresh()`. New card appears in appropriate section without page reload.

---

### Pattern: Client-side Empty-Input Guard

**Trigger:** Input value is empty string or whitespace only.

**Behavior:** Button remains `disabled`. No error message. No API call. Enter keydown is a no-op.

This is not an error state — it is a neutral idle state. The disabled button is the only signal.

---

### Pattern: Whitespace Trimming

**Trigger:** User submits a path with leading or trailing whitespace (common from terminal copy-paste).

**Behavior:** The client trims `value` before building the POST body (`path: value.trim()`). The server receives a clean path. Trimming is the client's responsibility — the route does not trim.

**Edge case note:** A path with leading or trailing whitespace (common from terminal copy-paste) is trimmed before submission. The server receives a clean path.

---

### Pattern: Error Clear on Resubmit

**Trigger:** User modifies input (optional) and clicks "Add" / presses Enter with a non-empty value.

**Behavior:** `setError(null)` fires at the start of the next submission (step 2 of submit pattern above). Error row disappears immediately when the next request begins, before the response returns.

---

## State Visibility

| State field | Visible in | Updated by |
|-------------|------------|------------|
| `value` | Input field text | User typing; cleared on success |
| `isSubmitting` | Input `disabled`; Button `disabled` + label | Set `true` on submit start; `false` in `finally` |
| `error` | Error `<p>` below input row | Set from `json.error` on failure; set `null` on next submit start; absent on success |
| `activeCards` partition | Active cards grid | Derived server-side from `getProjectsData()` on each render/refresh |
| `pendingCards` partition | Pending Setup section (heading + grid) | Derived server-side; section absent when length is 0 |
| Pending section visibility | ProjectCardsPanel DOM | `pendingCards.length > 0` |

---

## Full Component Hierarchy

```
ProjectCardsPanel (async server component)
└── PanelShell
    ├── [empty state div — conditional]
    ├── div (active cards grid — conditional)
    │   └── ProjectCard × n
    │       ├── Card
    │       │   ├── CardHeader
    │       │   │   └── [repoName + HALT Badge]
    │       │   └── CardContent
    │       │       ├── [ProjectMeta: projectId, agentName]
    │       │       ├── [CommitInfo: message, date]
    │       │       ├── [LoreSummary: title, date]
    │       │       ├── [SprintBadge — conditional]
    │       │       └── [PrCountBadge]
    ├── AddProjectInput ('use client' island)
    │   ├── Input (shadcn)
    │   ├── Button (shadcn)
    │   └── p (error — conditional)
    └── [pending section — conditional]
        ├── h3 ("Pending Setup")
        └── div (pending cards grid)
            └── PendingSetupCard × n
                └── Card (bg-muted)
                    └── CardHeader
                        ├── span (repoName — text-muted-foreground)
                        └── Badge outline ("Needs setup")
```

---

## Architectural Note

`AddProjectInput` is a `'use client'` island embedded in the async server component `ProjectCardsPanel`. No props flow into it. It is fully self-contained. This is the correct Next.js 15 pattern: the server component renders the client island as a leaf, preserving server-side data fetching for the panel while enabling client-side interactivity for the input.

`router.refresh()` re-runs `ProjectCardsPanel`, which calls `getProjectsData()` directly. `getProjectsData()` is uncached — it runs a fresh discovery pass on every call — so the refresh always reflects the newly-written config file. `cache.delete('projects')` is called by the POST route independently and serves GET `/api/projects` consumers only; it has no effect on the panel's refresh path.

---

## Out of Scope (UI)

Per 01-REQUIREMENTS.md §Out of Scope:

- No remove/delete UI for config file entries.
- No path picker or filesystem browser — paste input only.
- No per-project configuration UI.
- No source-path provenance indicator on active cards.
- No changes to `ProjectCard` fields or layout.
