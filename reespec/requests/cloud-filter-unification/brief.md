# Cloud Filter Unification

## Problem

available-dates, heatmap, and timeseries endpoints each use different cloud filtering implementations. available-dates (the date picker gatekeeper) is the most lenient, so it shows dates in the picker that the heatmap can't render. The heatmap silently falls back to an older date (±15 days), confusing users with a "Different data date" warning.

### Root cause

| | available-dates | heatmap/timeseries (CloudMaskingService) |
|---|---|---|
| Bands | SCL only | QA60 OR SCL |
| Scale | 20m | 60m |
| Buffer | none | 300m |
| Pre-filter | none | tile CLOUDY_PIXEL_PERCENTAGE ≤ 2× |

Two implementations written independently, never unified.

## Goals

1. **Single cloud filter**: all three endpoints use the same SCL-based AOI cloud filtering at 20m, no buffer
2. **Picker guarantees data**: if a date appears in the date picker, heatmap and timeseries can render it — no fallback needed
3. **Remove fallback**: heatmap fetches the exact requested date or errors — no ±15 day search
4. **Clean frontend**: remove the "Different data date" warning banner and related dead code

## Non-goals

- Changing how vegetation indices are calculated (10m bands untouched)
- Changing the SCL values used for cloud detection (3, 8, 9, 10 stays)
- Adding new cloud detection methods
- Changing the available-dates API response format

## Impact

- Users stop seeing confusing "different date" warnings
- Fewer dates in the picker (stricter consistency), but every date delivers what it promises
- Simpler backend code — one cloud filter path instead of two
