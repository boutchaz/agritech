# Tasks: Cloud Filter Unification

## Backend

### 1. Route get_sentinel2_collection through filter_by_scl_coverage

- [x] **RED** — In `earth_engine.py:get_sentinel2_collection`, when `use_aoi_cloud_filter=True`, the code calls `CloudMaskingService.filter_collection_by_aoi_clouds` (QA60+SCL, 60m, 300m buffer) and applies a `CLOUDY_PIXEL_PERCENTAGE ≤ max_cloud*2` pre-filter. Verify this is the current behavior by reading lines 375-395.
- [x] **ACTION** — When `use_aoi_cloud_filter=True`: (1) remove the `CLOUDY_PIXEL_PERCENTAGE` filter from the collection query (fetch unfiltered by tile cloud), (2) replace the `filter_collection_by_aoi_clouds` call with `CloudMaskingService.filter_by_scl_coverage(collection, aoi, max_cloud)`, (3) remove the `cloud_buffer_meters` parameter from the method signature.
- [x] **GREEN** — Read the updated method. Confirm: no `CLOUDY_PIXEL_PERCENTAGE` filter when `use_aoi_cloud_filter=True`, calls `filter_by_scl_coverage`, no `cloud_buffer_meters` parameter.

### 2. Remove redundant double-filtering in timeseries paths

- [x] **RED** — Three timeseries methods apply `filter_by_scl_coverage` AFTER `get_sentinel2_collection(use_aoi_cloud_filter=True)`, which now already calls `filter_by_scl_coverage` internally. Verify double-filtering at: `_per_observation_chunk` (line 862-865), `_get_time_series_batched` (line 977-980), `_get_time_series_sequential` (line 1106-1109).
- [x] **ACTION** — Remove the redundant `if use_aoi_cloud_filter: collection = CloudMaskingService.filter_by_scl_coverage(...)` blocks from all three methods. The filtering now happens once inside `get_sentinel2_collection`.
- [x] **GREEN** — Grep for `filter_by_scl_coverage` in `earth_engine.py`. Confirm it's called only inside `get_sentinel2_collection` — not in `_per_observation_chunk`, `_get_time_series_batched`, or `_get_time_series_sequential`.

### 3. Rewrite available-dates to use get_sentinel2_collection

- [x] **RED** — In `indices.py:get_available_dates` (line 1402), the endpoint has its own inline SCL implementation (~100 lines: unfiltered collection, per-image reduceRegion, manual filtering). This duplicates the logic in `CloudMaskingService`. Verify by reading lines 1568-1752.
- [x] **ACTION** — Replace the inline implementation with: (1) call `earth_engine_service.get_sentinel2_collection(geometry, start, end, max_cloud, use_aoi_cloud_filter=True)`, (2) extract dates from the filtered collection using a simple `.map()` to get date + cloud info, (3) keep the same response format. Remove the `extract_date_with_aoi_cloud` and `_gee_get_dates_with_aoi_cloud` inline functions.
- [x] **GREEN** — Read the updated endpoint. Confirm: no inline SCL logic, uses `get_sentinel2_collection`, same response shape.

### 4. Remove heatmap ±15 day fallback loop

- [x] **RED** — In `earth_engine.py:export_heatmap_data` (line 1608), there's a `for delta in range(0, 16)` loop that searches ±15 days when the exact date has no data. Verify by reading lines 1622-1649.
- [x] **ACTION** — Replace the fallback loop with: (1) call `get_sentinel2_collection` for a single-day window (requested date to requested date + 1 day) with `use_aoi_cloud_filter=True`, (2) if collection is empty, raise `ValueError(f"No Sentinel-2 images found for {date}")`, (3) if images exist, take the least cloudy one. Remove `metadata.requested_date` from the response — it's always the exact date now.
- [x] **GREEN** — Read the updated method. Confirm: no fallback loop, single-day fetch, raises ValueError on empty.

### 5. Clean up cloud_buffer_meters references

- [x] **RED** — `cloud_buffer_meters` is passed through multiple call sites: `get_sentinel2_collection`, `indices.py` calculate endpoint (line 484), schemas.py (IndexCalculationRequest, TimeseriesRequest). Search for all references.
- [x] **ACTION** — Remove `cloud_buffer_meters` parameter from `get_sentinel2_collection` signature. Remove it from all call sites in `indices.py`. Remove the field from request schemas in `schemas.py` if it exists.
- [x] **GREEN** — Grep for `cloud_buffer_meters` across backend-service/. Confirm zero references remain (or only in test files documenting old behavior).

### 6. Update CloudMaskingService docstring and cleanup

- [x] **RED** — The module docstring (cloud_masking.py:1-8) says "SCL-based AOI cloud filtering is ONLY used for available-dates" and `filter_collection_by_aoi_clouds` is the primary method. Both statements are now wrong.
- [x] **ACTION** — Update module docstring to reflect that `filter_by_scl_coverage` is the primary cloud filtering method used by all endpoints (available-dates, heatmap, timeseries). Remove `filter_collection_by_aoi_clouds` if no callers remain.
- [x] **GREEN** — Read updated docstring. Grep for `filter_collection_by_aoi_clouds` — confirm no active callers. If removed, confirm no import errors.

## Frontend

### 7. Remove date mismatch UI from InteractiveIndexViewer

- [x] **RED** — `InteractiveIndexViewer.tsx` has: `dateMismatch` state, mismatch detection in `generateVisualization()` (line ~392), and the amber warning banner (line ~861). Verify these exist.
- [x] **ACTION** — Remove: (1) `dateMismatch` state declaration, (2) the `if (heatmapResult.metadata?.requested_date ...)` block, (3) the `{dateMismatch && (...)}` JSX banner, (4) any `setDateMismatch(null)` resets.
- [x] **GREEN** — Grep for `dateMismatch` in `InteractiveIndexViewer.tsx`. Confirm zero references. Run `tsc --noEmit` from `project/` to verify no type errors.

### 8. Remove date mismatch UI from LeafletHeatmapViewer

- [x] **RED** — Check `LeafletHeatmapViewer.tsx` for similar date mismatch handling (banner, state, detection logic).
- [x] **ACTION** — Remove all date mismatch references: state, detection logic, warning banner JSX.
- [x] **GREEN** — Grep for `dateMismatch` and `requested_date` in `LeafletHeatmapViewer.tsx`. Confirm zero references. Run `tsc --noEmit`.

### 9. Remove unused i18n keys

- [x] **RED** — Check `src/locales/{en,fr,ar}/satellite.json` for `dateMismatchTitle` and `dateMismatchDescription` keys.
- [x] **ACTION** — Remove `dateMismatchTitle` and `dateMismatchDescription` from all three language files.
- [x] **GREEN** — Grep for `dateMismatch` across `src/locales/`. Confirm zero references.
