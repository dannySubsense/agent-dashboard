# Spec Review: project-discovery-v1

Reviewer: @spec-reviewer
Date: 2026-06-21
Iteration: 2 (re-review after iteration-1 fixes)
Docs reviewed: 01-REQUIREMENTS, 02-ARCHITECTURE, 03-UI-SPEC, 04-ROADMAP
Context files cross-checked (iteration 1, unchanged): `src/lib/cache.ts`, `src/lib/discovery.ts`, `src/lib/projects.ts`, `src/app/api/projects/route.ts`, `src/components/panels/ProjectCardsPanel.tsx`, `src/types/index.ts`

**Verdict: APPROVED — ready for Frank gate.** All four actionable iteration-1 findings (F1, F2 MEDIUM; F3, F5 LOW) are correctly applied. F4 (optional doc note) was also applied. F6 remains acknowledged/out-of-scope. No hard blocker. No new gaps introduced by the edits. One trivial cosmetic nit (N1, below) is noted for the human but does not block.

---

## Iteration-1 Fix Verification

| ID | Severity | Fix Required | Applied? | Evidence |
|----|----------|--------------|----------|----------|
| F1 | MEDIUM | 02-ARCH invariant note + 03-UI-SPEC causal sentence correction | ✅ Confirmed | 02-ARCH lines 346–348 (§Cache Invalidation Strategy → "Invariant: `getProjectsData()` Must Remain Uncached"); 03-UI-SPEC lines 486–487 (§Architectural Note) |
| F2 | MEDIUM | try/catch/finally in 03-UI-SPEC + network-failure test in 04-ROADMAP Slice 6 | ✅ Confirmed | 03-UI-SPEC lines 188–208 (explicit try/catch/finally); 04-ROADMAP line 307 (notes) + line 335 (test) |
| F3 | LOW | client-side trim in 03-UI-SPEC + trim note in 02-ARCH | ✅ Confirmed | 03-UI-SPEC lines 187, 192, 397, 419–425; 02-ARCH line 230 (Trim note) |
| F4 | LOW | one-line note that POST body is unused by v1 UI | ✅ Confirmed | 02-ARCH lines 259 (§POST Route Design Note) |
| F5 | LOW | Slice 5 "Depends On" = none; map + overview updated | ✅ Confirmed | 04-ROADMAP line 31 (overview table), line 42 (Depends On), lines 16–17 (Dependency Map), line 354 (Sequence Rule 6) |
| F6 | LOW (pre-existing) | acknowledged, no fix this sprint | ✅ As intended | Standing divergence risk; out of scope; entangled with F1 invariant (now documented) |

### F1 — detail

- **02-ARCH** (lines 346–348): the invariant is present and accurate — "`getProjectsData()` must remain uncached. It is called directly by `ProjectCardsPanel` on every server-component render, which is what ensures `router.refresh()` always sees fresh data after a POST. If `getProjectsData()` is ever wrapped in the `'projects'` cache… the POST route and the `router.refresh()` panel path must both invalidate before re-render — failing to do so would silently serve stale data without any error." This matches the code reality verified in iteration 1 (panel calls `getProjectsData()` directly; the `'projects'` key is touched only by GET `/api/projects`).
- **03-UI-SPEC** (lines 486–487): the prior incorrect causal claim is replaced with — "`router.refresh()` re-runs `ProjectCardsPanel`, which calls `getProjectsData()` directly. `getProjectsData()` is uncached… so the refresh always reflects the newly-written config file. `cache.delete('projects')` is called by the POST route independently and serves GET `/api/projects` consumers only; it has no effect on the panel's refresh path." Correct and consistent with 02-ARCH.

### F2 — detail

- **03-UI-SPEC** (lines 188–208): submission sequence now wraps `fetch` + `res.json()` + branch in an explicit `try`, with a `catch { setError('An unexpected error occurred') }` and `finally { setIsSubmitting(false) }`. Line 208 explicitly states the catch covers both `fetch` network rejections AND `res.json()` parse failures (non-JSON HTML 500 page). This closes the silent-failure / unhandled-rejection trap.
- **04-ROADMAP Slice 6** (line 307): implementation note mandates the try/catch/finally structure. Line 335 adds the test: "On `fetch` network rejection or non-JSON response from POST, an inline error message is shown (`'An unexpected error occurred'`) and the submit button re-enables (`isSubmitting` returns false)." Test count in Slice 6 is internally consistent (header says eleven tests; eleven are listed).

### F3 — detail

