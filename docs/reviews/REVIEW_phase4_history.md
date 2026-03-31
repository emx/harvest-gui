# Review + Test Report: Phase 4 — History Screen

**Task:** 776405e4 | **Review task:** 3889f8b9
**Reviewer:** CR | **Date:** 2026-03-31
**Commit reviewed:** 316b2c8

## Verdict
PASS

No High severity findings. CR fix-ups from Phase 3 correctly applied. History screen is well-implemented with proper sorting, filtering, and detail panel.

## CR Fix Verification

| Phase 3 Finding | Status | Notes |
|-----------------|--------|-------|
| CR-01 (tail_log UTF-8 boundary) | Fixed | Fallback to full-file read if `read_to_string` fails on chunk. Lines 152-159 of commands/mod.rs. |
| TG-02 (formatRelativeTime NaN) | Fixed | `isNaN(date.getTime())` guard returns "Unknown". Line 8 of Dashboard.tsx. |

## Code Review Findings

| Finding | Severity | Location | Description |
|---------|----------|----------|-------------|
| CR-01 | Medium | History.tsx:50 | `Button` uses `size="icon-xs"` variant — this is not a standard shadcn/ui button size. If the button component doesn't define this variant, it will either fall back to default or produce a className mismatch. Should verify against button.tsx's variant definitions. |
| CR-02 | Medium | History.tsx:25-31 | `formatBytes` is duplicated between Dashboard.tsx (line 19) and History.tsx (line 25). Same implementation, same function name. Should be extracted to a shared utility (e.g. `lib/format.ts`). Not a bug, but a maintainability risk — one gets updated, the other doesn't. |
| CR-03 | Low | History.tsx:103 | Date sorting compares `new Date(a.ts).getTime()` on every sort — if `ts` is invalid, `getTime()` returns `NaN` and comparisons become unpredictable. The `formatDate` function guards against invalid dates for display, but the sort does not. |
| CR-04 | Low | History.tsx:42 | `DetailPanel` uses `.find()` to match collect_id from the full collects array. For large datasets this is O(n) per panel render. Fine for expected data sizes but worth noting. |
| CR-05 | Low | App.tsx:25-29 | View routing changed from ternary to three separate conditional renders. The `activeView !== "dashboard" && activeView !== "history"` guard will need updating every time a new view is wired in. A switch/case or object map would be more maintainable. |

## Test Coverage Gaps

| Gap | Risk | Description |
|-----|------|-------------|
| TG-01 | Medium | `size="icon-xs"` button variant — does it exist in the button component? Needs verification against button.tsx |
| TG-02 | Low | Sorting with invalid timestamps — `NaN` comparisons produce inconsistent ordering |
| TG-03 | Low | Search filter with special regex characters in input — `.toLowerCase().includes()` is safe (no regex), so this is fine |
| TG-04 | Low | Detail panel when `collects` query errors but `processed` succeeds — shows "No files downloaded" which is misleading (it's an error, not empty) |

## Tests Written
Shadow mode — no gap tests written. Findings are advisory.

## Architecture Notes

Good choices:
- `useMemo` for sorting/filtering avoids recomputation on unrelated state changes
- Toggle sort direction on same column, reset direction on column change — standard UX
- Empty state messaging distinguishes "no data" from "no search results"
- Detail panel toggle (click to open, click same row to close) is intuitive
- shadcn table component is standard, correctly integrated

The `formatBytes` duplication (CR-02) is the most actionable finding — should be resolved before more views need it.
