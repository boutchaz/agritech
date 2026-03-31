# Tasks: timeseries-enddate-fix

### 1. end_date always initializes to today

- [ ] **RED** — Write `project/src/components/SatelliteAnalysisView/__tests__/timeseries-enddate.test.tsx`: Mock `localStorage` with a stored date range `{ start: '2024-03-25', end: '2026-03-25' }`. Render `TimeSeriesChart` with a stub parcelId/boundary. Assert the end-date input's value equals today's date (`2026-03-31`), NOT the persisted `2026-03-25`. Run `cd project && npx vitest run src/components/SatelliteAnalysisView/__tests__/timeseries-enddate.test.tsx` → fails.
- [ ] **ACTION** — In `TimeSeriesChart.tsx`, change the `useEffect` that initializes dates: always set `endDate` to `new Date().toISOString().split('T')[0]`. Only read `start` from localStorage. Update the persistence `useEffect` to only save `startDate`.
- [ ] **GREEN** — Run `cd project && npx vitest run src/components/SatelliteAnalysisView/__tests__/timeseries-enddate.test.tsx` → passes.

### 2. forceSync always sends today as end_date

- [ ] **RED** — In the same test file, add a test: mock `satelliteApi.startTimeSeriesSync` and `satelliteApi.getTimeSeriesSyncStatus`. Set displayed `endDate` input to a past date `2026-03-15` (simulating user manually changing it mid-session). Click the "Récupérer depuis satellite" button. Assert `startTimeSeriesSync` was called with `date_range.end_date` equal to today's date, not `2026-03-15`. Run test → fails.
- [ ] **ACTION** — In `forceSync()`, override `endDate` with `new Date().toISOString().split('T')[0]` before building the sync request body.
- [ ] **GREEN** — Run test → passes.

### 3. Verify no TypeScript regressions

- [ ] **RED** — Run `cd project && npx tsc --noEmit` — check current state compiles.
- [ ] **ACTION** — Fix any type errors introduced by the changes (if any).
- [ ] **GREEN** — Run `cd project && npx tsc --noEmit` → zero errors.
