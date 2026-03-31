# Review + Test Report: Phase 3 — Dashboard Screen

**Task:** 86e3a9f4 | **Review task:** 339943f4
**Reviewer:** CR | **Date:** 2026-03-31
**Commit reviewed:** 8319120

## Verdict
PASS

No High severity findings. CR-01/CR-02 fixes from Phase 2 are correctly applied. Dashboard implementation is clean and well-structured.

## CR Fix Verification

| Phase 2 Finding | Status | Notes |
|-----------------|--------|-------|
| CR-01 (UTF-8 byte slicing) | Fixed | Now uses `chars().rev().take(4)` — safe for multi-byte. Line 105 of commands/mod.rs. |
| CR-02 (tail_log full read) | Fixed | Now seeks from end, reads `n * 512` byte chunk. Lines 146-157. |

## Code Review Findings

| Finding | Severity | Location | Description |
|---------|----------|----------|-------------|
| CR-01 | Medium | commands/mod.rs:146 | `tail_log` seek-from-end reads a fixed chunk (`n * 512 bytes`). If the seek lands mid-way through a multi-byte UTF-8 character, `read_to_string` will error. The chunk start may also land mid-line, but the code uses `.lines().collect()` then takes the last N, which naturally drops the first partial line — acceptable behavior. The UTF-8 boundary risk is the real concern; consider falling back to reading more if `read_to_string` fails, or using `BufRead` on bytes. |
| CR-02 | Medium | Dashboard.tsx:7 | `formatRelativeTime` uses `Date.now()` at call time but the component doesn't re-render on a timer. Stale "5m ago" will stay on screen until the next TanStack Query refetch (30s stale, but only on window focus by default). Minor UX issue — data-driven pages typically accept this. |
| CR-03 | Low | Dashboard.tsx:136-137 | `ConfigSummary` filters out `CANOPY_CLIENT_ID` in addition to `CANOPY_CLIENT_SECRET`. The spec says "Do not show secrets here" — CLIENT_ID is not a secret. The ID is useful context. Not a bug, just overly conservative filtering. |
| CR-04 | Low | queries.ts:1-45 | All 5 Tauri commands have query hooks but `tail_log` is missing. No current consumer needs it (dashboard doesn't show logs), but if a future view wants logs, the hook is absent. Informational only. |
| CR-05 | Low | Header.tsx:21-23 | Mode badge only distinguishes "production" vs everything-else (yellow). If `CANOPY_MODE` is an unexpected value (e.g. "test"), it renders yellow which is reasonable, but the badge text will show the raw value — fine behavior. |

## Test Coverage Gaps

| Gap | Risk | Description |
|-----|------|-------------|
| TG-01 | Medium | `tail_log` seek landing on UTF-8 boundary — could produce `read_to_string` error on non-ASCII log content |
| TG-02 | Low | `formatRelativeTime` with invalid/empty ISO string — `new Date("")` returns Invalid Date, `Date.now() - NaN = NaN`, `Math.floor(NaN) < 1` is false, falls through all branches to return `"NaNd ago"` |
| TG-03 | Low | Dashboard with zero collects but non-zero processed (or vice versa) — metric cards show correct independent values? Logic looks correct on inspection. |

## Tests Written
Shadow mode — no gap tests written. Findings are advisory.

## Architecture Notes

Good choices:
- Zustand for view routing is appropriate for a Tauri app — avoids react-router complexity
- TanStack Query wrapping `invoke` is clean; 30s stale time is reasonable
- Component decomposition (PollStatus, MetricCards, RecentActivity, ConfigSummary) keeps Dashboard.tsx readable
- Error/loading states handled consistently across all sections
- shadcn/ui components are present and correctly used

The overall implementation quality is solid. The two Medium findings are edge cases that are unlikely to bite in normal use but worth tracking.
