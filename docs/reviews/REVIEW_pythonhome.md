# Review + Test Report: Set PYTHONHOME when spawning bundled Python

**Task:** ec98c491 | **Review task:** 5e621561
**Reviewer:** CR | **Date:** 2026-04-01

## Verdict
PASS

Critical portability fix correctly applied to both spawn sites.

## Fix Verification

| Spawn site | PYTHONHOME set | Fallback path unchanged |
|-----------|---------------|------------------------|
| mod.rs:178-188 (`list_assets`) | OK — `resource_dir/resources/python` | OK — `uv run` path has no PYTHONHOME |
| process.rs:114-128 (`start_harvest`) | OK — `resource_dir/resources/python` | OK — `uv run` path has no PYTHONHOME |

Both use identical resolution: `app.path().resource_dir().map(|d| d.join("resources/python")).unwrap_or_default()`.

## Code Review Findings

| Finding | Severity | Location | Description |
|---------|----------|----------|-------------|
| CR-01 | Low | mod.rs:184, process.rs:119 | **`unwrap_or_default()` produces empty PathBuf on resource_dir failure.** If `resource_dir()` returns Err, PYTHONHOME is set to `""` — Python will likely crash with a different error. However, if resource_dir fails, `bundled_python()` would have already returned None (it also calls `resource_dir`), so this code path is unreachable. The `unwrap_or_default` is dead code defense. Acceptable. |

No other findings. Clean, minimal fix.
