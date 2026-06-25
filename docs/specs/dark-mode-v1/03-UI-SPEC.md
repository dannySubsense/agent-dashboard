# UI Spec: dark-mode-v1

**Source DDR:** DDR-010
**Sprint:** dark-mode-v1
**Date:** 2026-06-21
**Author:** ui-spec-writer

---

## 1. Scope

This is a CSS-layer change. No new screens, no new user flows, no structural layout changes. The dashboard layout, panel grid, and all component hierarchies remain identical in both modes.

This spec defines:
- The visual state of every panel element in dark mode
- Which CSS tokens or Tailwind palette classes each element depends on
- Which hardcoded classes require contrast verification before acceptance
- Per-panel visual acceptance criteria the implementation must satisfy

What this spec does NOT define: layout, flows, interaction patterns, component hierarchy. Those are unchanged from the existing dashboard-framework-v1 implementation.

---

## 2. Mode Activation Mechanism

Dark mode activates via `@media (prefers-color-scheme: dark)` in `globals.css`. No JavaScript, no toggle, no class manipulation. The browser fires the media query; CSS cascades automatically; all elements re-theme via CSS custom property resolution.

There is no visual state for "toggle" or "transition" — mode switches are instantaneous at the CSS layer.

---

## 3. Token Reference

The following CSS custom properties govern panel appearance. Values shown are from the dark mode `@media` block (moved from `.dark {}`). Implementation copies these values verbatim — no value changes.

| Token | Dark Value (oklch) | Usage in panels |
|---|---|---|
| `--background` | `oklch(0.145 0 0)` | Page background |
| `--foreground` | `oklch(0.985 0 0)` | Primary text (`text-foreground`) |
| `--card` | `oklch(0.205 0 0)` | Panel card background (`bg-card`) |
| `--card-foreground` | `oklch(0.985 0 0)` | Panel card text (`text-card-foreground`) |
| `--muted` | `oklch(0.269 0 0)` | Muted backgrounds (`bg-muted`, `bg-muted/30`, `bg-muted/50`) |
| `--muted-foreground` | `oklch(0.708 0 0)` | Secondary text (`text-muted-foreground`) |
| `--border` | `oklch(1 0 0 / 10%)` | Dividers, panel borders (`border-border`) |
| `--destructive` | `oklch(0.704 0.191 22.216)` | Error/HALT text (`text-destructive`) |
| `--secondary` | `oklch(0.269 0 0)` | Badge secondary bg (`bg-secondary`) |
| `--secondary-foreground` | `oklch(0.985 0 0)` | Badge secondary text |
| `--accent` | `oklch(0.269 0 0)` | Hover/accent backgrounds |
| `--accent-foreground` | `oklch(0.985 0 0)` | Hover/accent text |

**New token added in this sprint:**

| Token | Light Value | Dark Value | Tailwind alias |
|---|---|---|---|
| `--status-online` | `oklch(0.627 0.194 149.214)` (green-600) | `oklch(0.723 0.193 148.347)` (green-500) | `text-status-online`, `bg-status-online` |

---

## 4. Hardcoded Color Inventory

These six classes bypass the CSS variable system. Each must be verified for contrast against the dark panel background (`--card`: `oklch(0.205 0 0)`) before the sprint closes.

| Panel | Element | Class | Contrast check | Threshold | Action if fail |
|---|---|---|---|---|---|
| ActivityFeedPanel | LORE capture event dot | `bg-violet-500` | Visual distinction dot vs. dark bg | 3:1 UI component | Replace with `bg-status-lore-capture` token |
| ActivityFeedPanel | Git commit event dot | `bg-sky-500` | Visual distinction dot vs. dark bg | 3:1 UI component | Replace with `bg-status-git-commit` token |
| ActivityFeedPanel | PR merge event dot | `bg-emerald-500` | Visual distinction dot vs. dark bg | 3:1 UI component | Replace with `bg-status-pr-merge` token |
| AgentStatusPanel | Online label text | `text-green-600` | WCAG AA text | 4.5:1 | **Pre-resolved: replace with `text-status-online`** |
| AgentStatusPanel | Online status dot | `bg-green-500` | Visual distinction dot vs. dark bg | 3:1 UI component | Replace with `bg-status-online` token |
| OpenWorkPanel | HALT severity dot | `bg-red-500` | Visual distinction dot vs. dark bg | 3:1 UI component | Replace with `bg-status-halt` token |

