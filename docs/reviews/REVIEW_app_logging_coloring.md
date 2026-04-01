# Review + Test Report: Add app-level logging and improve log display coloring

**Task:** fa934c89 | **Review task:** 6e8a2702
**Reviewer:** CR | **Date:** 2026-04-01

## Verdict
PASS

Well-structured feature across 9 files. Clean separation of concerns: Rust logging → file, new Tauri command, React query hook, shared LogLine component, dual log views with structured coloring. All 6 handoff tasks delivered.

## Task Verification

### Task 1: Rust app-level logging

| Item | Status | Notes |
|------|--------|-------|
| `log` + `simplelog` in Cargo.toml | OK | Lines 26-27: `log = "0.4"`, `simplelog = "0.12"` |
| Logger init in lib.rs | OK | `init_logging()` called in setup closure. `CombinedLogger` with `WriteLogger` → `harvest-gui.log` in app_data_dir. Append mode. |
| Log statements in mod.rs | OK | `info!` on bundled_python/aria2c resolution, canopy_dir resolve, list_assets call/result, check_canopy_dir. `warn!` on missing files. `error!` on failures. |
| Log statements in process.rs | OK | `info!` on spawn/stop, `warn!` on reap, `error!` on spawn failure |
| Log statements in config.rs | OK | `info!` on load/save, `error!` on parse failure |

### Task 2: `tail_app_log` command

| Item | Status | Notes |
|------|--------|-------|
| Command in mod.rs:300-331 | OK | Reads `harvest-gui.log` from `app_data_dir()`. Same tail logic as `tail_log`. 64KB chunk, last N lines. |
| Registered in lib.rs:47 | OK | `commands::tail_app_log` in invoke_handler |

### Task 3: Health page → app log

| Item | Status | Notes |
|------|--------|-------|
| Health.tsx imports `useTailAppLog` | OK | Line 7: from queries |
| Section title "App Diagnostics" | OK | Line 124-125 |
| Uses `tail_app_log` not `tail_log` | OK | AppDiagnostics component, line 114 |
| Query hook in queries.ts:69-76 | OK | `useTailAppLog` with 10s stale/refetch |

### Task 4 & 5: Log coloring — Active + Health

Both use the shared `LogLine` component with `format="harvest"` (Active:194) and `format="app"` (Health:151).

### Task 6: Shared LogLine component

| Feature | Status | Notes |
|---------|--------|-------|
| Two regex formats | OK | `HARVEST_RE` for process log, `APP_RE` for simplelog format |
| Level parsing | OK | Maps ERROR/CRITICAL→error, WARNING/WARN→warning, DEBUG/TRACE→debug |
| Timestamp dimming | OK | `text-slate-500` |
| Module coloring | OK | `text-cyan-600` |
| Level coloring | OK | error=red-400, warning=amber-500, info=slate-300, debug=slate-500 |
| Status word highlighting | OK | OK/ready/started=teal, failed/error/timeout=red, warning/skip=amber |
| Left gutter border | OK | error=red, warning=amber |
| Zebra striping | OK | Odd rows `bg-white/[0.02]` |
| Fallback for unparsed lines | OK | Keyword-based coloring (ERROR/WARNING/DEBUG detection) |

## Code Review Findings

| Finding | Severity | Location | Description |
|---------|----------|----------|-------------|
| CR-01 | Medium | lib.rs:23-25 | **Logger is file-only, no dev stdout.** Handoff said "in dev mode, stdout too" but CombinedLogger only has WriteLogger. In dev mode, log output won't appear in terminal. Could add `TermLogger` conditionally. Not blocking — logs are still written to file and visible via Health page. |
| CR-02 | Low | process.rs:23-74 | **Manual date formatting is ~75 lines.** `now_iso()` hand-rolls UTC date calculation. This works but is fragile and hard to audit. The `chrono` crate or even `time` crate would be cleaner. However, this code predates this PR (it was there before) — CC didn't introduce it. Not CC's fault, not blocking. |
| CR-03 | Low | LogLine.tsx:39-43 | **`STATUS_PATTERNS` is declared but only used via `combined` regex.** The `STATUS_PATTERNS` array with its color mappings is iterated inside `highlightStatus` to determine the color class for each matched word. This works but is slightly roundabout — the `combined` regex matches all words, then `STATUS_PATTERNS` is tested per-word to find the color. Functional, just a bit indirect. |
| CR-04 | Low | mod.rs:300 | **`tail_app_log` duplicates `tail_log` logic.** Both functions have the same chunk-read-from-end pattern. Could extract a shared `tail_file(path, n)` helper. Minor DRY concern — two instances is acceptable. |
| CR-05 | Low | Health.tsx:113-114 | **`useTailAppLog(100)` — filter operates on all 100 lines client-side.** Fine for 100 lines. Would need server-side filtering if line count increases. |

## Test Coverage Gaps

| Gap | Risk | Description |
|-----|------|-------------|
| TG-01 | Low | LogLine regex parsing edge cases (malformed timestamps, missing modules, mixed formats) |
| TG-02 | Low | `tail_app_log` when log file doesn't exist yet (first launch before any logging) — should return error or empty |

## Tests Written
Shadow mode — no gap tests written.

## Architecture Notes

The separation of app log (Health page) vs process log (Active page) is clean and addresses the original confusion where both views showed the same data. The shared LogLine component correctly avoids duplication while supporting both log formats via the `format` prop. The `simplelog` crate is a good lightweight choice — no unnecessary deps like `tracing-subscriber` or `tokio`.
