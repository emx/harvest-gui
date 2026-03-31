# Harvest GUI — v1 / v2 Design Scope

**Created:** 2026-03-31
**Status:** Active

---

## v1 — Ship It (current)

The goal: a working, polished desktop app that a client can install, configure, and use without touching a terminal.

### Features (complete)
- Dashboard with poll status, metrics, recent activity, disk usage
- History screen with sortable/filterable table and detail panel
- Active screen with start/stop controls, live log streaming
- Health screen with status indicators, colorized log viewer
- Settings screen with editable config (ORG_ID, LOCAL_DIR, MODE, credentials)
- Persistent config file (config.json in app data dir)
- Config resolution: config file → env var fallback
- Cross-platform Rust commands (macOS + Windows)
- Mission control dark theme with glassmorphism, radar sweep, status bar
- Process lifecycle management with proper cleanup

### Features (remaining)
- Bundled Python environment (python-build-standalone)
- Bundled harvest CLI (pip-installed in bundled venv)
- Bundled aria2c binary (platform-specific)
- Native folder picker for LOCAL_DIR (tauri-plugin-dialog)
- Build scripts for macOS (arm64, x64) and Windows (x64)
- Tauri app packaging and signing

### Known limitations (accepted for v1)
- Secrets (CLIENT_ID, CLIENT_SECRET) stored in plaintext config.json — acceptable for controlled client deployment, not for public distribution
- Full secret returned to frontend for Settings form pre-fill — local desktop app, no network exposure
- App version hardcoded ("0.1.0")
- `harvest --assets` output is plain text, not machine-parseable

---

## v2 — Hardening and Polish

### Security
- **OS keychain integration** — Store CLIENT_ID and CLIENT_SECRET in macOS Keychain / Windows Credential Manager. Config.json holds only non-sensitive fields.
- **Masked secret in frontend** — Never return full secret to React. Settings form sends new values to Rust but never receives the original back. "Change secret" workflow instead of pre-fill.
- **Config file permissions** — Set 0600 on Unix, restrict ACL on Windows.

### Features
- **Auto-update** — Check for new versions, download and apply updates (Tauri updater plugin)
- **Dynamic app version** — Read from Cargo.toml / tauri.conf.json at build time
- **Native folder picker** — Resolve tauri-plugin-dialog integration (deferred from v1 due to crate timeout)
- **Machine-parseable asset list** — Work with harvest team to add `--assets --json` flag for structured output
- **Download progress** — Real-time progress bars per file (requires aria2 RPC status polling from Rust)
- **Notification system** — Desktop notifications on download complete, errors, or config issues
- **Log export** — Export filtered logs to file from Health view

### UX
- **Onboarding wizard** — Step-by-step first-launch flow (credentials → directory → mode → test connection → start)
- **Keyboard shortcuts** — Start/stop, view switching, refresh
- **Tray icon** — Minimize to system tray, show status in tray menu
- **Multiple profiles** — Switch between sandbox/production with separate credential sets

### Technical debt
- `now_iso()` hand-rolled date formatter → replace with `chrono` crate
- Flag controls duplicated between Settings and Active → extract shared component
- Old `useConfig` hook cleanup (if not removed in v1 rework)
