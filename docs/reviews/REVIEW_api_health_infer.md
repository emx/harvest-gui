# Review + Test Report: Remove API-spawning health check, infer status from harvest logs

**Task:** d7e774fa | **Review task:** d9a5de4c
**Reviewer:** CR | **Date:** 2026-04-01

## Verdict
PASS

Critical fix — eliminates the token-burning API check. Log-based inference is the right approach. Clean removal of all `checkApi` machinery.

## Task Verification

### Task 1: Infer Canopy API status from harvest logs

| Item | Status | Notes |
|------|--------|-------|
| `checkApi()` removed | OK | No invoke("list_assets") call anywhere in Health.tsx |
| `useEffect` auto-check removed | OK | No setTimeout/checkApi |
| `apiOk/apiLoading/apiError` states removed | OK | No local state for API |
| `invoke` import removed | OK | Not needed anymore |
| `RefreshCw` import removed | OK | No refresh button |
| Refresh button removed | OK | No manual check button |
| `inferApiStatus` function | OK | Lines 60-84. Scans last 50 logs backwards. |
| Error patterns | OK | Lines 47-52: `harvest.poller`, `harvest.canopyauth`, `HTTP 4xx`, `rate_limit` |
| Success patterns | OK | Lines 54-58: `Token acquired`, `Found.*item`, `Poll cycle` |
| Not running → neutral | OK | Returns `{ok: null, text: "Not running"}` |
| Waiting state | OK | Returns `{ok: null, text: "Waiting for poll..."}` |
| Error snippet | OK | Truncates line to 60 chars with ellipsis |
| Reads from Zustand store | OK | Line 90: `useAppStore((s) => s.harvestLogs)` |

### Task 2: HealthIndicator neutral state

| Item | Status | Notes |
|------|--------|-------|
| `ok` prop type `boolean \| null` | OK | Line 17 |
| Dot: null → `bg-slate-500` | OK | Line 22 |
| Text: null → `text-slate-400` | OK | Line 24 |
| True → green, false → red | OK | Lines 22-24 |

### Task 3: Token warning on AssetFetcher

| Item | Status | Notes |
|------|--------|-------|
| Warning text present | OK | Line 55: "Uses one API token (50/day limit)" |
| Styling | OK | `text-[10px] text-slate-500` — muted, non-intrusive |

## Code Review Findings

| Finding | Severity | Location | Description |
|---------|----------|----------|-------------|
| CR-01 | Low | AssetFetcher.tsx:55 | **Token warning is a third child in `justify-between` flex row.** CardHeader has `flex flex-row items-center justify-between` with 3 children (title, button, warning). With `justify-between`, the warning gets pushed to the far right. May look slightly off-layout. Consider placing the warning below the button or inside the button's parent span. |
| CR-02 | Low | Health.tsx:66-81 | **Error patterns checked before success patterns per-line.** Correct priority — if a line matches both error and success patterns, error wins. But the scan stops at the first matching line overall (backwards), so a recent success line could mask an older error. This is by design — most recent status wins. |
| CR-03 | Low | Health.tsx:50 | **`HTTP\s+4\d\d` catches all 4xx errors.** This includes 404 (not found) which may not indicate an API auth issue. Acceptable since the harvest process wouldn't normally produce 404s for auth endpoints. |

## Architecture Notes

The inferApiStatus approach is elegant — no network calls, no token consumption, reactive to live logs via Zustand. When harvest starts, the indicator naturally transitions from "Not running" → "Waiting for poll..." → "OK" (or error) as log lines arrive. This is a zero-cost health signal.

## Tests Written
Shadow mode — no gap tests written.
