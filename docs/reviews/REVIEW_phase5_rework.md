# Review + Test Report: Phase 5 Rework — Process Lifecycle Hardening

**Task:** 13fd7e49 | **Review task:** 1e8b3b5c
**Reviewer:** CR | **Date:** 2026-03-31
**Commit reviewed:** 9b7f382

## Verdict
PASS

All 3 High and 3 Medium findings from the original Phase 5 review are addressed. New findings are all Medium/Low.

## Original Finding Resolution

| Original Finding | Severity | Status | Notes |
|-----------------|----------|--------|-------|
| CR-01 (zombie/thread leak) | High | **Fixed** | `ProcessHandle` tracks child + thread handles. `cleanup_old_process` does `wait()` + `join()`. `stop_harvest` joins threads after kill. |
| CR-02 (redundant env vars) | High | **Fixed** | Removed explicit CANOPY_* re-setting. Comment at line 138 documents the decision. |
| CR-03 (epoch timestamps) | High | **Fixed** | `now_iso()` produces proper `2026-03-31T00:20:00Z` format via manual UTC calculation. |
| CR-04 (race on restart) | Medium | **Fixed** | `cleanup_old_process()` called before spawning new process. Does `wait()` + thread joins. |
| CR-05 (unbounded logs) | Medium | **Fixed** | `MAX_LOG_LINES = 1000` cap in Active.tsx with `slice(-MAX_LOG_LINES)`. |
| CR-06 (disconnected flags) | Medium | **Fixed** | `HarvestFlags` in Zustand store. Both Header and Active read from same source. |

## Code Review Findings

| Finding | Severity | Location | Description |
|---------|----------|----------|-------------|
| CR-01 | Medium | process.rs:148-171 | **Dead code: `done` flag.** `Arc<Mutex<bool>>` is created (line 148), cloned for stdout thread (line 153), and set to `true` on stdout EOF (line 171) — but nothing ever reads it. The stderr thread doesn't set it either. This was presumably scaffolding for a completion signal that wasn't needed since pipe EOF already terminates the threads. Should be removed. |
| CR-02 | Medium | process.rs:22-73 | **`now_iso()` is a 50-line hand-rolled date formatter.** While it avoids a `chrono` dependency, it's complex and easy to get wrong (leap year edge cases, month boundary math). A single-dep solution (`chrono::Utc::now().to_rfc3339()`) would be 1 line. Risk: edge case bugs in date calculation are hard to spot. I traced through the logic and it appears correct for dates through at least 2100, but it's a maintenance liability. |
| CR-03 | Medium | Header.tsx:21-28, Active.tsx:61-67 | **Flag serialization duplicated.** The `{ once: harvestFlags.once \|\| null, use_aria2: ... }` mapping is copy-pasted between Header and Active. Should be a shared function (e.g., in store.ts or a utility) to maintain DRY. If flag names change, both callsites must be updated. |
| CR-04 | Low | Active.tsx:34 | **Log cap creates new array on every event.** `[...prev, event.payload]` then `.slice(-MAX_LOG_LINES)` copies the array twice per log line. For high-throughput log streams this could cause GC pressure. A ring buffer would be more efficient, but for 1000 lines this is fine. |
| CR-05 | Low | process.rs:240-242 | **Double-wait on exited process.** `try_wait()` returns `Some(_)` (reaping the child), then `cleanup_old_process` calls `wait()` again. The second `wait()` returns `ECHILD` error which is silently ignored via `let _ =`. Functionally correct but slightly untidy. |

## Test Coverage Gaps

| Gap | Risk | Description |
|-----|------|-------------|
| TG-01 | Medium | `now_iso()` date calculation for leap year boundaries (Feb 29, Dec 31 of leap years) — complex manual logic |
| TG-02 | Low | Flag serialization divergence between Header and Active if one callsite is updated but not the other |
| TG-03 | Low | `stop_harvest` when process has already exited (between status poll and user click) — `kill()` would fail on dead process |

## Tests Written
Shadow mode — no gap tests written. Findings are advisory.

## Architecture Notes

This rework is a significant improvement. The process lifecycle is now properly managed with `ProcessHandle` bundling child + threads, and `cleanup_old_process` providing a single cleanup path. The Zustand flag store is clean and extensible.

Remaining tech debt:
- Dead `done` flag (CR-01) — trivial cleanup
- Hand-rolled `now_iso()` (CR-02) — works but fragile long-term
- Duplicated flag serialization (CR-03) — minor DRY violation

None of these are blocking. The core process lifecycle is sound.
