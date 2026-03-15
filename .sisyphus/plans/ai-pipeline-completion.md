# AI Pipeline Completion — Enable Alerts & Auto-Recommendations

## TL;DR

> **Quick Summary**: Wire the final 3 missing pieces so the AI monitoring pipeline works end-to-end: set `ai_enabled` + `ai_phase` on calibration success (both code paths), auto-generate recommendations from stress diagnostics with dedup guards, and widen the satellite data freshness window.
> 
> **Deliverables**:
> - Parcels automatically become AI-enabled after calibration completes
> - Daily cron pipeline creates both alerts AND recommendations for stress scenarios
> - Duplicate alert/recommendation prevention per parcel
> - All existing tests updated to reflect new behavior
> 
> **Estimated Effort**: Short (3-5 focused tasks, ~2-3 hours)
> **Parallel Execution**: YES — 2 waves
> **Critical Path**: Task 1 (ai_enabled flag) → Task 3 (auto-recommendations, depends on enabled parcels for testing)

---

## Context

### Original Request
Complete the AI agricultural monitoring pipeline so that calibration → diagnostics → alerts → recommendations works automatically without manual intervention.

### Interview Summary
**Key Discussions**:
- AI pipeline analysis revealed `ai_enabled` flag is never set → all cron jobs skip every parcel
- `AiRecommendationsService.createRecommendation()` is fully implemented but never called automatically
- `hasRecentSatelliteData` requires data within 7 days but satellite sync is weekly → intermittent failures
- User confirmed: "no DB constraints, enforcement in app code only" for calibration status
- All 15 prior tasks committed and pushed to `develop` branch

**Research Findings**:
- Two calibration paths exist: `provisionAndCalibrateInBackground()` (line 287) AND `runCalibrationComputation()` (line 567) — both update `ai_calibration_id` but neither sets `ai_enabled`
- `ai_phase` column exists with DB CHECK constraint (`disabled | calibration | active | paused`) but is never set in code — leaving it as `disabled` while setting `ai_enabled = true` creates inconsistency
- `createAiAlert()` does raw INSERT with zero deduplication — daily pipeline will create duplicate alerts for persistent stress
- `AiDiagnosticsResponse` provides `scenario`, `scenario_code`, `confidence`, `description`, `indicators` but NO `action` field — recommendation `action` text must be derived from scenario code
- `ai-jobs.module.ts` imports only DatabaseModule, AiDiagnosticsModule, AiAlertsModule — needs AiRecommendationsModule added
- `ai-jobs.service.spec.ts` mock providers need updating for new AiRecommendationsService dependency
- `calibration.service.spec.ts` line 203 asserts parcel update with only `ai_calibration_id` — needs `ai_enabled` and `ai_phase` added

### Metis Review
**Identified Gaps** (addressed):
- **Two calibration paths**: Both `provisionAndCalibrateInBackground` AND `runCalibrationComputation` must set `ai_enabled` — addressed in Task 1
- **`ai_phase` inconsistency**: Column exists with valid values but never used — addressed by setting `'active'` alongside `ai_enabled: true`
- **Duplicate prevention**: No dedup on alerts or recommendations — addressed in Tasks 2 and 3
- **Missing action mapping**: Diagnostics response lacks `action` field for recommendations — addressed with static `SCENARIO_RECOMMENDATION_MAP`
- **Test breakage**: Both spec files need updating — addressed in Tasks 1 and 3

---

## Work Objectives

### Core Objective
Enable the complete AI monitoring pipeline: after calibration succeeds, daily cron jobs process the parcel, detect stress, create alerts, and generate actionable recommendations — all automatically.

### Concrete Deliverables
- `calibration.service.ts`: Both parcel update locations set `ai_enabled: true` + `ai_phase: 'active'`
- `ai-jobs.service.ts`: Daily pipeline generates recommendations alongside alerts, with dedup
- `ai-jobs.module.ts`: Imports `AiRecommendationsModule`
- `ai-jobs.service.spec.ts`: Updated mocks and assertions
- `calibration.service.spec.ts`: Updated assertion at line 203
- `RECENT_SATELLITE_LOOKBACK_DAYS` constant changed from 7 to 14

