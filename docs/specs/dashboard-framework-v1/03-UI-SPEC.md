# UI Specification: Dashboard Framework v1

- **Sprint:** dashboard-framework-v1
- **Source DDR:** DDR-002 (ACCEPTED 2026-06-20)
- **Author:** ui-spec-writer
- **Date:** 2026-06-20

---

## Overview

Single-page read-only dashboard at `/`. All six panels render on one page; no routing or navigation in v1. Target viewport: 1440p+ desktop browser over Tailscale VPN. The page is a server-rendered Next.js App Router page; the only client-side interactivity is the Activity Feed filter state.

---

## Screens

| Screen | Purpose | Entry Point |
|--------|---------|-------------|
| Dashboard (`/`) | Aggregated view of all active projects: cards, pipeline, session context, activity, agents, open work | Direct URL access |

This is the only screen in v1.

---

## Screen States

The Dashboard screen has the following distinct states:

| State | Description |
|---|---|
| Loading | One or more panels are still awaiting data. Each pending panel displays a skeleton placeholder in place of its body content. |
| Nominal | All panels have resolved successfully and display current data. |
| Partial Degradation | One or more panels returned `data: null` or `error != null`; those panels render PanelUnavailable. Remaining panels render normally. |
| Full Degradation | All panels unavailable; page structure and headers remain visible; all panels show PanelUnavailable. |
| Empty Projects | `PROJECTS_ROOT` returned zero discovered projects; panels that depend on project discovery render their empty states. |

---

## User Flows

### Flow: Dashboard Orientation (US-01)

**User goal:** Answer "where am I across all projects?" in under 10 seconds.

1. User navigates to the dashboard URL in a browser over Tailscale.
2. Browser receives the HTML shell (header, grid structure) immediately.
3. Each panel independently displays a skeleton loader while its data fetches.
4. Panels populate with data as their API calls complete independently.
5. User reads across Project Cards (row 1) for quick project-level status.
6. User scans Open Work for blocking items (red HALT badges).
7. End state: all six panels visible with current data.

**Success path:** All API routes resolve; all panels show data within 5 seconds on a LAN connection.
**Partial failure path:** One or more API routes fail; affected panels show PanelUnavailable with error message; remaining panels remain fully functional.

---

### Flow: Project Status Scan (US-02)

**User goal:** Identify most recently active projects and their status.

1. User loads dashboard; Project Cards panel is in row 1, taking approximately two-thirds of the page width.
2. Panel displays cards sorted by `lastTouchedAt` descending (most recent first).
3. User reads the leading cards to identify the most recently active projects.
4. User scans for red HALT badges on any card.
5. User reads commit message, LORE capture summary, sprint badge, and PR count per card.
6. End state: user knows which projects are most active and which have blocking items.

**Success path:** Cards render with full data.
**No projects path:** Panel body shows "No projects discovered. Check `PROJECTS_ROOT` configuration."
**Partial data path:** Individual null fields display their defined empty-state text (see Empty States table) rather than blank space.

---

### Flow: DDR Pipeline Review (US-03)

**User goal:** See which design decisions are pending, accepted, in-sprint, or shipped across all projects.

1. User scrolls to DDR Pipeline panel (row 2, full page width).
2. Panel displays a Kanban board with columns: PROPOSED, ACCEPTED, IN SPRINT, SHIPPED, and UNKNOWN (conditional).
3. Each column header shows the column label and count of entries.
4. User reads column card counts and individual DDR titles per column.
5. End state: user knows the pipeline state of all DDRs across all projects.

**Success path:** All DDR index files parsed; DDRs distributed across columns.
**No DDRs path:** All columns render empty with their header labels; no error shown.
**Unknown status path:** UNKNOWN column appears to the right of SHIPPED; each card in this column displays the raw status value from the source file.

---

### Flow: Resume Project Context (US-04)

**User goal:** Pick up where a previous session left off without re-deriving context.

1. User locates the "Where Did I Leave Off?" panel (row 3, left column, approximately half the page width).
2. Panel displays one session-close card per project that has a matching LORE capture.
3. Cards are ordered by capture timestamp descending (most recent first).
4. Each card shows: project repo name, capture timestamp, capture title, and a content preview (up to approximately 300 characters with "..." appended if truncated).
5. User reads the relevant project's card.
6. End state: user has the carry-forward context without opening a terminal.

**Success path:** LORE returns session-close captures; cards render.
**No captures path:** Projects without session-close captures are omitted from the list. If no projects have any session-close captures, the panel body shows "No session captures found across discovered projects."
**LORE unavailable path:** Panel renders PanelUnavailable with "Data unavailable" message.
**Very long content path:** Content is truncated at approximately 300 characters; "..." suffix is visible; no layout overflow.

---

### Flow: Activity Feed Browse (US-05)

**User goal:** Track cross-project activity in a single chronological view.

