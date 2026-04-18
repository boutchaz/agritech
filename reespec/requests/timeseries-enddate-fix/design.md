# Design: timeseries-enddate-fix

## Approach

Single file change: `project/src/components/SatelliteAnalysisView/TimeSeriesChart.tsx`

### Change 1: Date initialization
Currently initializes `endDate` from localStorage or `getDateRangeLastNDays(730)`.  
**After**: Always compute `endDate` as today's date (`new Date().toISOString().split('T')[0]`). Only persist and restore `startDate` from localStorage.

### Change 2: localStorage persistence
Stop persisting `end_date` to localStorage. Only persist `start_date`. On restore, read `start_date` and always set `end_date` = today.

### Change 3: Date range presets
The quick-select buttons ("3 mois", "6 mois", etc.) call `getDateRangeLastNDays(N)` which computes both start and end from today — these already produce today as `end_date`, so no change needed there.

## Risks
- None significant. The end_date input field remains editable — if a user manually sets it to a past date during the session, that's intentional and fine. The fix ensures it always **starts** at today.

## Rejected alternatives
- Making `end_date` input read-only: too restrictive, user might want to look at a historical window.
- Fixing only in `forceSync`: user would still see a stale chart range on load.