### Definition of Done
- [ ] `pnpm --filter agritech-api test` passes with 0 failures
- [ ] After calibration, parcel has `ai_enabled = true` and `ai_phase = 'active'`
- [ ] Daily pipeline creates alert + recommendation for stress scenarios (C, D, E, F)
- [ ] Daily pipeline does NOT create alert/recommendation for non-stress scenarios (A, B, G, H)
- [ ] Running daily pipeline twice does NOT create duplicate alert or recommendation for same parcel+alert_code

### Must Have
- `ai_enabled: true` set in BOTH calibration completion paths
- `ai_phase: 'active'` set alongside `ai_enabled`
- Dedup guard: check for existing unresolved alert with same `alert_code` for parcel before creating
- Dedup guard: check for existing `pending` recommendation with same `alert_code` for parcel before creating
- Static scenario→recommendation mapping for codes C, D, E, F
- Recommendation validity window: `valid_from = today`, `valid_until = today + 14 days`
- All existing tests passing after changes

### Must NOT Have (Guardrails)
- Do NOT modify `ai-diagnostics.service.ts` — scenario logic is complex and correct
- Do NOT create a separate cron job for recommendations — add to existing `runDailyAiPipelineTrigger`
- Do NOT bypass `createRecommendation()` with direct DB inserts
- Do NOT change `CreateRecommendationDto` class or add new fields
- Do NOT add notification/email when recommendation is created
- Do NOT add new API endpoints to trigger pipeline manually
- Do NOT generate recommendations for non-stress scenarios (A, B, G, H)
- Do NOT modify the frontend AI tab — backend pipeline changes only
- Do NOT use `as any` or `@ts-ignore`
- Do NOT add excessive comments or JSDoc

---

## Verification Strategy (MANDATORY)

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (Jest + `mock-database.helper`)
- **Automated tests**: YES (Tests-after — update existing specs to cover new behavior)
- **Framework**: Jest (`pnpm --filter agritech-api test`)

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **API/Backend**: Use Bash (`pnpm --filter agritech-api test`, specific test file runs)
- **Module wiring**: Use `tsc --noEmit` to verify compilation

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — independent changes):
├── Task 1: Set ai_enabled + ai_phase in calibration service [quick]
├── Task 2: Add dedup guard to alert creation in daily pipeline [quick]
└── Task 4: Widen satellite freshness window [quick]

Wave 2 (After Wave 1 — depends on dedup + module wiring):
└── Task 3: Auto-generate recommendations in daily pipeline [deep]

Wave FINAL (After ALL tasks):
├── Task F1: Full test suite verification [quick]
└── Task F2: Plan compliance audit [quick]
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | — | F1 |
| 2 | — | 3 |
| 3 | 2 | F1 |
| 4 | — | F1 |
| F1 | 1, 2, 3, 4 | F2 |
| F2 | F1 | — |

### Agent Dispatch Summary

- **Wave 1**: 3 tasks — T1 → `quick`, T2 → `quick`, T4 → `quick`
- **Wave 2**: 1 task — T3 → `deep`
- **FINAL**: 2 tasks — F1 → `quick`, F2 → `quick`

---

## TODOs

