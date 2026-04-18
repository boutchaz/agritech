# Design: cron-delta-sync

## Approach

### New shared helper: `getParcelSyncStartDate()`

Located in `SatelliteCacheService` (already injected by both crons). Logic:

```
getParcelSyncStartDate(parcelId, organizationId, plantingYear?):
  1. SELECT MAX(date) FROM satellite_indices_data 
     WHERE parcel_id = X AND organization_id = Y
  2. If found → return (max_date - 1 day)   // overlap safety
  3. If not found (first sync):
     a. If plantingYear exists:
        - parcelAge = currentYear - plantingYear
        - age ≥ 3  → today - 36 months
        - age 2-3  → today - 24 months
        - age < 2  → Jan 1 of plantingYear
     b. No plantingYear → today - 24 months
```

### Fix 1: Daily warmup (`satellite-sync.service.ts`)

`syncTimeSeries()` method changes:
- Add `planting_year` to the parcel SELECT query
- Call `getParcelSyncStartDate()` instead of fixed 6-month window
- Use `syncParcelSatelliteData()` (which has `force_refresh: true`) instead of `getTimeSeries()` (which hits cache)

### Fix 2: 5-day monitoring (`monitoring-cron.service.ts`)

`runMonitoringCycle()` changes:
- Add `planting_year` to the parcel SELECT query
- Call `getParcelSyncStartDate()` instead of fixed 10-day window
- Already uses `syncParcelSatelliteData()` with `force_refresh: true` ✅

### Data flow after fix

```
┌──────────────────────────────────────────────────────────┐
│  Both crons now:                                          │
│                                                          │
│  For each parcel:                                         │
│    start = getParcelSyncStartDate(parcel)                │
│    end   = today                                          │
│    syncParcelSatelliteData(parcel, start→end)            │
│      └─ force_refresh: true                              │
│      └─ calls FastAPI → GEE/CDSE                         │
│      └─ persists new points to satellite_indices_data     │
└──────────────────────────────────────────────────────────┘
```

## Risks
- First sync for old parcels (≥3 years) will fetch 36 months of data — potentially slow. Mitigated by CONCURRENCY=1 and the fact that this only happens once per parcel.
- The 1-day overlap on delta sync means we re-fetch the last day's data. Minor cost, prevents gaps from timezone edge cases.

## Files changed
1. `satellite-cache.service.ts` — add `getParcelSyncStartDate()` method
2. `satellite-sync.service.ts` — use delta sync + `syncParcelSatelliteData()`
3. `monitoring-cron.service.ts` — use delta sync via helper
