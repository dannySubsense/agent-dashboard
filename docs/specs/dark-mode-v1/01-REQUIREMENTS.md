# Requirements: dark-mode-v1

**Source DDR:** DDR-010  
**Sprint:** dark-mode-v1  
**Date:** 2026-06-21  
**Author:** requirements-analyst

---

## Summary

Enable automatic dark mode on the agent-dashboard by activating the `prefers-color-scheme: dark` media-query path in `globals.css`. The dashboard must re-theme entirely from the OS preference signal — no toggle, no JavaScript, no state. All six panels must render legibly in both modes after a hardcoded-color audit and targeted remediation.

---

## Prerequisite Finding: globals.css Strategy Mismatch

> **This is not a scope decision — it is a factual description of current state that the implementation must address.**

The current `globals.css` (line 3) declares:

```css
@custom-variant dark (&:is(.dark *));
```

and dark token overrides are defined under a `.dark {}` selector (lines 80–112). This is the **class-toggling strategy**, not the media-query strategy called for by DDR-010.

No component in the codebase uses a `dark:` prefixed Tailwind utility. The `@custom-variant` declaration is entirely unused. The implementation must:

1. Remove the `@custom-variant dark` line from `globals.css`.
2. Move the existing dark-mode CSS variable block from `.dark { ... }` to `@media (prefers-color-scheme: dark) { :root { ... } }`.

This is the primary structural change. All 27 dark token values already exist and are correct — only the selector wrapping them changes.

---

## Hardcoded Color Audit (Pre-Implementation)

The following hardcoded Tailwind palette classes were identified across the six panels during requirements analysis. Each bypasses the CSS variable system and must be evaluated for legibility against the dark background (`oklch(0.205 0 0)`) (`--card`):

| File | Class | Context | Action Required |
|------|-------|---------|-----------------|
| `ActivityFeedPanel.tsx` | `bg-violet-500` | Lore-capture event dot | Verify contrast; retain or replace with CSS variable |
| `ActivityFeedPanel.tsx` | `bg-sky-500` | Git-commit event dot | Verify contrast; retain or replace with CSS variable |
| `ActivityFeedPanel.tsx` | `bg-emerald-500` | PR-merge event dot | Verify contrast; retain or replace with CSS variable |
| `AgentStatusPanel.tsx` | `text-green-600` | "online" label text | **Verify WCAG AA contrast** (4.5:1 minimum) against dark background |
| `AgentStatusPanel.tsx` | `bg-green-500` | Online status indicator dot | Verify contrast; retain or replace |
| `OpenWorkPanel.tsx` | `bg-red-500` | HALT severity indicator dot | Verify contrast; retain or replace |

All other components (ProjectCardsPanel, DdrPipelinePanel, SessionClosePanel, PanelShell, PanelUnavailable, ProjectCard, DashboardGrid, layout.tsx) use exclusively CSS variable-based Tailwind tokens and require no color changes.

---

## User Stories

### US-1: OS-Driven Dark Mode Activation
As Danny,  
I want the dashboard to adopt a dark color scheme whenever my OS is set to dark mode,  
so that the UI is comfortable during extended homelab sessions without any manual configuration.

### US-2: All Panels Legible in Dark Mode
As Danny,  
I want all six dashboard panels to render legibly in dark mode,  
so that no panel appears broken, invisible, or unreadable when the OS preference is dark.

### US-3: Semantic Indicators Distinguishable in Dark Mode
As Danny,  
I want color-coded status indicators — event-type dots, online/offline status, and HALT markers — to remain visually distinguishable against the dark background,  
so that I can interpret panel state at a glance in either mode.

### US-4: Zero Interaction Required
As Danny,  
I want dark mode to activate automatically from the OS preference with no UI control, no page action, and no JavaScript involved,  
so that the dashboard behaves like every other tool in my homelab environment.

---

## Acceptance Criteria

### US-1: OS-Driven Dark Mode Activation

- [ ] Given the OS is set to dark mode, when the dashboard loads in any modern browser, then the body background renders using the dark `--background` token value.
- [ ] Given the OS is set to light mode, when the dashboard loads, then the body background renders using the light `--background` token value.
- [ ] Given the OS switches dark/light preference while the dashboard tab is open, then the dashboard re-themes immediately without a page reload.
- [ ] Given `globals.css` is inspected at build time, then the line `@custom-variant dark (&:is(.dark *))` is absent.
- [ ] Given `globals.css` is inspected at build time, then there is no top-level `.dark {}` selector block; dark token overrides appear only inside `@media (prefers-color-scheme: dark) { :root { ... } }`.
- [ ] Given JavaScript is fully disabled in the browser, then dark mode still activates when the OS preference is dark (pure CSS mechanism — no JS dependency).

### US-2: All Panels Legible in Dark Mode

- [ ] Given OS dark preference, when ProjectCardsPanel renders with project data, then card backgrounds, card text, and badge labels are legible (no invisible or zero-contrast elements).
- [ ] Given OS dark preference, when DdrPipelinePanel renders with DDR entries, then kanban column headers, count badges, card borders, and card text are legible.
- [ ] Given OS dark preference, when SessionClosePanel renders with session data, then entry titles, content previews, timestamps, and dividers are legible.
- [ ] Given OS dark preference, when ActivityFeedPanel renders with events, then the filter bar, event list rows, event-type labels, timestamps, and the timeline dividers are legible.
- [ ] Given OS dark preference, when AgentStatusPanel renders with agent records, then the table header, all table rows, hover highlight, and all cell text are legible.
- [ ] Given OS dark preference, when OpenWorkPanel renders with items, then group headers (HALTs, Open PRs, Open Issues, Unaccepted DDRs), list items, and section dividers are legible.
- [ ] Given OS dark preference, when any panel renders in the unavailable state (PanelUnavailable), then "Data unavailable" and the error message are legible.
- [ ] Given OS dark preference, when any panel renders in the stale-data state, then the stale notice banner text is legible against its background.