Architecture decision (02-ARCHITECTURE.md §Primary Architecture Decision): mid-to-high lightness, high-chroma Tailwind palette classes are expected to pass the 3:1 threshold against `oklch(0.205 0 0)` (`--card`) without mode variants. The `text-green-600` case is the only pre-confirmed failure — that replacement is already specified and is not conditional on verification.

Verification method: Load the dashboard with OS dark preference in a Chromium-based browser. Use DevTools accessibility panel or a contrast checker on the rendered element colors to confirm ratios numerically.

---

## 5. Shared Component Visual States

### 5.1 PanelShell

PanelShell wraps all six panels. Its dark mode appearance is fully token-driven.

**Structure and token mapping:**

```
PanelShell container
  └── rounded-lg border border-border bg-card text-card-foreground

  PanelShell title bar
    └── px-4 py-3 border-b border-border
        h2: text-sm font-semibold tracking-tight
        → inherits text-card-foreground (--card-foreground)

  PanelShell stale notice [conditional: response.stale === true && data !== null]
    └── px-4 py-2 text-xs text-muted-foreground bg-muted/50 border-b border-border
        → bg: --muted at 50% opacity
        → text: --muted-foreground
        → error substring: font-mono (same color)

  PanelShell body
    └── flex-1 overflow-auto
        → when data === null: renders PanelUnavailable
        → when data !== null: renders panel content
```

**Dark mode states to verify:**

| State | Elements visible | Verification check |
|---|---|---|
| Normal (data loaded) | Title bar, panel body content | Title bar text legible; panel border visible against page background |
| Stale (data present, source unreachable) | Title bar, stale notice banner, panel body | Stale notice banner: `bg-muted/50` resolves to dark muted value; text legible |
| Unavailable (data null) | Title bar, PanelUnavailable | See 5.2 |

### 5.2 PanelUnavailable

Used when any panel's data source fails. Appears inside PanelShell body.

**Token mapping:**

```
div.p-4.text-sm
  p.font-semibold.text-destructive  → "Data unavailable"
    → --destructive dark: oklch(0.704 0.191 22.216) — warm red, high lightness
  p.text-muted-foreground.font-mono.text-xs  → error message [conditional]
    → --muted-foreground dark: oklch(0.708 0 0)
```

**Dark mode states to verify:**

| State | Verification check |
|---|---|
| Error message present | `text-destructive` reads as visible red against `bg-card`; error message mono text legible |
| No error message | "Data unavailable" text only; legible |

---

## 6. Panel Visual State Inventory

### 6.1 ProjectCardsPanel

**Component hierarchy relevant to dark mode:**

```
ProjectCardsPanel
  └── PanelShell [title="Project Cards"]
        └── ProjectCard (×n)  [shadcn Card]
              ├── CardHeader
              │     ├── repoName span (font-bold text-sm) → text-card-foreground
              │     └── HALT Badge [conditional] (variant="destructive")
              │           → bg-destructive text-destructive-foreground
              ├── CardContent
              │     ├── ProjectMeta
              │     │     ├── projectId (text-muted-foreground)
              │     │     └── agentName (text-muted-foreground)
              │     ├── CommitInfo
              │     │     ├── message (text-card-foreground)
              │     │     └── relative date (text-muted-foreground)
              │     ├── LoreSummary
              │     │     ├── title (text-card-foreground)
              │     │     └── relative date (text-muted-foreground)
              │     ├── SprintBadge [conditional]
              │     │     ├── sprint slug (text-muted-foreground)
              │     │     └── status Badge (variant: default|secondary|destructive|outline)
              │     └── PrCountBadge
              │           ├── "PRs:" label (text-muted-foreground)
              │           └── count Badge (variant="secondary")
```