1. User locates the Unified Activity Feed panel (row 4, full page width).
2. Panel renders with default state: all projects, all event types, last 14 days, sorted newest first.
3. LORE captures, git commits, and PR merges appear interleaved in a single timeline.
4. **Apply project filter:** User clicks the Project dropdown and selects a repo name.
5. Timeline re-renders client-side showing only events where `repoName` matches the selection.
6. **Apply type filter:** User clicks the Event Type dropdown and selects a type.
7. Timeline re-renders showing only events matching both the active project filter and the type filter.
8. **Clear filters:** User clicks "Clear filters" button; both dropdowns reset to "All"; timeline returns to default 14-day view.
9. End state: user has browsed the desired slice of cross-project activity.

**Empty filter result:** "No events match the current filters." message in the timeline area.
**No events in 14-day window:** "No activity in the last 14 days." message; not a blank space.
**API unavailable:** Panel renders PanelUnavailable.

---

### Flow: Agent Status Check (US-06)

**User goal:** See which agents are currently active across all projects.

1. User locates Agent Status panel (row 1, right column, approximately one-third of the page width).
2. Panel lists all registered agents with name, project, relay handle, registry status, and Switchboard status badge.
3. Agents are sorted alphabetically by name.
4. User reads agent rows to identify who is online.
5. End state: user knows which agents are active.

**Success path:** LORE agent registry and `~/.switchboard/sessions.json` both readable; agents listed with accurate status.
**Switchboard unavailable path:** `switchboardStatus` column shows "unknown" for all agents; name, project, relay handle, and registry status still render.
**LORE unavailable path:** Panel renders PanelUnavailable.
**No agents registered:** Panel body shows "No agents registered."

---

### Flow: Open Work Review (US-07)

**User goal:** Identify all blocking and pending items across projects without switching context.

1. User locates Open Work Tracker panel (row 3, right column, approximately half the page width).
2. Panel displays grouped sections: HALTs (with red badges), Open PRs, Open Issues, Unaccepted DDRs.
3. HALTs render first; their red badges draw immediate attention.
4. User reads HALTs for blocked items.
5. User reads PRs, issues, and unaccepted DDRs for pending work.
6. End state: user knows all blocking and pending items across all projects.

**Success path:** All groups render with data.
**No HALTs path:** HALT group is omitted from the panel body.
**GitHub unavailable path:** PR and Issue groups show "Data unavailable" in-group notice; HALT and Unaccepted DDR groups render normally if their sources are available.
**Multiple HALTs same project:** All listed individually; none collapsed or merged.
**Truncation:** PRs and issues are capped at 25 per project; a "Showing 25 of N" label appears at the end of the affected group.
**All groups empty:** Panel body shows "No open work items found."

---

## Layout Structure

### Page Layout

