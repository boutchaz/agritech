# Calibration Test Flow (F1 / F2 / F3)

## Goal

Validate the complete AI calibration lifecycle for a parcel:
- F1 initial calibration
- F2 partial recalibration
- F3 annual recalibration

This flow is designed for staging/test environments with real API + frontend.

## Preconditions

- User has access to an organization with permissions on parcels.
- A parcel exists with:
  - `crop_type` set (example: `olivier`)
  - valid boundary polygon
  - `irrigation_frequency` may be missing (should be warning, not blocker)
- AI is enabled on the parcel (`ai_enabled = true` or enabled through UI).
- At least one calibration referential source exists:
  - DB (`crop_ai_references`) OR
  - local JSON fallback (`referentials/DATA_<crop>.json`).

## Environment Setup

1. Apply latest DB migrations.
2. Start API + frontend.
3. Login as organization admin or manager.
4. Open parcel AI page.

## Flow A - F1 Initial Calibration

### A1. Start calibration

1. Go to parcel AI calibration page.
2. Click **Start calibration**.
3. Verify readiness panel:
   - Missing irrigation frequency appears as warning (not hard fail).
4. Submit F1 wizard.

Expected:
- calibration record created with mode `F1`.
- parcel AI phase transitions into calibration lifecycle.
- no blocking error for missing irrigation frequency on legacy parcel.

### A2. Validate generated baseline

1. Wait until calibration completes.
2. Check calibration result cards/summary.

Expected:
- baseline indices shown (NDVI/NDRE/NDMI if available).
- confidence and health/potential outputs displayed.
- referential loaded from DB or local JSON fallback without "Crop AI references not found" failure.

## Flow B - F2 Partial Recalibration

### B1. Trigger partial recalibration

1. From AI calibration page, open **F2 partial recalibration**.
2. Select motif/reason and affected blocks.
3. Submit recalibration.

Expected:
- new recalibration record created with `mode_calibrage = F2`.
- reason/motif persisted.
- output compares previous vs new values for impacted blocks.

### B2. Validate UX behavior

1. Change selected motif and observe form sections.

Expected:
- conditional fields appear/disappear correctly.
- no stale values submitted for hidden sections.

## Flow C - F3 Annual Recalibration

### C1. Close season and trigger F3 availability

1. Close season with harvest and campaign bilan data.
2. Open calibration area.

Expected:
- F3 availability/reminder appears when eligibility rules are met.
- reminder is not duplicated for same trigger event/user.

### C2. Execute F3 wizard

1. Start annual recalibration wizard.
2. Fill campaign report and validation steps.
3. Export campaign report (PDF print flow).
4. Submit.

Expected:
- F3 record created and linked to season flow.
- annual baseline updated for next campaign.
- PDF export works and contains campaign sections.

## API Checks (Optional but Recommended)

Use authenticated requests and confirm:

- Start calibration endpoint creates expected row in `calibrations`.
- F2 endpoint stores motif + partial update payload.
- F3 endpoint stores annual recalibration payload.
- Recommendation follow-up fields on `ai_recommendations` can be populated later by monitoring jobs:
  - `evaluation_window_days`
  - `evaluation_indicator`
  - `expected_response`
  - `actual_response_pct`
  - `efficacy`

## Notification Checks

Trigger calibration/season reminder event once.

Expected:
- one notification per recipient user (no duplicates).
- actor can be excluded where call-site provides `excludeUserId`.

## Regression Checklist

- Starting calibration on old parcels does not crash due to missing irrigation fields.
- Wizard prefill correctly maps parcel irrigation/water fields.
- AI plan/calibration wording remains consistent in French UI.
- Calibration page loads with existing data and no console/runtime errors.

## Exit Criteria

Flow is accepted when all of the following are true:

1. F1, F2, F3 each run successfully end-to-end.
2. No duplicate notifications in tested scenarios.
3. Referential loading works with DB row and with local JSON fallback.
4. No blocking backend error in calibration start for legacy parcels.
5. Campaign report export works from F3 wizard.
