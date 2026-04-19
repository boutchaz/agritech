# Chill Hours — Hourly Fetch & Single Source of Truth — Brief

## Problem

Two competing chill-hours numbers exist in the product:

| Surface | Value | Method | Threshold | Window |
|---|---|---|---|---|
| Calibration page (`block_b.phenology_dashboard.chill`) | 409h | Sine model from daily Tmin/Tmax | 7.2°C | Nov–Feb |
| Weather tab (`PhenologicalTemperatureCounters`) | 215h | Sine model from daily Tmin/Tmax (client-side) | 10°C | Dec–Feb |

The same parcel shows two different chill-hour totals on two different pages. Hassan and Karim both see this and lose trust. The discrepancy comes from (1) different threshold constants, (2) different month windows, (3) duplicated client/server math, (4) sine modeling instead of real hourly data.

Beyond chill, the weather tab computes ~12 phenological thresholds (frost, optimal flowering, heat stress, growing hours, extreme heat) per crop with the same drift problem. Each one risks the same dual-source split.

## Goal

Make backend the single source of truth for all phenological hour-counters. Eliminate frontend temperature math. Switch the source data from sine-modeled daily to real hourly readings from Open-Meteo Archive. Numbers in the UI become consistent across surfaces and more accurate against ground truth.

## Non-Goals

- Not adding new agronomic indicators — only consolidating existing ones
- Not replacing the daily weather pipeline (everything else still runs on daily)
- Not changing variety chill brackets (`heures_froid_requises` in `DATA_OLIVIER.json`)
- Not touching `ChillHoursGauge` UI shape — it just receives a more accurate number
- Not implementing a sine fallback — hard fail per locked decision
- Not backfilling existing calibrations (lazy migration only)

## Scope

### Backend (FastAPI — `backend-service/`)

1. New helper `fetch_hourly_temperature(lat, lon, start, end)` in `weather_service.py`
   - GETs Open-Meteo Archive `hourly=temperature_2m`
   - Caches into new `weather_hourly_data` table
   - Cache-aside pattern mirroring existing `weather_daily_data`
2. New helper `count_hours_below_threshold(rows, threshold, compare, upper=None)`
   - Generic counter over hourly rows
3. New helper `compute_phenological_counters(lat, lon, year, crop_type, referentiel)`
   - Reads stage definitions from referentiel (new `phenological_stages` block)
   - For each stage threshold: count from cached hourly via above helper
   - Caches result row in new `weather_threshold_cache` table
4. Two endpoints:
   - `GET /weather/hour-counter` — generic counter (engineer-facing)
   - `GET /weather/phenological-counters?lat&lon&crop_type&year` — stage-aware (UI-facing)
5. Rewire `s2_weather_extraction.py` chill computation:
   - Replace `estimate_chill_hours()` sinusoidal sum with hourly fetch + count
   - Hard fail with clear error message when Open-Meteo unavailable

### Referentiel changes (per-crop JSON)

6. Add `phenological_stages` block to each `DATA_*.json`:
   ```
   "phenological_stages": [
     {
       "key": "dormancy",
       "name_fr": "Dormance",
       "months": [11, 12, 1, 2],
       "thresholds": [
         { "key": "chill", "label_fr": "Heures de froid", "compare": "below", "value": 7.2 },
         { "key": "frost_risk", "label_fr": "Risque de gel", "compare": "below", "value": 0 }
       ]
     },
     ...
   ]
   ```
7. Add to all 4 referentiel files (`DATA_OLIVIER`, `DATA_AGRUMES`, `DATA_AVOCATIER`, `DATA_PALMIER_DATTIER`)
8. Mirror current `PhenologicalTemperatureCounters.tsx` config in JSON shape

### NestJS layer

9. Proxy or direct frontend call — to confirm during planning. Likely frontend hits FastAPI directly (matches existing satellite-proxy pattern).

### Frontend (`project/`)

10. Delete hardcoded `cropPhenologicalConfig` in `PhenologicalTemperatureCounters.tsx`
11. Replace local `calculateCountersForData()` with `useQuery` against `/weather/phenological-counters`
12. Render whatever stages + thresholds the backend returns (no client-side compute)
13. Loading + error states (errors no longer silent — endpoint can hard-fail)

### Database

14. New table `weather_hourly_data` (lat, lon, datetime, temperature_2m, …)
15. New table `weather_threshold_cache` (lat, lon, year, crop_type, stage_key, threshold_key, count)
16. RLS policies (read-only for org members, writes from service role)

## Key Design Decisions (from discovery)

1. **B1 wide** — server-computed scalar for all 12+ thresholds, single endpoint serves crops generically
2. **Cache option 3** — raw hourly cached for source-of-truth, computed counts cached for hot-path queries
3. **No fallback** — Open-Meteo failure = hard fail with explicit error; cache insulates after first hit per (lat, lon, year)
4. **Lazy migration** — old calibrations keep their sine numbers in `step2.chill_hours`; next calibration replaces with hourly value
5. **Referentiel-driven windows** — stage definitions live in `DATA_*.json`, generic across crops, eliminates hardcoded duplication between client and pipeline

## Impact

- **Karim** (300ha, 5 parcels): chill numbers agree across calibration + weather tab. Trust restored.
- **Hassan** (agronome, 5–15 farms): more accurate chill (real hourly vs sine ±15% bias). Defensible against literature.
- **Ahmed** (50ha, no tech): no behavior change visible.
- **Coastal parcels** (flat diurnal): chill numbers will drop noticeably (sine overestimates flat-cycle chill). Was over-reporting "green" status; will correct.
- **Mountain parcels**: slight chill increase.

## Risks

- **SIAM-week (April 20-26) hard-fail risk**: if Open-Meteo has an outage during the demo week, calibrations fail loudly instead of degrading. Mitigation: cache pre-warming script for showcased parcels.
- **Open-Meteo rate limit (10k/day free tier)**: each new (lat, lon, year) triple = 1 API call. ~50 parcels × 4 calibrations/year = 200 calls/year — well under cap. Backfill of historic data could spike usage.
- **Frontend regression**: weather tab loses local computation. If endpoint is slow, page feels slower than today. Mitigation: aggressive `staleTime` in TanStack Query, server-side cache hot for re-renders.
- **Referentiel schema change**: adding `phenological_stages` to JSON files. Other consumers (calibration prompts) may need awareness. Risk low because we're adding, not modifying existing keys.
- **Lazy migration UX**: parcels that don't recalibrate will continue showing the sine number indefinitely. Decision: accept this. Hassan-grade users can manually trigger recalibration when they care.