Target viewport: 1440px+ width. Fixed 12-column CSS grid layout. Panels do not reorder or collapse in v1.

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ PAGE HEADER                                                                  │
│ "Agent Dashboard"                                [Last fetched: HH:MM:SS]   │
├────────────────────────────────────────────────┬─────────────────────────────┤
│ Panel 1: Project Cards                         │ Panel 5: Agent Status       │
│ (cols 1–8, approximately 66% width)            │ (cols 9–12, ~33% width)     │
│                                                │                             │
├────────────────────────────────────────────────┴─────────────────────────────┤
│ Panel 2: DDR Pipeline (cols 1–12, full width)                                │
│                                                                              │
├──────────────────────────────────┬───────────────────────────────────────────┤
│ Panel 3: Where Did I Leave Off?  │ Panel 6: Open Work Tracker               │
│ (cols 1–6, approximately 50%)    │ (cols 7–12, approximately 50%)           │
│                                  │                                           │
├──────────────────────────────────┴───────────────────────────────────────────┤
│ Panel 4: Unified Activity Feed (cols 1–12, full width)                       │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Page Header

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Agent Dashboard                              Last fetched: 2026-06-20 14:32  │
└──────────────────────────────────────────────────────────────────────────────┘
```

The header contains the dashboard title and a server render timestamp. The timestamp reflects when the page was rendered by the server (not real-time; refreshing the page updates it).

---

### Panel 1: Project Cards

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Project Cards                                                                │
├──────────────────────────────────────────────────────────────────────────────┤
│ ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐      │
│ │ agent-dashboard ■  │  │ gap-lens-dilution  │  │ lore-backend       │      │
│ │ agent-dashboard    │  │ gap-lens           │  │ (no agent)         │      │
│ │ Agent: Lumen       │  │ Agent: Dillon      │  │                    │      │
│ │────────────────────│  │────────────────────│  │────────────────────│      │
│ │ fix: DDR-002 arch  │  │ feat: filter ep.   │  │ No commits         │      │
│ │ 2h ago             │  │ 1 day ago          │  │                    │      │
│ │────────────────────│  │────────────────────│  │────────────────────│      │
│ │ Architecture spec  │  │ Sprint closed      │  │ No captures        │      │
│ │ 3h ago             │  │ 2 days ago         │  │                    │      │
│ │────────────────────│  │────────────────────│  │────────────────────│      │
│ │ dashboard-v1       │  │ filter-v1          │  │ (no sprint)        │      │
│ │ IN PROGRESS        │  │ COMPLETE           │  │                    │      │
│ │────────────────────│  │────────────────────│  │────────────────────│      │
│ │ PRs: 2             │  │ PRs: 0             │  │ PRs: 1             │      │
│ └────────────────────┘  └────────────────────┘  └────────────────────┘      │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Card grid:** Auto-fill columns within the panel; no hard-coded column count. Cards are not interactive in v1 (no click-through).

**Fields within each ProjectCard, top to bottom:**

| Field | Source | Null/empty display |
|---|---|---|
| `repoName` (bold, header) | `ProjectCardData.repoName` | Always present |
| HALT badge (red, header right) | `ProjectCardData.hasActiveHalt` | Omitted when `false` |
| `projectId` (muted) | `ProjectCardData.projectId` | "no agent configured" (muted, italic) |
| `agentName` (muted) | `ProjectCardData.agentName` | "no agent configured" (muted, italic) |
| Last commit message (single line, ellipsis) | `ProjectCardData.lastCommit.message` | "No commits" (muted) |
| Last commit date | `ProjectCardData.lastCommit.date` | Omitted when commit is null |
| Last LORE capture title (single line, ellipsis) | `ProjectCardData.lastLoreCapture.title` | "No captures" (muted) |
| Last LORE capture date | `ProjectCardData.lastLoreCapture.timestamp` | Omitted when capture is null |
| Sprint slug + status badge | `ProjectCardData.currentSprint` | Entire field omitted when `null` |
| Open PR count badge | `ProjectCardData.openPrCount` | "0" is shown; not omitted |

Cards are sorted by `ProjectCardData.lastTouchedAt` descending before rendering.

---

### Panel 2: DDR Pipeline

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ DDR Pipeline                                                                 │
├──────────────────────────────────────────────────────────────────────────────┤
│  PROPOSED (3)       ACCEPTED (2)     IN SPRINT (1)    SHIPPED (5)           │
│  ┌──────────────┐   ┌──────────────┐  ┌──────────────┐ ┌──────────────┐    │
│  │ DDR-005      │   │ DDR-002      │  │ DDR-001      │ │ DDR-009      │    │
│  │ Port inv...  │   │ Dashboard... │  │ Bootstrap... │ │ New project  │    │
│  │ agent-dash   │   │ agent-dash   │  │ agent-dash   │ │ agent-dash   │    │
│  │ sprint: tbd  │   │ dashboard-v1 │  │ bootstrap-v1 │ │ new-proj-v1  │    │
│  └──────────────┘   └──────────────┘  └──────────────┘ └──────────────┘    │
│  ┌──────────────┐   ┌──────────────┐                    ┌──────────────┐    │
│  │ DDR-006      │   │ DDR-003      │                    │ DDR-008      │    │
│  │ Agent stat.. │   │ Project dis..│                    │ Session cl.. │    │
│  └──────────────┘   └──────────────┘                    └──────────────┘    │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Columns:** PROPOSED → ACCEPTED → IN SPRINT → SHIPPED, rendered left to right. UNKNOWN column appended at right only when at least one entry with an unrecognized status exists.

**Column header:** Column label + count of DDR cards in that column.

**Empty columns:** Header and label rendered; no cards; column is not hidden.

**Each DdrCard contains:**
- DDR number (e.g., "DDR-005")
- Title (single line, overflow ellipsis)
- Repo name (muted)
- Sprint slug or "tbd" (muted)

**UNKNOWN column cards** additionally display the raw status value from the source file in parentheses.

---

### Panel 3: Where Did I Leave Off?

```
┌──────────────────────────────────────────────────────┐
│ Where Did I Leave Off?                                │
├──────────────────────────────────────────────────────┤
│ agent-dashboard                          3h ago       │
│ SESSION-CLOSE — dashboard-framework-v1               │
│ "Completed architecture doc. Next: run /spec-start   │
│ for DDR-002 and produce the UI spec..."              │
├──────────────────────────────────────────────────────┤
│ gap-lens-dilution                        2 days ago   │
│ SESSION-CLOSE — filter-v1                            │
│ "Paused on filter endpoint. Resume from slice 4..."  │
├──────────────────────────────────────────────────────┤
│ lore-backend                             5 days ago   │
│ SESSION-CLOSE — schema-v2                            │
│ "Schema migration complete. Next: write test suite..."│
└──────────────────────────────────────────────────────┘
```

**Per-project SessionCloseCard fields:**
- Repo name (bold) + relative timestamp (right-aligned)
- Capture title (single line)
- Content body: displayed up to approximately 300 characters; "..." appended if truncated

**Ordering:** Cards sorted by `SessionClose.timestamp` descending (most recent first).

**Projects without a session-close capture are omitted from this panel.**

---

### Panel 4: Unified Activity Feed

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Unified Activity Feed                                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│  Project: [All ▾]    Type: [All ▾]    [Clear filters]                       │
├──────────────────────────────────────────────────────────────────────────────┤
│  ● 2026-06-20 14:32   LORE capture   agent-dashboard                        │
│    Captured architecture decision for DDR-002                                │
│                                                                              │
│  ● 2026-06-20 11:15   Git commit     gap-lens-dilution                       │
│    feat: add project filter to activity endpoint                             │
│                                                                              │
│  ● 2026-06-20 09:00   PR merge       agent-dashboard                        │
│    PR #9 merged: DDR-002 architecture spec                                   │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Filter bar (top of panel body):**
- Project dropdown (shadcn Select): options are "All" + one entry per distinct `repoName` in the loaded events
- Event Type dropdown (shadcn Select): options are "All", "LORE capture", "Git commit", "PR merge"
- Clear filters button (shadcn Button): resets both dropdowns to "All"

**Filter bar is always visible** even when no events exist.

**Timeline (below filter bar):**
- Vertically scrollable list
- Events sorted by `timestamp` descending (newest first)
- Each FeedEvent row: event type indicator dot/icon + absolute timestamp + event type display label + repo name + summary text

**Event type display labels and mapping:**

| `ActivityEventType` value | Display label |
|---|---|
| `lore-capture` | LORE capture |
| `git-commit` | Git commit |
| `pr-merge` | PR merge |

**Filtering is applied client-side** to the full 14-day dataset loaded from props. No additional network request is made when filter state changes.

---

### Panel 5: Agent Status

```
┌────────────────────────────────────────────────────────┐
│ Agent Status                                            │
├────────────────────────────────────────────────────────┤
│ Agent    Project         Handle   Registry   Status    │
│ cairn    lore-personal   cairn    confirmed  ○ offline │
│ dillon   gap-lens        dillon   confirmed  ? unknown │
│ lumen    agent-dash      lumen    confirmed  ● online  │
└────────────────────────────────────────────────────────┘
```

**Table layout** (not a card grid): one row per registered agent.

**Columns:**
- Agent: `AgentRecord.name`
- Project: `AgentRecord.projectId`
- Handle: `AgentRecord.relayHandle`
- Registry: `AgentRecord.registryStatus` (raw value from LORE)
- Status: `AgentRecord.switchboardStatus` rendered as a status badge

**Status badge rendering:**

| `SwitchboardStatus` | Badge display |
|---|---|
| `online` | Filled green dot + "online" |
| `offline` | Gray dot + "offline" |
| `unknown` | "?" character + "unknown" (muted) |

**Ordering:** Agents sorted alphabetically by `AgentRecord.name`.

---

### Panel 6: Open Work Tracker

```
┌────────────────────────────────────────────────────────┐
│ Open Work                                               │
├────────────────────────────────────────────────────────┤
│ HALTs (2)                                              │
│ ■ agent-dashboard   HALT on US-07 spec...  1h ago     │
│ ■ gap-lens          HALT on filter impl... 2 days ago  │
├────────────────────────────────────────────────────────┤
│ Open PRs (1)                                           │
│   agent-dashboard   PR #12: fix auth hea...           │
├────────────────────────────────────────────────────────┤
│ Open Issues (3)                                        │
│   gap-lens          #18: perf on initial load         │
│   agent-dashboard   #4: shadcn table scroll           │
│   gap-lens          #22: rate limit retry             │
├────────────────────────────────────────────────────────┤
│ Unaccepted DDRs (2)                                    │
│   agent-dashboard   DDR-005: port inventory            │
│   gap-lens          DDR-011: auth layer                │
└────────────────────────────────────────────────────────┘
```

**Group order:** HALTs → Open PRs → Open Issues → Unaccepted DDRs (this order is fixed).

**Group header:** Group label + count of items in parentheses.

**Groups with zero items are omitted** from the panel body. If all groups are empty, the panel body shows "No open work items found."

**HALT items:**
- Red badge/indicator (left edge or prefix)
- Repo name
- HALT title (single line, ellipsis)
- Relative timestamp

**PR items:**
- Repo name
- PR number + title (single line, ellipsis)
- (No timestamp displayed)

**Issue items:**
- Repo name
- Issue number + title (single line, ellipsis)
- (No timestamp displayed)

**Unaccepted DDR items:**
- Repo name
- DDR number + title (single line, ellipsis)
- (No timestamp displayed)

**Truncation:** When a project has more than 25 PRs or issues, the group shows 25 items and a "Showing 25 of N" label at the end.

---

## Interaction Patterns

### Interaction 1: Page Load

**Trigger:** User navigates to `/`.
**Components involved:** `DashboardPage`, `PanelShell` (all 6), React Suspense boundaries.

**Behavior:**
1. Browser receives HTML shell (header, grid structure, panel shells with titles) immediately via server streaming.
2. Each panel is wrapped in a React Suspense boundary; while its data fetches, the Suspense fallback renders a skeleton placeholder occupying the panel body area.
3. Each panel resolves and hydrates independently as its API call completes.
4. If `ApiResponse.error != null` and `ApiResponse.data == null`, `PanelShell` renders `PanelUnavailable` in place of the panel body.
5. If `ApiResponse.stale == true` and `ApiResponse.data != null`, `PanelShell` renders the panel body plus a stale-data notice.

**Loading state (per panel):** Skeleton placeholder with animated content blocks. Panel title is visible during skeleton state.
**Error state (per panel):** `PanelUnavailable` with "Data unavailable" heading and optional error message string.
**Success state (per panel):** Panel body renders with data.

---

### Interaction 2: Activity Feed — Apply Project Filter

**Trigger:** User selects a project name from the Project dropdown in the Activity Feed filter bar.
**Component:** `ActivityFeedPanel` (Client Component), `FeedFilterBar`, `FeedTimeline`.

**Behavior:**
1. User opens Project dropdown; sees "All" plus one entry per distinct `repoName` in the loaded `ActivityEvent[]`.
2. User selects a repo name.
3. Client state `filterProject` is set to the selected repo name.
4. `FeedTimeline` re-renders showing only events where `repoName === filterProject`.
5. No network request is made; filtering is applied to the dataset in component props.

**Loading state:** Not applicable (client-side only; no fetch).
**Empty result:** "No events match the current filters." replaces the event list.

---

### Interaction 3: Activity Feed — Apply Event Type Filter

**Trigger:** User selects an event type from the Event Type dropdown.
**Component:** `ActivityFeedPanel` (Client Component), `FeedFilterBar`, `FeedTimeline`.

**Behavior:**
1. User opens Type dropdown; sees "All", "LORE capture", "Git commit", "PR merge".
2. User selects a type.
3. Client state `filterType` is set to the corresponding `ActivityEventType` value.
4. `FeedTimeline` re-renders showing only events where `type === filterType`.
5. Project and type filters are combinatorial: both active simultaneously.

**Loading state:** Not applicable.
**Empty result:** "No events match the current filters."

---

### Interaction 4: Activity Feed — Clear Filters

**Trigger:** User clicks the "Clear filters" button.
**Component:** `ActivityFeedPanel` (Client Component), `FeedFilterBar`.

**Behavior:**
1. Both filter states reset to defaults: `filterProject = null`, `filterType = null`.
2. Both dropdowns reset to "All".
3. `FeedTimeline` re-renders with the full 14-day event dataset.

---

### Interaction 5: Stale Data Notice

**Trigger:** `ApiResponse.stale == true` on the response passed to a panel.
**Component:** `PanelShell`.

**Behavior:**
1. Panel body renders its data normally.
2. A notice is shown below the panel title bar: "Showing cached data — data source currently unreachable."
3. If `ApiResponse.error` is also set (non-null), the error text appears alongside the stale notice.
4. Panel is otherwise fully functional; no content is suppressed.

---

### Interaction 6: Panel Unavailable

**Trigger:** `ApiResponse.data == null` with no valid stale cache entry.
**Component:** `PanelShell` → `PanelUnavailable`.

**Behavior:**
1. Panel body is replaced entirely by the `PanelUnavailable` component.
2. `PanelUnavailable` displays: "Data unavailable" as a heading, plus optional error message string from `ApiResponse.error`.
3. The panel title bar and panel border remain visible (only the body is replaced).
4. All other panels are completely unaffected.

---

## Component Hierarchy

```
layout.tsx                                 (src/app/layout.tsx)
└── Header                                 (src/components/shared/)
    ├── DashboardTitle                     ("Agent Dashboard")
    └── LastFetchedTimestamp               (server render time, formatted)

