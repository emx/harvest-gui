# Review + Test Report: Bundling — Python, Harvest, and aria2c

**Task:** dc166ccd | **Review task:** eb075569
**Reviewer:** CR | **Date:** 2026-03-31
**Commit reviewed:** 8e6a222

## Verdict
PASS

No High severity findings. Bundling infrastructure is well-structured with proper dev/production fallback. ORG_ID preamble fix confirmed.

## Preamble Fix Verification

| Finding | Status |
|---------|--------|
| ConfigGuard CANOPY_ORG_ID | **Fixed** | Added to CRITICAL_FIELDS array (line 6). Now checks CLIENT_ID, CLIENT_SECRET, ORG_ID, LOCAL_DIR. |

## Code Review Findings

| Finding | Severity | Location | Description |
|---------|----------|----------|-------------|
| CR-01 | Medium | bundle.sh:47 | **`rm -rf "$RESOURCES_DIR"` deletes entire resources directory.** If someone accidentally sets RESOURCES_DIR to a wrong path, this is destructive. The variable is computed from the script's own location so the risk is low, but a safety check (`[[ "$RESOURCES_DIR" == *"src-tauri/resources" ]]`) would add a guard. |
| CR-02 | Medium | bundle.sh:93-102 | **macOS aria2c copies the system binary.** `cp $(command -v aria2c)` copies whatever `aria2c` is on PATH — could be a Homebrew binary linked against dynamic libraries not present on the target machine. A statically linked binary or Homebrew bottle would be more portable. CC acknowledges this with the warning message. Acceptable for v1 if the target machine is similar to the build machine. |
| CR-03 | Medium | mod.rs:27-32 | **Dev mode fallback uses relative path.** `PathBuf::from("resources/harvest-venv/bin/python")` is relative to the current working directory, which in `cargo tauri dev` is `src-tauri/`. This should work because Tauri sets the CWD to the `src-tauri` directory during dev. However, if the CWD changes (e.g. user launches from a different directory), the fallback breaks silently (returns None, falls back to `uv`). Documenting the CWD assumption would help. |
| CR-04 | Medium | mod.rs:178 | **`list_assets` now takes `AppHandle`.** This is a signature change that requires frontend update — the `invoke("list_assets")` calls in Health.tsx and AssetFetcher.tsx don't pass the app handle. However, Tauri auto-injects `AppHandle` for commands that declare it — the frontend doesn't need to pass it. Correct. |
| CR-05 | Low | bundle.sh:39 | **Python build tag `20250409` is hardcoded.** If the tag doesn't exist or the release is removed, the download fails. The script will fail fast (`set -euo pipefail` + curl `-f`), which is correct behavior. Consider using a `latest` redirect or checking the release exists. Minor — hardcoded versions are more reproducible. |
| CR-06 | Low | bundle.ps1:79 | **PowerShell string interpolation issue.** `Write-Host "  Venv:    $ResourcesDir\harvest-venv\"` — the trailing backslash-quote may cause issues in some PowerShell versions. Should escape or use single quotes for the suffix. |
| CR-07 | Low | bundle.sh:74-81 | **Local harvest install path hardcoded.** `$HOME/projects/harvest` assumes a specific development layout. This is clearly a dev convenience (falls back to PyPI), so it's fine. |
| CR-08 | Low | process.rs:144-147 | **HARVEST_ARIA2C_PATH set correctly.** The env var is only set when bundled aria2c exists — harvest falls back to system aria2c or skips it. Clean conditional. |

## Feature Delivery Audit

| Feature | Status | Notes |
|---------|--------|-------|
| bundle.sh (macOS/Linux) | OK | Downloads Python, creates venv, installs harvest, copies aria2c |
| bundle.ps1 (Windows) | OK | Same flow with PowerShell equivalents |
| Resource path resolution | OK | `bundled_python()` / `bundled_aria2c()` with production + dev fallback |
| tauri.conf.json resources | OK | `"resources/**/*"` glob registered |
| start_harvest bundled spawn | OK | Uses bundled Python if available, falls back to `uv run` |
| list_assets bundled spawn | OK | Same pattern, now takes AppHandle |
| HARVEST_ARIA2C_PATH injection | OK | Set when bundled aria2c exists |
| Dev mode fallback | OK | Returns None → uses `uv run` path |
| .gitkeep placeholder | OK | Ensures resource glob matches in dev |

## Test Coverage Gaps

| Gap | Risk | Description |
|-----|------|-------------|
| TG-01 | Medium | macOS aria2c portability — copied Homebrew binary may have dylib dependencies |
| TG-02 | Medium | `resources/` not in .gitignore — CC flagged this, needs CD to add |
| TG-03 | Low | Python build standalone version pinning — no verification of download integrity (checksum) |
| TG-04 | Low | Bundle size — standalone Python + venv + aria2c could be 100-200MB+ in the app bundle |

## Tests Written
Shadow mode — no gap tests written.

## Architecture Notes

The bundling architecture is sound:
- Clean separation: build script prepares resources, Tauri bundles them, Rust resolves paths at runtime
- Dev/production fallback is the right pattern — developers don't need to run bundle.sh for `cargo tauri dev`
- `bundled_python()` / `bundled_aria2c()` helpers are well-abstracted and reusable
- HARVEST_ARIA2C_PATH env var integration matches the Harvest CLI's existing support (PR #4)

Key concerns for production:
- Bundle size will be significant (Python alone is ~80MB)
- macOS code signing will need to handle the embedded Python binary and aria2c
- The `.gitignore` entry for `src-tauri/resources/` is needed to avoid committing ~200MB of binaries

Overall a clean v1 bundling implementation. The foundation is solid for refinement.