All classes are shadcn/ui token-based. No hardcoded palette colors.

**Dark mode states to verify:**

| State | Elements | Verification check |
|---|---|---|
| Normal (projects loaded) | Card grid, all card sections | Card background (`bg-card`) distinct from page background; card border (`border-border`) visible; repo name, commit message, capture title legible (`text-card-foreground`) |
| HALT badge visible | Destructive badge in CardHeader | `variant="destructive"` badge renders with dark `--destructive` token; legible |
| Sprint badge: IN PROGRESS | `variant="default"` badge | Legible against card content area |
| Sprint badge: COMPLETE | `variant="secondary"` badge | Legible |
| Sprint badge: BLOCKED/HALTED | `variant="destructive"` badge | Legible |
| Sprint badge: TODO | `variant="outline"` badge | Border visible; text legible |
| Empty state (no projects) | `text-muted-foreground` message | Legible against `bg-card` |
| Unavailable | PanelUnavailable | See 5.2 |
| Stale | Stale notice banner + card grid | See 5.1 |

### 6.2 DdrPipelinePanel

**Component hierarchy relevant to dark mode:**

```
DdrPipelinePanel
  └── PanelShell [title="DDR Pipeline"]
        └── KanbanBoard
              └── KanbanColumnView (×4 or ×5)
                    ├── Column header
                    │     ├── column label span
                    │     │     → text-xs font-semibold uppercase text-foreground
                    │     └── count badge span
                    │           → bg-muted text-muted-foreground rounded-full font-mono
                    └── DdrCard (×n) [zero-n per column]
                          ├── DDR number: text-xs font-mono text-muted-foreground
                          ├── Title: text-sm font-medium (inherits text-card-foreground)
                          ├── Repo name: text-sm text-muted-foreground
                          ├── Sprint slug: text-xs text-muted-foreground
                          └── Raw status [UNKNOWN column only]: text-xs text-muted-foreground
                          Container: rounded border border-border bg-background p-2
```

Note: DdrCard uses `bg-background` (not `bg-card`). In dark mode, `--background` is `oklch(0.145 0 0)` — slightly darker than `--card` (`oklch(0.205 0 0)`). This produces a subtle visual contrast between the kanban column area and the individual cards.

**Dark mode states to verify:**

| State | Elements | Verification check |
|---|---|---|
| Normal (DDRs loaded) | Kanban board with cards in columns | Column label (`text-foreground`) legible; count badge (`bg-muted` / `text-muted-foreground`) legible; DdrCard border visible; DDR number, title, repo name, sprint slug all legible |
| Empty column (0 items) | Column header only, no DdrCards | Count badge showing "0" legible; empty column body area presents no broken state |
| UNKNOWN column visible | All standard columns + UNKNOWN; raw status line | Raw status text (`text-muted-foreground`) legible |
| DdrCard `bg-background` in dark | Card surface darker than column bg | Card is distinguishable from surrounding kanban column background |
| Unavailable | PanelUnavailable | See 5.2 |
| Stale | Stale notice banner + kanban board | See 5.1 |

### 6.3 SessionClosePanel

**Component hierarchy relevant to dark mode:**

```
SessionClosePanel
  └── PanelShell [title="Where Did I Leave Off?"]
        └── SessionCloseList
              └── div.divide-y.divide-border
                    └── SessionCloseCard (×n)
                          ├── Header row
                          │     ├── repoName: font-semibold text-sm → text-card-foreground
                          │     └── timestamp: text-xs text-muted-foreground
                          ├── Capture title: text-sm → text-card-foreground
                          └── Content preview: text-xs text-muted-foreground
```

All tokens. No hardcoded palette colors.

**Dark mode states to verify:**

