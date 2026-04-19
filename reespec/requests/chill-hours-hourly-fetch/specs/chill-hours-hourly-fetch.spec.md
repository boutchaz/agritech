# Spec: Chill Hours — Hourly Fetch & Single Source of Truth

## Capability 1: Hourly weather fetch with cache

### S1.1 Open-Meteo Archive returns hourly temperature_2m
- **GIVEN** a (lat, lon, start_date, end_date) with no cached hourly rows
- **WHEN** `WeatherService.fetch_hourly_temperature()` is called
- **THEN** it issues `GET https://archive-api.open-meteo.com/v1/archive` with `hourly=temperature_2m`
- **AND** it parses the response into rows of `{ recorded_at: datetime, temperature_2m: float }`
- **AND** all rows are returned

### S1.2 Cached rows are returned without API call
- **GIVEN** `weather_hourly_data` has all rows in (lat, lon, start_date, end_date) range
- **WHEN** `fetch_hourly_temperature()` is called for that range
- **THEN** Open-Meteo is NOT called (zero HTTP requests)
- **AND** the cached rows are returned

### S1.3 Gap-fill: only missing hours are fetched
- **GIVEN** `weather_hourly_data` has half the requested range cached
- **WHEN** `fetch_hourly_temperature()` is called
- **THEN** Open-Meteo is called only for the missing date range(s)
- **AND** returned rows include both cached + freshly fetched

### S1.4 Coordinates are quantized to 4 decimals before lookup/insert
- **GIVEN** a query with `lat=33.89351234`
- **WHEN** the cache lookup runs
- **THEN** the lookup uses `lat=33.8935` (4-decimal rounded)
- **AND** newly inserted rows store `lat=33.8935`

### S1.5 Open-Meteo failure raises an explicit error (no fallback)
- **GIVEN** Open-Meteo returns HTTP 5xx or times out
- **WHEN** `fetch_hourly_temperature()` is called for an uncached range
- **THEN** the function raises `WeatherFetchError` (or equivalent)
- **AND** no rows are persisted
- **AND** no sine fallback is invoked

---

## Capability 2: Generic hour counter

### S2.1 `count_hours_below_threshold(rows, threshold, compare='below')` counts strict-below
- **GIVEN** an hourly row list with temperatures `[2, 5, 7.2, 8, 10]`
- **WHEN** `count_hours_below_threshold(rows, 7.2, compare='below')` is called
- **THEN** it returns `2` (only `2` and `5` are strictly below)

### S2.2 Compare='above' counts strict-above
- **GIVEN** rows with temps `[10, 35, 36, 40]`
- **WHEN** `count_hours_below_threshold(rows, 35, compare='above')` is called
- **THEN** it returns `2`

### S2.3 Compare='between' counts inclusive range
- **GIVEN** rows with temps `[14, 15, 20, 25, 26]`
- **WHEN** `count_hours_below_threshold(rows, 15, compare='between', upper=25)` is called
- **THEN** it returns `3` (15, 20, 25 inclusive)

### S2.4 Months filter restricts the row set
- **GIVEN** rows spanning Jan–Dec
- **WHEN** counter is called with `months={11, 12, 1, 2}`
- **THEN** rows from March–October are excluded before counting

### S2.5 NaN/null temperatures are excluded
- **GIVEN** rows with temps `[5, None, 6, NaN]`
- **WHEN** counter is called with threshold=7, compare='below'
- **THEN** it returns `2` (only valid numeric values counted)

---

## Capability 3: Phenological counters service

### S3.1 Loads stage definitions from referentiel
- **GIVEN** `DATA_OLIVIER.json` has a `phenological_stages` block
- **WHEN** `compute_phenological_counters(lat, lon, year, 'olivier')` is called
- **THEN** it iterates each stage and each threshold from the referentiel
- **AND** returns a structure mirroring the referentiel shape

### S3.2 Returns counts per (stage, threshold)
- **GIVEN** the referentiel has 3 stages with 2 thresholds each, hourly data for the year
- **WHEN** the service is called
- **THEN** the response has 3 stages each with 2 counter values
- **AND** every counter value is a non-negative integer

### S3.3 Threshold cache is populated on first call
- **GIVEN** `weather_threshold_cache` is empty for (lat, lon, year, crop_type)
- **WHEN** `compute_phenological_counters()` is called
- **THEN** N rows are inserted (one per stage × threshold)

### S3.4 Threshold cache is read on subsequent calls
- **GIVEN** `weather_threshold_cache` has all rows for (lat, lon, year, crop_type)
- **WHEN** `compute_phenological_counters()` is called again
- **THEN** counts are returned from cache without re-running counter logic
- **AND** Open-Meteo is not called

