# Design: Cloud Filter Unification

## Approach

Unify all satellite endpoints on a single cloud filtering path: **SCL-only at 20m, no buffer**.

`CloudMaskingService.filter_by_scl_coverage()` already implements this logic (cloud_masking.py:284-325). It's currently unused. The plan is to route all endpoints through it.

## Key Decision

**SCL is a filter gate, not a pixel mask.** It only determines "is this date cloud-free enough?" The actual index calculation continues using raw 10m bands (B2, B3, B4, B8) untouched.

## Changes

### Backend (backend-service/)

**1. `get_sentinel2_collection` (earth_engine.py:316)**
- When `use_aoi_cloud_filter=True`: replace `CloudMaskingService.filter_collection_by_aoi_clouds` with `CloudMaskingService.filter_by_scl_coverage`
- Remove the `CLOUDY_PIXEL_PERCENTAGE ≤ max_cloud × 2` pre-filter when `use_aoi_cloud_filter=True` (fetch unfiltered, let SCL decide)
- Remove `cloud_buffer_meters` parameter (no longer used)

**2. `available-dates` endpoint (indices.py:1402)**
- Replace the inline SCL implementation (lines 1631-1746) with a call to `get_sentinel2_collection(use_aoi_cloud_filter=True)`
- Both available-dates and heatmap now go through the same code path

**3. `export_heatmap_data` (earth_engine.py:1608)**
- Remove the ±15 day fallback loop
- Fetch exact date via `get_sentinel2_collection(use_aoi_cloud_filter=True)` for a single-day window
- If collection is empty, raise ValueError (no silent fallback)

**4. `CloudMaskingService` cleanup (cloud_masking.py)**
- `filter_by_scl_coverage` becomes the primary method
- `filter_collection_by_aoi_clouds` (QA60+SCL, 60m, 300m buffer) can be removed or deprecated
- Update module docstring

### Frontend (project/src/)

**5. Remove date mismatch UI**
- `InteractiveIndexViewer.tsx`: remove `dateMismatch` state, warning banner, and the mismatch detection logic in `generateVisualization()`
- `LeafletHeatmapViewer.tsx`: remove mismatch banner if present
- Remove `metadata.requested_date` handling — heatmap now always returns the exact requested date or errors

## Data Flow After Change

```
User opens satellite view
        │
        ▼
POST /available-dates
  → get_sentinel2_collection(use_aoi_cloud_filter=True)
    → filter_by_scl_coverage (SCL, 20m, no buffer)
  → returns guaranteed-available dates
        │
        ▼
Date picker shows only those dates
        │
        ▼
User selects date → POST /heatmap
  → get_sentinel2_collection(use_aoi_cloud_filter=True)  ← SAME filter
    → filter_by_scl_coverage (SCL, 20m, no buffer)
  → renders exact date (guaranteed to have data)
```

## Risks

- **Fewer dates in picker**: some dates that passed the old lenient filter won't pass now. This is correct behavior — those dates couldn't render heatmaps anyway.
- **GEE compute**: `filter_by_scl_coverage` uses `collection.map()` + `reduceRegion` at 20m per image. For available-dates over a full month (~6 images), this is acceptable. For very large date ranges, may be slower than tile-level filtering.
- **No fallback**: if the user somehow requests a date not in the picker (API direct call), they get an error instead of fallback data. This is the intended behavior.