| State | Elements | Verification check |
|---|---|---|
| Normal (sessions loaded) | Scrollable list of SessionCloseCards | Repo name (primary text) legible; capture title legible; content preview (`text-muted-foreground`) legible; `divide-border` row dividers visible between cards |
| Empty state (no captures) | `text-muted-foreground` message | Legible against `bg-card` |
| Unavailable | PanelUnavailable | See 5.2 |
| Stale | Stale notice banner + session list | See 5.1 |

### 6.4 ActivityFeedPanel (+ ActivityFeedLoader)

ActivityFeedPanel is the sole `'use client'` component. Dark mode is CSS-native — the client component boundary has no effect on CSS variable resolution.

**Component hierarchy relevant to dark mode:**

```
ActivityFeedLoader [Server Component]
  └── ActivityFeedPanel [Client Component]
        └── PanelShell [title="Unified Activity Feed"]
              ├── Filter bar
              │     └── div.border-b.border-border
              │           ├── "Project:" label: text-xs text-muted-foreground
              │           ├── Project Select (shadcn/ui) → token-driven
              │           ├── "Type:" label: text-xs text-muted-foreground
              │           ├── Type Select (shadcn/ui) → token-driven
              │           └── "Clear filters" Button [conditional] → token-driven ghost variant
              └── Timeline body [one of three states]
                    ├── PanelUnavailable [when data === null]
                    ├── Empty message: text-sm text-muted-foreground [when filteredEvents.length === 0]
                    └── ul.divide-y.divide-border [event list]
                          └── li.flex.items-start (×n)
                                ├── Type dot: h-2 w-2 rounded-full [HARDCODED CLASS]
                                │     'lore-capture': bg-violet-500
                                │     'git-commit':   bg-sky-500
                                │     'pr-merge':     bg-emerald-500
                                └── Event content
                                      ├── Timestamp: text-xs text-muted-foreground font-mono
                                      ├── Type label: text-xs font-medium text-foreground
                                      ├── Repo name: text-sm text-muted-foreground
                                      └── Summary: text-sm → text-card-foreground
```

**Hardcoded dot classes — dark mode requirement:**

| Dot | Class | Required visual state |
|---|---|---|
| LORE capture | `bg-violet-500` | Violet dot distinctly visible against dark list-row background; must not blend into `bg-card` (`oklch(0.205 0 0)`) |
| Git commit | `bg-sky-500` | Sky-blue dot distinctly visible against dark list-row background |
| PR merge | `bg-emerald-500` | Emerald dot distinctly visible against dark list-row background |

The list rows have no explicit background class — they inherit `bg-card` from PanelShell. The dots sit against `oklch(0.205 0 0)`.

**Dark mode states to verify:**

| State | Elements | Verification check |
|---|---|---|
| Normal (events loaded, no filter) | Filter bar + event list | Filter bar border visible; select trigger legible; all event rows: timestamp, type label, repo name, summary legible; each dot type distinguishable |
| Filter active | Filter bar with active selections + "Clear filters" button | Select values visible in dark; Clear filters button (ghost) legible |
| Filtered empty | Empty message | `text-muted-foreground` message legible |
| No events in 14-day window | Empty message (no filter) | Legible |
| Unavailable (data === null) | Filter bar + PanelUnavailable | Filter bar renders above unavailable state; see 5.2 |
| Stale | Stale notice banner (PanelShell) + feed | See 5.1 |

**Select dropdown (shadcn/ui):**

The SelectContent popover renders in a portal. Its background uses `--popover` / `--popover-foreground` tokens. Verify: dropdown options legible in dark mode; hover state (uses `--accent`) visible.

### 6.5 AgentStatusPanel

AgentStatusPanel contains the only confirmed WCAG AA failure: `text-green-600` on the online status label. This is replaced with `text-status-online` per 02-ARCHITECTURE.md.

**Component hierarchy relevant to dark mode:**

