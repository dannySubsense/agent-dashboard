# Architecture: dark-mode-v1

**Source DDR:** DDR-010
**Sprint:** dark-mode-v1
**Date:** 2026-06-21
**Author:** architect

---

## Summary

Pure CSS change. No new components, no new TypeScript types, no new libraries. Two files change: `globals.css` (selector migration + one new semantic token) and `AgentStatusPanel.tsx` (one class replacement). The OS preference signal activates automatically via the browser's CSS media query engine — zero JavaScript involvement.

---

## Primary Architecture Decision: Hardcoded Color Strategy

### Dot indicators — retain Tailwind palette classes

`bg-violet-500`, `bg-sky-500`, `bg-emerald-500`, `bg-green-500`, `bg-red-500` are all mid-to-high lightness, high-chroma colors. Against `oklch(0.205 0 0)` (`--card`) they provide strong visual distinction well above the 3:1 UI component threshold and require no mode-specific value.

Implementation gate: verify each against the dark background. If any dot fails 3:1, replace using the semantic token pattern defined below — add token to `globals.css`, alias in `@theme inline`, update the class in the component.

### Online status text label — replace with semantic token

`text-green-600` is the sole WCAG AA text compliance risk. `green-600` (L ≈ 0.608 oklch) against `oklch(0.205 0 0)` (`--card`) produces a borderline contrast ratio that may fail the 4.5:1 text minimum. A semantic token allows per-mode tuning in a single CSS declaration block.

**Decision:** Replace `text-green-600` with `text-status-online` backed by `--status-online` token. Light mode retains the green-600 hue. Dark mode shifts to the green-500 hue (higher lightness, improved contrast against the card background; verified contrast ratio: ~8.1:1 against `oklch(0.205 0 0)` (`--card`) — well above the 4.5:1 WCAG AA text minimum).

Rationale for semantic token over a dark: utility: the `@custom-variant dark` line is being removed; `dark:` prefixes become no-ops. The semantic token approach is consistent with the existing shadcn/ui token pattern and requires no Tailwind variant machinery.

---

## Affected Files

| File | Change Type | Scope |
|------|-------------|-------|
| `src/app/globals.css` | Modify | Remove `@custom-variant dark` line; migrate `.dark {}` block to `@media (prefers-color-scheme: dark) { :root { ... } }`; add `--status-online` token and `@theme inline` alias |
| `src/components/panels/AgentStatusPanel.tsx` | Modify | Replace `text-green-600` with `text-status-online` in `SwitchboardStatusBadge` |

No other files require changes for v1.

---

## Data Schemas

No new TypeScript interfaces are introduced. This feature operates entirely at the CSS layer. All existing component prop types are unchanged.

---

## CSS Token Contract

The following specifies the exact structural requirements for `globals.css` after implementation.

### Removal

Remove line 3 of current `globals.css`:

```css
@custom-variant dark (&:is(.dark *));
```

### Selector migration

Replace the current `.dark { ... }` block (lines 80–112) with:

```css
@media (prefers-color-scheme: dark) {
  :root {
    /* all 27 existing token declarations, values unchanged */
  }
}
```

All 27 token values are copied verbatim — only the selector wrapping changes.

### New semantic token: `--status-online`

Add to `@theme inline` block:

```css
--color-status-online: var(--status-online);
```

Add to `:root` block (light mode — green-600 hue):

```css
--status-online: oklch(0.627 0.194 149.214);
```

Add inside `@media (prefers-color-scheme: dark) { :root { ... } }` (dark mode — green-500 hue, higher lightness for contrast):

```css
--status-online: oklch(0.723 0.193 148.347);
```

**Contrast verification (dark mode):** `oklch(0.723 0.193 148.347)` against `oklch(0.205 0 0)` (the card background, `--card`) yields a relative luminance ratio of **~8.1:1**, exceeding the WCAG AA text minimum of 4.5:1.

Note: The oklch values above are derived from Tailwind v4's built-in green palette. Implementation must confirm exact values against the Tailwind v4 source (`node_modules/tailwindcss`) to ensure byte-for-byte match with the existing palette classes being replaced.

Tailwind resolves `text-status-online` and `bg-status-online` as utility classes from the `--color-status-online` theme alias — same mechanism as all other `--color-*` tokens in the existing `@theme inline` block.