- Client-side trim is now the single chosen location: 03-UI-SPEC line 187 ("The path is trimmed client-side (`path: value.trim()`) before the fetch. Trim happens in the client, not in the route."), line 192 (`body: JSON.stringify({ path: value.trim() })`), line 397, and the dedicated §Whitespace Trimming pattern (lines 419–425). 02-ARCH line 230 adds the matching Trim note ("The client sends `{ path: value.trim() }`. The route receives a pre-trimmed path; no server-side trim is required."). The open question from iteration 1 ("client or route?") is resolved → client. No double-trim, no conflict.

### F5 — detail

- 04-ROADMAP Slice Overview table (line 31) shows Slice 5 "Depends On" = "—". Slice 5 body (line 42) = "Depends On: —". Dependency Map (lines 16–17) lists `PendingSetupCard` deps as "— (uses existing `ProjectCardData` type; no sprint dependency)" and the panel partition depending only on `PendingSetupCard` (Slice 5). Sequence Rule 6 (line 354) updated: "Slice 5 has no blocking dependency and may begin immediately." Internally consistent across all four locations.

---

## Final Completeness Pass (post-edit)

No new gaps were introduced by the four edits. Cross-checks re-run:

- **File map ↔ roadmap slices:** still an exact match (8 files; `ProjectCardsPanel.tsx` in S5 + S6). Unchanged by edits.
- **Validation sequence ↔ error strings:** the F3 trim is purely additive (client-side) and does not alter the route's step ordering or any error string. Relative-path rejection still asserts `startsWith('/')` before `path.resolve()`.
- **Empty-state matrix:** untouched; still fully covered by Slice 5 tests + Slice 6 browser verification.
- **F2 control flow:** the new try/catch/finally is consistent between 03-UI-SPEC (lines 188–208), the §Interaction Patterns summary (line 399), and 04-ROADMAP Slice 6 (line 307). On success the block does `setError(null)` → `setValue('')` → `router.refresh()`; on a received-but-not-ok response it sets the server error; on throw it sets the generic message; `finally` always clears `isSubmitting`. No state-leak path remains.
- **F1 consistency:** 02-ARCH invariant and 03-UI-SPEC architectural note now tell the same (correct) story. The risk table below retains the future-refactor mitigation.

### N1 (TRIVIAL, non-blocking) — fallback-string inconsistency

