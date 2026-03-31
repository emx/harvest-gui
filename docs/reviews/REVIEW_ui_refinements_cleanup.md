# Review + Test Report: UI Refinements Cleanup — Cross-Platform and Robustness

**Task:** d7a037f7 | **Review task:** 8709ee38
**Reviewer:** CR | **Date:** 2026-03-31
**Commits reviewed:** 02e1b33, 231c4bf

## Verdict
PASS

All 5 CR findings and 2 unverified items addressed. Code quality is solid.

## Original Finding Resolution

| Finding | Status | Notes |
|---------|--------|-------|
| CR-01 (cross-platform get_disk_usage) | **Fixed** | `#[cfg(windows)]` impl using `windows-sys::GetDiskFreeSpaceExW`. `windows-sys` added as target-specific dependency in Cargo.toml (line 27-28). Both impls return same `DiskUsage` struct. |
| CR-02 (UTF-8 path correctness) | **Fixed** | Unix impl uses `OsStrExt::as_bytes()` (line 195-199) for CString. Windows impl uses `OsStrExt::encode_wide()` (line 225). Both avoid `to_string_lossy()`. Null byte in path now returns explicit error. |
| CR-03 (detail panel design system) | **Fixed** | `--card-panel: oklch(0.235 0.014 264 / 60%)` added to `.dark` block (App.css line 80). History detail panel uses `var(--card-panel)` (line 33). |
| CR-06 (API timeout) | **Fixed** | `Promise.race` with 10s timeout (Health.tsx lines 57-60). Timeout rejects with `new Error("Timeout")` → shows in UI. |
| CR-07 (division by zero) | **Fixed** | `disk.data.total_bytes > 0` guard (Dashboard.tsx line 104). Falls through to `diskPct = null` → "Unknown" display. |
| Status bar heartbeat pulse | **Verified present** | CC confirmed animate-pulse on teal dot when running. |
| Header accent line | **Verified present** | CC confirmed 2px teal gradient at bottom. |

## Code Review Findings

| Finding | Severity | Location | Description |
|---------|----------|----------|-------------|
| CR-01 | Low | commands/mod.rs:220-222 | **Windows impl has unused `path_str` variable.** `path_str` is obtained via `to_str()` (line 221) but only used in the error message (line 238). The actual API call uses `wide` (line 225). The `to_str()` check is effectively a redundant UTF-8 validation since `encode_wide()` handles arbitrary `OsStr`. Could simplify by removing the `path_str` check and using `dir.display()` for the error message. Very minor. |
| CR-02 | Low | commands/mod.rs:243 | **Windows `used_bytes` uses `total_free` not `free_bytes`.** `used_bytes: total_bytes.saturating_sub(total_free)`. `GetDiskFreeSpaceExW` returns: `free_bytes` = free bytes available to caller (may be quota-limited), `total_free` = total free bytes on disk. Using `total_free` for the subtraction is correct (gives actual disk used, not quota-limited used). Good. |
| CR-03 | Low | Health.tsx:57-58 | **Timeout promise never cleaned up.** The `setTimeout` in `Promise.race` creates a timer that isn't cleared if `invoke` resolves first. The timer will fire and reject the promise, but since the race is already settled, the rejection is silently ignored. No memory leak — the timer callback runs and is GC'd. Functionally correct. |

## Tests Written
Shadow mode — no gap tests written.

## Architecture Notes

The codebase is now cross-platform ready:
- `get_disk_usage`: Unix (libc statvfs) + Windows (GetDiskFreeSpaceExW)
- Path handling: `OsStr::as_bytes()` on Unix, `OsStr::encode_wide()` on Windows
- `windows-sys` as target-specific dependency — zero overhead on non-Windows builds

All design system values now live in CSS custom properties. No inline oklch values remain in component `style` attributes.

The robustness guards (timeout, divide-by-zero) are simple and correct. No over-engineering.