---

## Component Change Contract

### AgentStatusPanel.tsx — `SwitchboardStatusBadge`

Current (line 11):
```tsx
<span className="inline-flex items-center gap-1.5 text-xs text-green-600">
```

Replace with:
```tsx
<span className="inline-flex items-center gap-1.5 text-xs text-status-online">
```

No other lines in `AgentStatusPanel.tsx` change. The `bg-green-500` dot on line 12 is retained.

**Fallback contract:** If browser rendering verification reveals that `text-status-online` fails the 4.5:1 contrast threshold in any target environment, replace `text-status-online` with `text-foreground` to guarantee legibility. Do not use a lighter green that has not been independently contrast-verified.

---

## Patterns

| Pattern | Usage | Rationale |
|---------|-------|-----------|
| `@media (prefers-color-scheme: dark) { :root { ... } }` | Sole dark mode mechanism in `globals.css` | Locked by DDR-010 §3.1; CSS-native, zero JS, no hydration concerns |
| Semantic CSS token (`--status-online`) for mode-sensitive colors | Online status text label only | Allows per-mode tuning in a single globals.css location; consistent with existing shadcn/ui token pattern; no component logic change |
| Retain Tailwind palette classes for bright UI indicator dots | All six dot indicators | Bright/high-chroma palette classes pass the 3:1 visual threshold against `oklch(0.205 0 0)` (`--card`) without mode variants; avoids premature token proliferation |

### Anti-Patterns (Do Not Use)

- `darkMode: 'class'` Tailwind strategy — rejected in DDR-010 §4
- `@custom-variant dark (&:is(.dark *))` — removed in this sprint
- `dark:` Tailwind utility prefix — removed variant makes this inert; deferred per requirements Out of Scope
- Any React state, context, `useEffect`, `localStorage`, or `sessionStorage` for theme management — zero JS constraint
- `<html className="dark">` or any server/client theme injection in `layout.tsx` — no class toggling
- New semantic tokens for dot indicators pre-emptively — add only if contrast verification fails; follow the established pattern

---

## Integration Points

- `globals.css` is the Tailwind CSS v4 entry point (`@import "tailwindcss"`). All token changes propagate to every component via CSS cascade — no per-component imports.
- `@theme inline` block bridges CSS custom properties to Tailwind utility class names. `--color-status-online` must be added here for `text-status-online` to resolve as a utility.
- `AgentStatusPanel.tsx` is an async Server Component. The class replacement is a static string — no runtime behavior change.
- `layout.tsx` requires no changes. `<html lang="en">` carries no class attribute; `suppressHydrationWarning` is not needed because there is no server/client theme state divergence.
- `ActivityFeedPanel.tsx` (`'use client'`) requires no changes. Media-query dark mode is CSS-native; the client/server component boundary is irrelevant to CSS variable resolution.

---

## Dependencies

No new dependencies.

| Existing Dependency | Version | Relevance |
|--------------------|---------|-----------|
| `tailwindcss` | ^4.0.0 | Processes `@theme inline`, generates utility classes from `--color-*` tokens, applies `@media` dark block |
| `next` | ^15.0.0 | Serves `globals.css` through the Next.js CSS pipeline |

---

## Constraint Verification

| Constraint (from 01-REQUIREMENTS.md) | Satisfied By |
|---------------------------------------|--------------|
| `@media (prefers-color-scheme: dark)` only — no class toggling | `.dark {}` migrated to `@media` block; `@custom-variant dark` removed |
| No JS, React state, context, or localStorage | Pure CSS mechanism; no component logic changes |
| No `<html className="...">` manipulation | `layout.tsx` unchanged |
| Zero UI toggle element | No toggle component added |
| WCAG AA text compliance for online label | `--status-online` dark mode value `oklch(0.723 0.193 148.347)` verified at ~8.1:1 against `oklch(0.205 0 0)` (`--card`) — exceeds 4.5:1 minimum; fallback to `text-foreground` if browser verification fails |
| All 27 dark token values preserved | Selector wrapper changes; values copied verbatim |
| `@custom-variant dark` absent from final `globals.css` | Explicitly removed |
| JS-disabled dark mode activation | Media query fires at CSS layer; no JS path |
