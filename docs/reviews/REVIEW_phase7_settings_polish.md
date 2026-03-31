# Review + Test Report: Phase 7 — Settings + Polish

**Task:** 90be1f9a | **Review task:** 14d1d9d1
**Reviewer:** CR | **Date:** 2026-03-31
**Commit reviewed:** db0101b

## Verdict
PASS

No High severity findings. All Phase 6 fixes applied correctly. Clean final phase delivery.

## CR Fix Verification

| Phase 6 Finding | Status | Notes |
|-----------------|--------|-------|
| CR-01 (dead useListAssets hook) | **Fixed** | Removed from queries.ts. |
| CR-02 (duplicated asset component) | **Fixed** | `AssetFetcher` component extracted to `src/components/AssetFetcher.tsx` with `emptyText` and `maxHeight` props. Used by both Active and Health views. |
| CR-04 (silent Header error) | **Fixed** | Header now shows inline error message with 5-second auto-dismiss (lines 17-23, 47-51). |

## Code Review Findings

| Finding | Severity | Location | Description |
|---------|----------|----------|-------------|
| CR-01 | Medium | Settings.tsx:27 | **CLIENT_ID masking done in frontend.** `entry.value.slice(-4)` masks CLIENT_ID on the display side. The Rust `get_config` only masks CLIENT_SECRET — CLIENT_ID is returned in full. This means the full CLIENT_ID is transmitted over the Tauri IPC boundary and available in JS memory. For a local desktop app this is acceptable, but inconsistent with SERVER_SECRET masking which is done in Rust. Consider masking CLIENT_ID in Rust too for consistency. |
| CR-02 | Medium | Settings.tsx:64-155, Active.tsx:111-162 | **Flag controls duplicated between Settings and Active.** The checkbox/number inputs for harvest flags are nearly identical in both views. Both bind to the same Zustand store. Unlike the AssetFetcher extraction, these controls weren't extracted into a shared component. Adding a new flag requires updating both views. |
| CR-03 | Low | Settings.tsx:167 | **App version hardcoded as `"0.1.0"`.** The handoff spec says to read from package.json or Tauri config. Hardcoding means the version will drift when bumped. Should read from `@tauri-apps/api` app info or the Cargo.toml version. Minor — this is an info display, not functional. |
| CR-04 | Low | App.tsx:30-40 | **AnimatePresence view transitions.** Clean implementation with `mode="wait"`, fade+slide (0.15s), keyed by `activeView`. One note: `exit` animation moves content up (`y: -8`) while `initial` moves content down (`y: 8`), creating a subtle directional slide. This works well for a top-to-bottom nav. Good UX choice. |
| CR-05 | Low | Dashboard.tsx:57-61 | **Staggered metric card animation.** `delay: i * 0.05` gives a subtle left-to-right entrance. Clean, not over-done. However, this animation replays every time the Dashboard tab is selected (AnimatePresence re-mounts), which may feel repetitive. Consider `layout` animation or one-time entrance tracking if it becomes annoying. |

## Test Coverage Gaps

| Gap | Risk | Description |
|-----|------|-------------|
| TG-01 | Medium | CLIENT_ID value available in JS memory — no practical exploit in local Tauri app but inconsistent security posture |
| TG-02 | Low | `harvestFlags.include` and `exclude` with whitespace or commas — does `harvest --include` parse these correctly? The Rust side passes the raw string as a single arg. |
| TG-03 | Low | Settings flag changes while harvest is running — the Active view disables inputs during run, but Settings doesn't. Changing flags in Settings while running would affect the *next* start but could be confusing. |

## Tests Written
Shadow mode — no gap tests written. Findings are advisory.

## Architecture Notes — Full Project Review

This is the final phase. The app is feature-complete with all 5 sidebar views (Dashboard, Active, History, Health, Settings) and the full Harvest process management lifecycle.

**Strengths across the project:**
- Clean component decomposition with shared utilities (`lib/format.ts`, `AssetFetcher`, `serializeFlags`)
- Consistent data fetching pattern via TanStack Query hooks
- Proper Zustand state management for cross-component concerns
- Good error/loading/empty state coverage across all views
- Tauri command layer is well-organized (mod.rs for file reads, process.rs for lifecycle)
- Process lifecycle is properly hardened (ProcessHandle, cleanup_old_process, thread joining)
- View routing via component map is clean and extensible
- Subtle, appropriate animations (pulse dot, staggered cards, view transitions)

**Remaining tech debt (advisory — none blocking):**
- `now_iso()` hand-rolled date formatter (50 lines, Phase 5 rework CR-02)
- Flag controls duplicated between Settings and Active (this review CR-02)
- CLIENT_ID not masked on Rust side (this review CR-01)
- App version hardcoded (this review CR-03)
- Settings doesn't disable flag inputs while harvest is running (TG-03)
