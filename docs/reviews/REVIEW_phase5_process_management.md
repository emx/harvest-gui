# Review + Test Report: Phase 5 — Process Management

**Task:** cc3af185 | **Review task:** cc362443
**Reviewer:** CR | **Date:** 2026-03-31
**Commit reviewed:** cc80204

## Verdict
FAIL — High severity finding CR-01 (zombie process / resource leak)

## CR Fix Verification

| Phase 4 Finding | Status | Notes |
|-----------------|--------|-------|
| CR-02 (formatBytes duplication) | Fixed | Extracted to `src/lib/format.ts`. Dashboard and History import from shared utility. |
| CR-05 (view routing) | Fixed | App.tsx now uses `views` component map — clean, extensible. |
| CR-01 (button icon-xs) | Verified | CC confirmed variant exists in button.tsx. |

## Code Review Findings

| Finding | Severity | Location | Description |
|---------|----------|----------|-------------|
| CR-01 | **High** | process.rs:84-128 | **Zombie process / resource leak.** `stdout` and `stderr` are `take()`n from the `Child` before it's stored in managed state. The spawned reader threads hold the pipes and will run until the process exits. However, the `Child` stored in state has had its stdio handles removed. When `stop_harvest` calls `child.kill()` + `child.wait()`, the process is killed — but the reader threads may still be blocked on `reader.lines()`. If the process is killed abruptly, the reader threads will exit on broken pipe, but there's no join or cleanup. More critically: **if `start_harvest` is called, the process exits on its own (e.g. `--once` mode), `harvest_status` sets `*guard = None` dropping the `Child`, but the reader threads have no signal to stop.** The threads are detached and will clean up naturally when the pipe closes, so this is a resource leak rather than a hang — but it means old threads can linger. |
| CR-02 | **High** | process.rs:74-79 | **Env var inheritance is wrong.** `Command::new()` by default inherits the full parent environment. Then lines 75-79 explicitly re-set only CANOPY_* vars. This is redundant but harmless — **unless** the intent was to pass *only* CANOPY vars (sandboxing). As written, the child inherits ALL parent env vars plus the redundant re-sets. If the GUI is launched with sensitive env vars, the child harvest process inherits them all. Given this is a local desktop app the practical risk is low, but the code's intent is unclear. |
| CR-03 | **High** | process.rs:16-23 | **`now_iso()` returns Unix epoch seconds, not an ISO timestamp.** The comment says "Simple ISO-ish timestamp" but the output is just a number like `1711843200`. The frontend `LogEntry.timestamp` field receives this. The Active.tsx component doesn't display timestamps (it only displays `entry.line`), so this is invisible now — but when timestamps are displayed, they'll be raw epoch numbers, not parseable dates. |
| CR-04 | Medium | process.rs:44-49 | **Race condition on "already running" check.** `start_harvest` holds the Mutex while checking + spawning. This is correct for serialization. However, `try_wait` on line 45 mutates the child's state — if the process has exited, the status is consumed. After `try_wait` returns `Some(_)`, the old `Child` is still in the `Option` but the code falls through to spawn a new one and overwrite `*guard`. The old `Child` is dropped without `wait()`, which on some platforms may leave a zombie. Should explicitly `guard.take()` and `child.wait()` before proceeding. |
| CR-05 | Medium | Active.tsx:33 | **Unbounded log accumulation.** `setLogs((prev) => [...prev, event.payload])` appends every log line forever. For a long-running harvest process, this will consume increasing memory and degrade render performance. Should cap at a reasonable limit (e.g., last 1000 lines). |
| CR-06 | Medium | Header.tsx:19 | **Header start uses empty flags `{}`.** When clicking "Start Poll" from the header, it passes `{ flags: {} }`. The Rust side will default all flags to None/false, which is fine — but the user might expect the Active view's flag settings to be respected. The two start paths (header vs Active view) are disconnected. |
| CR-07 | Low | Active.tsx:59 | **Boolean flags sent as `true \| null` instead of `true \| false`.** `once: once \|\| null` sends `null` when false. The Rust `Option<bool>` deserializes `null` as `None`, which works, but it's an unusual pattern. `false` would be clearer and still work (Rust would get `Some(false)` which `unwrap_or(false)` handles identically). |

## Test Coverage Gaps

| Gap | Risk | Description |
|-----|------|-------------|
| TG-01 | High | Process exits on its own (--once mode) — does harvest_status correctly detect exit? Does the next start_harvest correctly clean up? The `try_wait` path in start_harvest doesn't call `wait()` on the dead child. |
| TG-02 | High | Rapid start/stop/start sequence — potential race between reader threads and new process startup |
| TG-03 | Medium | Long-running process with thousands of log lines — memory/render performance of Active.tsx |
| TG-04 | Medium | `uv` not on PATH — spawn error handling works, but error message may be cryptic |
| TG-05 | Low | Include/exclude flags with spaces or special characters — shell escaping? `Command::arg()` handles this correctly (no shell), so this is actually safe. |

## Tests Written
Shadow mode — no gap tests written. Findings are advisory.

## Architecture Notes

Good choices:
- `Mutex<Option<Child>>` for managed state is the standard Tauri pattern
- Separate `process.rs` module keeps the commands organized
- Streaming via `BufReader::lines()` + Tauri events is clean
- 3-second status polling in Active.tsx catches external process exit
- Component map routing in App.tsx is much cleaner than the previous conditional chain
- `lib/format.ts` extraction is well-done

Concerns:
- The three High findings (CR-01 zombie/leak, CR-03 fake timestamps, CR-04 race on restart) collectively indicate the process lifecycle needs hardening. This is the most safety-critical code in the app — spawning and killing child processes must be bulletproof.
- The `now_iso()` function is particularly concerning as it suggests the timestamp implementation was rushed.
- CR-06 (disconnected start paths) is a UX design issue that CD should weigh in on.
