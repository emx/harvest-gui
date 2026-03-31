# Harvest GUI — v1 / v2 Design Scope

**Created:** 2026-03-31
**Last updated:** 2026-03-31
**Status:** Active

---

## v1 — Ship It (current)

The goal: a working, polished desktop app that a client can install, configure, and use without touching a terminal.

### Features (complete)
- Dashboard with poll status, metrics, recent activity, disk usage
- History screen with sortable/filterable table and detail panel (horizontal split)
- Active screen with start/stop controls, live log streaming
- Health screen with status indicators (daemon/config/API), colorized log viewer
- Settings screen with editable config (ORG_ID, LOCAL_DIR, MODE, credentials)
- Persistent config file (config.json in app data dir)
- Config resolution: config file → env var fallback
- Cross-platform Rust commands (macOS + Windows)
- Mission control dark theme with glassmorphism, radar sweep, status bar
- Process lifecycle management with proper cleanup (ProcessHandle, thread joining)
- Bundled Python environment (python-build-standalone 3.11)
- Bundled harvest CLI (pip-installed in bundled venv)
- Bundled aria2c binary (platform-specific)
- Build scripts for macOS/Linux (bundle.sh) and Windows (bundle.ps1)
- ConfigGuard for first-launch UX (redirects unconfigured views to Settings)
- HARVEST_ARIA2C_PATH env var injection for bundled aria2c

### Design Decisions (v1)

**Config storage: JSON, not TOML**
Config file uses JSON (`config.json`), not TOML. CC chose JSON to avoid a `toml` crate dependency. JSON is fine for a simple flat config. Accepted.

**Config format: plaintext secrets**
CLIENT_ID and CLIENT_SECRET are stored in plaintext in `config.json` in the app data directory. Accepted for v1 because this is a controlled client deployment, not a public app store release. The config file has default OS permissions. Deferred to v2: OS keychain integration.

**Full secret returned to frontend**
`load_config` returns unmasked secrets to the frontend for Settings form pre-fill. Accepted for v1 because the secret stays within local Tauri IPC — no network exposure. Deferred to v2: masked-only secret with "change secret" workflow.

**macOS aria2c: copy system binary**
`bundle.sh` copies the Homebrew `aria2c` binary. Homebrew's aria2 on macOS links against system libraries (libSystem, libc++, libiconv) and uses SecureTransport (not OpenSSL). System libraries are present on all macOS versions. The binary works on any macOS >= the build machine's version. Accepted for v1. For v2: consider static builds or downloading from aria2 releases.

**Windows aria2c: official static release**
`bundle.ps1` downloads the official aria2 release ZIP — a static build with no external dependencies. No portability concerns on Windows.

**Dev mode fallback: `uv run`**
`bundled_python()` checks for the bundled Python binary. If not found (dev mode without `bundle.sh`), returns `None`, and spawn commands fall back to `uv run python -m harvest`. The dev fallback uses a relative path (`resources/harvest-venv/bin/python`) which depends on CWD being `src-tauri/`. If the relative path doesn't match, it harmlessly falls through to `uv run`. Production path uses `resource_dir()` and is always correct.

**Python build tag: hardcoded**
`bundle.sh` pins Python build tag `20250409` from python-build-standalone. Hardcoded is intentional — makes builds reproducible. Two developers building on different days get the same Python. python-build-standalone releases are permanent (never deleted).

**Tauri auto-injects AppHandle**
`list_assets` takes `AppHandle` as a parameter. Tauri auto-injects this — the frontend doesn't pass it. `invoke("list_assets")` works with no args. Standard Tauri pattern.

**PowerShell escaping**
`bundle.ps1` uses backslash in path strings (e.g. `$ResourcesDir\harvest-venv\`). PowerShell does not use backslash escaping (uses backtick). This is correct — the backslash is a literal Windows path character.

**Local harvest install path**
`bundle.sh` tries `$HOME/projects/harvest` first, falls back to PyPI. Dev convenience — a CI machine without the local directory gets the PyPI version automatically.

### Known limitations (accepted for v1)
- Secrets stored in plaintext config.json (see design decision above)
- Full secret returned to frontend (see design decision above)
- App version hardcoded ("0.1.0")
- `harvest --assets` output is plain text, not machine-parseable
- Native folder picker deferred (tauri-plugin-dialog crate timeout during build)
- macOS aria2c portability depends on build machine's macOS version
- Bundle size ~100-200MB (standalone Python ~80MB + venv + aria2c)

### Remaining v1 work
- Native folder picker for LOCAL_DIR (retry tauri-plugin-dialog)
- Tauri app packaging and code signing
- Real-life validation on both macOS and Windows

---

## v2 — Hardening and Polish

### Security
- **OS keychain integration** — Store CLIENT_ID and CLIENT_SECRET in macOS Keychain / Windows Credential Manager. Config.json holds only non-sensitive fields.
- **Masked secret in frontend** — Never return full secret to React. Settings form sends new values to Rust but never receives the original back. "Change secret" workflow instead of pre-fill.
- **Config file permissions** — Set 0600 on Unix, restrict ACL on Windows.

### Features
- **Auto-update** — Check for new versions, download and apply updates (Tauri updater plugin)
- **Dynamic app version** — Read from Cargo.toml / tauri.conf.json at build time
- **Native folder picker** — Resolve tauri-plugin-dialog integration (if not resolved in v1)
- **Machine-parseable asset list** — Work with harvest team to add `--assets --json` flag for structured output
- **Download progress** — Real-time progress bars per file (requires aria2 RPC status polling from Rust)
- **Notification system** — Desktop notifications on download complete, errors, or config issues
- **Log export** — Export filtered logs to file from Health view
- **Static aria2c for macOS** — Download static build from aria2 releases instead of copying Homebrew binary

### UX
- **Onboarding wizard** — Step-by-step first-launch flow (credentials → directory → mode → test connection → start)
- **Keyboard shortcuts** — Start/stop, view switching, refresh
- **Tray icon** — Minimize to system tray, show status in tray menu
- **Multiple profiles** — Switch between sandbox/production with separate credential sets

### Technical debt
- `now_iso()` hand-rolled date formatter → replace with `chrono` crate
- Flag controls duplicated between Settings and Active → extract shared component