### S3.5 Unknown crop_type returns 4xx error
- **GIVEN** `crop_type = 'mango'` and no `DATA_MANGO.json` exists
- **WHEN** the service is called
- **THEN** it raises an error mapped to HTTP 400 with message indicating unsupported crop

---

## Capability 4: HTTP endpoints

### S4.1 `GET /weather/hour-counter` returns count + cache flag
- **GIVEN** valid query params lat, lon, start, end, threshold, compare
- **WHEN** the endpoint is called
- **THEN** response JSON shape is `{ count: int, fetched_hours: int, from_cache: bool }`

### S4.2 `GET /weather/phenological-counters` returns stages structure
- **GIVEN** lat, lon, year, crop_type
- **WHEN** the endpoint is called
- **THEN** response JSON has `crop_type`, `year`, `computed_at`, `stages: [{key, name_fr, months, counters: [{key, label_fr, value, threshold, compare, unit}]}]`

### S4.3 Endpoints return 502 on Open-Meteo failure
- **GIVEN** Open-Meteo is unavailable AND no cache exists
- **WHEN** either endpoint is called
- **THEN** response is HTTP 502 with `{ error, details }`

---

## Capability 5: Calibration engine swap

### S5.1 `s2_weather_extraction` writes hourly-derived chill_hours
- **GIVEN** a calibration run for an olive parcel with lat/lon
- **WHEN** step 2 weather extraction runs
- **THEN** `chill_hours` is computed by counting hourly rows below 7.2°C in months {11,12,1,2}
- **AND** `estimate_chill_hours` (sine model) is NOT called for this purpose

### S5.2 Calibration hard-fails when Open-Meteo is unavailable
- **GIVEN** Open-Meteo is unavailable AND no cached hourly data exists for the parcel
- **WHEN** calibration step 2 runs
- **THEN** the calibration is marked failed with an error message indicating weather fetch failure

### S5.3 `estimate_chill_hours` remains for other consumers
- **GIVEN** existing callers like `compute_olive_gdd_two_phase` that use `estimate_chill_hours`
- **WHEN** they run
- **THEN** the function still exists and behaves as before (no signature change, no removal)

---

## Capability 6: Referentiel `phenological_stages` block

### S6.1 All 4 referentiel files have the block
- **GIVEN** the four files `DATA_OLIVIER.json`, `DATA_AGRUMES.json`, `DATA_AVOCATIER.json`, `DATA_PALMIER_DATTIER.json`
- **WHEN** parsed
- **THEN** each contains a top-level `phenological_stages` array

### S6.2 Each stage has required fields
- **GIVEN** a stage entry in any referentiel
- **WHEN** validated
- **THEN** it has `key`, `name_fr`, `months` (array of 1-12), and `thresholds` (array)

### S6.3 Each threshold has required fields
- **GIVEN** a threshold inside any stage
- **WHEN** validated
- **THEN** it has `key`, `label_fr`, `compare` ('below'|'above'|'between'), `value` (number), `unit`
- **AND** if `compare === 'between'`, it also has `upper` (number)

### S6.4 Olive `dormancy` stage uses 7.2°C threshold and Nov-Feb window
- **GIVEN** the olive referentiel
- **WHEN** the dormancy stage is read
- **THEN** `months === [11, 12, 1, 2]`
- **AND** the chill threshold has `value === 7.2`

---

## Capability 7: Frontend integration

### S7.1 `PhenologicalTemperatureCounters` reads from backend
- **GIVEN** the component mounted with a parcelId + cropType
- **WHEN** rendered
- **THEN** it issues a `useQuery` against `/weather/phenological-counters`
- **AND** it does NOT compute temperature counts client-side

### S7.2 Component renders backend stage structure
- **GIVEN** the API response with 3 stages
- **WHEN** the component renders
- **THEN** the DOM contains 3 stage sections
- **AND** each section contains its counters with values

### S7.3 Hardcoded `cropPhenologicalConfig` is removed
- **GIVEN** the source file `PhenologicalTemperatureCounters.tsx`
- **WHEN** searched
- **THEN** the constant `cropPhenologicalConfig` no longer exists

### S7.4 Client-side `calculateCountersForData` is removed
- **GIVEN** the source file `PhenologicalTemperatureCounters.tsx`
- **WHEN** searched
- **THEN** the function `calculateCountersForData` no longer exists

### S7.5 Error state renders when API returns 502
- **GIVEN** the API call fails with 502
- **WHEN** the component renders
- **THEN** an error message is shown (i18n key `weather.counters.error`)

---

## Capability 8: End-to-end consistency

### S8.1 Same chill_hours number on both surfaces
- **GIVEN** an olive parcel with hourly weather cached for the dormancy window
- **WHEN** the user views the calibration page AND the weather tab
- **THEN** the chill_hours value rendered on the calibration page (`block_b.phenology_dashboard.chill.value`) equals the chill_hours counter rendered in the weather tab's dormancy stage