```
AgentStatusPanel
  └── PanelShell [title="Agent Status"]
        └── AgentTable
              └── div.overflow-x-auto
                    └── table.w-full.text-sm
                          ├── thead
                          │     └── tr.border-b.border-border
                          │           └── th (×5): text-xs text-muted-foreground font-medium
                          │                 "Agent" | "Project" | "Handle" | "Registry" | "Status"
                          └── tbody
                                └── tr (×n) [per agent]
                                      ├── hover: hover:bg-muted/30 transition-colors
                                      ├── td: Agent name — font-mono text-sm → text-card-foreground
                                      ├── td: Project — text-xs text-muted-foreground max-w truncate
                                      ├── td: Handle — font-mono text-xs text-muted-foreground
                                      ├── td: Registry status — text-xs text-muted-foreground
                                      └── td: SwitchboardStatusBadge
                                            ├── online state [HARDCODED — REPLACED THIS SPRINT]
                                            │     span: text-xs text-status-online (was text-green-600)
                                            │     dot:  bg-green-500 [HARDCODED — VERIFY]
                                            ├── offline state
                                            │     span: text-xs text-muted-foreground
                                            │     dot:  bg-muted-foreground/40
                                            └── unknown state
                                                  span: text-xs text-muted-foreground
                                                  "?" character: font-mono
```

**SwitchboardStatusBadge in dark mode:**

| Status | Text element | Dot element | Dark mode requirement |
|---|---|---|---|
| online | `text-status-online` | `bg-green-500` | Text meets WCAG AA 4.5:1 against `bg-card`; dot visually distinct |
| offline | `text-muted-foreground` | `bg-muted-foreground/40` | Both legible; subdued vs online is intentional |
| unknown | `text-muted-foreground` | "?" character | Legible; parity with offline visual weight |

**Dark mode states to verify:**

| State | Elements | Verification check |
|---|---|---|
| Normal (agents loaded) | Table with rows | Table header text legible; all cell text legible; row border (`border-border/50`) visible as subtle separator |
| Row hover | Hover state on any row | `hover:bg-muted/30` produces visible highlight without obscuring cell text |
| Online agent | SwitchboardStatusBadge online | `text-status-online` meets 4.5:1 against `bg-card` dark background; `bg-green-500` dot distinct (3:1 UI threshold) |
| Offline agent | SwitchboardStatusBadge offline | `text-muted-foreground` legible; muted dot (`bg-muted-foreground/40`) present but visually subordinate to online dot |
| Unknown agent | SwitchboardStatusBadge unknown | "?" and label text legible |
| Empty state (no agents) | `text-muted-foreground` message | Legible |
| Unavailable | PanelUnavailable | See 5.2 |
| Stale | Stale notice banner + table | See 5.1 |

### 6.6 OpenWorkPanel

**Component hierarchy relevant to dark mode:**

```
OpenWorkPanel
  └── PanelShell [title="Open Work"]
        └── OpenWorkList
              ├── Empty state: text-sm text-muted-foreground [when all groups empty]
              └── div.divide-y.divide-border/50 [groups]
                    ├── HaltGroup [conditional: halts.length > 0]
                    │     ├── Group header: text-xs font-semibold text-muted-foreground
                    │     │                 bg-muted/30 border-b border-border/50
                    │     └── HaltItem (×n)
                    │           ├── HALT dot: w-2 h-2 rounded-sm bg-red-500 [HARDCODED]
                    │           ├── repoName: text-xs font-medium text-muted-foreground
                    │           ├── timestamp: text-xs text-muted-foreground
                    │           └── title: text-sm → text-card-foreground
                    ├── PrGroup [conditional: prs.length > 0]
                    │     ├── Group header: same token pattern as HaltGroup header
                    │     ├── PrItem (×n)
                    │     │     ├── repoName: text-xs font-medium text-muted-foreground
                    │     │     └── title (with PR #): text-sm → text-card-foreground
                    │     └── Truncation notice [conditional]: text-xs text-muted-foreground italic
                    ├── IssueGroup [conditional: issues.length > 0]
                    │     ├── Group header: same token pattern
                    │     ├── IssueItem (×n): same token pattern as PrItem
                    │     └── Truncation notice [conditional]: text-xs text-muted-foreground italic
                    └── DdrGroup [conditional: ddrs.length > 0]
                          ├── Group header: same token pattern
                          └── DdrItem (×n)
                                ├── repoName: text-xs font-medium text-muted-foreground
                                └── title: text-sm → text-card-foreground
```

