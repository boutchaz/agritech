# Chill Hours — Hourly Fetch — Design

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Open-Meteo Archive                                                       │
│   GET /v1/archive?hourly=temperature_2m                                  │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │ (one fetch per new lat,lon,year)
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│ FastAPI: weather_service.fetch_hourly_temperature(lat, lon, start, end)  │
│                                                                          │
│   1. Read cached rows from weather_hourly_data                           │
│   2. Identify gaps                                                       │
│   3. Fetch only missing ranges from Open-Meteo                           │
│   4. Persist new rows                                                    │
│   5. Return full hourly series                                           │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                ┌────────────────┴─────────────────┐
                ▼                                  ▼
┌──────────────────────────┐    ┌────────────────────────────────────────┐
│ Calibration engine       │    │ FastAPI: phenological-counters service │
│ s2_weather_extraction.py │    │                                        │
│                          │    │   1. Load referentiel for crop_type    │
│ Replaces sine sum:       │    │   2. For each stage in phenological_   │
│   chill_hours = count(   │    │      stages:                           │
│     hourly,              │    │      For each threshold in stage:      │
│     where T < 7.2,       │    │        count = count_hours(            │
│     in months {11,12,    │    │          hourly_in_window,             │
│              1,2})       │    │          threshold.compare,            │
│                          │    │          threshold.value,              │
│   Hard fail on fetch     │    │          threshold.upper)              │
│   failure (no fallback)  │    │   3. Cache row in weather_threshold_   │
│                          │    │      cache                             │
│                          │    │   4. Return { stage_key: { th_key:n }} │
└──────────────────────────┘    └────────────────────────────────────────┘
                                                     │
                                                     ▼
                                ┌────────────────────────────────────────┐
                                │ React: PhenologicalTemperatureCounters │
                                │                                        │
                                │   useQuery(['weather/pheno', parcelId])│
                                │     → fetch                            │
                                │   Render stages from response, no      │
                                │   client-side temperature math.        │
                                └────────────────────────────────────────┘
```

## Schema additions

### Table `weather_hourly_data`

```sql
CREATE TABLE IF NOT EXISTS public.weather_hourly_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  latitude DECIMAL(8,4) NOT NULL,
  longitude DECIMAL(9,4) NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,            -- 1h-resolution UTC datetime
  temperature_2m DECIMAL(5,2),                 -- °C
  source TEXT NOT NULL DEFAULT 'open-meteo-archive',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (latitude, longitude, recorded_at, source)
);

CREATE INDEX IF NOT EXISTS idx_whd_geo_time
  ON public.weather_hourly_data (latitude, longitude, recorded_at);
```

Coordinate quantization: round lat/lon to 4 decimals (~11m) before insert and lookup. Matches `weather_daily_data` convention.

### Table `weather_threshold_cache`

```sql
CREATE TABLE IF NOT EXISTS public.weather_threshold_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  latitude DECIMAL(8,4) NOT NULL,
  longitude DECIMAL(9,4) NOT NULL,
  year INTEGER NOT NULL,
  crop_type TEXT NOT NULL,
  stage_key TEXT NOT NULL,
  threshold_key TEXT NOT NULL,
  count INTEGER NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (latitude, longitude, year, crop_type, stage_key, threshold_key)
);
```

Invalidation: when `weather_hourly_data` gains rows for a (lat, lon, year), purge matching cache rows. Trigger or app-level — TBD in planning. Simplest: include `hourly_data_max_fetched_at` in cache row, treat stale if hourly cache fetched newer.

### Referentiel `phenological_stages` block

Add to each `DATA_*.json` (`OLIVIER`, `AGRUMES`, `AVOCATIER`, `PALMIER_DATTIER`):

```json
{
  "phenological_stages": [
    {
      "key": "dormancy",
      "name_fr": "Dormance",
      "name_en": "Dormancy",
      "name_ar": "السكون",
      "months": [11, 12, 1, 2],
      "thresholds": [
        {
          "key": "chill_hours",
          "label_fr": "Heures de froid",
          "compare": "below",
          "value": 7.2,
          "unit": "h",
          "icon": "snowflake"
        },
        {
          "key": "frost_risk",
          "label_fr": "Risque de gel",
          "compare": "below",
          "value": 0,
          "unit": "h",
          "icon": "snowflake"
        }
      ]
    },
    {
      "key": "flowering",
      "name_fr": "Floraison",
      "months": [3, 4, 5],
      "thresholds": [
        {
          "key": "optimal_flowering",
          "label_fr": "Conditions optimales",
          "compare": "between",
          "value": 15,
          "upper": 25,
          "unit": "h",
          "icon": "leaf"
        },
        {
          "key": "heat_stress",
          "label_fr": "Stress thermique",
          "compare": "above",
          "value": 35,
          "unit": "h",
          "icon": "flame"
        }
      ]
    },
    {
      "key": "fruit_development",
      "name_fr": "Développement des fruits",
      "months": [6, 7, 8, 9],
      "thresholds": [
        { "key": "growing_hours", "label_fr": "Heures de croissance", "compare": "above", "value": 10, "unit": "h", "icon": "sun" },
        { "key": "extreme_heat", "label_fr": "Chaleur extrême", "compare": "above", "value": 40, "unit": "h", "icon": "flame" }
      ]
    }
  ]
}
```

Existing `stades_bbch` is left untouched (different concept — BBCH morphological codes, not threshold counters).

## API contracts

### `GET /weather/hour-counter`

Generic counter for engineer/test use.

```
Query: lat (float), lon (float), start (ISO date), end (ISO date),
       threshold (float), compare ('below'|'above'|'between'),
       upper (float, required if compare='between'),
       months (csv of 1-12, optional — filter to month set)