In 03-UI-SPEC the received-but-not-ok branch uses `setError(json.error ?? 'Failed to add project')` (line 199), whereas the equivalent branch is described as `json.error ?? 'An unexpected error occurred'` in §Interaction Patterns (line 399) and in 04-ROADMAP Slice 6 (line 305). The `?? <fallback>` is only reached if a 4xx/5xx response arrives with no `error` field — which this route never produces (every non-200 path sets a descriptive `error` string). So the fallback is effectively dead. Cosmetic only. Optional fix: standardise on one string. Not a blocker; does not affect any test (tests assert on the server's `json.error` string, not the fallback).

---

## Requirements → Architecture Coverage

| Requirement | Architecture Coverage | Status |
|-------------|----------------------|--------|
| US-01 Config persistence in discovery | `config.ts` `readConfigFile`; `discoverProjects()` Source 3 | ✅ |
| US-02 POST /api/projects/paths | route.ts 9-step sequence; `ApiResponse<ProjectCardData[]>`; unused-body note (F4) | ✅ |
| US-03 Add Project UI (happy) | `AddProjectInput` client island | ✅ |
| US-04 Add Project UI (error) | `AddProjectInput` error state + try/catch network/parse path (F2) | ✅ |
| US-05 Pending Setup section | `PendingSetupCard` + panel partition | ✅ |
| US-06 Panel revalidation | `router.refresh()` on success; mechanism now correctly documented (F1) | ✅ |

## Requirements → UI Coverage

| User Story | Screen/Flow | Status |
|------------|-------------|--------|
| US-03 | Flow 1 Happy Path + empty-input guard | ✅ |
| US-04 | Flow 2 Error Path + §Submission sequence try/catch (F2) | ✅ |
| US-05 | Flow 3 + Empty-State Matrix | ✅ |
| US-06 | §Architectural Note (router.refresh, corrected reasoning F1) | ✅ |

## Architecture → Roadmap Coverage

| Component | Slice | Status |
|-----------|-------|--------|
| `ProjectsConfig` type | Slice 1 | ✅ |
| `InMemoryCache.delete` | Slice 1 | ✅ |
| `config.ts` | Slice 2 | ✅ |
| `discoverProjects()` Source 3 | Slice 3 | ✅ |
| POST route | Slice 4 | ✅ |
| `PendingSetupCard` + partition | Slice 5 (Depends On: — , F5) | ✅ |
| `AddProjectInput` + embed | Slice 6 | ✅ |

---

## Identified Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Future de-dup of `getProjectsData`/`fetchProjects` through the cache silently breaks `router.refresh()` | M | H | F1 invariant note now present in 02-ARCH (lines 346–348); do not merge F6 cleanup without re-testing the add→refresh flow |
| Network/non-JSON POST failure leaves UI with no error and a possible unhandled rejection | Resolved | — | F2 try/catch/finally now specified (03-UI-SPEC 188–208) + tested (04-ROADMAP Slice 6 line 335) |
| Whitespace-padded paste produces confusing rejection | Resolved | — | F3 client-side trim now specified (03-UI-SPEC) + 02-ARCH note |
| Concurrent POSTs from two tabs race on file write | L | L | Accepted per 01-REQ edge-case table (single-user); last-write-wins + dedup |
| `.git` unreadable due to parent search-permission yields "no .git directory" message | L | L | Acceptable for single-user homelab; no fix required |

## Assumptions

| Assumption | Impact if Wrong |
|------------|-----------------|
| `getProjectsData()` never throws (Promise.allSettled), so `response.data` is effectively always non-null and `AddProjectInput` always renders | If it could throw, the Add input would vanish on total discovery failure; matrix's "AddProjectInput: shown" would not hold |
| `getProjectsData()` remains uncached (now an explicit 02-ARCH invariant) | If wrapped in the `'projects'` cache without dual invalidation, `router.refresh()` serves stale data with no error |
| `os.homedir()` resolves to the same home the Next.js process can write under | Config writes fail with 500 if home is remapped read-only (noted in 01-REQ Assumes) |
| Single Next.js server process (module-singleton cache is shared) | Multi-instance deploy would not share cache state; out of scope per 01-REQ |

## Open Questions

| Question | Status | Resolution |
|----------|--------|------------|
| Should the path be trimmed in the client or the route? (F3) | Resolved | Client — specified in 03-UI-SPEC + 02-ARCH note |
| Should F2's catch surface a generic message or the raw error? | Resolved | Generic "An unexpected error occurred" (03-UI-SPEC line 208) |
| Keep returning the unused full list from POST (F4), or return a lighter ack? | Resolved | Keep (US-02 contract); documented as unused-by-v1-UI in 02-ARCH line 259 |
| Standardise the dead else-branch fallback string? (N1) | Open (trivial) | Optional; pick one of `'Failed to add project'` / `'An unexpected error occurred'`. Not a blocker |

---

## Approval Checklist

### Requirements (01)
- [ ] Reviewed by human
- [x] Acceptance criteria are testable — confirmed testable as written
- [ ] Out of scope is acceptable

### Architecture (02)
- [ ] Reviewed by human
- [x] F1 invariant note added (`getProjectsData()` must stay uncached) — lines 346–348
- [x] F3 trim note added (line 230); F4 unused-body note added (line 259)
- [x] Patterns appropriate; schema (`ProjectsConfig`) valid and non-conflicting with `src/types/index.ts`

### UI Spec (03)
- [ ] Reviewed by human
- [x] F1 causal sentence corrected (lines 486–487)
- [x] F2 try/catch/finally failure path specified (lines 188–208)
- [x] F3 client-side trim reflected (lines 187, 192, 419–425)

### Roadmap (04)
- [ ] Reviewed by human
- [x] F5 Slice 5 dependency corrected to "—" (line 31/42; map 16–17; rule 354)
- [x] F2 Slice 6 network-failure test added (line 335) + try/catch note (line 307)
- [x] Slices appropriately sized; sequence correct

### Overall
- [ ] Reviewed by human
- [x] F1 and F2 (MEDIUM) addressed
- [x] F3, F4, F5 addressed; F6 acknowledged/out-of-scope
- [x] All risks have mitigations
- [ ] N1 trivial fallback-string nit (human's call; non-blocking)
- [ ] Ready for implementation (pending human + Frank gate)

---

## Reviewer Conclusion

Iteration-2 re-review confirms all four actionable findings from iteration 1 are correctly and consistently applied across the affected documents, with no new gaps introduced. The F1 invariant note and corrected UI causal reasoning now agree with the verified code reality; the F2 try/catch/finally closes the silent network/parse-failure trap and carries a matching roadmap test; F3 fixes the whitespace-paste UX with a single, unambiguous client-side trim; F5 removes the spurious Slice 5 dependency in all four locations. F4 and F6 are documented as intended. The only residual item is N1, a dead-code fallback-string inconsistency that affects no test and no runtime path.

No HALT. Every slice remains implementable and would pass its stated tests. **Verdict: APPROVED — ready for Frank gate.**
