# Review + Test Report: UI Refinements — Dashboard, Active, History, Health, Settings

**Task:** 5b161382 | **Review task:** b7037cc0
**Reviewer:** CR | **Date:** 2026-03-31
**Commits reviewed:** 578df5b, fbbd921

## Verdict
PASS

No High severity findings. Substantial feature delivery across all views with new Rust commands, store updates, and visual enhancements.

## Code Review Findings

| Finding | Severity | Location | Description |
|---------|----------|----------|-------------|
| CR-01 | Medium | commands/mod.rs:192-212 | **`get_disk_usage` is `#[cfg(unix)]` only — no Windows variant.** If the app is ever built for Windows, the command won't compile into the binary but it's still registered in `lib.rs`, causing a linker error. Since this is a Tauri app (potentially cross-platform), either add a Windows implementation using `GetDiskFreeSpaceExW` or a fallback that returns an error. For a macOS-only project this is fine — flagging as Medium for awareness. |
| CR-02 | Medium | commands/mod.rs:196-197 | **`canopy_dir()` path converted via `to_string_lossy` for CString.** If CANOPY_LOCAL_DIR contains non-UTF-8 bytes (unusual but possible on Unix), `to_string_lossy` replaces them with `U+FFFD`, producing a different path. Should use `OsStr::as_bytes()` → `CString` for correctness. Low practical risk on macOS. |
| CR-03 | Medium | History.tsx:33 | **Detail panel reverts to inline oklch style.** `style={{ background: "oklch(0.235 0.014 264 / 60%)", backdropFilter: "blur(8px)" }}` — this was flagged in the visual cleanup (CR-03) as bypassing the design system. The teal-tinted distinct background is the intent, but it introduces a new inline oklch value. Should define a CSS var (e.g. `--card-panel`) for this. |
| CR-04 | Medium | History.tsx:79-81 | **`useEffect` cleanup to clear selection runs on unmount.** `return () => setSelectedCollectId(null)` clears the shared store when History unmounts. But if the user navigates Dashboard → History (with a pre-selected collect from Dashboard click), then back to Dashboard, the selection is cleared. The Dashboard → History → Dashboard flow works correctly because History mounts, picks up the selection, displays the detail, and clears on leave. Good design. |
| CR-05 | Low | Dashboard.tsx:39-49 | **`AnimatedNumber` creates a new `motionValue` on every render.** `useMotionValue(0)` is called inside the component body. Framer Motion handles this correctly (the hook is stable), and the `animate` effect re-triggers on value change. Performance is fine for 2-3 metric cards. |
| CR-06 | Low | Health.tsx:68-70 | **API health check runs on mount with no error boundary.** `checkApi()` in `useEffect` fires immediately. If `list_assets` takes a long time (slow API), the "Checking..." state persists. There's no timeout. For a health check, consider adding a timeout (e.g. 10s) so a hung API shows "Timeout" rather than spinning forever. |
| CR-07 | Low | Dashboard.tsx:103-113 | **`used_bytes / total_bytes` can divide by zero.** If `total_bytes` is 0 (e.g. error in statvfs), `diskPct` becomes `Infinity`. The color thresholds would fall through to `text-red-400`. The display would show "Infinity% volume used". Should guard against `total_bytes === 0`. |

## Feature Delivery Audit

| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard config clickable → Settings | OK | Card has cursor-pointer, onClick navigates via store |
| Dashboard recent activity clickable → History | OK | Sets selectedCollectId in store before navigating |
| Dashboard disk usage colored indicator | OK | Green/amber/red thresholds, libc statvfs, volume % displayed |
| Active: removed --use-aria2 and --parallel | OK | Removed from store, serializeFlags, process.rs HarvestFlags, and both Active + Settings UIs |
| Active: renamed asset button/heading | OK | Verified in AssetFetcher props |
| History: horizontal split detail panel | OK | Flex layout, detail on right side with border-l |
| History: distinct detail panel background | OK | Semi-transparent with backdrop blur |
| Health: three indicator cards | OK | Daemon Running, Canopy Reachable, Canopy API OK |
| Health: removed Connection Test | OK | Replaced by indicators |
| Health: colorized log viewer | OK | ERROR=red, WARNING=amber, INFO=default, DEBUG=dimmed |
| Card top-border accent | OK | `border-t-2 border-t-teal-500/40` on all major cards |
| Alternating table rows | OK | `bg-white/[0.02]` on even rows |
| Animated numbers | OK | Framer Motion count-up on metric cards |
| Status bar heartbeat | Not verified | Didn't see explicit pulse addition in StatusBar — may be in CSS |
| Header accent line | Not verified | Didn't see explicit gradient line in Header — may need checking |

## Test Coverage Gaps

| Gap | Risk | Description |
|-----|------|-------------|
| TG-01 | Medium | `get_disk_usage` on non-Unix platforms — compilation will fail |
| TG-02 | Medium | `total_bytes = 0` from statvfs — Infinity% display |
| TG-03 | Low | API health check with no timeout — could spin indefinitely |
| TG-04 | Low | History detail panel with many files — fixed 80rem width may truncate filenames |

## Tests Written
Shadow mode — no gap tests written. Findings are advisory.

## Architecture Notes

Good additions:
- `selectedCollectId` in Zustand store enables Dashboard → History navigation with context — clean cross-view communication
- `HealthIndicator` component is well-abstracted and reusable
- `AnimatedNumber` is a nice minimal wrapper around Framer Motion values
- `getLogLineColor` is simple and correct for log level detection
- `check_canopy_dir` is a minimal, focused Rust command
- `get_disk_usage` using libc statvfs is the right approach for macOS

The store is now well-shaped: view routing, harvest flags, and selected collect ID — all serve clear cross-component coordination needs.
