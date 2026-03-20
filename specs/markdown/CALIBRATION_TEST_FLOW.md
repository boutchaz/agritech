# Calibration Test Flow

## Goal

Validate the complete AI calibration lifecycle for a parcel:

| Semantic name | UI / product | Legacy API mode (if present) |
|---------------|--------------|------------------------------|
| **Initial calibration** | Assistant de calibrage initial (8-step wizard, then pipeline) | `F1` |
| **Partial recalibration** | Recalibrage partiel (motif → blocs → validation) | `F2` |
| **Annual recalibration** | Recalibrage annuel (post-campaign wizard) | `F3` |

This flow is designed for staging/test environments with real API + frontend.

## Preconditions

- User has access to an organization with permissions on parcels.
- A parcel exists with:
  - `crop_type` set (example: `olivier`)
  - valid boundary polygon
  - `irrigation_frequency` may be missing (should be warning, not hard fail)
- AI is enabled on the parcel (`ai_enabled = true` or enabled through UI).
- At least one calibration referential source exists:
  - DB (`crop_ai_references`) OR
  - local JSON fallback (`referentials/DATA_<crop>.json`).

## Environment Setup

1. Apply latest DB migrations.
2. Start API + frontend.
3. Login as organization admin or manager.
4. Open parcel AI page.

### Automated checks (Playwright, deployed dashboard)

From `project/`, with a **fully onboarded** user that can access the target parcel:

**Recommended:** copy `project/.env.integration.example` to `project/.env.integration` and fill values (that file is gitignored).

Or export variables:

```bash
export INTEGRATION_USER_EMAIL='you@example.com'
export INTEGRATION_USER_PASSWORD='***'
export INTEGRATION_CALIBRATION_PARCEL_ID='<uuid>'
# optional — default is the production integration dashboard
export INTEGRATION_BASE_URL='https://agritech-dashboard.thebzlab.online'

pnpm test:e2e:integration
```

- Default suite: smoke + **initial calibration** readiness (when the initial wizard is shown), **partial recalibration** (when the parcel is active), **annual recalibration** (when the eligibility banner shows). Steps that do not apply to the current parcel phase are **skipped**, not failed.
- Playwright selectors use **`data-testid="calibration-*"`** hooks on the calibration UI so tests do not depend on translated strings. When adding or moving copy, keep those attributes stable.
- To actually trigger **initial calibration** from the Validation step (real job on the parcel):  
  `INTEGRATION_CALIBRATION_SUBMIT_INITIAL=true pnpm test:e2e:integration`  
  (Legacy alias: `INTEGRATION_CALIBRATION_SUBMIT_F1=true`.)

## Flow A — Initial calibration

Wizard steps (semantic labels in UI): Complements plantation → Historique irrigation → Analyse sol → Analyse eau → Analyse foliaire → Historique recoltes → Historique cultural → **Validation**.

### A1. Start calibration

1. Go to parcel AI calibration page.
2. Complete the initial calibration assistant through **Validation**, then launch when readiness allows.
3. Verify readiness panel:
   - Missing irrigation frequency appears as warning (not hard fail).
4. Submit the initial calibration wizard.

Expected:

- calibration record created (legacy mode `F1` where applicable).
- parcel AI phase transitions into calibration lifecycle.
- no blocking error for missing irrigation frequency on legacy parcel.

### A2. Validate generated baseline

1. Wait until calibration completes.
2. Check calibration result cards/summary.

Expected:

- baseline indices shown (NDVI/NDRE/NDMI if available).
- confidence and health/potential outputs displayed.
- referential loaded from DB or local JSON fallback without "Crop AI references not found" failure.

## Flow B — Partial recalibration

### B1. Trigger partial recalibration

1. From AI calibration page, open **Recalibrage partiel**.
2. Select motif/reason and affected blocks.
3. Submit recalibration.

Expected:

- new recalibration record created (legacy `mode_calibrage = F2` where applicable).
- reason/motif persisted.
- output compares previous vs new values for impacted blocks.

### B2. Validate UX behavior

1. Change selected motif and observe form sections.

Expected:

- conditional fields appear/disappear correctly.
- no stale values submitted for hidden sections.

## Flow C — Annual recalibration

### C1. Close season and trigger annual flow availability

1. Close season with harvest and campaign bilan data.
2. Open calibration area.

Expected:

- annual recalibration availability/reminder appears when eligibility rules are met.
- reminder is not duplicated for same trigger event/user.

### C2. Execute annual recalibration wizard

1. Start annual recalibration wizard.
2. Fill campaign report and validation steps.
3. Export campaign report (PDF print flow).
4. Submit.

Expected:

- annual record created and linked to season flow (legacy `F3` payloads where applicable).
- annual baseline updated for next campaign.
- PDF export works and contains campaign sections.

## API Checks (Optional but Recommended)

Use authenticated requests and confirm:

- Start calibration endpoint creates expected row in `calibrations`.
- Partial recalibration endpoint stores motif + partial update payload.
- Annual recalibration endpoint stores annual payload.
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

1. Initial, partial, and annual calibration each run successfully end-to-end where applicable.
2. No duplicate notifications in tested scenarios.
3. Referential loading works with DB row and with local JSON fallback.
4. No blocking backend error in calibration start for legacy parcels.
5. Campaign report export works from the annual recalibration wizard.