DashboardPage                              (Server Component — src/app/page.tsx)
└── DashboardGrid                          (12-column CSS Grid)
    │
    ├── ProjectCardsPanel                  (Server Component — cols 1–8, row 1)
    │   └── PanelShell                     (src/components/shared/PanelShell.tsx)
    │       ├── PanelHeader                ("Project Cards")
    │       ├── [StaleNotice]              (conditional on ApiResponse.stale)
    │       ├── [PanelUnavailable]         (conditional on ApiResponse.data == null)
    │       └── ProjectCardGrid            (CSS auto-fill grid)
    │           └── ProjectCard (×n)       (src/components/cards/ProjectCard.tsx)
    │               ├── CardHeader         (repoName + HaltBadge conditional)
    │               ├── ProjectMeta        (projectId + agentName, muted)
    │               ├── CommitInfo         (message + relative date; "No commits" if null)
    │               ├── LoreSummary        (title + relative date; "No captures" if null)
    │               ├── SprintBadge        (slug + status; omitted if currentSprint null)
    │               └── PrCountBadge       (openPrCount as number)
    │
    ├── AgentStatusPanel                   (Server Component — cols 9–12, row 1)
    │   └── PanelShell
    │       ├── PanelHeader                ("Agent Status")
    │       ├── [StaleNotice]              (conditional)
    │       ├── [PanelUnavailable]         (conditional)
    │       └── AgentTable
    │           └── AgentRow (×n)
    │               ├── AgentName
    │               ├── ProjectLabel
    │               ├── RelayHandle
    │               ├── RegistryStatus
    │               └── SwitchboardStatusBadge
    │
    ├── DdrPipelinePanel                   (Server Component — cols 1–12, row 2)
    │   └── PanelShell
    │       ├── PanelHeader                ("DDR Pipeline")
    │       ├── [StaleNotice]              (conditional)
    │       ├── [PanelUnavailable]         (conditional)
    │       └── KanbanBoard
    │           ├── KanbanColumn "PROPOSED"
    │           │   ├── ColumnHeader       (label + count)
    │           │   └── DdrCard (×n)
    │           │       ├── DdrNumber
    │           │       ├── DdrTitle       (single line, ellipsis)
    │           │       ├── RepoLabel      (muted)
    │           │       └── SprintLabel    (muted; "tbd" if empty)
    │           ├── KanbanColumn "ACCEPTED"
    │           │   └── ...same structure
    │           ├── KanbanColumn "IN SPRINT"
    │           │   └── ...same structure
    │           ├── KanbanColumn "SHIPPED"
    │           │   └── ...same structure
    │           └── [KanbanColumn "UNKNOWN"]    (conditional — only if entries exist)
    │               └── DdrCard (×n)
    │                   └── ...same structure + RawStatusLabel
    │
    ├── SessionClosePanel                  (Server Component — cols 1–6, row 3)
    │   └── PanelShell
    │       ├── PanelHeader                ("Where Did I Leave Off?")
    │       ├── [StaleNotice]              (conditional)
    │       ├── [PanelUnavailable]         (conditional)
    │       └── SessionCloseList
    │           └── SessionCloseCard (×n)
    │               ├── SessionHeader      (repoName bold + timestamp right-aligned)
    │               ├── CaptureTitle       (single line)
    │               └── ContentPreview     (~300 char truncation with "..." indicator)
    │
    ├── OpenWorkPanel                      (Server Component — cols 7–12, row 3)
    │   └── PanelShell
    │       ├── PanelHeader                ("Open Work")
    │       ├── [StaleNotice]              (conditional)
    │       ├── [PanelUnavailable]         (conditional)
    │       └── OpenWorkList
    │           ├── [OpenWorkGroup "HALTs"]          (omitted if count == 0)
    │           │   ├── GroupHeader        ("HALTs (N)")
    │           │   └── OpenWorkItem (×n)
    │           │       ├── HaltBadge      (red)
    │           │       ├── RepoLabel
    │           │       ├── ItemTitle      (single line, ellipsis)
    │           │       └── Timestamp      (relative)
    │           ├── [OpenWorkGroup "Open PRs"]       (omitted if count == 0)
    │           │   ├── GroupHeader        ("Open PRs (N)")
    │           │   └── OpenWorkItem (×n)
    │           │       ├── PrNumber
    │           │       ├── RepoLabel
    │           │       └── ItemTitle      (single line, ellipsis)
    │           ├── [OpenWorkGroup "Open Issues"]    (omitted if count == 0)
    │           │   ├── GroupHeader        ("Open Issues (N)")
    │           │   └── OpenWorkItem (×n)
    │           │       ├── IssueNumber
    │           │       ├── RepoLabel
    │           │       └── ItemTitle      (single line, ellipsis)
    │           └── [OpenWorkGroup "Unaccepted DDRs"] (omitted if count == 0)
    │               ├── GroupHeader        ("Unaccepted DDRs (N)")
    │               └── OpenWorkItem (×n)
    │                   ├── DdrNumber
    │                   ├── RepoLabel
    │                   └── ItemTitle      (single line, ellipsis)
    │
    └── ActivityFeedPanel                  (Client Component — cols 1–12, row 4)
        └── PanelShell
            ├── PanelHeader                ("Unified Activity Feed")
            ├── [StaleNotice]              (conditional)
            ├── [PanelUnavailable]         (conditional)
            └── FeedBody
                ├── FeedFilterBar          (always visible)
                │   ├── ProjectFilterSelect  (shadcn Select; "All" default)
                │   ├── TypeFilterSelect     (shadcn Select; "All" default)
                │   └── ClearFiltersButton   (shadcn Button; resets both filters)
                └── FeedTimeline
                    ├── [EmptyState]         (conditional; shown when filtered result is empty)
                    └── FeedEvent (×n)
                        ├── EventTypeIndicator  (colored dot or icon per type)
                        ├── EventTimestamp      (absolute format)
                        ├── EventTypeLabel      ("LORE capture" | "Git commit" | "PR merge")
                        ├── RepoLabel
                        └── EventSummary        (single line; overflow ellipsis)
