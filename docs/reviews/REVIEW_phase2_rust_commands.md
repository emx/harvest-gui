# Review + Test Report: Phase 2 — Rust Commands for File Reads

**Task:** e52929e2 | **Review task:** d3663c99
**Reviewer:** CR | **Date:** 2026-03-30
**Commit reviewed:** 3e0ec0e

## Verdict
PASS

No High severity findings. No gap tests expose bugs (shadow mode — no gap tests written).

## Code Review Findings

| Finding | Severity | Location | Description |
|---------|----------|----------|-------------|
| CR-01 | Medium | commands/mod.rs:105 | Secret masking uses byte-index slicing (`&val[val.len() - 4..]`). Panics on multi-byte UTF-8 secrets. Use `val.chars()` for safe slicing. Low practical risk (secrets are typically ASCII) but technically unsound. |
| CR-02 | Medium | commands/mod.rs:129-142 | `tail_log` reads entire file into memory then keeps last N lines. For a large append-only log, this is wasteful. Consider seek-from-end or a ring buffer approach. Not a correctness bug but a latent performance issue. |
| CR-03 | Low | commands/mod.rs:46-82 | `list_collect_files` only reads one level deep. Matches spec ("one subdir per collect_id") — noting the assumption. |
| CR-04 | Low | commands/mod.rs:92 | `get_config` returns `Vec<ConfigEntry>` (not `Result`). Inconsistent with other commands but functionally correct since env var reads can't fatally fail. |

## Test Coverage Gaps

| Gap | Risk | Description |
|-----|------|-------------|
| TG-01 | Medium | Secret masking with secrets shorter than 4 characters — code returns `"****"` but untested path |
| TG-02 | Medium | Empty `collects/` directory — should return empty vec |
| TG-03 | Low | `tail_log` with `lines=0` — `saturating_sub` handles it but edge case untested |
| TG-04 | Low | Malformed JSON files — error path coverage for `get_processed` and `get_last_poll` |

## Tests Written
Shadow mode — no gap tests written. Findings are advisory.

## Notes

Overall quality is solid for a first-pass file-reading layer. The code is straightforward, error messages are descriptive, and the command registration is clean. The two Medium findings (CR-01, CR-02) are worth addressing before this code sees production load but are not blocking.

The test UI in App.tsx is appropriately simple for throwaway verification — no concerns there.
