# Review + Test Report: GUI UX — logging noise, poll controls, cutover date, aria2 health

**Task:** 19bd6bf7 | **Review task:** 14ce1da8
**Reviewer:** CR | **Date:** 2026-04-01

## Verdict
PASS

4 features across 8 files. All correctly implemented. The aria2 RPC check using raw TCP is creative — avoids adding an HTTP client dependency.

## Task Verification

### Task 1: Reduce logging noise

| Log statement | Before | After | Status |
|--------------|--------|-------|--------|
| `canopy_dir resolved from config/env` | info! | removed | OK (mod.rs:71-84) |
| `config loaded from` | info! | removed | OK (config.rs:60-66) |
| `config saved to` | info! | kept | OK |
| `canopy_dir error` | error! | kept | OK |
| `config parse error` | error! | kept | OK |

### Task 2: Poll control redesign

| Location | Change | Status |
|----------|--------|--------|
| Header.tsx | Running → disabled "Harvest Poll Running" badge (green). Not running → "Start Poll" button. No stop. | OK (lines 61-74) |
| Active.tsx | Start button only shown when `!running` (line 102). No stop button. | OK |
| Settings.tsx | `StopPoll` component (lines 356-419). Red "Stop Poll" button, only when `status?.running` (line 290). Confirmation modal with backdrop blur. | OK |
| Modal | Overlay `bg-black/60 backdrop-blur-sm`, confirm/cancel buttons, warning text. | OK |

### Task 3: Cutover date

| Item | Status | Notes |
|------|--------|-------|
| Rust command `set_cutover_date` | OK | mod.rs:358-370. Creates `.harvest/` dir, writes `{"last_poll_ts": "<date>T00:00:00Z"}`. |
| Registered in lib.rs | OK | Line 51 |
| Settings UI `CutoverDate` component | OK | Settings.tsx:295-354. Date input + "Set Cutover" button. |
| Only shows when no poll data | OK | Line 302-303: `hasPollData = lastPoll && lastPoll.last_poll_ts; if (hasPollData) return null` |
| Amber accent (distinct from teal) | OK | `border-t-amber-500/40` (line 320) |

### Task 4: Aria2 RPC health indicator

| Item | Status | Notes |
|------|--------|-------|
| Rust command `check_aria2_rpc` | OK | mod.rs:372-408. Raw TCP to 127.0.0.1:6800, JSON-RPC `aria2.getVersion`, 2s timeout. |
| No `app: AppHandle` param | OK | Not needed — checks localhost directly. |
| Response check | OK | Checks for "200" or "\"result\"" in response (line 401). |
| Registered in lib.rs | OK | Line 52 |
| `useAria2Check` query hook | OK | queries.ts:105-111. `staleTime: 30_000`. |
| Health indicator | OK | Health.tsx:114-119. "Connected" / "Not reachable". |
| Grid changed to 4 columns | OK | Health.tsx:82 — `grid-cols-2 lg:grid-cols-4` (responsive). |

## Code Review Findings

| Finding | Severity | Location | Description |
|---------|----------|----------|-------------|
| CR-01 | Medium | mod.rs:373 | **`check_aria2_rpc` doesn't take AppHandle.** This is fine — it checks localhost. But if aria2 RPC port is ever configurable, this would need updating. Noted for future. |
| CR-02 | Medium | mod.rs:394-404 | **Raw TCP HTTP request is fragile.** Hand-crafted HTTP/1.1 request works but doesn't handle chunked encoding, redirects, or keep-alive. For a simple health check this is acceptable — the response is tiny and the connection is `close`. But if aria2 returns a different HTTP status or format, the check may false-negative. |
| CR-03 | Low | mod.rs:401 | **Response check `resp.contains("200")` is loose.** Could match "200" appearing in the body (e.g., a version number "1.200.0"). In practice aria2 responses are short and this is unlikely. |
| CR-04 | Low | Settings.tsx:302-303 | **Cutover visibility logic.** `useLastPoll()` returns error when `last_poll.json` doesn't exist (file not found). If the query errors, `lastPoll` is undefined, and `hasPollData` is false → cutover shows. But after setting a cutover date, `last_poll.json` now exists, so `useLastPoll` succeeds and `hasPollData` is true → cutover hides. This is correct but slightly subtle — the cutover date write creates the same file that `useLastPoll` reads, which auto-hides the cutover UI. Smart but implicit. |
| CR-05 | Low | Settings.tsx:310-316 | **Cutover doesn't invalidate `lastPoll` query.** After setting cutover, the `useLastPoll` query still has cached data showing no poll. The cutover UI stays visible until the query refetches (60s). Could `queryClient.invalidateQueries` after invoke. Minor UX delay. |

## Tests Written
Shadow mode — no gap tests written.