- [x] 1. Set `ai_enabled` + `ai_phase` on calibration success (both paths)

  **What to do**:
  - In `calibration.service.ts`, find the parcel update at line 285-288 inside `provisionAndCalibrateInBackground()`:
    ```typescript
    .update({ ai_calibration_id: calibrationId })
    ```
    Change to:
    ```typescript
    .update({ ai_calibration_id: calibrationId, ai_enabled: true, ai_phase: 'active' })
    ```
  - In `calibration.service.ts`, find the parcel update at line 565-568 inside `runCalibrationComputation()`:
    ```typescript
    .update({ ai_calibration_id: calibration.id })
    ```
    Change to:
    ```typescript
    .update({ ai_calibration_id: calibration.id, ai_enabled: true, ai_phase: 'active' })
    ```
  - In `calibration.service.spec.ts`, update the assertion at line 203:
    ```typescript
    expect(parcelUpdateQuery.update).toHaveBeenCalledWith({
      ai_calibration_id: insertedCalibration.id,
    });
    ```
    Change to:
    ```typescript
    expect(parcelUpdateQuery.update).toHaveBeenCalledWith({
      ai_calibration_id: insertedCalibration.id,
      ai_enabled: true,
      ai_phase: 'active',
    });
    ```

  **Must NOT do**:
  - Do NOT change the error handling behavior (background path logs+continues, sync path throws)
  - Do NOT add any new columns to the update
  - Do NOT touch `runCalibrationComputation` logic beyond the parcel update

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 3 small edits in 2 files — straightforward string replacements
  - **Skills**: []
    - No special skills needed for simple edits
  - **Skills Evaluated but Omitted**:
    - `react-doctor`: Not frontend work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 4)
  - **Blocks**: F1 (test verification)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `agritech-api/src/modules/calibration/calibration.service.ts:285-288` — Background path parcel update (currently only sets `ai_calibration_id`)
  - `agritech-api/src/modules/calibration/calibration.service.ts:565-568` — Sync path parcel update (currently only sets `ai_calibration_id`)

  **API/Type References**:
  - `project/supabase/migrations/20260312000000_agromind_ia.sql:1-6` — Column definitions: `ai_enabled BOOLEAN DEFAULT false`, `ai_phase TEXT CHECK (ai_phase IN ('disabled', 'calibration', 'active', 'paused'))`

  **Test References**:
  - `agritech-api/src/modules/calibration/calibration.service.spec.ts:203-205` — Existing assertion that checks parcel update payload

  **WHY Each Reference Matters**:
  - Lines 285-288: The background provisioning path — most common flow (used when satellite/weather data needs provisioning)
  - Lines 565-568: The synchronous computation path — used when data already exists. Missing this means parcels with pre-existing data never get `ai_enabled`
  - Migration file: Confirms the column names and valid CHECK values for `ai_phase`
  - Spec line 203: The exact assertion that will fail if not updated — must match the new update payload

  **Acceptance Criteria**:

  - [ ] `agritech-api/src/modules/calibration/calibration.service.ts` line ~287 includes `ai_enabled: true, ai_phase: 'active'`
  - [ ] `agritech-api/src/modules/calibration/calibration.service.ts` line ~567 includes `ai_enabled: true, ai_phase: 'active'`
  - [ ] `pnpm --filter agritech-api test -- --testPathPattern=calibration.service.spec` passes

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Sync calibration path sets ai_enabled and ai_phase
    Tool: Bash (grep + test run)
    Preconditions: Code changes applied
    Steps:
      1. Run: grep -A2 'ai_calibration_id: calibration.id' agritech-api/src/modules/calibration/calibration.service.ts
      2. Verify output contains 'ai_enabled: true' and 'ai_phase: .active.'
      3. Run: pnpm --filter agritech-api test -- --testPathPattern=calibration.service.spec
    Expected Result: grep shows both fields; tests pass with 0 failures
    Failure Indicators: grep output missing ai_enabled or ai_phase; test failure on parcel update assertion
    Evidence: .sisyphus/evidence/task-1-sync-path-enabled.txt

  Scenario: Background calibration path sets ai_enabled and ai_phase
    Tool: Bash (grep)
    Preconditions: Code changes applied
    Steps:
      1. Run: grep -A2 'ai_calibration_id: calibrationId' agritech-api/src/modules/calibration/calibration.service.ts
      2. Verify output contains 'ai_enabled: true' and 'ai_phase: .active.'
    Expected Result: Both fields present in background path update
    Failure Indicators: grep output missing ai_enabled or ai_phase
    Evidence: .sisyphus/evidence/task-1-background-path-enabled.txt
  ```

  **Commit**: YES (groups with Tasks 2, 4)
  - Message: `feat(ai): enable ai_enabled flag on calibration, add alert dedup, widen satellite window`
  - Files: `calibration.service.ts`, `calibration.service.spec.ts`
  - Pre-commit: `pnpm --filter agritech-api test`

- [x] 2. Add dedup guard to alert creation in daily pipeline

  **What to do**:
  - In `ai-jobs.service.ts`, add a private method `hasUnresolvedAlert` that checks if an unresolved alert with the same `alert_code` already exists for the parcel:
    ```typescript
    private async hasUnresolvedAlert(
      parcelId: string,
      organizationId: string,
      alertCode: string,
    ): Promise<boolean> {
      const client = this.databaseService.getAdminClient();
      const { data, error } = await client
        .from('performance_alerts')
        .select('id')
        .eq('parcel_id', parcelId)
        .eq('organization_id', organizationId)
        .eq('alert_code', alertCode)
        .eq('is_ai_generated', true)
        .is('resolved_at', null)
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to check existing alerts: ${error.message}`);
      }

      return !!data;
    }
    ```
  - In `runDailyAiPipelineTrigger()` (around line 170-174), BEFORE calling `aiAlertsService.createAiAlert(alertInput)`, add:
    ```typescript
    if (alertInput) {
      const alertExists = await this.hasUnresolvedAlert(
        parcel.id,
        parcel.organization_id,
        alertInput.alert_code!,
      );
      if (!alertExists) {
        await this.aiAlertsService.createAiAlert(alertInput);
      }
    }
    ```
  - Update `ai-jobs.service.spec.ts` to add a test case: when an unresolved alert with same `alert_code` exists, `createAiAlert` should NOT be called

  **Must NOT do**:
  - Do NOT modify `ai-alerts.service.ts` — the dedup is in the job orchestrator, not the alert service
  - Do NOT add dedup based on `title` or `description` — use `alert_code` which is deterministic
  - Do NOT delete or resolve existing duplicate alerts

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: One new method + one conditional guard + one test — small scoped change
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `react-doctor`: Not frontend work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 4)
  - **Blocks**: Task 3 (recommendation generation extends this flow)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `agritech-api/src/modules/ai-jobs/ai-jobs.service.ts:141-190` — `runDailyAiPipelineTrigger` method — the daily pipeline loop where alert creation happens at line 173
  - `agritech-api/src/modules/ai-jobs/ai-jobs.service.ts:472-497` — `buildStressAlert` method — shows how `alert_code` is built: `AI-SCENARIO-${diagnostics.scenario_code}`
  - `agritech-api/src/modules/ai-jobs/ai-jobs.service.ts:450-470` — `hasRecentSatelliteData` method — pattern for querying with `.maybeSingle()` and returning boolean

  **API/Type References**:
  - `agritech-api/src/modules/ai-alerts/ai-alerts.service.ts:147-174` — `createAiAlert` method — the INSERT that currently has no dedup
  - `project/supabase/migrations/20260312000000_agromind_ia.sql:14-23` — `performance_alerts` columns: `alert_code TEXT`, `is_ai_generated BOOLEAN`

  **Test References**:
  - `agritech-api/src/modules/ai-jobs/ai-jobs.service.spec.ts:66-80` — Existing test pattern for the daily pipeline

  **WHY Each Reference Matters**:
  - Lines 141-190: The exact method being modified — need to understand the loop structure and error isolation pattern
  - Lines 472-497: Shows `alert_code` format (`AI-SCENARIO-C`, etc.) — this is the dedup key
  - Lines 450-470: Pattern to follow for the new `hasUnresolvedAlert` method (same query style)
  - Alert service line 147: Confirms there's no built-in dedup — we must add it in the jobs layer

  **Acceptance Criteria**:

  - [ ] `hasUnresolvedAlert` method exists in `ai-jobs.service.ts`
  - [ ] `runDailyAiPipelineTrigger` checks `hasUnresolvedAlert` before calling `createAiAlert`
  - [ ] Test: when unresolved alert exists → `createAiAlert` is NOT called
  - [ ] Test: when no unresolved alert exists → `createAiAlert` IS called

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Alert dedup prevents duplicate creation
    Tool: Bash (test run)
    Preconditions: Code changes applied, mock returns existing alert for dedup query
    Steps:
      1. Run: pnpm --filter agritech-api test -- --testPathPattern=ai-jobs.service.spec
      2. Verify dedup test passes — alertsService.createAiAlert NOT called when alert exists
    Expected Result: All ai-jobs tests pass including new dedup test
    Failure Indicators: Test failure on dedup assertion
    Evidence: .sisyphus/evidence/task-2-alert-dedup.txt

  Scenario: New alert created when no duplicate exists
    Tool: Bash (test run)
    Preconditions: Mock returns null for dedup query (no existing alert)
    Steps:
      1. Run same test file
      2. Verify original alert creation test still passes
    Expected Result: createAiAlert called exactly once
    Failure Indicators: createAiAlert not called or called multiple times
    Evidence: .sisyphus/evidence/task-2-alert-creation.txt
  ```

  **Commit**: YES (groups with Tasks 1, 4)
  - Message: `feat(ai): enable ai_enabled flag on calibration, add alert dedup, widen satellite window`
  - Files: `ai-jobs.service.ts`, `ai-jobs.service.spec.ts`
  - Pre-commit: `pnpm --filter agritech-api test`

- [ ] 3. Auto-generate recommendations from stress diagnostics in daily pipeline

  **What to do**:
  - In `ai-jobs.module.ts`, add `AiRecommendationsModule` to imports:
    ```typescript
    import { AiRecommendationsModule } from '../ai-recommendations/ai-recommendations.module';

    @Module({
      imports: [DatabaseModule, AiDiagnosticsModule, AiAlertsModule, AiRecommendationsModule],
      ...
    })
    ```
  - In `ai-jobs.service.ts`, inject `AiRecommendationsService` in constructor:
    ```typescript
    import { AiRecommendationsService } from '../ai-recommendations/ai-recommendations.service';

    constructor(
      private readonly databaseService: DatabaseService,
      private readonly aiDiagnosticsService: AiDiagnosticsService,
      private readonly aiAlertsService: AiAlertsService,
      private readonly aiRecommendationsService: AiRecommendationsService,
    ) {}
    ```
  - Add a static `SCENARIO_RECOMMENDATION_MAP` constant (place near top of file, after `STRESS_SCENARIO_CODES`):
    ```typescript
    const SCENARIO_RECOMMENDATION_MAP: Record<string, { constat: string; diagnostic: string; action: string; priority: string }> = {
      C: {
        constat: 'Moderate vegetation stress detected — NDVI declining below vigilance threshold',
        diagnostic: 'Possible water deficit or nutrient deficiency causing reduced chlorophyll activity',
        action: 'Increase irrigation frequency and monitor vegetation indices over the next 7 days. Check soil moisture levels.',
        priority: 'medium',
      },
      D: {
        constat: 'Critical vegetation decline detected — NDVI below alert threshold with rapid deterioration',
        diagnostic: 'Severe stress condition indicating potential crop damage from prolonged water deficit, disease, or pest attack',
        action: 'Immediate irrigation intervention required. Inspect parcel for disease or pest damage. Consider emergency foliar treatment.',
        priority: 'high',
      },
      E: {
        constat: 'Water stress indicators abnormal — NDMI declining with negative water balance',
        diagnostic: 'Soil moisture deficit detected from evapotranspiration exceeding precipitation over sustained period',
        action: 'Assess soil moisture levels. Increase irrigation volume and reduce intervals between waterings. Monitor NDMI recovery.',
        priority: 'medium',
      },
      F: {
        constat: 'Heat and climate stress detected — weather anomaly combined with vegetation decline',
        diagnostic: 'Extreme temperature event causing thermal stress on vegetation, potentially reducing photosynthetic efficiency',
        action: 'Apply anti-stress treatments if available. Adjust irrigation to early morning and late evening. Consider shade measures for sensitive crops.',
        priority: 'high',
      },
    };
    ```
  - Add a private method `buildStressRecommendation` (place after `buildStressAlert`):
    ```typescript
    private buildStressRecommendation(
      parcel: AiEnabledParcelJobRecord,
      diagnostics: AiDiagnosticsResponse,
    ): CreateRecommendationDto | null {
      const mapping = SCENARIO_RECOMMENDATION_MAP[diagnostics.scenario_code];
      if (!mapping) return null;

      const now = new Date();
      const validUntil = new Date(now);
      validUntil.setUTCDate(validUntil.getUTCDate() + 14);

      return {
        parcel_id: parcel.id,
        constat: mapping.constat,
        diagnostic: `${mapping.diagnostic}. ${diagnostics.description}`,
        action: mapping.action,
        alert_code: `AI-SCENARIO-${diagnostics.scenario_code}`,
        priority: mapping.priority,
        crop_type: parcel.crop_type ?? undefined,
        valid_from: this.toIsoDate(now),
        valid_until: this.toIsoDate(validUntil),
      };
    }
    ```
    NOTE: Import `CreateRecommendationDto` from `../ai-recommendations/dto/create-recommendation.dto`.
  - Add a private method `hasPendingRecommendation` for dedup:
    ```typescript
    private async hasPendingRecommendation(
      parcelId: string,
      organizationId: string,
      alertCode: string,
    ): Promise<boolean> {
      const client = this.databaseService.getAdminClient();
      const { data, error } = await client
        .from('ai_recommendations')
        .select('id')
        .eq('parcel_id', parcelId)
        .eq('organization_id', organizationId)
        .eq('alert_code', alertCode)
        .eq('status', 'pending')
        .limit(1)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to check existing recommendations: ${error.message}`);
      }

      return !!data;
    }
    ```
  - In `runDailyAiPipelineTrigger()`, after the alert creation block (around line 174), add recommendation creation:
    ```typescript
    const recommendationInput = this.buildStressRecommendation(parcel, diagnostics);
    if (recommendationInput) {
      const recoExists = await this.hasPendingRecommendation(
        parcel.id,
        parcel.organization_id,
        recommendationInput.alert_code!,
      );
      if (!recoExists) {
        await this.aiRecommendationsService.createRecommendation(
          recommendationInput,
          parcel.organization_id,
        );
      }
    }
    ```
  - Update `ai-jobs.service.spec.ts`:
    - Add mock for `AiRecommendationsService` with `createRecommendation: jest.fn()`
    - Add it to the test module providers
    - Add test: stress scenario creates both alert AND recommendation
    - Add test: non-stress scenario creates neither alert nor recommendation
    - Add test: dedup prevents duplicate recommendation when pending one exists

  **Must NOT do**:
  - Do NOT modify `CreateRecommendationDto` or `AiRecommendationsService`
  - Do NOT create a separate cron job — integrate into existing `runDailyAiPipelineTrigger`
  - Do NOT generate recommendations for non-stress scenarios
  - Do NOT add LLM calls — use static mapping only
  - Do NOT add `calibration_id` to recommendation (would require fetching calibration per parcel in the loop)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Multiple interconnected changes across 3 files, new method implementations, test updates — needs careful reasoning about integration
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `react-doctor`: Not frontend work

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (sequential after Wave 1)
  - **Blocks**: F1 (test verification)
  - **Blocked By**: Task 2 (dedup pattern must exist first; also this task modifies the same method that Task 2 modifies)

  **References**:

  **Pattern References**:
  - `agritech-api/src/modules/ai-jobs/ai-jobs.service.ts:141-190` — `runDailyAiPipelineTrigger` method — the loop where recommendation creation will be added after alert creation
  - `agritech-api/src/modules/ai-jobs/ai-jobs.service.ts:472-497` — `buildStressAlert` method — pattern to follow for `buildStressRecommendation` (same gating on STRESS_SCENARIO_CODES)
  - `agritech-api/src/modules/ai-jobs/ai-jobs.service.ts:15` — `STRESS_SCENARIO_CODES` constant — defines which codes trigger alerts AND recommendations: ['C', 'D', 'E', 'F']

  **API/Type References**:
  - `agritech-api/src/modules/ai-recommendations/dto/create-recommendation.dto.ts:10-70` — `CreateRecommendationDto` fields: parcel_id (required), constat (required), diagnostic (required), action (required), conditions, suivi, crop_type, alert_code, priority, valid_from, valid_until
  - `agritech-api/src/modules/ai-recommendations/ai-recommendations.service.ts:111-143` — `createRecommendation(data, organizationId)` method signature — takes DTO + orgId
  - `agritech-api/src/modules/ai-diagnostics/ai-diagnostics.service.ts:44-50` — `AiDiagnosticsResponse` shape: scenario, scenario_code, confidence, description, indicators
  - `agritech-api/src/modules/ai-recommendations/ai-recommendations.module.ts:6-11` — Module exports `AiRecommendationsService` — confirms it can be imported

  **Test References**:
  - `agritech-api/src/modules/ai-jobs/ai-jobs.service.spec.ts:26-52` — Test setup with mock providers — pattern for adding `AiRecommendationsService` mock
  - `agritech-api/src/modules/ai-jobs/ai-jobs.service.spec.ts:66-80` — Existing daily pipeline test pattern

  **WHY Each Reference Matters**:
  - Lines 141-190: The exact insertion point — recommendation creation goes after alert creation (line ~174) inside the per-parcel try/catch
  - `buildStressAlert` at 472: Structural pattern — new `buildStressRecommendation` follows same shape (check scenario code, build object, return null if not applicable)
  - `CreateRecommendationDto`: Contract we must satisfy — required fields are parcel_id, constat, diagnostic, action. The `SCENARIO_RECOMMENDATION_MAP` provides the text for these.
  - `createRecommendation()` signature: Takes (dto, organizationId) — must pass org ID separately
  - Test setup at lines 26-52: Shows how to mock a service (jest.fn()) and inject into test module — follow same pattern for recommendations mock

  **Acceptance Criteria**:

  - [ ] `AiRecommendationsModule` imported in `ai-jobs.module.ts`
  - [ ] `AiRecommendationsService` injected in `AiJobsService` constructor
  - [ ] `SCENARIO_RECOMMENDATION_MAP` constant defined for codes C, D, E, F
  - [ ] `buildStressRecommendation` method returns `CreateRecommendationDto | null`
  - [ ] `hasPendingRecommendation` method checks for existing pending recommendation
  - [ ] `runDailyAiPipelineTrigger` creates recommendation after alert, with dedup
  - [ ] Test: stress scenario (code C) → both `createAiAlert` AND `createRecommendation` called
  - [ ] Test: non-stress scenario (code A) → neither `createAiAlert` nor `createRecommendation` called
  - [ ] Test: pending recommendation exists → `createRecommendation` NOT called
  - [ ] `pnpm --filter agritech-api test -- --testPathPattern=ai-jobs.service.spec` passes

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Stress scenario generates both alert and recommendation
    Tool: Bash (test run)
    Preconditions: Mocked diagnostics returns scenario_code 'C', no existing alert/recommendation
    Steps:
      1. Run: pnpm --filter agritech-api test -- --testPathPattern=ai-jobs.service.spec
      2. Verify test passes: alertsService.createAiAlert called once
      3. Verify test passes: recommendationsService.createRecommendation called once
      4. Verify recommendation payload includes correct constat, diagnostic, action from SCENARIO_RECOMMENDATION_MAP
    Expected Result: Both services called with correct payloads
    Failure Indicators: Either service not called, or called with wrong payload
    Evidence: .sisyphus/evidence/task-3-stress-recommendation.txt

  Scenario: Non-stress scenario generates neither alert nor recommendation
    Tool: Bash (test run)
    Preconditions: Mocked diagnostics returns scenario_code 'A' (healthy)
    Steps:
      1. Run same test file
      2. Verify: alertsService.createAiAlert NOT called
      3. Verify: recommendationsService.createRecommendation NOT called
    Expected Result: Neither service called
    Failure Indicators: Either service called unexpectedly
    Evidence: .sisyphus/evidence/task-3-non-stress-no-recommendation.txt

  Scenario: Recommendation dedup prevents duplicate
    Tool: Bash (test run)
    Preconditions: Mock returns existing pending recommendation for dedup query
    Steps:
      1. Run same test file
      2. Verify: recommendationsService.createRecommendation NOT called
    Expected Result: createRecommendation skipped
    Failure Indicators: createRecommendation called despite existing pending recommendation
    Evidence: .sisyphus/evidence/task-3-recommendation-dedup.txt
  ```

  **Commit**: YES
  - Message: `feat(ai): auto-generate recommendations from stress diagnostics`
  - Files: `ai-jobs.service.ts`, `ai-jobs.module.ts`, `ai-jobs.service.spec.ts`
  - Pre-commit: `pnpm --filter agritech-api test`

- [x] 4. Widen satellite data freshness window from 7 to 14 days

  **What to do**:
  - In `ai-jobs.service.ts`, change the constant at line 13:
    ```typescript
    const RECENT_SATELLITE_LOOKBACK_DAYS = 7;
    ```
    to:
    ```typescript
    const RECENT_SATELLITE_LOOKBACK_DAYS = 14;
    ```
  - No test changes needed — the constant is used internally and existing tests mock the DB response

  **Must NOT do**:
  - Do NOT change `WEATHER_FETCH_LOOKBACK_DAYS` — 7 days for weather is correct
  - Do NOT make this configurable via env var — keep as constant

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single constant change — trivial
  - **Skills**: []
  - **Skills Evaluated but Omitted**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: F1 (test verification)
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `agritech-api/src/modules/ai-jobs/ai-jobs.service.ts:13` — `RECENT_SATELLITE_LOOKBACK_DAYS = 7` — the constant to change
  - `agritech-api/src/modules/ai-jobs/ai-jobs.service.ts:450-470` — `hasRecentSatelliteData` method — consumes this constant to filter satellite data by date

  **WHY Each Reference Matters**:
  - Line 13: The exact line to edit
  - Lines 450-470: Shows how the constant is used — `gte('date', this.getLookbackDate(RECENT_SATELLITE_LOOKBACK_DAYS))` — widening from 7→14 means satellite data up to 2 weeks old is considered "recent"

  **Acceptance Criteria**:

  - [ ] `RECENT_SATELLITE_LOOKBACK_DAYS` equals `14` in `ai-jobs.service.ts`
  - [ ] `pnpm --filter agritech-api test -- --testPathPattern=ai-jobs.service.spec` passes

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Satellite freshness window is 14 days
    Tool: Bash (grep)
    Preconditions: Code change applied
    Steps:
      1. Run: grep 'RECENT_SATELLITE_LOOKBACK_DAYS' agritech-api/src/modules/ai-jobs/ai-jobs.service.ts
      2. Verify output shows '= 14'
    Expected Result: Constant set to 14
    Failure Indicators: Still shows 7 or different value
    Evidence: .sisyphus/evidence/task-4-satellite-window.txt

  Scenario: Tests still pass with widened window
    Tool: Bash (test run)
    Preconditions: Constant changed
    Steps:
      1. Run: pnpm --filter agritech-api test -- --testPathPattern=ai-jobs.service.spec
    Expected Result: All tests pass
    Failure Indicators: Any test failure
    Evidence: .sisyphus/evidence/task-4-tests-pass.txt
  ```

  **Commit**: YES (groups with Tasks 1, 2)
  - Message: `feat(ai): enable ai_enabled flag on calibration, add alert dedup, widen satellite window`
  - Files: `ai-jobs.service.ts`
  - Pre-commit: `pnpm --filter agritech-api test`

---

## Final Verification Wave

- [ ] F1. **Full Test Suite Run** — `quick`
  Run `pnpm --filter agritech-api test` and verify 0 failures. If any test fails, identify the failing test, read its source, and fix the implementation (not the test) unless the test assertion is outdated.
  Output: `Tests [N pass / 0 fail] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Plan Compliance Audit** — `quick`
  Read this plan. For each "Must Have": verify implementation exists (read file, check the line). For each "Must NOT Have": search codebase for forbidden patterns. Check all 4 tasks are committed.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | VERDICT: APPROVE/REJECT`

---

## Commit Strategy

- **Commit 1** (after Tasks 1+2+4): `feat(ai): enable ai_enabled flag on calibration, add alert dedup, widen satellite window`
  - Files: `calibration.service.ts`, `calibration.service.spec.ts`, `ai-jobs.service.ts`, `ai-jobs.service.spec.ts`
  - Pre-commit: `pnpm --filter agritech-api test`

- **Commit 2** (after Task 3): `feat(ai): auto-generate recommendations from stress diagnostics`
  - Files: `ai-jobs.service.ts`, `ai-jobs.module.ts`, `ai-jobs.service.spec.ts`
  - Pre-commit: `pnpm --filter agritech-api test`

---

## Success Criteria

### Verification Commands
```bash
pnpm --filter agritech-api test  # Expected: all tests pass
pnpm --filter agritech-api build  # Expected: 0 errors
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Changes pushed to `develop` branch
