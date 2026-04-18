# Learnings — ai-pipeline-completion

## [2026-03-12T19:47:50Z] Session ses_31db0cfa4ffeAt2b4m25hHK9V6 — Plan Start

### Key Architecture Facts
- Two calibration completion code paths exist in `calibration.service.ts`:
  1. `provisionAndCalibrateInBackground()` — background path, used when satellite/weather data needs provisioning. Parcel update at ~line 287.
  2. `runCalibrationComputation()` — synchronous path, used when data already exists. Parcel update at ~line 567.
  Both currently only set `ai_calibration_id`. Neither sets `ai_enabled` or `ai_phase`.

- `ai_phase` column on `parcels` table has CHECK constraint: `('disabled', 'calibration', 'active', 'paused')`. Valid to set `'active'`.

- `ai-jobs.service.ts` daily pipeline cron only processes parcels where `ai_enabled = true` (line 300). This is why alerts are never generated — no parcel ever has this flag set.

- `createAiAlert()` does raw INSERT with zero deduplication. Alert code format: `AI-SCENARIO-${code}` (e.g., `AI-SCENARIO-C`).

- `AiRecommendationsModule` exports `AiRecommendationsService` — confirmed at module line 10.

- Stress scenario codes that trigger alerts/recommendations: `['C', 'D', 'E', 'F']`
  - C: Moderate vegetation stress (vigilance threshold crossed)
  - D: Critical decline (alert threshold, rapid deterioration)
  - E: Water stress (NDMI declining, negative water balance)
  - F: Heat/climate stress (weather anomaly + vegetation decline)

- Non-stress scenarios (A, B, G, H) should NOT generate alerts or recommendations.

### File Modification Map
- Task 1 only: `calibration.service.ts`, `calibration.service.spec.ts`
- Task 2+4 combined: `ai-jobs.service.ts`, `ai-jobs.service.spec.ts`
- Task 3 only: `ai-jobs.service.ts`, `ai-jobs.module.ts`, `ai-jobs.service.spec.ts`

### Pre-existing LSP Errors (IGNORE)
- `ai-diagnostics.controller.ts`: "Decorators are not valid here" — NestJS false positive from tsconfig
- `calibration.controller.ts`: Same decorator issue — NestJS false positive
- These are NOT caused by our changes and should be ignored

## [2026-03-12T20:15:00Z] Task 1 Complete: ai_enabled + ai_phase in calibration service

### Changes Applied
1. **Background path** (`provisionAndCalibrateInBackground()` at line 287):
   - Changed: `.update({ ai_calibration_id: calibrationId })`
   - To: `.update({ ai_calibration_id: calibrationId, ai_enabled: true, ai_phase: 'active' })`
   - Error handling: Logs error but continues (graceful degradation)

2. **Sync path** (`runCalibrationComputation()` at line 567):
   - Changed: `.update({ ai_calibration_id: calibration.id })`
   - To: `.update({ ai_calibration_id: calibration.id, ai_enabled: true, ai_phase: 'active' })`
   - Error handling: Throws BadRequestException on failure

3. **Test assertion** (`calibration.service.spec.ts` at line 203):
   - Updated to match new payload with `ai_enabled: true, ai_phase: 'active'`
   - Assertion now verifies all three fields are set correctly

### Verification
- LSP diagnostics: ✅ Clean (no errors on modified files)
- Code changes: ✅ Both parcel update locations updated
- Test assertion: ✅ Updated to match new payload
- Pre-existing test failure at line 177 (fetch mock setup) is unrelated to these changes

### Impact
- Parcels completing calibration will now have `ai_enabled = true` and `ai_phase = 'active'`
- This enables the daily AI cron job (`ai-jobs.service.ts` line 300) to process these parcels
- Alerts and recommendations can now be generated for calibrated parcels

## [2026-03-12T20:51:33Z] Tasks 2+4 Complete: Alert dedup + satellite window

### Changes Applied

1. **RECENT_SATELLITE_LOOKBACK_DAYS constant** (line 13):
   - Changed from `7` to `14` days
   - Extends satellite data lookback window for daily AI pipeline
   - WEATHER_FETCH_LOOKBACK_DAYS remains at 7 (unchanged)

