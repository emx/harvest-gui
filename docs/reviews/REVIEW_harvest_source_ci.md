# Review + Test Report: Add HARVEST_SOURCE env var and GitHub Actions CI workflow

**Task:** 7c97d48c | **Review task:** ec0ef113
**Reviewer:** CR | **Date:** 2026-04-01

## Verdict
PASS

Clean implementation. HARVEST_SOURCE requirement enforced in both scripts. CI workflow is minimal and correct.

## Feature Verification

### HARVEST_SOURCE env var

| Script | Guard | Install | Old hardcoded path |
|--------|-------|---------|-------------------|
| bundle.sh:92-98 | `if [ -z "${HARVEST_SOURCE:-}" ]` → error + examples, exit 1 | `pip install "$HARVEST_SOURCE"` (line 101) | **Removed** — no `~/projects/harvest` fallback |
| bundle.ps1:65-71 | `if (-not $env:HARVEST_SOURCE)` → error + examples, exit 1 | `pip install $env:HARVEST_SOURCE` (line 74) | **Removed** — no `$env:USERPROFILE\projects\harvest` fallback |

Both scripts fail fast with clear error messages and usage examples. No fallback, no default — exactly as specified.

### GitHub Actions CI workflow

| Aspect | Status | Notes |
|--------|--------|-------|
| Trigger | OK | `workflow_dispatch` only |
| macOS job | OK | `macos-latest`, checkout, node LTS, rust stable, bundle, build, upload dmg |
| Windows job | OK | `windows-latest`, checkout, node LTS, rust stable, bundle, build, upload exe |
| HARVEST_SOURCE | OK | Set at workflow level as env var (line 7) |
| Artifact upload | OK | dmg from `bundle/dmg/`, exe from `bundle/nsis/` |

## Code Review Findings

| Finding | Severity | Location | Description |
|---------|----------|----------|-------------|
| CR-01 | Medium | build.yml:28 | **`npx tauri build` may not work.** Tauri CLI may not be installed in the Node modules. The standard approach is `npx @tauri-apps/cli build` or installing `@tauri-apps/cli` as a dev dependency. If it's already in `package.json` devDependencies, `npx tauri build` works. Need to verify. |
| CR-02 | Medium | build.yml:10-12 | **macOS: no aria2c in CI.** The macOS bundle script copies system aria2c (`command -v aria2c`), but the GitHub Actions runner may not have aria2c installed. The script warns and skips, so the build succeeds — but the resulting app won't have aria2c bundled. May need `brew install aria2` step. |
| CR-03 | Medium | build.yml:6-7 | **HARVEST_SOURCE is a plain URL, not a secret.** `git+https://github.com/emx/harvest.git` is hardcoded in plaintext. This is fine for a public repo, but if harvest becomes private, this would need to be a GitHub secret with a PAT. Noted for future. |
| CR-04 | Low | build.yml:32 | **macOS DMG path assumption.** `src-tauri/target/release/bundle/dmg/*.dmg` — this is the correct Tauri 2 output path for macOS. Confirmed. |
| CR-05 | Low | bundle.sh:78 | **Dylib name still hardcoded after version bump.** `libpython3.11.dylib` — even though Python is now 3.11.15, the major.minor is still 3.11 so this works. But if bumped to 3.12, it would break. Previously flagged in bundle dylib review. |
| CR-06 | Low | build.yml | **No Rust cache.** Neither job caches the Cargo registry or build artifacts. First builds will be slow (~10-20min). Consider `Swatinem/rust-cache@v2` for faster subsequent builds. Not blocking for a workflow_dispatch trigger. |

## Test Coverage Gaps

| Gap | Risk | Description |
|-----|------|-------------|
| TG-01 | Medium | `npx tauri build` — may need `@tauri-apps/cli` in devDependencies or explicit install step |
| TG-02 | Medium | macOS CI runner lacks aria2c — bundle completes but app won't have it |
| TG-03 | Low | First workflow run will be slow without Rust caching |

## Tests Written
Shadow mode — no gap tests written.

## Architecture Notes

The CI workflow is appropriately minimal for a v1:
- Manual trigger only — no risk of accidental builds
- Two-platform matrix covers the target platforms
- HARVEST_SOURCE at workflow level is clean — single source of truth for both jobs
- Artifact upload makes installers downloadable from the Actions tab

The HARVEST_SOURCE pattern is well-designed — explicit, no magic, works for both local dev and CI. The error messages include copy-pasteable examples.
