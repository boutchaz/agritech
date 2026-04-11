# Spec: Unified Cloud Filtering

## Capability: get_sentinel2_collection uses SCL-only filter

### Scenario: AOI cloud filter uses SCL at 20m without buffer
- **GIVEN** `get_sentinel2_collection` is called with `use_aoi_cloud_filter=True`
- **WHEN** the collection is filtered
- **THEN** it calls `CloudMaskingService.filter_by_scl_coverage` (SCL band, 20m scale, no buffer)
- **AND** does NOT apply `CLOUDY_PIXEL_PERCENTAGE` pre-filter
- **AND** does NOT use QA60 band for filtering

### Scenario: Non-AOI filter remains tile-level
- **GIVEN** `get_sentinel2_collection` is called with `use_aoi_cloud_filter=False`
- **WHEN** the collection is filtered
- **THEN** it applies `CLOUDY_PIXEL_PERCENTAGE ≤ max_cloud` tile-level filter (unchanged)

## Capability: available-dates uses shared collection method

### Scenario: available-dates returns only SCL-filtered dates
- **GIVEN** a parcel AOI and date range
- **WHEN** POST /available-dates is called
- **THEN** it uses `get_sentinel2_collection(use_aoi_cloud_filter=True)` to get filtered images
- **AND** returns only dates from that filtered collection

### Scenario: available-dates and heatmap agree on date availability
- **GIVEN** a date returned by available-dates as available
- **WHEN** that date is requested via POST /heatmap
- **THEN** the heatmap finds data for that exact date (no fallback)

## Capability: heatmap fetches exact date

### Scenario: heatmap returns exact requested date
- **GIVEN** a date that passed available-dates filtering
- **WHEN** POST /heatmap is called with that date
- **THEN** it returns data for that exact date
- **AND** `date` in response equals the requested date
- **AND** `metadata.requested_date` is not present

### Scenario: heatmap errors on unavailable date
- **GIVEN** a date with no Sentinel-2 data (or too cloudy)
- **WHEN** POST /heatmap is called with that date
- **THEN** it returns HTTP 404 with "No data found" message
- **AND** does NOT search ±15 days for fallback data

## Capability: frontend has no date mismatch handling

### Scenario: no mismatch warning displayed
- **GIVEN** any date selected from the picker
- **WHEN** heatmap data loads successfully
- **THEN** no "Different data date" warning banner is shown
- **AND** the displayed date matches the selected date