2. **hasUnresolvedAlert private method** (added after line 470):
   - Queries `performance_alerts` table for existing unresolved alerts
   - Filters by: parcel_id, organization_id, alert_code, is_ai_generated=true, resolved_at=null
   - Returns boolean: true if unresolved alert exists, false otherwise
   - Follows exact pattern of `hasRecentSatelliteData` method
   - Throws error if query fails (consistent error handling)

3. **runDailyAiPipelineTrigger dedup check** (lines 172-180):
   - Before calling `createAiAlert`, now checks `hasUnresolvedAlert`
   - Uses `alertInput.alert_code!` (non-null assertion safe — alert_code always set in buildStressAlert)
   - Skips alert creation if unresolved alert already exists
   - Dedup check is inside try/catch block (failures isolated per parcel)

4. **New test case** (ai-jobs.service.spec.ts):
   - Test name: "runDailyAiPipelineTrigger skips alert creation when unresolved alert already exists"
   - Mocks performance_alerts query to return existing alert: `{ id: 'existing-alert-1' }`
   - Verifies `createAiAlert` is NOT called when alert exists
   - Verifies dedup query filters by: parcel_id, organization_id, alert_code, is_ai_generated, resolved_at

### Verification Results
- LSP diagnostics: ✅ Clean (no errors on ai-jobs.service.ts or ai-jobs.service.spec.ts)
- Test suite: ✅ 6 passed, 0 failed
  - Existing tests: 5 pass (unchanged)
  - New dedup test: 1 pass
- Code changes: ✅ All 3 modifications applied correctly
- Test evidence: Saved to `.sisyphus/evidence/task-2-4-tests.txt`

### Impact
- Prevents duplicate alert creation for same parcel/scenario combination
- Extends satellite data lookback from 7 to 14 days (more historical context)
- Dedup is deterministic: uses alert_code (not title/description)
- Does NOT delete or resolve existing duplicate alerts in DB
- Does NOT modify ai-alerts.service.ts (dedup logic stays in orchestrator)

## [2026-03-12T20:20:00Z] Task 2: Fix calibration service test regression

### Root Cause
The test was failing because:
1. Fixture satellite/weather readings had dates from 2026-01-XX (only ~70 days old)
2. `hasInsufficientCoverage()` requires 730+ days of data (2-year lookback)
3. With insufficient coverage, service took provisioning path instead of direct computation
4. Test expected direct computation path (sync/parcel endpoint)

### Changes Applied
1. **Dynamic date generation** (lines 66-68):
   - Created `lookbackBase` = today - 730 days
   - Created `toIsoDate()` helper to format dates as YYYY-MM-DD
   - Satellite readings now start from 730 days ago, incrementing by index

2. **Satellite rows** (lines 70-82):
   - Changed from static fixture dates to dynamic dates
   - Each reading gets date = lookbackBase + index days
   - Preserves all index values (NDVI, NDRE, NDMI, GCI, EVI, SAVI)

3. **Weather rows** (lines 98-108):
   - Changed from static fixture dates to dynamic dates
   - Each reading gets date = lookbackBase + index days
   - Preserves all weather values (temp_min, temp_max, precip, et0)

4. **Parcel mock field** (line 60):
   - Changed `system` → `planting_system` to match service expectation
   - Service reads `parcel.planting_system ?? 'unknown'` (line 757 of service)

### Verification
- ✅ All 3 tests pass (1 main + 2 edge cases)
- ✅ LSP diagnostics clean
- ✅ Test now correctly exercises direct computation path (sync/parcel endpoint)
- ✅ Parcel system field correctly set to 'intensif'

### Impact
- Test now validates the correct code path (runCalibrationComputation)
- Ensures ai_enabled + ai_phase updates are tested in sync scenario
- Prevents regression if CALIBRATION_LOOKBACK_DAYS changes again

## [2026-03-12T20:03:16Z] Task 3: Auto-generate recommendations in daily pipeline
- AiRecommendationsModule added to ai-jobs.module.ts
- SCENARIO_RECOMMENDATION_MAP defined for codes C, D, E, F
- buildStressRecommendation method added (returns CreateRecommendationDto | null)
- hasPendingRecommendation method added (dedup by alert_code + status=pending)
- runDailyAiPipelineTrigger: recommendation creation added after alert creation block
- 3 new tests added: stress creates both, non-stress creates neither, reco dedup works
- Test result: 9 pass / 0 fail
