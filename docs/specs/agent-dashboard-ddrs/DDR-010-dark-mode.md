# DDR-010 — Dark Mode

- **Status:** PROPOSED
- **Author:** lumen
- **Date:** 2026-06-21
- **Sprint (on approval):** tbd
- **Supersedes:** —

---

## §1 Context

The agent-dashboard UI has no dark mode. All shadcn/ui components and Tailwind utility classes currently use light-only defaults. Danny operates the dashboard in a homelab environment where ambient lighting varies and extended sessions are common — a light-only UI is fatiguing and inconsistent with the rest of the homelab tooling.

shadcn/ui is built on CSS custom properties (`--background`, `--foreground`, `--muted`, `--card`, `--border`, `--ring`, etc.). The shadcn/ui init output already defines dark-mode variants for all of these tokens — they are dormant in the current setup, not absent. Activating dark mode is a surfacing problem, not a build problem.

Tailwind CSS v4 (the stack's styling layer per DDR-002) supports two dark mode strategies: `@media (prefers-color-scheme: dark)` (media-query-based, default) and `darkMode: 'class'` (explicit class toggling). The choice between them determines whether JavaScript and user-controlled state are required.

All six panels from DDR-002 (Project Cards, DDR Pipeline, Leave Off Panel, Activity Feed, Agent Status, Open Work Tracker) must render correctly in both light and dark modes. Five of the six panels are Server Components; ActivityFeedPanel is the single `'use client'` component.

---

## §2 Principle

Dark mode is a first-class experience, not an afterthought. It must be enabled at the CSS layer so all current and future panels inherit it without per-panel work.

System preference is the correct control surface for a single-user homelab dashboard. Danny's OS dark mode setting is already the authoritative signal for every other tool in the environment. The dashboard should respect it automatically. A manual toggle introduces state management (localStorage persistence, hydration handling, a UI control element) for zero gain in a single-user context.

All six panels must render correctly in both modes. A panel that looks broken in dark mode is a defect, not a known limitation.

---

## §3 Decision

### 3.1 Dark Mode Strategy

Use `prefers-color-scheme: dark` media-query dark mode — Tailwind CSS v4's default behavior. No class toggling, no localStorage, no JavaScript involved in mode switching.

This surfaces shadcn/ui's dormant dark-mode CSS variable definitions automatically. When the OS reports a dark preference, the browser applies the `@media (prefers-color-scheme: dark)` block; shadcn/ui's token overrides take effect; all components re-theme without any component-level changes.

### 3.2 CSS Variables Setup

In `globals.css` (the Tailwind CSS v4 entry point), dark-mode CSS variable overrides are declared under `@media (prefers-color-scheme: dark)` on the `:root` selector, following the shadcn/ui setup documentation. This block is added once; it covers the entire application.

No per-component or per-panel dark-mode classes are required unless a component uses hardcoded color values outside the CSS variable system.

### 3.3 Scope

All six panels must be verified in dark mode during the spec phase. Any component using a hardcoded color value (hex, RGB, or non-shadcn Tailwind color class such as `bg-gray-100`) that does not map to a CSS variable must be identified and updated to use the appropriate token. This is the primary implementation risk (see §5).

### 3.4 No Manual Toggle in v1

There is no light/dark toggle control in the UI for v1. OS preference is the sole control. A user-facing toggle — if needed in a future session — is a separate DDR.

---

## §4 Trade-offs Rejected

| Option | Why Rejected |
|---|---|
| `darkMode: 'class'` (class toggling) | Requires a toggle UI element, localStorage persistence, and hydration-safe state management. Unnecessary complexity for a single-user homelab dashboard with a clear OS preference signal. |
| Custom dark color palette | shadcn/ui's CSS variable system already provides a complete, well-tested dark palette. A bespoke palette duplicates work and risks visual inconsistency with shadcn/ui component internals. |
| No dark mode | Not acceptable. Extended homelab sessions in a light-only UI is a known ergonomic issue. |

---

## §5 Risks

| Risk | Mitigation |
|---|---|
| Custom colors in panels bypass CSS variable system | Spec phase includes an audit of all non-shadcn color usages across the six panels; any hardcoded values are replaced with CSS variable tokens before merge |
| Nivo charts do not inherit CSS variable theming | Nivo applies its own internal color system; charts may render with light-mode colors regardless of OS preference — flagged as an open question; pre-wired for a Nivo dark-mode DDR |
| shadcn/ui CSS variable block missing from `globals.css` | Setup doc checklist item; verified during spec review |
| ActivityFeedPanel (`'use client'`) behaves differently | Media-query dark mode is CSS-native; client vs. server component boundary is irrelevant to CSS variable resolution — no special handling needed |

---

## §6 Open Questions

1. **Custom colors audit** — Are any non-shadcn colors (hardcoded hex, RGB, or raw Tailwind palette classes) used in the current six panels? Answer expected during spec phase.
2. **Nivo dark mode** — Do `@nivo/calendar` and `@nivo/funnel` support `prefers-color-scheme`-aware theming, or do they require an explicit theme prop? This is pre-wired for a future Nivo charts DDR; it does not block DDR-010.