### US-3: Semantic Indicators Distinguishable in Dark Mode

- [ ] Given OS dark preference, when ActivityFeedPanel renders lore-capture events, then the violet indicator dot is visually distinct from the dark list-row background.
- [ ] Given OS dark preference, when ActivityFeedPanel renders git-commit events, then the sky-blue indicator dot is visually distinct from the dark list-row background.
- [ ] Given OS dark preference, when ActivityFeedPanel renders PR-merge events, then the emerald indicator dot is visually distinct from the dark list-row background.
- [ ] Given OS dark preference, when AgentStatusPanel renders an online agent, then the "online" label text meets WCAG AA contrast ratio (minimum 4.5:1) against the dark table-row background.
- [ ] Given OS dark preference, when AgentStatusPanel renders an online agent, then the green status dot is visually distinct from the dark table-row background.
- [ ] Given OS dark preference, when OpenWorkPanel renders a HALT item, then the red indicator dot is visually distinct from the dark list-item background.

### US-4: Zero Interaction Required

- [ ] Given the dashboard is loaded in either light or dark OS mode, then no toggle button, theme control, or color mode selector is present anywhere in the rendered page.
- [ ] Given a first-time visitor with OS dark preference, when the dashboard loads, then dark mode is active on the first render — no user action required.
- [ ] Given `localStorage` and `sessionStorage` are both cleared, when the dashboard loads with OS dark preference, then dark mode is still active.

---

## Edge Cases

| Case | Expected Behavior |
|------|-------------------|
| Browser does not support `prefers-color-scheme` | Dashboard renders in light mode (`:root` defaults apply); no error |
| OS dark/light preference changes while dashboard tab is active | CSS media query fires; dashboard re-themes instantly without reload or flash |
| ActivityFeedPanel with no events in dark mode | Empty-state message (`text-muted-foreground`) is legible against dark panel background |
| DdrPipelinePanel with empty kanban columns in dark mode | Empty column bodies and count badges (showing 0) are legible |
| OpenWorkPanel with no open items in dark mode | "No open work items found." empty state is legible |
| PanelUnavailable rendered in dark mode | `text-destructive` token resolves to the dark-variant destructive color; legible |
| Stale data banner in dark mode | `bg-muted/50` resolves to dark muted token; text legible |
| Nivo charts (if rendered) in dark mode | Charts retain their internal light-mode colors; this is a known limitation, not a defect in v1 |
| `.dark` CSS class manually applied to any element | Has no theming effect; class-based variant is removed in this sprint |
| `suppressHydrationWarning` absent on `<html>` tag | No hydration mismatch because no server/client theme state divergence exists |

---

## Out of Scope

- NOT: Manual light/dark toggle or theme switcher in the UI — deferred to a future DDR.
- NOT: Per-user theme preference stored in localStorage, cookies, or the LORE database.
- NOT: Nivo chart dark-mode theming (`@nivo/calendar`, `@nivo/funnel`) — these charts apply their own color system independent of CSS variables; flagged as an open question in DDR-010 §6 and pre-wired for a dedicated Nivo DDR.
- NOT: Custom dark color palette — the existing shadcn/ui token set is used as-is.
- NOT: Dark mode for any panels or UI surfaces added after this sprint (they automatically inherit CSS variable theming if they use standard tokens; no per-panel work needed beyond the audit scope of this sprint).
- NOT: Mobile dark mode testing — this dashboard is desktop-only (homelab, single user, no mobile requirement).
- NOT: Animated or cross-faded theme transition on OS preference change.
- Deferred: Any panel-level `dark:` utility overrides — not needed and not used in the current codebase.

---

## Constraints

- Must: Implement dark mode exclusively via `@media (prefers-color-scheme: dark) { :root { ... } }` in `globals.css`.
- Must not: Use `darkMode: 'class'` strategy, `@custom-variant dark`, or any class-toggling mechanism.
- Must not: Introduce any JavaScript, React state, context, or `localStorage` reads/writes for theme management.
- Must not: Add a `<html className="...">` manipulation in `layout.tsx` or any server/client component for theme switching.
- Must: Verify WCAG AA contrast (4.5:1 minimum for text, 3:1 minimum for UI components) for all identified hardcoded colors against the dark card surface (`oklch(0.205 0 0)`) (`--card`), replacing any that fail.
- Must: All six panels pass the legibility acceptance criteria above before this sprint closes.
- Assumes: The 27 dark-mode CSS variable values in the existing `.dark {}` block in `globals.css` are correct and only need to be moved to the `@media (prefers-color-scheme: dark) { :root {} }` block — no token value changes.
- Assumes: Danny's browser supports `prefers-color-scheme` (all browsers in production use since 2019).
- Assumes: Semantic dot indicators (`bg-violet-500`, `bg-sky-500`, `bg-emerald-500`, `bg-green-500`, `bg-red-500`) are likely legible against the dark background but must be confirmed during implementation; replacement with CSS variable tokens is acceptable if contrast fails.
