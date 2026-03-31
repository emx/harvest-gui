# Review + Test Report: Fix canopy_dir to read from saved config instead of env var

**Task:** 1241fd50 | **Review task:** 0a7782f6
**Reviewer:** CR | **Date:** 2026-04-01

## Verdict
PASS

Critical fix correctly applied. Root cause of 5 broken features resolved. All callers updated, frontend unchanged.

## Fix Verification

### canopy_dir() change (mod.rs:64-74)
- Now accepts `&AppHandle`
- Reads from `config::load_config(app)` first (config file)
- Falls back to `env::var("CANOPY_LOCAL_DIR")` if config value is empty
- Error message updated: "Set it in Settings" (user-actionable)

### All callers updated with `app: AppHandle`

| Command | Line | AppHandle added | canopy_dir(&app) |
|---------|------|----------------|-----------------|
| get_processed | 77 | OK | OK |
| get_last_poll | 86 | OK | OK |
| list_collect_files | 107 | OK | OK |
| tail_log | 147 | OK (alongside existing `lines`) | OK |
| get_disk_usage (unix) | 235 | OK | OK |
| get_disk_usage (windows) | 259 | OK | OK |
| check_canopy_dir | 289 | OK | OK |

### Frontend compatibility verified
All `invoke()` calls in queries.ts pass only user args (e.g. `{ lines }` for tail_log). `AppHandle` is auto-injected by Tauri — no frontend changes needed. Confirmed via grep.

## Code Review Findings

| Finding | Severity | Location | Description |
|---------|----------|----------|-------------|
| CR-01 | Low | mod.rs:66 | **Config load on every call.** `canopy_dir` reads `config.json` from disk on every invocation (get_processed, get_last_poll, etc.). These commands are called frequently (30s stale time via TanStack Query). For a local file read this is fast, but it's redundant work. Could cache the resolved config in Tauri managed state with a TTL. Not blocking — file I/O for a small JSON file is negligible. |
| CR-02 | Low | mod.rs:66 | **`load_config(app.clone())` clones AppHandle.** `canopy_dir` takes `&AppHandle` but `load_config` takes `AppHandle` (owned). The clone is cheap (Arc internally) but the signature inconsistency remains from the earlier CR-03 fix. Minor. |

No other findings. Clean, correct fix that unifies the config source for all commands.