**HALT dot in dark mode:**

| Dot | Class | Required visual state |
|---|---|---|
| HALT severity | `bg-red-500` | Red dot distinctly visible against dark list-item background (inherits `bg-card`); must not blend into panel background |

**Group header dark mode appearance:**

Group headers use `bg-muted/30`. In dark mode: `--muted` is `oklch(0.269 0 0)` at 30% opacity — a subtle dark band distinguishing group headers from list item rows. Text is `text-muted-foreground`.

**Dark mode states to verify:**

| State | Elements | Verification check |
|---|---|---|
| HALTs present | HaltGroup header + items | Group header band (`bg-muted/30`) visible as distinct from list rows; "HALTs (N)" label legible; HALT dot (`bg-red-500`) distinctly visible; repo name, timestamp, title all legible |
| Open PRs present | PrGroup header + items | Group header legible; PR title and repo label legible; truncation notice (if shown) legible |
| Open Issues present | IssueGroup header + items | Same as PrGroup |
| Unaccepted DDRs present | DdrGroup header + items | Same pattern |
| Multiple groups | All four groups stacked | Group dividers (`divide-border/50`) visible; section-to-section separation clear |
| Empty state (all groups empty) | `text-muted-foreground` message | Legible |
| Unavailable | PanelUnavailable | See 5.2 |
| Stale | Stale notice banner + work list | See 5.1 |

---

## 7. Visual Acceptance Criteria Summary

The following table consolidates all acceptance criteria from 01-REQUIREMENTS.md into per-panel, per-state verification items. Implementation must confirm each before closing the sprint.

### 7.1 CSS Mechanism

| Criterion | How to verify |
|---|---|
| `@custom-variant dark` line absent from `globals.css` | Inspect `src/app/globals.css`; line must not exist |
| No top-level `.dark {}` selector block in `globals.css` | Inspect `src/app/globals.css`; dark overrides appear only inside `@media (prefers-color-scheme: dark) { :root { ... } }` |
| Dark mode activates from OS preference with JS disabled | Disable JS in browser; set OS to dark; load dashboard; confirm dark background renders |
| Dashboard re-themes on live OS preference change | Switch OS preference while tab is open; confirm instant re-theme without reload |
| No toggle button or theme control anywhere in the rendered page | Inspect all six panels and layout; no toggle element exists |

### 7.2 ProjectCardsPanel

| Criterion | Pass condition |
|---|---|
| Card surface legible | `bg-card` (`oklch(0.205 0 0)`) is visually distinct from `bg-background` (`oklch(0.145 0 0)`) |
| Card border visible | `border-border` at `oklch(1 0 0 / 10%)` is perceptible against card background |
| Repo name legible | `text-card-foreground` has sufficient contrast against `bg-card` |
| Muted metadata legible | `text-muted-foreground` (`oklch(0.708 0 0)`) legible; lower contrast than primary text is intentional |
| Destructive HALT badge legible | `--destructive` dark value reads as visible red |
| All badge variants legible | default, secondary, destructive, outline Badge variants all legible |
| Empty state legible | "No projects discovered" message legible |

### 7.3 DdrPipelinePanel

| Criterion | Pass condition |
|---|---|
| Kanban column headers legible | Column label (`text-foreground`) and count badge (`bg-muted` + `text-muted-foreground`) legible |
| DdrCard surface distinct | `bg-background` cards visually separate from kanban column background |
| DdrCard content legible | DDR number, title, repo, sprint slug all legible |
| Empty columns render cleanly | No broken visual state in zero-item columns |