```

---

## State Visibility

### Server-rendered State

| Data | TypeScript type | Visible in | Source API |
|---|---|---|---|
| All discovered projects | `ProjectCardData[]` | ProjectCardsPanel, ProjectCard (all instances) | `/api/projects` |
| Last commit per project | `GitCommit \| null` on `ProjectCardData` | CommitInfo inside ProjectCard | `/api/projects` |
| Last LORE capture per project | `LoreCaptureSummary \| null` on `ProjectCardData` | LoreSummary inside ProjectCard | `/api/projects` |
| Sprint info per project | `SprintInfo \| null` on `ProjectCardData` | SprintBadge inside ProjectCard | `/api/projects` |
| Open PR count per project | `number` on `ProjectCardData` | PrCountBadge inside ProjectCard | `/api/projects` |
| HALT flag per project | `boolean` on `ProjectCardData` | HaltBadge inside ProjectCard | `/api/projects` |
| All DDR entries | `DdrEntry[]` | DdrPipelinePanel, KanbanColumn, DdrCard | `/api/ddr-pipeline` |
| Session-close captures | `SessionClose[]` | SessionClosePanel, SessionCloseCard | `/api/session-closes` |
| Activity events (14-day default) | `ActivityEvent[]` | ActivityFeedPanel (as initial props) | `/api/activity-feed` |
| Registered agents | `AgentRecord[]` | AgentStatusPanel, AgentRow | `/api/agents` |
| Switchboard status per agent | `SwitchboardStatus` on `AgentRecord` | SwitchboardStatusBadge in AgentRow | `/api/agents` |
| Open work items (all types) | `OpenWorkItem[]` | OpenWorkPanel, OpenWorkGroup, OpenWorkItem | `/api/open-work` |
| API error per panel | `ApiResponse.error: string \| null` | PanelShell → PanelUnavailable or StaleNotice | Any API route |
| Stale cache flag per panel | `ApiResponse.stale: boolean` | PanelShell → StaleNotice | Any API route |

### Client-side State (ActivityFeedPanel only)

| State variable | Type | Default | Visible in | Updated by |
|---|---|---|---|---|
| `filterProject` | `string \| null` | `null` (all projects) | ProjectFilterSelect value; FeedTimeline filter | ProjectFilterSelect onChange |
| `filterType` | `ActivityEventType \| null` | `null` (all types) | TypeFilterSelect value; FeedTimeline filter | TypeFilterSelect onChange |

---

## Empty States

| Panel / Field | Empty condition | Display |
|---|---|---|
| Project Cards panel | Zero projects discovered | "No projects discovered. Check `PROJECTS_ROOT` configuration." |
| ProjectCard — CommitInfo | `lastCommit == null` | "No commits" (muted text) |
| ProjectCard — LoreSummary | `lastLoreCapture == null` | "No captures" (muted text) |
| ProjectCard — SprintBadge | `currentSprint == null` | Entire field omitted |
| ProjectCard — ProjectMeta | `projectId == null` or `agentName == null` | "no agent configured" (muted, italic) |
| DDR Pipeline column | Column has zero DdrEntry items | Column header and label render; no cards; column is not hidden |
| DDR Pipeline panel | Zero DDR entries across all projects | All 4 columns empty; no error |
| Session Close panel | No session-close captures found anywhere | "No session captures found across discovered projects." |
| Session Close — per project | Project has no session-close capture | Project is omitted from the list (not shown as a card) |
| Activity Feed — default | No events in the 14-day window | "No activity in the last 14 days." (not a blank space) |
| Activity Feed — filtered | No events match active filter state | "No events match the current filters." |
| Agent Status panel | No agents in LORE registry | "No agents registered." |
| Open Work — HALT group | No active HALTs | Group is omitted |
| Open Work — PR group | No open PRs | Group is omitted |
| Open Work — Issue group | No open issues | Group is omitted |
| Open Work — DDR group | No PROPOSED DDRs | Group is omitted |
| Open Work panel | All groups empty | "No open work items found." |

---

## Error and Degradation States

| Condition | Affected surface | Display |
|---|---|---|
| `ApiResponse.data == null`, no stale cache | Any panel | PanelUnavailable: "Data unavailable" + error message string |
| `ApiResponse.stale == true`, data available | Any panel | Panel renders data + "Showing cached data — data source currently unreachable." |
| LORE Postgres unreachable | Session Close panel, Agent Status panel, HALT and capture fields in Project Cards | Affected panels show PanelUnavailable; fields on Project Cards show null/empty fallback |
| GitHub API unavailable | Open Work PR group, Open Work Issue group, Project Cards PrCountBadge | Affected groups/fields show "Unavailable"; HALT and DDR groups still render |
| GitHub rate limit (429/403) | Open Work PR/issue groups | Stale cache served if available with stale notice; otherwise "Rate limit reached" notice in group |
| `~/.switchboard/` missing or malformed | Agent Status — SwitchboardStatusBadge only | All agents show `switchboardStatus: 'unknown'`; rest of agent data renders normally |
| `PROJECTS_ROOT` unreadable or missing | Project Cards, and all panels dependent on project discovery | Project Cards shows error empty state; other panels show empty or unavailable as appropriate |
| `GITHUB_TOKEN` env var missing | Open Work PR/issue groups, Project Cards PrCountBadge | Affected areas show "GitHub token not configured" or default to 0/empty |
| PR or issue count exceeds 25 for a project | Open Work PR or Issue group | Items capped at 25; "Showing 25 of N" label appended to the group |
| Session-close `content` exceeds ~300 characters | SessionCloseCard ContentPreview | Hard-truncated at approximately 300 characters; "..." appended |
| DDR entry with unrecognized status | DDR Pipeline | Entry placed in UNKNOWN column; raw status shown in parentheses on its DdrCard |
| Switchboard `sessions.json` is zero bytes | Agent Status — SwitchboardStatusBadge | Treated as empty object; all agents show `'unknown'` |
| `CLAUDE.md` absent or malformed | ProjectCard for that repo | Card renders with "no agent configured" for projectId and agentName fields; card is not hidden |

---

## Visual Design Conventions

These are semantic and layout conventions only. Color values, font choices, and spacing are implementation decisions left to the developer.

### Timestamp Format

| Age of event | Format |
|---|---|
| Less than 60 minutes | "Xm ago" (e.g., "35m ago") |
| Less than 24 hours | "Xh ago" (e.g., "2h ago") |
| Within the current year | Abbreviated date ("Jun 18") |
| Prior year | Full date with year ("Jun 18, 2025") |

Activity Feed timeline uses absolute timestamps (not relative) to give a precise sequence view.

### Text Truncation

| Field | Truncation rule |
|---|---|
| Session-close content | Hard truncate at approximately 300 characters; append "..." |
| All other single-line text fields (DDR titles, PR titles, commit messages, LORE capture titles) | CSS single-line ellipsis (`text-overflow: ellipsis`) |

### Badge Semantics

| Badge | Condition | Severity |
|---|---|---|
| HALT badge (red) on ProjectCard | `hasActiveHalt == true` | Red |
| Switchboard online (filled dot) | `switchboardStatus == 'online'` | Positive indicator |
| Switchboard offline (empty dot) | `switchboardStatus == 'offline'` | Neutral |
| Switchboard unknown ("?") | `switchboardStatus == 'unknown'` | No indicator; muted text |
| Sprint status badge | `SprintStatus` value | Semantic per status (COMPLETE positive, BLOCKED/HALTED warning, IN PROGRESS neutral, TODO muted) |
| PR count badge | `openPrCount` value | Neutral |

### Content Ordering

| Panel | Ordering |
|---|---|
| Project Cards | `lastTouchedAt` descending (most recent first) |
| DDR Kanban columns | Parse order within each column in v1 (no secondary sort) |
| DDR columns (left to right) | PROPOSED → ACCEPTED → IN SPRINT → SHIPPED → [UNKNOWN if any] |
| Session Close cards | `timestamp` descending (most recent capture first) |
| Activity Feed timeline | `timestamp` descending (newest event first) |
| Open Work — HALT items | `timestamp` descending |
| Open Work — PRs and Issues | GitHub API return order (most recently updated first) |
| Agent Status rows | Alphabetical by `name` |

### Open Work Group Visibility

Groups with zero items are omitted from the Open Work panel body entirely. The group order of those that do render is always: HALTs → Open PRs → Open Issues → Unaccepted DDRs.

---

## Requirements Coverage

| User Story | Covered by |
|---|---|
| US-01 Dashboard Orientation | Page layout, Page Load interaction, all 6 panels present in DOM |
| US-02 Project Cards Panel | Panel 1 layout, ProjectCard field spec, ordering, HALT badge, empty states |
| US-03 DDR Pipeline Panel | Panel 2 layout, KanbanBoard, column spec, UNKNOWN column, empty columns |
| US-04 Session Close Panel | Panel 3 layout, SessionCloseCard, truncation, LORE unavailable state |
| US-05 Unified Activity Feed | Panel 4 layout, FeedFilterBar, Interactions 2–4, empty filter state |
| US-06 Agent Status Panel | Panel 5 layout, AgentTable, SwitchboardStatusBadge, Switchboard degradation |
| US-07 Open Work Tracker | Panel 6 layout, OpenWorkGroup spec, red badges, truncation label, grouping |
| US-08 Automatic Project Discovery | "No projects" empty state; "no agent configured" card fallback |
| US-09 Graceful Per-Panel Degradation | Interaction 6 (PanelUnavailable), error/degradation states table, PanelShell behavior |
| US-10 In-Memory Response Caching | Stale notice (Interaction 5); transparent to UI — no visible cache control in v1 |

---

## v2 Deferred Items

The following behaviors are explicitly out of scope for v1 and must not be added during this sprint:

- Click-through to per-project detail views (DDR-002 §3.4 Panel 1)
- Real-time data refresh (WebSocket or polling)
- User-configurable panel layout, ordering, or preferences
- Mobile-optimized or responsive layout
- Activity Feed date range picker (days parameter is fixed at 14 in v1)
- Per-panel refresh controls
