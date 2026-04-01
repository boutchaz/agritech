# Brief: cron-delta-sync

## Problem
Both satellite cron jobs fail to fetch new imagery:

1. **Daily warmup (03:00)** — calls `cache.getTimeSeries()` without `force_refresh`, so once ≥3 points exist in DB it always gets a cache HIT and never contacts the satellite service. Effectively a no-op after first sync.
2. **5-day monitoring (04:00)** — uses `force_refresh: true` (good) but has a fixed 10-day lookback. For parcels that haven't been synced in a while, this misses the gap.

Both crons also use a fixed date window (6 months / 10 days) instead of syncing only the delta since last sync.

## Goal
- Both crons use **delta sync**: from last synced date → today, with `force_refresh: true`
- For parcels with **no existing data** (first sync), lookback is based on parcel age via `planting_year`:
  - Age ≥ 3 years → 36 months
  - Age 2–3 years → 24 months  
  - Age < 2 years → from Jan 1 of planting year
  - No planting_year → 24 months (default)
- Shared helper method for start_date resolution (used by both crons)

## Non-Goals
- Changing the calibration service's lookback logic (stays at 730 days)
- Changing FastAPI / CDSE provider
- Changing cron schedules or concurrency guards
- Changing the frontend (already fixed in timeseries-enddate-fix)

## Impact
- Satellite data stays fresh daily for all parcels
- New parcels get appropriate historical depth on first sync
- Reduced wasted work — only fetching the delta, not re-querying months of cached data
