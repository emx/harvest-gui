# Review + Test Report: Config File System — Persistent Settings and Editable Configuration

**Task:** 48fb355a | **Review task:** 0c1282d6
**Reviewer:** CR | **Date:** 2026-03-31
**Commit reviewed:** 24863d6

## Verdict
FAIL — High severity finding CR-01 (secrets stored in plaintext)

## Code Review Findings

| Finding | Severity | Location | Description |
|---------|----------|----------|-------------|
| CR-01 | **High** | config.rs:64-74 | **Secrets stored in plaintext JSON.** `save_config` writes `canopy_client_secret` (and `canopy_client_id`) as plaintext to `config.json` in the app data directory. On macOS this is `~/Library/Application Support/com.emx.harvest-gui/config.json` — readable by any process running as the user. The config file has default file permissions (user read/write). Any malware, other app, or script can read the secrets. Should use the OS keychain (macOS Keychain, Windows Credential Manager) for secrets, or at minimum restrict file permissions to 0600 on Unix. |
| CR-02 | **High** | config.rs:111-145 | **`get_resolved_config` returns full secret to frontend on every call.** The secret is masked for display (`mask_secret`), but `load_config` (called by `useAppConfig` query hook) returns the full unmasked secret to the frontend. The Settings form pre-fills the secret field with the real value. While this is a local desktop app (secret stays in IPC), the full secret is in React state, React DevTools, and potentially in TanStack Query's cache. |
| CR-03 | Medium | config.rs:147-166 | **`get_resolved_env` clones `AppHandle`.** `load_config(app.clone())` on line 148 — `AppHandle` is cheaply cloneable (it's an Arc internally), so this isn't a performance issue, but it's the only function that takes `&AppHandle` instead of `AppHandle`. The inconsistency is because it's a non-command helper function. Fine. |
| CR-04 | Medium | process.rs:130-135 | **`start_harvest` env injection silently ignores config errors.** `if let Ok(env_vars) = super::config::get_resolved_env(&app)` — if config loading fails, no env vars are injected and the process spawns without credentials. The user gets no indication that config failed. Should at minimum log the error, or propagate it. |
| CR-05 | Medium | Settings.tsx:67 | **`handleRestart` uses inline flag serialization.** `{ once: harvestFlags.once \|\| null, ... }` — the `serializeFlags` utility was extracted specifically to avoid this duplication (Phase 5 rework CR-03). Should use `serializeFlags(harvestFlags)`. |
| CR-06 | Medium | App.tsx:31-36 | **First-launch redirect only checks on mount.** The `useEffect` fires once when `resolved` data arrives. If the user navigates away from Settings before saving anything, they can use the app with no config. The redirect doesn't re-trigger. The handoff spec says "other views should show a 'Configure in Settings' message" — this isn't implemented. Views will show error states from failed Rust commands instead of a helpful redirect message. |
| CR-07 | Low | config.rs:42 | **Config format changed from TOML to JSON.** The handoff spec says `config.toml` but implementation uses `config.json`. JSON is fine (and avoids a `toml` crate dependency), but the deviation should be noted. |
| CR-08 | Low | Settings.tsx:237 | **App version still hardcoded as `"0.1.0"`.** Noted in Phase 7 review, still present. |
| CR-09 | Low | queries.ts:54-60 | **Old `useConfig` hook still exists.** `get_config` is still registered in lib.rs and the hook remains. If nothing uses it, it's dead code. If something still uses it (old Dashboard path), it returns the old format without source tracking. |

## Feature Delivery Audit

| Feature | Status | Notes |
|---------|--------|-------|
| Config file at app_data_dir | OK | `config.json` at platform-appropriate path |
| load_config command | OK | Creates default if missing, reads if exists |
| save_config command | OK | Writes JSON with pretty-print |
| Config resolution (file → env fallback) | OK | `resolve()` function with source tracking |
| get_resolved_config with source flags | OK | Returns source: "config"/"env"/"none" |
| start_harvest env injection | Partial | Injects resolved config but silently ignores errors (CR-04) |
| Editable Settings form | OK | All 5 fields, password toggle, mode dropdown |
| Source badges | OK | "config" / "env" per field |
| Save with feedback | OK | Success/error messages |
| Restart warning when running | OK | Amber banner with "Restart Now" button |
| First-launch redirect | Partial | Redirects to Settings, but no "Configure in Settings" messages on other views (CR-06) |
| Native folder picker | Deferred | Not implemented (crates.io timeout), text input only |

## Test Coverage Gaps

| Gap | Risk | Description |
|-----|------|-------------|
| TG-01 | High | Plaintext secrets in config.json — any user-level process can read them |
| TG-02 | High | Config file permissions — default umask, not restricted to owner-only |
| TG-03 | Medium | Concurrent config writes from multiple windows — no file locking |
| TG-04 | Medium | Config file with invalid JSON — `load_config` returns parse error but Settings form shows empty fields instead of the previous working config |
| TG-05 | Low | `save_config` with very long values — no length validation |

## Tests Written
Shadow mode — no gap tests written. Findings are advisory.

## Architecture Notes

The config layer is well-structured: `load_config`/`save_config` for CRUD, `get_resolved_config` for display, `get_resolved_env` for process injection. The resolution order (config file → env var → empty) is correct.

However, the **plaintext secret storage** (CR-01) is a significant security concern. For a desktop app distributed to clients, the client secret sitting in a readable JSON file in Application Support is a risk. The minimum fix is to use macOS Keychain (via `security` command or `keychain-services` crate) for CLIENT_ID and CLIENT_SECRET, storing only non-sensitive config in the JSON file.

The restart warning UX (CR-06 restart flow) is well done — amber banner with inline action.
