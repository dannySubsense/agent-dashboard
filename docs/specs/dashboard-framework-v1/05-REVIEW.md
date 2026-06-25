# Spec Review: Dashboard Framework v1 — Pass 3 (Roadmap Sync Verification)

- **Sprint:** dashboard-framework-v1
- **Reviewer:** spec-reviewer
- **Date:** 2026-06-20
- **Pass:** 3 (targeted re-review of Pass 2 HALT fixes N1–N4)
- **Documents reviewed:** 01-REQUIREMENTS.md, 02-ARCHITECTURE.md, 03-UI-SPEC.md, 04-ROADMAP.md, DDR-002
- **Verdict:** READY — pass to Frank gate

---

## Pass 3 Scope

Pass 2 issued a HALT on four roadmap-sync gaps (N1–N4). @planner applied all four fixes to `04-ROADMAP.md`. This pass verifies those four fixes are closed, confirms the 12 Pass 1 gaps have not regressed, and checks for any new blocking gap. It is not a full re-derivation of Pass 1.

---

## Pass 3 Gap Resolution (N1–N4)

| Gap | Description | Evidence | Status |
|-----|-------------|----------|--------|
| N1 | Slices 7–10 panels must call `src/lib/*` directly, not `fetch('/api/...')`; dependency map must show panels → lib layer | Slice 7 ProjectCardsPanel "calls `getProjectsData()` from `src/lib/projects.ts` directly (no `fetch('/api/...')` in RSC)"; Slice 8 DdrPipelinePanel/SessionClosePanel call `discoverProjects`/`parseDdrIndex`/`getSessionCloses` directly; Slice 9 ActivityFeedLoader calls `getLoreActivityEvents`/`getCommitsSince`/`getMergedPrs` directly; Slice 10 AgentStatusPanel/OpenWorkPanel call lib directly. Dependency map (04-ROADMAP lines 40–47) lists panel deps as `lib/*`; explicit note line 50: "Panel RSCs call lib functions directly; they do not depend on the API routes." | CLOSED |
| N2 | Slice 4 `github.ts` must use `(owner, repo)` signatures; no `dannySubsense/${repoName}` hardcoding; null `githubRemote` guard | Slice 4 contracts all `(owner: string, repo: string)`; impl note: "owner and repo are resolved from `DiscoveredProject.githubRemote` ... when `githubRemote` is null, the caller skips GitHub calls"; test: "callers must guard on `githubRemote` before invoking any GitHub lib function." `'dannySubsense'` appears only as real-repo test arguments, not source hardcoding. | CLOSED |
| N3 | Slice 2 `git.ts` must list `getGitHubRemote(repoPath)`; `discovery.ts` must call it to populate `githubRemote`; four unit tests | git.ts lists `getGitHubRemote(repoPath)`; discovery.ts "calls `getGitHubRemote()` per repo to populate `DiscoveredProject.githubRemote`"; four tests present: HTTPS parse, SSH parse, non-GitHub→null, not-a-repo→null. | CLOSED |
| N4 | Slice 6 activity-feed route: `days` only server-side filter; `type`/`project` accepted but not filtered server-side in v1; test must not assert server-side type filtering | Slice 6: "`days` is the only server-side filter applied in v1; `type` and `project` params are accepted ... but are not used for server-side filtering in v1 — reserved for v2." Test: `?days=7&type=git-commit` returns full list; "`type` param is accepted without error but does not filter server-side in v1." | CLOSED |

**All four N-gaps CLOSED.**

---

## Previously Closed Gaps (Pass 1) — Regression Spot-Check

Spot-checked; none regressed:

| Pass 1 area | Spot-check result |
|-------------|-------------------|
| Suspense per-panel isolation (no page-level `Promise.allSettled`) | Intact — 02-ARCH §page.tsx, Slice 1 impl note, anti-patterns list |
| `getGitHubRemote` resolves owner/repo from git remote (not dir name) | Intact — 02-ARCH §git.ts + Patterns; anti-pattern "Assuming GitHub owner/repo from directory name" |
| DDR status normalization (BACKLOG/DRAFT → PROPOSED) | Intact — 02-ARCH §Assumption 2, `normalizeDdrStatus` contract, Slice 2 tests |
| PROGRESS.md dual-format parse (plain + bold `Status:`) | Intact — 02-ARCH §Assumption 1, Slice 2 tests cover both variants |
| ActivityFeedLoader RSC / ActivityFeedPanel client split | Intact — 02-ARCH code example, Slice 9 |
| Stale-on-failure cache contract (`stale: true`) | Intact — 02-ARCH §Caching + API route pattern; UI Interaction 5 |
| Per-panel degradation via PanelShell/PanelUnavailable | Intact — 02-ARCH §Error Boundary; UI §Error/Degradation |
| `requireEnv` returns "" (no crash) on missing var | Intact — 02-ARCH §env.ts, Slice 1 test |
| Session-close 300-char truncation | Intact — UI Panel 3 + §Truncation; Slice 8 test (301→300+"...") |
| 25-item PR/issue cap | Intact — Req edge case, UI Panel 6, Slice 6/10 |
| UNKNOWN Kanban column conditional render | Intact — UI Panel 2, Slice 8 |
| `error.tsx` requires `'use client'` | Intact — Slice 1 file note |

---

## New Gaps Found This Pass

None blocking. One minor non-blocking note below.

| Note | Detail | Blocking? |
|------|--------|-----------|
| NOTE-1 | Slice 6 prose (04-ROADMAP lines 292, 300) describes mapping `GitCommit` to an `ActivityEvent` "with `type='commit'`". The canonical union in `src/types/index.ts` is `ActivityEventType = 'lore-capture' \| 'git-commit' \| 'pr-merge'`, and the 02-ARCHITECTURE `ActivityFeedLoader` example correctly uses `type: 'git-commit'`. The literal `'commit'` is a prose shorthand inconsistent with the type. TypeScript will reject `'commit'` at compile time and the executor has the correct canonical value in two authoritative places, so this cannot ship wrong. | No — TS-enforced; canonical sources correct |

Recommendation: optionally have @planner change "`type='commit'`" to "`type='git-commit'`" in 04-ROADMAP Slice 6 for prose accuracy. Not a gate blocker.

---

## Identified Risks (carried forward, unchanged)

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Assumed LORE table/column names (`documents`, `project_id`, etc.) differ from live schema | M | M | Isolated to `src/lib/lore.ts`; Slice 3 verifies against live VM 103 before downstream slices |
| Agent Registry stored as `document_type='spec'` in `lore-personal` may not match live data shape | M | M | `parseAgentDocument` returns null and is skipped per row; Slice 3 test validates against live registry |
| Switchboard `sessions.json` schema drift | L | M | Isolated reader; degrades to "unknown"; documented assumption |
| 5s time-to-interactive target depends on cold-cache parallel fetch latency | L | L | Per-panel Suspense; 60s cache warmth; non-functional target, not a hard AC blocker |

---

## Open Questions

None open. All DDR-002 §6 questions resolved (PM2, port 3000, Switchboard filesystem reads, sprint batching).

---

## Approval Checklist

### Requirements (01)
- [x] Acceptance criteria testable
- [x] Out of scope explicit (charts deferred, port panel deferred, click-through v2)

### Architecture (02)
- [x] Every US has coverage (§Requirements Coverage)
- [x] Schemas are valid TypeScript
- [x] Assumptions resolved against real repo files

### UI Spec (03)
- [x] Every US has a flow + layout
- [x] Loading/error/stale/empty states specified per panel

### Roadmap (04)
- [x] Every architecture + UI component mapped to a slice
- [x] Panels depend on lib layer (N1)
- [x] github.ts signatures + remote guard correct (N2)
- [x] getGitHubRemote in Slice 2 with tests (N3)
- [x] activity-feed server-side filter scope correct (N4)
- [x] No circular dependencies; file ownership table complete

### Overall
- [x] All four Pass 2 N-gaps CLOSED
- [x] No Pass 1 regression
- [x] No new blocking gap
- [ ] Human/Frank final approval

---

## Verdict

**READY — pass to Frank gate.**

All four Pass 2 HALT gaps (N1–N4) are CLOSED. No Pass 1 gap regressed. One non-blocking prose note (NOTE-1, TypeScript-enforced) recorded. No gap remains that would block a code executor.