### 7.4 SessionClosePanel

| Criterion | Pass condition |
|---|---|
| Repo name legible | Primary text (`text-card-foreground`) legible |
| Capture title legible | Primary text legible |
| Content preview legible | `text-muted-foreground` legible (intentionally lower contrast) |
| Row dividers visible | `divide-border` lines perceptible between cards |

### 7.5 ActivityFeedPanel

| Criterion | Pass condition |
|---|---|
| Filter bar border visible | `border-b border-border` separates filter bar from timeline |
| Select triggers legible | shadcn Select components render with token-based dark styles |
| Select dropdown legible | SelectContent popover: option text and hover state legible in dark |
| "Clear filters" button legible | Ghost button text visible |
| Violet dot distinct (`bg-violet-500`) | Contrast ratio >= 3:1 against `oklch(0.205 0 0)` |
| Sky dot distinct (`bg-sky-500`) | Contrast ratio >= 3:1 against `oklch(0.205 0 0)` |
| Emerald dot distinct (`bg-emerald-500`) | Contrast ratio >= 3:1 against `oklch(0.205 0 0)` |
| Event row content legible | Timestamp, type label, repo name, summary all legible |
| Row dividers visible | `divide-border` between event rows perceptible |
| Empty state messages legible | Both filter-empty and no-activity messages legible |

### 7.6 AgentStatusPanel

| Criterion | Pass condition |
|---|---|
| Table header legible | Column labels (`text-muted-foreground`) legible |
| Row separator visible | `border-border/50` between rows perceptible |
| Row hover visible | `hover:bg-muted/30` produces a visible highlight |
| Agent name (mono) legible | `font-mono` cell text legible |
| Muted cell text legible | Project, handle, registry cells (`text-muted-foreground`) legible |
| Online label meets WCAG AA | `text-status-online` contrast ratio >= 4.5:1 against `bg-card` dark background (green-500 hue: `oklch(0.723 0.193 148.347)`) |
| Online dot distinct (`bg-green-500`) | Contrast ratio >= 3:1 against `oklch(0.205 0 0)` |
| Offline state legible | Muted text and dot present; visually subordinate to online state |
| Unknown state legible | "?" and label text legible |
| Empty state legible | "No agents registered." message legible |

### 7.7 OpenWorkPanel

| Criterion | Pass condition |
|---|---|
| Group header band visible | `bg-muted/30` produces a distinguishable header row against list item background |
| Group header label legible | `text-muted-foreground` group label legible |
| HALT dot distinct (`bg-red-500`) | Contrast ratio >= 3:1 against `oklch(0.205 0 0)` |
| HALT item content legible | Repo name, timestamp, title all legible |
| PR/Issue/DDR item content legible | Repo name and title legible in each group |
| Group dividers visible | `divide-border/50` between group sections perceptible |
| Truncation notice legible | Italic `text-muted-foreground` notice legible |
| Empty state legible | "No open work items found." legible |

### 7.8 Shared States (all panels)

| Criterion | Pass condition |
|---|---|
| PanelUnavailable "Data unavailable" legible | `text-destructive` dark value reads as visible red against `bg-card` |
| PanelUnavailable error message legible | `text-muted-foreground` mono text legible |
| Stale notice banner legible | `bg-muted/50` banner text legible; distinguishable from panel body |
| Light mode unaffected | All panels render correctly in light mode after the migration (regression check) |

---

## 8. Out of Scope

Per 01-REQUIREMENTS.md:

- Nivo chart dark theming (`@nivo/calendar`, `@nivo/funnel`) — charts retain light-mode colors in v1; not a defect
- Manual toggle or theme switcher — no toggle element is added or removed
- Mobile dark mode verification — desktop only
- `dark:` Tailwind utility prefix usage anywhere in the codebase
- Animated/cross-faded theme transitions
