# Review + Test Report: UX fixes — live log, stale data, Health delay, History layout, Disk Usage, Fetch Assets, log coloring

**Task:** 5a946f34 | **Review task:** 04085eca
**Reviewer:** CR | **Date:** 2026-04-01

## Verdict
PASS

7 UX fixes across 11 files. All root causes addressed correctly. Good architectural decisions (Zustand log store, app-level listener, split panel). CC also touched Header.tsx and Settings.tsx (not in original handoff scope) to clear logs on start — correct and necessary.

## Task Verification

### Task 1: Move harvest log listener to app level

| Item | Status | Notes |
|------|--------|-------|
| `harvestLogs` + `addHarvestLog` + `clearHarvestLogs` in store | OK | store.ts:27-29, 57-63. MAX_LOG_LINES=1000 cap. |
| `LogEntry` type exported from store | OK | store.ts:12-16 |
| App-level `listen("harvest-log")` in App.tsx | OK | App.tsx:44-51. Runs once on mount, pushes to store. |
| Active.tsx reads from store instead of local state | OK | Active.tsx:20-21. No local `logs` state, no local listener. |
| Clear logs on start — Active | OK | Active.tsx:40 calls `clearHarvestLogs()` |
| Clear logs on start — Header | OK | Header.tsx:30 calls `clearHarvestLogs()` |
| Clear logs on start — Settings | OK | Settings.tsx:67 calls `clearHarvestLogs()` |
| Error handling via store | OK | Active.tsx:47,59 use `useAppStore.getState().addHarvestLog()` |

### Task 2: refetchInterval on dashboard queries

| Query | refetchInterval | Status |
|-------|----------------|--------|
| useProcessed | 60_000 | OK (queries.ts:29) |
| useLastPoll | 60_000 | OK (queries.ts:38) |
| useCollectFiles | 60_000 | OK (queries.ts:47) |
| useDiskUsage | 60_000 | OK (queries.ts:92) |
| useCanopyDirCheck | 60_000 | OK (queries.ts:101) |
| useHarvestStatus | unchanged | OK (queries.ts:59, no refetchInterval — uses Active's setInterval) |

### Task 3: Health page delay fix

| Item | Status | Notes |
|------|--------|-------|
| `useEffect(() => { checkApi() })` removed | OK | Health.tsx:72 — no auto-check on mount |
| `apiLoading` default = `false` | OK | Health.tsx:52 |
| "Not checked" text when `apiOk === null` | OK | Health.tsx:91 ternary: `apiOk ? "OK" : apiOk === null ? "Not checked" : apiError \|\| "Failed"` |

### Task 4: Fetch Assets spinner

| Item | Status | Notes |
|------|--------|-------|
| `Loader2` import | OK | AssetFetcher.tsx:3 |
| Spinner when loading | OK | AssetFetcher.tsx:48-51 — `Loader2` with `animate-spin` replaces `List` icon |

### Task 5: History persistent split panel

| Item | Status | Notes |
|------|--------|-------|
| Always-visible DetailPanel | OK | History.tsx:215-219 — always rendered |
| Empty state | OK | History.tsx:33-36 — "Select a collect to view files" |
| Distinct background | OK | History.tsx:32 — `bg-black/30` |
| 60/40 width split | OK | History.tsx:149 (`w-[60%]`), History.tsx:32 (`w-[40%]`) |
| Independent scroll | OK | Both panels have `overflow-y-auto` |
| Selection in Zustand store | OK | History.tsx:81-82, store.ts:25-26 |
| Cleanup on unmount | OK | History.tsx:85-87 clears selection |

### Task 6: Disk Usage shows harvest data

| Item | Status | Notes |
|------|--------|-------|
| "Data Size" label | OK | Dashboard.tsx:122 |
| Primary value = `formatBytes(harvestSize)` | OK | Dashboard.tsx:122-123 |
| Extra text = "across N collects" | OK | Dashboard.tsx:128 |
| System disk percentage removed | OK | No `diskPct`/`diskColor` logic. `useDiskUsage` import removed. |
| Three metric cards: Processed, On Disk, Data Size | OK | Dashboard.tsx:101-131 |

### Task 7: Fix APP_RE for simplelog format

| Item | Status | Notes |
|------|--------|-------|
| Updated regex | OK | LogLine.tsx:14-15 — now handles two formats via alternation |
| Format 1: `HH:MM:SS [LEVEL] target: message` | OK | Groups 1-4 |
| Format 2: `[YYYY-MM-DDTHH:MM:SS LEVEL target] message` | OK | Groups 5-8 |
| Extraction logic updated | OK | LogLine.tsx:112-120 — checks which group matched |

## Code Review Findings

| Finding | Severity | Location | Description |
|---------|----------|----------|-------------|
| CR-01 | Medium | Health.tsx:89-91 | **API indicator shows red dot when "Not checked".** `ok={apiOk ?? false}` makes the indicator red when `apiOk` is null. The text says "Not checked" (correct) but the red dot implies failure. Consider a third state — grey dot for unchecked. Minor UX inconsistency. |
| CR-02 | Low | Active.tsx:47 | **`useAppStore.getState()` inside async handler.** Direct store access bypasses React's subscription model. Works correctly here (fire-and-forget error log), but breaks the pattern used elsewhere. Acceptable for error paths. |
| CR-03 | Low | LogLine.tsx:15 | **APP_RE alternation regex is complex.** Two capture group sets (1-4 and 5-8) in one regex with `(?:...|...)`. Could be two separate regexes tried in sequence for readability. Functional as-is. |
| CR-04 | Low | Dashboard.tsx:6 | **`useDiskUsage` import removed.** The `DiskUsage` query is still defined in queries.ts but no longer used anywhere. Dead code — minor, can clean up later. |

## Test Coverage Gaps

| Gap | Risk | Description |
|-----|------|-------------|
| TG-01 | Low | App-level listener cleanup on unmount — ensure no memory leak if App unmounts |
| TG-02 | Low | MAX_LOG_LINES cap — verify Zustand store correctly trims when >1000 entries arrive rapidly |

## Tests Written
Shadow mode — no gap tests written.

## Scope Note

CC touched 11 files (handoff specified 9). The extra files — `Header.tsx` and `Settings.tsx` — were correctly modified to call `clearHarvestLogs()` before starting harvest. This is necessary for Task 1 to work correctly from all start locations. Good judgment call by CC.
