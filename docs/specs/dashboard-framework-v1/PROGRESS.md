# PROGRESS.md — dashboard-framework-v1

**Sprint:** dashboard-framework-v1
**Status:** IN PROGRESS
**DDR:** DDR-002 (ACCEPTED 2026-06-20)
**Frank gate:** APPROVED 2026-06-20

---

## Slices

- [x] Slice 1 — Next.js scaffold + Tailwind v4 + shadcn/ui + shared layout + env + vitest — COMPLETE (2026-06-20, Frank-approved, 17/17 tests)
- [x] Slice 2 — Project discovery lib (CLAUDE.md, PROGRESS.md, DDR index, git, getGitHubRemote) — COMPLETE (2026-06-20, Frank-approved, 88/88 tests)
- [x] Slice 3 — LORE data layer (Postgres, 5 query fns, parseAgentDocument) — COMPLETE (2026-06-20, Frank-approved, schema verified on VM 103)
- [x] Slice 4 — GitHub data layer (octokit/rest, owner/repo from githubRemote) — COMPLETE (2026-06-20, Frank-approved)
- [x] Slice 5 — Switchboard + filesystem data layer — COMPLETE (2026-06-20, Frank-approved)
- [x] Slice 6 — 6 API routes (all data layers consumed here) — COMPLETE (2026-06-20, Frank-approved, 92/92 tests)
- [x] Slice 7 — ProjectCardsPanel + ProjectCard + src/lib/projects.ts — COMPLETE (2026-06-20, Frank-approved)
- [x] Slice 8 — DdrPipelinePanel + SessionClosePanel — COMPLETE (2026-06-20, Frank-approved)
- [x] Slice 9 — ActivityFeedLoader + ActivityFeedPanel (client component) — COMPLETE (2026-06-20, Frank-approved)
- [ ] Slice 10 — AgentStatusPanel + OpenWorkPanel + PM2 config + deployment smoke test

---

## Carry-Forward Notes

- `src/app/layout.tsx` "Last fetched" header shows layout render time, not data fetch time — fix before any real panel renders data (Frank note, Slice 1)
- `src/lib/github.ts getMergedPrs` — fetches only 50 most-recently-updated closed PRs; merged PRs can fall off page 1 on busy repos; document ceiling (Frank note, Slices 2–5)
- `src/lib/git.ts getGitHubRemote` — regex forbids dots in repo names (`[^/\n.]+?`); repos like `user.github.io` silently return null (Frank note, Slices 2–5)
- `src/lib/lore.ts getLastCapturePerProject` — no LIMIT; pulls all docs and dedups in app code; switch to `DISTINCT ON (project_id)` as LORE grows (Frank note, Slices 2–5)
- `src/lib/env.ts requireEnv` name implies it throws — it doesn't; rename to `envOrWarn` when convenient (Frank note, Slices 2–5)

## Schema Verification (Slice 3 Done-When)

Schema verified: table=documents, columns=[id, project_id, document_type, title, content, author, status, created_at, updated_at, file_path, git_sha, sprint_id, metadata, epistemic_type, tags, supersedes_id]. All 8 assumed columns confirmed on live VM 103. Additional columns present but unused by lore.ts.

## Notes

Slices 2–5 are parallel (each depends only on Slice 1).
Slices 7–9 are parallel (each depends on Slices 1–5).
Slice 6 depends on Slices 2–5.
Slice 10 depends on Slices 6–9.