200: { "count": 409, "fetched_hours": 2880, "from_cache": true }
502: { "error": "open-meteo unavailable", "details": "..." }
```

### `GET /weather/phenological-counters`

UI-facing stage report.

```
Query: lat, lon, year, crop_type

200: {
  "crop_type": "olivier",
  "year": 2026,
  "computed_at": "2026-04-19T12:34:56Z",
  "stages": [
    {
      "key": "dormancy",
      "name_fr": "Dormance",
      "months": [11, 12, 1, 2],
      "counters": [
        { "key": "chill_hours", "label_fr": "Heures de froid", "value": 409, "threshold": 7.2, "compare": "below", "unit": "h" },
        { "key": "frost_risk",  "label_fr": "Risque de gel",  "value": 12,  "threshold": 0,   "compare": "below", "unit": "h" }
      ]
    },
    ...
  ]
}
502: hard fail — caller (frontend) must show error state, not fall back to local compute
```

## Calibration engine integration

`backend-service/app/services/calibration/pipeline/s2_weather_extraction.py`:

```python
# Before:
chill_hours = round(sum(estimate_chill_hours(d.temp_max, d.temp_min)
                        for d in daily_rows
                        if d.date.month in {11, 12, 1, 2}), 3)

# After:
hourly = await weather_service.fetch_hourly_temperature(lat, lon, dormancy_start, dormancy_end)
if hourly is None:
    raise CalibrationFetchError("Open-Meteo unavailable for chill_hours computation")
chill_hours = sum(1 for h in hourly if h.recorded_at.month in {11,12,1,2} and h.temperature_2m < 7.2)
```

`estimate_chill_hours` in `gdd_service.py` is **not removed** — it's still used elsewhere (e.g. `compute_olive_gdd_two_phase`). Just no longer drives `step2.chill_hours`.

## Frontend changes

`project/src/components/WeatherAnalytics/PhenologicalTemperatureCounters.tsx`:

1. Delete `cropPhenologicalConfig` constant (lines 36–334)
2. Delete `calculateCountersForData` function (lines 471–508)
3. Replace `temperatureData` prop with `parcelId` + `cropType` (or `lat`+`lon`+`year`)
4. Add `useQuery(['phenological-counters', parcelId, cropType, year], () => api.fetchPhenologicalCounters({...}))`
5. Render `data.stages[].counters[]` directly — UI reads label, value, threshold, unit from response
6. Loading skeleton, error state ("Counters unavailable — weather data fetch failed")

`project/src/lib/api/weather.ts` (new or extend):
```ts
export const fetchPhenologicalCounters = async (params): Promise<PhenologicalCountersResponse> => { ... }
```

## Migration

Lazy. No backfill script.

- New calibrations write hourly-derived `step2.chill_hours` into `profile_snapshot.output.step2.chill_hours`
- Old calibrations keep their sine value
- Calibration review page renders whatever is in the snapshot — no special-casing needed
- After ~3 months of organic recalibration cadence, vast majority migrated

## Testing

- Unit: `fetch_hourly_temperature` cache hit/miss/gap-fill (mock httpx)
- Unit: `count_hours_below_threshold` for each compare mode + edge cases (empty rows, NaN temps)
- Unit: `compute_phenological_counters` end-to-end with fixture referentiel
- Integration: hour-counter endpoint smoke test with mocked Open-Meteo
- Integration: phenological-counters endpoint with each crop_type's referentiel
- Integration: calibration s2 step using hourly fetch (mocked) — verifies hard-fail path
- Frontend: PhenologicalTemperatureCounters renders mock backend response correctly
- Frontend: error state appears when API returns 502
- E2E (manual): real parcel calibration end-to-end → chill_hours value matches GET /weather/phenological-counters → both surfaces show identical number

## Open Questions (planning-detail)

1. Cache invalidation strategy: app-level vs trigger? Lean app-level for portability.
2. Should `phenological-counters` endpoint be cached at HTTP layer too (Cache-Control headers)? Lean yes, 1h max-age.
3. Where does the frontend fetch `crop_type` from? `useParcelById` already loads it — pass through. No new query.
4. Should we add a generic crop fallback (when crop_type has no `phenological_stages` defined)? Lean yes — reuse the existing `default` config from `PhenologicalTemperatureCounters.tsx` as a JSON fallback.
5. NestJS proxy or direct frontend → FastAPI? Existing `satellite-proxy` pattern in NestJS — decide during planning whether to mirror.
