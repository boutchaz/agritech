# Brief: timeseries-enddate-fix

## Problem
The satellite timeseries page persists `end_date` in localStorage per parcel. Once saved, subsequent visits and syncs use the stale date — missing newer Copernicus imagery that's been published since.

Example: user visited on March 25, `end_date` saved as `2026-03-25`. On March 31, sync still asks for data up to March 25, missing 6 days of satellite passes.

## Goal
- The displayed chart range always extends to **today** (`end_date = new Date()`)
- The sync request (`forceSync`) always uses **today** as `end_date`
- `start_date` remains user-controllable (persisted in localStorage as before)

## Non-Goals
- Changing FastAPI/CDSE provider logic
- Changing the NestJS cache service
- Changing how `start_date` works

## Impact
- Users always see and sync the latest available satellite data
- Eliminates a silent data-staleness bug that's hard to diagnose
