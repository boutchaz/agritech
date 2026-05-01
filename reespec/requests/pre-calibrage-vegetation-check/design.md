# Design — Pre-Calibrage Vegetation Check

## Architecture

```
User clicks "Lancer le calibrage"
        │
        ▼
POST /parcels/{id}/calibration/start
        │
        ▼
CalibrationService.startCalibration()
  ├── existing: phase check, readiness check
  ├── NEW: vegetationCheck()          ◄── Phase 0.5
  │     ├── age < 4? → BYPASS
  │     ├── fetch July-Aug NDVI from satellite_indices_data
  │     ├── compute mean + min
  │     ├── apply rules → status
  │     └── if PARCELLE_VIDE → throw UnprocessableEntityException (422)
  │         if ZONE_GRISE → attach warning flag to calibration record
  │         if CONFIRMED/BYPASS → continue
  └── existing: transitionToCalibrating, insert calibration, runBackground
```

## Key Decisions

### Placement in startCalibration()

Insert AFTER readiness check (line ~270), BEFORE `transitionToCalibrating()` (line ~276). This way:
- Readiness check already confirmed satellite data exists (≥10 images)
- We haven't changed parcel state yet, so a 422 is clean — no rollback needed

### Data Source

Query `satellite_indices_data` table filtered to:
- `parcel_id` + `organization_id`
- `index_name = 'NDVI'`
- month extracted from `date` = 7 or 8 (July/August)
- No date range limit — use all available history

### Age Calculation

```
age = currentYear - parcel.plantingYear
```
Uses `parcel.plantingYear` already available from `getParcelContext()` (fetched at line 223).

### Error Response (422)

```json
{
  "statusCode": 422,
  "message": "Végétation insuffisante détectée",
  "error": "Unprocessable Entity",
  "vegetation_status": "PARCELLE_VIDE",
  "user_message": {
    "title": "Végétation insuffisante détectée",
    "body": "L'analyse satellitaire de votre parcelle...",
    "action": "correct_parcel"
  },
  "ndvi_stats": {
    "summer_mean": 0.08,
    "summer_min": 0.04,
    "sample_count": 5
  }
}
```

### ZONE_GRISE Handling

Store `vegetation_check_status: "ZONE_GRISE"` in the `profile_snapshot` of the calibration record. The calibration engine can read this downstream. Frontend shows a toast warning before spinner starts.

### Frontend Changes

In `useStartCalibration` `onError` handler:
- Check if error response contains `vegetation_status === "PARCELLE_VIDE"`
- If yes: show a blocking dialog with title/body from response + "Corriger ma parcelle" button
- If `vegetation_status === "ZONE_GRISE"` comes back in successful response: show toast warning

## Files to Modify

| File | Change |
|------|--------|
| `agritech-api/src/modules/calibration/vegetation-check.ts` | NEW — pure function + types |
| `agritech-api/src/modules/calibration/vegetation-check.spec.ts` | NEW — unit tests |
| `agritech-api/src/modules/calibration/calibration-data.service.ts` | Add `fetchSummerNdvi()` method |
| `agritech-api/src/modules/calibration/calibration.service.ts` | Call vegetation check in `startCalibration()` |
| `project/src/hooks/useCalibrationReport.ts` | Handle 422 vegetation error |
| `project/src/components/calibration/CalibrationWizard.tsx` | Show blocking dialog on PARCELLE_VIDE |
| `project/src/locales/{en,fr,ar}/common.json` | Add vegetation check messages |

## Risks

- **False positive blocking**: An established orchard with cloud-contaminated July-August data could show low NDVI. Mitigated by: using ALL available history (not just recent), and the rule absolue (doubt = let through). Rule 2 thresholds (mean < 0.15, min < 0.10) are very conservative — real trees almost never go this low.
- **No July-August data**: If zero July-August NDVI points exist, skip the check entirely (BYPASS). Never block on missing data.
