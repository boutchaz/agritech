# Tasks: cron-delta-sync

### 1. Add getParcelSyncStartDate() helper to SatelliteCacheService

- [x] **RED** — 5 tests: existing data → max_date-1, no data + planting ≥3yr → 36mo, <2yr → Jan 1, 2-3yr → 24mo, no planting → 24mo. → fails (method doesn't exist).
- [x] **ACTION** — Added `getParcelSyncStartDate()` to `satellite-cache.service.ts`. Queries MAX(date) from satellite_indices_data, falls back to planting_year-based logic.
- [x] **GREEN** — 5/5 tests pass.

### 2. Fix daily warmup to use delta sync

- [x] **RED** — 3 tests: selects planting_year, calls syncParcelSatelliteData with delta range, does NOT call getTimeSeries. → fails.
- [x] **ACTION** — In `satellite-sync.service.ts`: added planting_year to SELECT, replaced `getTimeSeries()` with `getParcelSyncStartDate()` + `syncParcelSatelliteData()`.
- [x] **GREEN** — 3/3 tests pass.

### 3. Fix 5-day monitoring to use delta sync

- [x] **RED** — 3 tests: selects planting_year, uses getParcelSyncStartDate, does NOT use fixed 10-day lookback. → fails.
- [x] **ACTION** — In `monitoring-cron.service.ts`: added planting_year to SELECT, replaced fixed 10-day range with `getParcelSyncStartDate()`.
- [x] **GREEN** — 3/3 tests pass.

### 4. Verify no TypeScript regressions

- [x] **RED** — `tsc --noEmit` → zero errors (baseline).
- [x] **ACTION** — No fixes needed.
- [x] **GREEN** — `tsc --noEmit` passes. All 11 new tests pass.
