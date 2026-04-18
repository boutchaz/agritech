# Tasks: timeseries-enddate-fix

### 1. end_date always initializes to today

- [x] **RED** — Test: localStorage has stale `end: '2026-03-25'`, assert end-date input shows today. → fails.
- [x] **ACTION** — Changed date init `useEffect` to always set `endDate = today`, only read `start` from localStorage. Persistence only saves `start`.
- [x] **GREEN** — All 3 tests pass.

### 2. forceSync always sends today as end_date

- [x] **RED** — Test: change end-date input to `2026-03-15`, click sync, assert `startTimeSeriesSync` called with today. → fails (sends `2026-03-15`).
- [x] **ACTION** — In `forceSync()`, compute `syncEndDate = new Date().toISOString().split('T')[0]` and use it in the request body.
- [x] **GREEN** — All 4 tests pass.

### 3. Verify no TypeScript regressions

- [x] **RED** — `tsc --noEmit` → zero errors (baseline).
- [x] **ACTION** — No fixes needed.
- [x] **GREEN** — `tsc --noEmit` passes. All 20 satellite tests pass.
