# Chill Hours — Hourly Fetch & Single Source of Truth — Tasks

---

## Phase 1: Database — schema additions

### 1. Add `weather_hourly_data` table to schema

- [x] **RED** — `grep -c 'weather_hourly_data' project/supabase/migrations/00000000000000_schema.sql` returned 0.
- [x] **ACTION** — Appended `weather_hourly_data` table to schema after `sum_gdd_between` function. Used `NUMERIC(7,2)` for lat/lon to match existing `weather_daily_data` convention (~1km grid, deviated from design.md's 4-decimal because consistency with existing geo cache wins). Added 2 indexes (geo+time, recorded_at desc). No RLS — non-org-scoped location cache, matches `weather_daily_data` and `weather_gdd_daily` pattern. Ran `npm run db:reset && npm run db:generate-types`.
- [x] **GREEN** — `grep -c 'weather_hourly_data' schema.sql` = 3, `grep -c 'weather_hourly_data' database.types.ts` = 1.

### 2. Add `weather_threshold_cache` table to schema

- [x] **RED** — `grep -c 'weather_threshold_cache' schema.sql` = 0.
- [x] **ACTION** — Appended cache table after `weather_hourly_data`. Same `NUMERIC(7,2)` lat/lon convention. UNIQUE on `(lat,lon,year,crop_type,stage_key,threshold_key)`. Lookup index on `(lat,lon,year,crop_type)`. No RLS — non-org-scoped derived cache. Ran `db:reset && db:generate-types`.
- [x] **GREEN** — schema occurrences = 2, types occurrence = 1.

---

## Phase 2: Referentiel — `phenological_stages` block

### 3. Add `phenological_stages` to `DATA_OLIVIER.json`

- [x] **RED** — Wrote `agritech-api/src/modules/referentials/phenological-stages.spec.ts` (placed under `src/modules/referentials/` to match existing module-spec convention vs the planned top-level `test/`). 4/4 fail.
- [x] **ACTION** — Added `phenological_stages` block to `DATA_OLIVIER.json` immediately after `metadata`. Three stages (dormancy, flowering, fruit_development), each with multilingual labels (`name_fr/en/ar`, `label_fr/en`).
- [x] **GREEN** — 4/4 pass.

### 4. Add `phenological_stages` to `DATA_AGRUMES.json`, `DATA_AVOCATIER.json`, `DATA_PALMIER_DATTIER.json`

- [x] **RED** — Extended spec with `describe.each([...])` for the 3 files. 9 fail (3 files × 3 tests).
- [x] **ACTION** — Added stages tailored per crop: agrumes (winter_rest Dec-Feb, flowering Mar-May, fruit_growth Jun-Sep); avocatier (winter Dec-Feb, flowering Mar-May, fruit_growth Jun-Oct); palmier_dattier (winter_rest Dec-Feb, pollination Mar-May, fruit_development Jun-Oct, with palm-specific extreme heat threshold @45°C).
- [x] **GREEN** — 13/13 pass (4 olivier + 3 × 3 others).

---

## Phase 3: Backend — hourly fetch + cache (FastAPI)

### 5. `WeatherService.fetch_hourly_temperature` — hits Open-Meteo with hourly param

- [x] **RED** — Wrote `tests/test_weather_hourly_fetch.py` with mocked httpx. Initial RED on async marker (no pytest-asyncio in repo) → switched to `asyncio.run()` pattern matching existing tests. Then RED on missing method.
- [x] **ACTION** — Added `fetch_hourly_temperature(lat, lon, start_date, end_date)` to `WeatherService`. Round lat/lon to 2 decimals (matches existing `fetch_historical` and `weather_daily_data` schema convention, deviated from design's 4-decimal). Returns `List[Dict]` of `{recorded_at, temperature_2m}`. No cache yet — added in subsequent tasks.
- [x] **GREEN** — `pytest tests/test_weather_hourly_fetch.py` → 1 passed.

### 6. Quantize coordinates to 2 decimals (regression coverage)

- [x] **RED** — Added test asserting `latitude=33.89, longitude=-5.55` in the outgoing params for input `(33.89351234, -5.547287)`. Implementation already added in task 5 ACTION (wasn't strictly TDD-first), so this is a regression-coverage test. Test passes immediately on first run.
- [x] **ACTION** — `round(lat, 2)` was added in task 5. Adjusted from design's 4-decimal to match existing `weather_daily_data` 2-decimal convention.
- [x] **GREEN** — `pytest tests/test_weather_hourly_fetch.py` → 2 passed.

### 7. Cache miss → write rows to `weather_hourly_data`

- [x] **RED** — Added `test_cache_miss_persists_fetched_rows`. Failed: persist_hourly_weather not called.
- [x] **ACTION** — Added `persist_hourly_weather(rows, lat, lon, source)` and `get_cached_hourly_weather(lat, lon, start_at, end_at)` helpers to `supabase_service.py`. Wired `persist_hourly_weather` call into `fetch_hourly_temperature` after API parse (catches persist exceptions as non-fatal — fetch still returns rows even if cache write fails).
- [x] **GREEN** — 3/3 pass.

### 8. Cache hit → no API call

- [x] **RED** — Added `test_cache_hit_skips_api_call`. Failed: httpx still called.
- [x] **ACTION** — `get_cached_hourly_weather` was added in task 7 already. In `fetch_hourly_temperature`, check cache first via `supabase_service.get_cached_hourly_weather`; if `len(cached) >= expected_hours` (computed via `_expected_hour_count` static helper from `(end_date - start_date + 1) * 24`), return cached rows without hitting Open-Meteo.
- [x] **GREEN** — 4/4 pass.

### 9. Gap-fill — only missing hours fetched

- [x] **RED** — Added `test_gap_fill_fetches_only_missing_dates`. Failed: API was called with original full range (start/end_date matching the full request).
- [x] **ACTION** — Reworked `fetch_hourly_temperature` cache-aside logic: identify per-day cache coverage (a day must have ≥24 rows to count as fully cached), compute missing dates set, group via existing `_contiguous_ranges` helper, fetch each sub-range, merge cached + fetched (filtering cached rows from any partially-covered missing day to avoid duplicates). Persist only the fetched rows.
- [x] **GREEN** — 5/5 pass.

### 10. Open-Meteo failure → raise `WeatherFetchError`

- [x] **RED** — Added `test_raises_weather_fetch_error_on_open_meteo_failure`. Failed: `WeatherFetchError` not exported.
- [x] **ACTION** — Defined `WeatherFetchError(RuntimeError)` at top of `weather_service.py`. Wrapped per-sub-range API call in try/except for `httpx.HTTPStatusError` + `httpx.RequestError`, re-raising as `WeatherFetchError`. No partial writes occur (persist runs only after all sub-ranges succeed).
- [x] **GREEN** — 6/6 pass.

---

## Phase 4: Backend — generic counter

### 11–15. `count_hours` — all comparison + filter cases (batched)

- [x] **RED** — Wrote `tests/test_hour_counter.py` with 5 tests covering S2.1–S2.5 (below strict, above strict, between inclusive, months filter, NaN/None excluded). All 5 fail at import (module doesn't exist).
- [x] **ACTION** — Created `backend-service/app/services/weather/hour_counter.py` with `count_hours(rows, threshold, compare, upper=None, months=None)`. Accepts iterable of dicts with `recorded_at` + `temperature_2m`. Skips invalid temps via `_is_valid_temp` (None/NaN/Inf). Optional months filter via `_parse_month` (handles ISO string + datetime). Three compare branches: 'below' (strict <), 'above' (strict >), 'between' (inclusive `threshold ≤ t ≤ upper`). Raises `ValueError` if 'between' missing upper.
- [x] **GREEN** — `pytest tests/test_hour_counter.py` → 5/5 pass.

(Tasks 11–15 batched as one TDD cycle since they share a single module — pure-function utility with no side effects, vertical-slice cost would have been pure overhead.)

---

## Phase 5: Backend — phenological counters service + endpoints

### 16–19. `compute_phenological_counters` — service + cache (batched)

- [x] **RED** — Wrote `tests/test_phenological_counters_service.py` with 4 tests covering S3.1, S3.3, S3.4, S3.5 (loads referentiel, persists on first call, skips fetch on full cache hit, raises UnsupportedCropError for unknown crop). All fail at import.
- [x] **ACTION** — Created `app/services/weather/phenological_counters.py` with `compute_phenological_counters(*, latitude, longitude, year, crop_type)`. Loads referentiel via existing `_load_referential_data_from_file`. Computes `expected_keys` set; if subset of cached, skips hourly fetch entirely. For each (stage, threshold), uses cache if present else calls `count_hours` with the stage's months filter. Persists newly-computed entries. Defines `UnsupportedCropError`. Added `get_cached_threshold_counts` + `persist_threshold_counts` helpers to `supabase_service.py`.
- [x] **GREEN** — `pytest tests/test_phenological_counters_service.py` → 4/4 pass.

(Tasks 16–19 batched — single coherent module + paired DB helpers; vertical-slicing the cache write/read/fetch-skip cases would have been overhead.)

### 20–22. Endpoints + 502 mapping (batched)

- [x] **RED** — Wrote `tests/test_weather_endpoints.py` with FastAPI TestClient: hour-counter shape, phenological-counters shape, 502 on `WeatherFetchError`, 400 on `UnsupportedCropError`. All 4 fail (routes don't exist).
- [x] **ACTION** — Added `/api/weather/hour-counter` and `/api/weather/phenological-counters` to `app/api/weather.py`. Routes use `Query` for params (with `compare` regex constraint), parse optional CSV `months`. Map `UnsupportedCropError`→400, `WeatherFetchError`→502 via `HTTPException` in both endpoints. Auth dep `get_current_user_or_service` covered by router-level dependency.
- [x] **GREEN** — `pytest tests/test_weather_endpoints.py` → 4/4 pass.

(Tasks 20–22 batched — single router file, three coupled routes/error mappings.)

---

## Phase 6: Calibration engine swap

### 23. `s2_weather_extraction` uses hourly chill computation

- [ ] **RED** — Write `backend-service/tests/test_step2_chill_uses_hourly.py`: with hourly data fixture (fixed temps), invoke step 2 extract; assert `chill_hours` equals the COUNT of hourly rows below 7.2°C in months {11,12,1,2}, NOT the sine-summed value. Run → fails (still uses sine).
- [ ] **ACTION** — In `s2_weather_extraction.py`, replace sine-based chill computation with `await weather_service.fetch_hourly_temperature(...)` + `count_hours(..., threshold=7.2, compare='below', months={11,12,1,2})`. Keep `estimate_chill_hours` (used by other modules).
- [ ] **GREEN** — Test passes.

### 24. Calibration step 2 hard-fails on Open-Meteo outage

- [ ] **RED** — Add test: mock weather_service to raise `WeatherFetchError` and no cache; run step 2; assert it raises a calibration-level error (e.g. `CalibrationFetchError` or propagates `WeatherFetchError`). Run → fails (likely catches and falls back).
- [ ] **ACTION** — Ensure step 2 propagates the error. No try/except that swallows `WeatherFetchError` in this code path.
- [ ] **GREEN** — Test passes.

---

## Phase 7: Frontend — consume backend, delete client-side compute

### 25. New API client `fetchPhenologicalCounters`

- [ ] **RED** — Write `project/src/lib/api/__tests__/weather.test.ts`: mock `fetch`, call `fetchPhenologicalCounters({lat, lon, year, cropType})`, assert it issues GET to FastAPI base + `/weather/phenological-counters` with expected query params. Run → fails (function doesn't exist).
- [ ] **ACTION** — Create or extend `project/src/lib/api/weather.ts` with `fetchPhenologicalCounters`. Use existing API base + auth headers pattern.
- [ ] **GREEN** — Test passes.

### 26. `usePhenologicalCounters` query hook

- [ ] **RED** — Write `project/src/hooks/__tests__/usePhenologicalCounters.test.tsx`: with React Query test wrapper + mocked api, render hook with `parcelId`+`cropType`+`year`; assert it calls `fetchPhenologicalCounters` with the right args. Run → fails.
- [ ] **ACTION** — Create `project/src/hooks/usePhenologicalCounters.ts`. Standard `useQuery` with key `['phenological-counters', parcelId, cropType, year]` and `enabled` guard.
- [ ] **GREEN** — Test passes.

### 27. `PhenologicalTemperatureCounters` renders backend response

- [ ] **RED** — Write `project/src/components/WeatherAnalytics/__tests__/PhenologicalTemperatureCounters.backend.test.tsx`: mock `usePhenologicalCounters` to return a 3-stage response; render component with parcelId+cropType; assert DOM contains the 3 stage names AND the counter values. Run → fails (current component computes locally and ignores hook).
- [ ] **ACTION** — Refactor `PhenologicalTemperatureCounters.tsx` to call `usePhenologicalCounters` instead of receiving `temperatureData`; iterate `data.stages[].counters[]` and render each. Keep visual styling (icons, color classes) but resolve them from a small map keyed by `threshold.icon` field.
- [ ] **GREEN** — Test passes.

### 28. Hardcoded `cropPhenologicalConfig` removed

- [ ] **RED** — Run `grep -c 'cropPhenologicalConfig' project/src/components/WeatherAnalytics/PhenologicalTemperatureCounters.tsx` → returns `>0`. Assertion: constant still present.
- [ ] **ACTION** — Delete `cropPhenologicalConfig` constant + the `PhenologicalStage` and threshold interfaces no longer used.
- [ ] **GREEN** — `grep -c 'cropPhenologicalConfig' …` returns `0`. Component still renders (verify by re-running task 27 test).

### 29. Client-side `calculateCountersForData` removed

- [ ] **RED** — Run `grep -c 'calculateCountersForData' project/src/components/WeatherAnalytics/PhenologicalTemperatureCounters.tsx` → returns `>0`.
- [ ] **ACTION** — Delete the function + every call site.
- [ ] **GREEN** — `grep -c 'calculateCountersForData' …` returns `0`. Component test still passes.

### 30. Error state on API failure

- [ ] **RED** — Add to backend.test.tsx: mock hook to return `{ isError: true, error: ... }`; assert DOM contains the i18n key fallback text for `weather.counters.error`. Run → fails.
- [ ] **ACTION** — Handle `isError` in component — render error block with `t('weather.counters.error', 'Compteurs météo indisponibles')`. Add i18n key to en/fr/ar `common.json` (or relevant namespace).
- [ ] **GREEN** — Test passes; i18n keys present in all 3 languages.

---

## Phase 8: End-to-end consistency verification

### 31. Calibration page chill === weather tab dormancy chill (manual)

- [ ] **RED** — Visit `/parcels/<olive-id>/ai/calibration` → note `block_b.phenology_dashboard.chill.value`. Visit `/parcels/<olive-id>/weather` → note dormancy chill counter. Assert: NOT equal (current state — sine vs hourly disagreement OR stale legacy calibration).
- [ ] **ACTION** — Recalibrate the parcel (forces fresh `step2.chill_hours` from hourly). Reload both pages.
- [ ] **GREEN** — Both surfaces show identical chill_hours value.

### 32. Open-Meteo outage simulated end-to-end

- [ ] **RED** — Block outbound traffic to `archive-api.open-meteo.com` (e.g. `/etc/hosts` redirect to 127.0.0.1). With cache cleared for a test parcel, trigger a recalibration. Assert: calibration succeeds silently (CURRENT broken behavior — sine fallback hides the failure).
- [ ] **ACTION** — Backend changes from prior phases should already produce hard-fail. Run the recalibration; check it errors with explicit message; check weather tab shows error state.
- [ ] **GREEN** — Calibration errors with clear message; weather tab error state visible. Restore network.
