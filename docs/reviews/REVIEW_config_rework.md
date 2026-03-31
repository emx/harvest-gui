# Review + Test Report: Config System Rework — Robustness and Cleanup

**Task:** b5cf180c | **Review task:** c1d7a143
**Reviewer:** CR | **Date:** 2026-03-31
**Commit reviewed:** 78abbfc

## Verdict
PASS

All 5 findings from the config system review correctly addressed. Clean, targeted fixes with no regressions.

## Original Finding Resolution

| Finding | Status | Notes |
|---------|--------|-------|
| CR-03 (AppHandle consistency) | **Fixed** | `get_resolved_env` now takes `AppHandle` (line 147 of config.rs). Consistent with all Tauri commands. |
| CR-04 (config error propagation) | **Fixed** | `start_harvest` now calls `get_resolved_env(app.clone())` with `.map_err()` — returns clear error "Failed to load configuration: {error}. Check Settings." instead of silently spawning without credentials (process.rs lines 133-134). |
| CR-05 (inline flag serialization) | **Fixed** | Settings.tsx `handleRestart` now uses `serializeFlags(harvestFlags)` (line 67). |
| CR-06 (first-launch UX) | **Fixed** | New `ConfigGuard` component wraps Dashboard/Active/History/Health via `guarded()` HOC in App.tsx. Shows friendly "Configuration Incomplete" message with missing field names and "Open Settings" button when critical fields are absent. |
| CR-09 (dead code) | **Fixed** | Removed: `get_config` command from mod.rs, registration from lib.rs, `ConfigEntry` interface and `useConfig` hook from queries.ts. Grep confirms no remaining references. |

## Code Review Findings

| Finding | Severity | Location | Description |
|---------|----------|----------|-------------|
| CR-01 | Low | ConfigGuard.tsx:12 | **Loading state passes through to children.** `if (isLoading) return <>{children}</>` renders the wrapped view before resolved config is available. This means the guarded view briefly renders, fires its own queries (which may fail), then ConfigGuard swaps in the incomplete-config message. A brief flash of error content is possible. Could show a skeleton or nothing during loading instead. Minor UX flicker. |
| CR-02 | Low | ConfigGuard.tsx:6 | **CRITICAL_FIELDS doesn't include ORG_ID.** Only CLIENT_ID, CLIENT_SECRET, and LOCAL_DIR are checked. If ORG_ID is required for harvest to work, it should be in the list. If it's optional, the current set is correct. Depends on the Harvest CLI's requirements. |
| CR-03 | Low | App.tsx:16-24 | **`guarded()` creates a new component type on every import.** The HOC is called at module scope (lines 27-30), so this is fine — each wrapped component is created once. Not a performance concern. Good pattern. |

## Deferred Items (from config system review, deferred to v2 per user decision)

| Original Finding | Status |
|-----------------|--------|
| CR-01 (plaintext secrets) | Deferred — secrets remain in plaintext JSON |
| CR-02 (full secret to frontend) | Deferred — load_config still returns unmasked secret |
| CR-07 (TOML → JSON format change) | Accepted — JSON is fine |
| CR-08 (hardcoded app version) | Deferred |

## Tests Written
Shadow mode — no gap tests written.

## Architecture Notes

The config system is now robust for the v1 milestone:
- Config errors propagate clearly to the user
- Unconfigured views show a helpful message instead of cryptic errors
- Dead code removed (clean codebase)
- Flag serialization consistent everywhere
- `ConfigGuard` is a clean, reusable pattern

The deferred items (plaintext secrets, full secret in frontend) are acknowledged risks for v2. The user has accepted these for now.
