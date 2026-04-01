# Review + Test Report: Download progress panel via direct aria2 RPC

**Task:** 85911008 | **Review task:** 3b7ca803
**Reviewer:** CR | **Date:** 2026-04-01

## Verdict
PASS

Well-designed feature. Shared `aria2_rpc_call` helper avoids duplicating TCP logic for new commands. DownloadProgress component is clean — auto-hides when no downloads, shows progress bars with speed/ETA/connections. 2s polling interval is appropriate for download monitoring.

## Task Verification

### Task 1: Rust command `get_download_progress`

| Item | Status | Notes |
|------|--------|-------|
| `DownloadEntry` struct | OK | mod.rs:410-419. gid, filename, status, total/completed/speed bytes, connections. |
| `aria2_rpc_call` shared helper | OK | mod.rs:421-458. Raw TCP, 64KB buffer, loop read, HTTP header strip, JSON parse. Returns `Option<Value>`. |
| `parse_download_entries` | OK | mod.rs:460-520. Extracts gid, status, totalLength, completedLength, downloadSpeed, connections. Filename from `files[0].path` with cross-platform basename extraction. Falls back to gid if no path. |
| `get_download_progress` command | OK | mod.rs:522-541. Calls `tellActive` and `tellWaiting` with `token:harvest123`. Returns empty vec if not reachable. |
| Registered in lib.rs | OK | Line 53 |

### Task 2: React query hook

| Item | Status | Notes |
|------|--------|-------|
| `DownloadEntry` interface | OK | queries.ts:105-113. Mirrors Rust struct. |
| `useDownloadProgress(enabled)` | OK | queries.ts:115-123. refetchInterval: 2_000, staleTime: 1_000, conditional enabled. |

### Task 3: DownloadProgress component

| Feature | Status | Notes |
|---------|--------|-------|
| Hide when empty | OK | Line 76: returns null if no downloads |
| Active downloads | OK | Progress bar (teal-500 on slate-800), percentage, speed, ETA, connections |
| Queued downloads | OK | Filename with "Queued" badge |
| Speed formatting | OK | B/s → KB/s → MB/s |
| ETA formatting | OK | Seconds → minutes+seconds → hours+minutes |
| Progress bar animation | OK | `transition-all duration-500` for smooth updates |
| Active count badge | OK | Header shows "N active" |

### Task 4: Active page placement

| Item | Status | Notes |
|------|--------|-------|
| Import | OK | Active.tsx:10 |
| Placement | OK | Line 123 — between AssetFetcher and Live Log |
| `enabled={running}` | OK | Only polls when harvest is running |

## Code Review Findings

| Finding | Severity | Location | Description |
|---------|----------|----------|-------------|
| CR-01 | Medium | mod.rs:372-408 vs 421-458 | **`check_aria2_rpc` duplicates TCP logic instead of using `aria2_rpc_call`.** New shared helper exists but old command wasn't refactored. Could be `check_aria2_rpc() -> bool { aria2_rpc_call(getVersion_body).is_some() }`. DRY concern — two TCP implementations to maintain. |
| CR-02 | Medium | mod.rs:528, 535 | **Hardcoded RPC secret `token:harvest123`.** This is correct per the handoff (harvest Python hardcodes it too), but if the secret ever changes, it needs updating in two places (Python + Rust). Not a security risk since it's localhost-only. |
| CR-03 | Low | mod.rs:522-541 | **`get_download_progress` makes two sequential TCP connections.** Each `aria2_rpc_call` opens a new connection (Connection: close). aria2 supports JSON-RPC batching (send array of requests). Could batch both calls into one connection. Minor perf concern at 2s polling. |
| CR-04 | Low | DownloadProgress.tsx:32 | **Filename truncation `max-w-[70%]`.** Long filenames will truncate. This is intentional — the right side needs space for percentage. Acceptable. |
| CR-05 | Low | mod.rs:439 | **Read timeout 3s vs connect timeout 2s.** Asymmetric but fine — reads may take longer if aria2 is processing a large tellActive response. |

## Test Coverage Gaps

| Gap | Risk | Description |
|-----|------|-------------|
| TG-01 | Low | `parse_download_entries` with malformed JSON (missing fields, wrong types) |
| TG-02 | Low | ETA calculation edge cases (speed=0, remaining=0, very large values) |

## Tests Written
Shadow mode — no gap tests written.

## Architecture Notes

Good decision to extract `aria2_rpc_call` as a shared helper. The loop-read pattern (mod.rs:446-452) is a significant improvement over the original `check_aria2_rpc` which only read 1KB — important since `tellActive` can return substantial JSON for many concurrent downloads.

The frontend component correctly auto-hides when empty and uses conditional query enabling, which means no unnecessary TCP connections when harvest isn't running.
