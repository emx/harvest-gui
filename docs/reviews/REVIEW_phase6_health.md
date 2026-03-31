# Review + Test Report: Phase 6 — Active Downloads + Health

**Task:** e6c9ae90 | **Review task:** aa29bc6a
**Reviewer:** CR | **Date:** 2026-03-31
**Commit reviewed:** 6c350d1

## Verdict
PASS

No High severity findings. Previous CR fixes correctly applied. Clean feature delivery.

## CR Fix Verification

| Phase 5 Rework Finding | Status | Notes |
|------------------------|--------|-------|
| CR-01 (dead `done` flag) | **Fixed** | `Arc` import and `done` variable removed from process.rs. |
| CR-03 (duplicated flag serialization) | **Fixed** | `serializeFlags()` extracted to store.ts (line 20). Header and Active both import from there. |

## Code Review Findings

| Finding | Severity | Location | Description |
|---------|----------|----------|-------------|
| CR-01 | Medium | queries.ts:68-75 | **`useListAssets` hook is dead code.** Defined with `enabled` parameter but never used — both Health.tsx AssetList (line 131) and Active.tsx AssetPreview (line 28) use direct `invoke()` calls with local state instead. Either use the hook or remove it. |
| CR-02 | Medium | Active.tsx:19-63, Health.tsx:121-178 | **AssetPreview and AssetList are near-duplicates.** Both fetch `list_assets`, manage loading/error/data state identically, and render asset lines in a monospace container. Only differ in empty-state text and max-height. Should be extracted to a shared component with props for the differences. |
| CR-03 | Low | mod.rs:169-183 | **`list_assets()` is a blocking synchronous call.** `Command::output()` blocks until `harvest --assets` completes. Tauri runs commands on a threadpool so the UI won't freeze, but a slow API response ties up a pool thread. Acceptable for a one-shot user-triggered command, but worth noting if it's ever called on an interval. |
| CR-04 | Low | Header.tsx:26-28 | **Silent error swallowing.** Empty catch block with comment "Active view will show the error" — but if the user is on Dashboard or any other view, they get no feedback that start/stop failed. The error is lost. Consider at minimum a console.error or a toast notification. |
| CR-05 | Low | Health.tsx:29-31 | **Connection test only proves `harvest --assets` runs.** Whether this validates API connectivity depends on what `harvest --assets` does internally. If it reads cached data or a config file without hitting the API, the "Connected to Canopy API" message is misleading. This is a UX accuracy concern, not a code bug. |

## Test Coverage Gaps

| Gap | Risk | Description |
|-----|------|-------------|
| TG-01 | Medium | `list_assets()` when `uv` is not on PATH or harvest module not installed — error message clarity |
| TG-02 | Low | `useTailLog` with `refetchInterval: 10_000` when harvest.log doesn't exist — continuous error refetching every 10s |
| TG-03 | Low | `list_assets()` output parsing — what if harvest --assets outputs empty string vs multi-line vs JSON? Currently returns raw lines, which is safe. |

## Tests Written
Shadow mode — no gap tests written. Findings are advisory.

## Architecture Notes

Good choices:
- `useTailLog` hook with `refetchInterval` for auto-refreshing log viewer
- Health screen decomposed into focused sub-components (ConnectionTest, LogViewer, AssetList)
- `list_assets` Rust command is simple and correct — `Command::output()` for one-shot is the right pattern
- Health view properly wired into the component map
- `serializeFlags` extraction is clean

The main cleanup opportunity is CR-01/CR-02: remove the unused `useListAssets` hook and extract the duplicated asset fetch component. Both are minor DRY issues that don't affect functionality.

Only Settings remains as a placeholder view. The app shell is nearly complete.
