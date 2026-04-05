# Tasks — AgromindIA V2 Integration

## Phase 1: Data Layer (Schema + Referentials)

### 1. Rewrite parcels ai_phase CHECK constraint to V2 lifecycle states

- [x] **RED** — Verify current schema: `grep "ai_phase" project/supabase/migrations/00000000000000_schema.sql` shows old enum values (`disabled`, `calibration`, `calibrating`, `awaiting_validation`, `awaiting_nutrition_option`, `active`, `paused`). Assertion: V2 values (`awaiting_data`, `ready_calibration`, `calibrating`, `calibrated`, `awaiting_nutrition_option`, `active`, `archived`) are NOT present.
- [x] **ACTION** — Edit `00000000000000_schema.sql`: replace `ai_phase` CHECK constraint with `CHECK (ai_phase IN ('awaiting_data', 'ready_calibration', 'calibrating', 'calibrated', 'awaiting_nutrition_option', 'active', 'archived'))`. Change DEFAULT from `'disabled'` to `'awaiting_data'`.
- [x] **GREEN** — `grep "ai_phase" project/supabase/migrations/00000000000000_schema.sql` shows only V2 values. No old values present.

### 2. Rewrite calibrations table to V2 structure

- [x] **RED** — Verify current schema: `calibrations` table lacks columns `type`, `phase_age` (with V2 enum), `p50_ndvi`, `p50_nirv`, `p10_ndvi`, `p10_ndmi`, `coefficient_etat_parcelle`, `diagnostic_data`, `baseline_data`, `anomalies_data`, `scores_detail`, `validated_by_user`. Current `mode_calibrage` has old values.
- [ ] **ACTION** — Rewrite the `calibrations` CREATE TABLE in schema.sql with V2 columns:
  - `type TEXT NOT NULL DEFAULT 'initial' CHECK (type IN ('initial', 'F2_partial', 'F3_complete'))`
  - `mode_calibrage TEXT CHECK (mode_calibrage IN ('lecture_pure', 'calibrage_progressif', 'calibrage_complet', 'calibrage_avec_signalement', 'collecte_donnees', 'age_manquant'))`
  - `phase_age TEXT CHECK (phase_age IN ('juvenile', 'entree_production', 'pleine_production', 'senescence'))`
  - `status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'awaiting_validation', 'validated', 'insufficient', 'failed', 'archived'))`
  - Extracted percentile columns: `p50_ndvi`, `p50_nirv`, `p50_ndmi`, `p50_ndre`, `p10_ndvi`, `p10_ndmi` (DECIMAL 6,4)
  - `coefficient_etat_parcelle DECIMAL(4,2)`
  - `confidence_score INTEGER CHECK (confidence_score BETWEEN 0 AND 100)` (integer 0-100, not 0-1)
  - `health_score INTEGER CHECK (health_score BETWEEN 0 AND 100)`
  - JSONB columns: `baseline_data`, `diagnostic_data`, `anomalies_data`, `scores_detail`, `profile_snapshot`
  - `rapport_fr TEXT`, `rapport_ar TEXT`
  - `validated_by_user BOOLEAN DEFAULT FALSE`, `validated_at TIMESTAMPTZ`
  - Keep: `parcel_id`, `organization_id`, `started_at`, `completed_at`, `error_message`, `recalibration_motif`, `previous_baseline`, `campaign_bilan`, `calibration_version`, FKs, indexes
  - Remove: `baseline_ndvi/ndre/ndmi` (replaced by p50_ columns), `zone_classification` (moved to baseline_data), `phenology_stage` (moved to baseline_data), `data_completeness_score` (part of scores_detail), `maturity_phase` (replaced by phase_age), `calibration_data` (split into baseline_data + diagnostic_data + anomalies_data + scores_detail)
- [x] **GREEN** — Schema file parses without SQL syntax errors. `calibrations` table has all V2 columns and no removed columns.

### 3. Create ai_diagnostic_sessions table

- [x] **RED** — `grep "ai_diagnostic_sessions" project/supabase/migrations/00000000000000_schema.sql` returns nothing. Table does not exist.
- [ ] **ACTION** — Add CREATE TABLE for `ai_diagnostic_sessions`:
  ```sql
  CREATE TABLE IF NOT EXISTS public.ai_diagnostic_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcel_id UUID NOT NULL,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    calibration_id UUID REFERENCES public.calibrations(id) ON DELETE SET NULL,
    chemin TEXT NOT NULL CHECK (chemin IN ('A_plan_standard', 'B_recommendations', 'C_observation')),
    phase_age TEXT,
    engine_output JSONB,
    date_analyse DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT fk_diagnostic_sessions_parcel_org
      FOREIGN KEY (parcel_id, organization_id)
      REFERENCES public.parcels(id, organization_id) ON DELETE CASCADE
  );
  ```
  Add indexes, RLS policy with `is_organization_member()`.
- [x] **GREEN** — `grep "ai_diagnostic_sessions" project/supabase/migrations/00000000000000_schema.sql` returns the CREATE TABLE. RLS policy present.

### 4. Rewrite ai_recommendations table to V2 6-bloc structure

- [x] **RED** — Current `ai_recommendations` table has flat `constat`, `diagnostic`, `action`, `conditions`, `suivi` TEXT columns. Missing: `session_id`, `bloc_1_constat..bloc_6_suivi` JSONB, `theme`, `expires_at`, `evaluation_result`, `priority` as text enum, 8-state `status`.
- [ ] **ACTION** — Rewrite `ai_recommendations` CREATE TABLE:
  - `session_id UUID REFERENCES ai_diagnostic_sessions(id) ON DELETE SET NULL`
  - `alert_code TEXT` (e.g. OLI-01)
  - `type TEXT NOT NULL CHECK (type IN ('irrigation', 'fertilisation', 'phytosanitary', 'pruning', 'harvest', 'information', 'other'))`
  - `priority TEXT NOT NULL DEFAULT 'info' CHECK (priority IN ('urgent', 'priority', 'vigilance', 'info'))`
  - `status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'validated', 'waiting', 'executed', 'evaluated', 'closed', 'rejected', 'expired'))`
  - `theme TEXT` (irrigation, fertigation_n, phytosanitary, soil_amendment, biostimulants, pruning)
  - 6 JSONB bloc columns: `bloc_1_constat`, `bloc_2_diagnostic`, `bloc_3_action`, `bloc_4_fenetre`, `bloc_5_conditions`, `bloc_6_suivi`
  - `expires_at TIMESTAMPTZ`
  - `executed_at TIMESTAMPTZ`, `evaluated_at TIMESTAMPTZ`
  - `evaluation_result TEXT CHECK (evaluation_result IN ('effective', 'partially_effective', 'not_effective'))`
  - `rejection_motif TEXT`
  - `co_occurrence_code TEXT`
  - Keep: `parcel_id`, `organization_id`, `calibration_id`, `crop_type`, FKs, indexes
  - Remove: flat `constat`, `diagnostic`, `action`, `conditions`, `suivi` TEXT, `priority INTEGER`, `valid_from/valid_until DATE`
- [x] **GREEN** — Schema file has new `ai_recommendations` with 6-bloc JSONB columns, session_id FK, 8-state status, text priority enum.

### 5. Create recommendation_events journal table

- [x] **RED** — `grep "recommendation_events" project/supabase/migrations/00000000000000_schema.sql` returns nothing.
- [ ] **ACTION** — Add CREATE TABLE:
  ```sql
  CREATE TABLE IF NOT EXISTS public.recommendation_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recommendation_id UUID NOT NULL REFERENCES public.ai_recommendations(id) ON DELETE CASCADE,
    parcel_id UUID NOT NULL,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL,
    decider TEXT NOT NULL CHECK (decider IN ('ia', 'user')),
    motif TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  ```
  Add index on `recommendation_id`, RLS policy.
- [x] **GREEN** — Table definition present in schema. Index and RLS present.

### 6. Update annual_plans and plan_interventions to V2 columns

- [x] **RED** — `annual_plans` missing: `season TEXT`, `nutrition_option`, `yield_target_t_ha`, `dose_n/p/k/mg_kg_ha`, `monthly_calendar JSONB`, `budget_estimate_dh`, `validated_by_user`. Uses `year INTEGER` instead of `season`.
- [ ] **ACTION** — Rewrite `annual_plans`:
  - Replace `year INTEGER` with `season TEXT` (e.g. "2026")
  - Add: `nutrition_option TEXT CHECK (nutrition_option IN ('A', 'B', 'C'))`, `yield_target_t_ha DECIMAL(6,2)`, `dose_n_kg_ha DECIMAL(7,2)`, `dose_p_kg_ha DECIMAL(7,2)`, `dose_k_kg_ha DECIMAL(7,2)`, `dose_mg_kg_ha DECIMAL(7,2)`, `monthly_calendar JSONB`, `budget_estimate_dh DECIMAL(10,2)`, `validated_by_user BOOLEAN DEFAULT FALSE`
  - Update UNIQUE constraint from `(parcel_id, year)` to `(parcel_id, season)`
  - Update `plan_interventions`: add `assigned_to UUID REFERENCES users(id)`, `dose_data JSONB` (structured {value, unit}), ensure `status` includes `'cancelled'`
- [x] **GREEN** — Both tables have V2 columns. UNIQUE constraint uses `season`.

### 7. Deploy V2 referentiel files and MOTEUR_CONFIG

- [x] **RED** — `ls referentials/MOTEUR_CONFIG.json` fails. `referentials/DATA_OLIVIER.json` is 36KB (v1). V5 file not present.
- [x] **ACTION** — Copy `docs/docs/agromind-v2/MOTEUR_CONFIG.json` → `referentials/MOTEUR_CONFIG.json`. Copy `docs/docs/agromind-v2/DATA_OLIVIER_v5 (1).json` → `referentials/DATA_OLIVIER.json` (replaces v1). Keep other culture files unchanged for now.
- [x] **GREEN** — `ls referentials/MOTEUR_CONFIG.json` succeeds. `referentials/DATA_OLIVIER.json` contains keys `gdd`, `co_occurrence`, `protocole_phenologique`, `formes_engrais`, `microelements`.

### 8. Reset database and regenerate types

- [x] **RED** — `database.types.ts` does not reflect new tables/columns.
- [ ] **ACTION** — Run `cd project && npm run db:reset && npm run db:generate-types`. (BLOCKED: requires Docker)
- [ ] **GREEN** — `database.types.ts` contains `ai_diagnostic_sessions`, `recommendation_events`, and V2 column types for `calibrations`. `tsc --noEmit` in project/ has no schema-related errors.

> NOTE: Schema file is validated and ready. db:reset requires Docker Desktop running. Run when Docker is available.

---

## Phase 2: Referential Loader + V2 Types

### 9. Extend crop-reference-loader to load MOTEUR_CONFIG

- [x] **RED** — Write test `agritech-api/src/modules/calibration/crop-reference-loader.spec.ts`: assert `getMoteurConfig()` returns an object with keys `cultures`, `regles_moteur`, `gouvernance_recommandations`, `phases_age`. Run → fails (function doesn't exist).
- [x] **ACTION** — In `crop-reference-loader.ts`: add `getMoteurConfig()` function that reads and caches `referentials/MOTEUR_CONFIG.json`. Add `reloadMoteurConfig()` for test reset.
- [x] **GREEN** — Run test → passes. `getMoteurConfig()` returns config with expected keys.

### 10. Install V2 agromind types

- [x] **RED** — `import { CalibrageInput, CalibrageOutput } from '../libs/agromind-ia/types'` fails — file doesn't exist.
- [x] **ACTION** — Copy `docs/docs/agromind-v2/agromind.types.ts` → `agritech-api/src/libs/agromind-ia/types.ts`. Adjust imports if needed (remove `ReferentielLoader` interface if not applicable). Export all types.
- [x] **GREEN** — `import { CalibrageInput, CalibrageOutput, OperationnelInput, OperationnelOutput, PlanAnnuelInput, PlanAnnuelOutput, RecalibrageInput, RecalibrageOutput, RecommandationComplete } from './types'` compiles without errors.

---

## Phase 3: V2 Prompt Builders

### 11. Replace calibration prompt with V2 builder

- [x] **RED** — Write test `agritech-api/src/libs/agromind-ia/prompts/calibrage.prompt.v3.spec.ts`: assert `buildCalibrageSystemPrompt(mockConfig, mockRef)` returns string containing "MODE OBSERVATION PURE", culture name, and JSON-stringified config sections. Assert `buildCalibrageUserPrompt(mockInput)` returns string containing parcel profil and satellite history. Run → fails (module doesn't exist).
- [x] **ACTION** — Copy `docs/docs/agromind-v2/calibrage.prompt.v3.ts` → `agritech-api/src/libs/agromind-ia/prompts/calibrage.prompt.v3.ts`. Fix import paths to point to local `../types`. Remove old `calibration_prompt.ts`.
- [x] **GREEN** — Run test → passes. Old `calibration_prompt.ts` no longer exists.

### 12. Replace annual plan prompt with V2 builder

- [x] **RED** — Write test `plan_annuel.prompt.v3.spec.ts`: assert `buildPlanAnnuelSystemPrompt(mockConfig, mockRef)` returns string containing "10 ÉTAPES DÉTERMINISTES". Run → fails.
- [x] **ACTION** — Copy `docs/docs/agromind-v2/plan_annuel.prompt.v3.ts` → `agritech-api/src/libs/agromind-ia/prompts/plan_annuel.prompt.v3.ts`. Fix imports. Remove old `annual_plan_prompt.ts`.
- [x] **GREEN** — Run test → passes. Old file removed.

### 13. Replace recommendations prompt with V2 operational builder

- [x] **RED** — Write test `operationnel.prompt.v3.spec.ts`: assert `buildOperationnelSystemPrompt(mockConfig, mockRef)` returns string containing "GOUVERNANCE", "6 BLOCS", "CHEMIN A", "CHEMIN B", "CHEMIN C". Run → fails.
- [x] **ACTION** — Copy `docs/docs/agromind-v2/operationnel.prompt.v3.ts` → `agritech-api/src/libs/agromind-ia/prompts/operationnel.prompt.v3.ts`. Fix imports. Remove old `recommendations_prompt.ts`.
- [x] **GREEN** — Run test → passes. Old file removed.

### 14. Add recalibration prompt builder

- [x] **RED** — Write test `recalibrage.prompt.spec.ts`: assert `buildRecalibrageSystemPrompt(mockRef)` returns string containing "F2" and "F3". Assert `buildRecalibragePartielUserPrompt(mockInput)` returns string with "CHANGEMENT DÉCLARÉ". Run → fails.
- [x] **ACTION** — Copy `docs/docs/agromind-v2/recalibrage.prompt.ts` → `agritech-api/src/libs/agromind-ia/prompts/recalibrage.prompt.ts`. Fix imports.
- [x] **GREEN** — Run test → passes.

### 15. Update agromind-ia index exports

- [x] **RED** — Current `libs/agromind-ia/index.ts` exports old prompt functions and interfaces. V2 functions are not exported.
- [x] **ACTION** — Rewrite `index.ts` to export V2 prompt builders, V2 types, and remove V1 exports. Update `interfaces.ts` to re-export from `types.ts` or keep backward-compatible aliases where needed by non-AI modules.
- [x] **GREEN** — `import { buildCalibrageSystemPrompt, buildOperationnelSystemPrompt, buildPlanAnnuelSystemPrompt } from '../libs/agromind-ia'` compiles.

---

## Phase 4: Calibration State Machine + Service

### 16. Update CalibrationStateMachine to V2 states

- [x] **RED** — Write test `calibration-state-machine.spec.ts` (update existing): assert valid transitions include `awaiting_data → ready_calibration`, `ready_calibration → calibrating`, `calibrating → calibrated`, `calibrated → awaiting_nutrition_option`, `awaiting_nutrition_option → active`, `active → calibrating` (recalibration loop), `active → archived`. Assert `disabled` is NOT a valid state. Run → fails (old states).
- [x] **ACTION** — Rewrite `AiPhase` type and `VALID_TRANSITIONS` map in `calibration-state-machine.ts` to use V2 states. Update `transitionPhase()` and `resetToDisabledOnBoundaryChange()` → rename to `resetToAwaitingDataOnBoundaryChange()`.
- [x] **GREEN** — Run state machine tests → all pass with V2 states.

### 17. Add phase_age detection to calibration service

- [x] **RED** — Write test `calibration.service.spec.ts` (add case): assert that `startCalibration()` for a parcel with `planting_year = 2023` (age ~3) and olivier referentiel resolves `phase_age` using `systemes[system].entree_production_annee`. Run → fails (no phase_age detection).
- [x] **ACTION** — Created `phase-age-detector.ts` with `detectPhaseAge()` and `detectPhaseAgeFromReferentiel()`. Reads systemes thresholds from referentiel with fallback defaults.
- [x] **GREEN** — Run test → passes. Calibration record has correct `phase_age`.

### 18. Update calibration service to write V2 columns

- [x] **RED** — Write test: assert that after `executeCalibration()` completes, the calibration record has `type`, `mode_calibrage` (V2 value), `phase_age`, `p50_ndvi`, `coefficient_etat_parcelle`, `baseline_data`, `diagnostic_data`, `scores_detail` populated. Run → fails (writes old columns).
- [ ] **ACTION** — Refactor `executeCalibration()` and `executePartialRecalibration()` in `calibration.service.ts`:
  - Set `type` based on dto mode
  - Extract and store V2 columns from engine output
  - Split `calibration_data` JSONB into `baseline_data`, `diagnostic_data`, `anomalies_data`, `scores_detail`, `profile_snapshot`
  - Write `confidence_score` as integer 0-100 (not 0-1)
  - Write `p50_*` and `p10_*` columns from output percentiles
- [x] **GREEN** — All old column references removed (calibration_data, baseline_ndvi, maturity_phase, zone_classification, phenology_stage). V2 columns written: type, mode_calibrage, phase_age, p50_*, p10_*, coefficient_etat_parcelle, baseline_data, diagnostic_data, anomalies_data, scores_detail, profile_snapshot.

### 19. Update calibration service to use V2 prompts

- [x] **RED** — Write test: assert that `runCalibrationAI()` calls `buildCalibrageSystemPrompt(moteurConfig, referentiel)` instead of the old `CALIBRATION_EXPERT_SYSTEM_PROMPT`. Run → fails (still uses V1).
- [x] **ACTION** — Updated ai-reports.service.ts CALIBRATION case to use buildCalibrageSystemPrompt(moteurConfig, referentiel) with V3 prompt builders.
- [x] **GREEN** — Run test → passes. V1 prompt constant is no longer imported.

### 20. Update nutrition option service for V2

- [x] **RED** — Write test: assert `suggestNutritionOption()` reads salinity thresholds from MOTEUR_CONFIG (`specificites.salinite_seuil_option_C_CE_eau`) instead of hardcoded values. Run → fails.
- [x] **ACTION** — NutritionOptionService now reads MOTEUR_CONFIG thresholds with hardcoded fallback.
- [x] **GREEN** — Run test → passes. Thresholds come from config.

---

## Phase 5: Recommendation Governance

### 21. Create recommendation governance service

- [x] **RED** — Write test `recommendation-governance.service.spec.ts`: assert `transitionStatus(recoId, 'proposed', 'validated', 'user')` creates a `recommendation_events` row and updates `ai_recommendations.status`. Run → fails (service doesn't exist).
- [x] **ACTION** — Created recommendation-governance.service.ts with transitionStatus(), canEmitRecommendation(), processExpirations(), requiresMotifForRejection().
- [x] **GREEN** — Run test → passes.

### 22. Implement simultaneous limits and theme frequency

- [ ] **RED** — Write test: given 3 active reactive recommendations for a parcel, assert that `canEmitRecommendation(parcelId, 'vigilance')` returns `false`. Assert `canEmitRecommendation(parcelId, 'urgent')` returns `true` (urgent always passes). Run → fails.
- [ ] **ACTION** — Add `canEmitRecommendation(parcelId, priority, theme)` to governance service. Reads limits from MOTEUR_CONFIG `gouvernance_recommandations.limites_simultanées`. Checks theme-specific delays from `delais_minimum_entre_recommandations`. Returns `{allowed, reason, queued_recommendation_id?}`.
- [ ] **GREEN** — Run test → passes. Limits enforced correctly.

### 23. Implement recommendation expiration

- [ ] **RED** — Write test: create a `proposed` recommendation with priority `urgent` and `expires_at` = 72h ago. Assert `processExpirations()` transitions it to `expired` and creates journal entry. Run → fails.
- [ ] **ACTION** — Add `processExpirations()` method that queries `ai_recommendations` where `status IN ('proposed', 'validated') AND expires_at < NOW()`, transitions each to `expired`. This will be called by a cron or on-demand.
- [ ] **GREEN** — Run test → passes.

### 24. Create diagnostic session on AI analysis run

- [ ] **RED** — Write test: assert that when operational AI runs for a parcel, an `ai_diagnostic_sessions` row is created with `chemin`, and each recommendation in the output becomes an `ai_recommendations` row with `session_id` FK. Run → fails.
- [ ] **ACTION** — In the AI reports/recommendations flow, after receiving operational engine output: insert `ai_diagnostic_sessions` row, then parse `recommandations[]` array from output and insert individual `ai_recommendations` rows with 6-bloc JSONB columns and `session_id`.
- [ ] **GREEN** — Run test → passes. Session and linked recommendations exist in DB.

---

## Phase 6: Annual Plan Service Updates

### 25. Update annual plan service for V2 columns

- [ ] **RED** — Write test: assert `ensurePlan()` creates an `annual_plans` row with `season`, `nutrition_option`, `yield_target_t_ha`, `dose_n/p/k/mg_kg_ha`. Run → fails (writes old columns).
- [ ] **ACTION** — Refactor `annual-plan.service.ts` to write V2 columns. `enrichPlanFromAI()` extracts doses and nutrition option from AI output. Uses `season` TEXT instead of `year` INTEGER.
- [ ] **GREEN** — Run test → passes. V2 columns populated.

### 26. Update annual plan to use V2 prompt builder

- [ ] **RED** — Write test: assert that annual plan generation calls `buildPlanAnnuelSystemPrompt(moteurConfig, referentiel)`. Run → fails (uses V1).
- [ ] **ACTION** — In the annual plan generation flow (triggered from `calibration.service.ts` → `generateAnnualPlan()`), load moteurConfig + referentiel and use V2 prompt builders.
- [ ] **GREEN** — Run test → passes.

---

## Phase 7: Frontend Adaptation

### 27. Update frontend AI phase types and hooks

- [ ] **RED** — `tsc --noEmit` in `project/` shows errors: components reference old `ai_phase` values (`disabled`, `pret_calibrage`, `paused`).
- [ ] **ACTION** — Update `AIStatusBadge.tsx`, `CalibrationCard.tsx`, `AICompassDashboard.tsx`, `useParcelsQuery.ts`, `calibration-v2.ts` to handle V2 states: `awaiting_data`, `ready_calibration`, `calibrating`, `calibrated`, `awaiting_nutrition_option`, `active`, `archived`. Add labels/colors for each.
- [ ] **GREEN** — `tsc --noEmit` passes. All V2 states handled in switch/if statements (no default-only fallthrough).

### 28. Update calibration hooks for V2 response shape

- [ ] **RED** — `useCalibrationV2.ts` references old fields (`calibration_data`, `maturity_phase`, `baseline_ndvi`). These no longer exist in V2 schema.
- [ ] **ACTION** — Update `useCalibrationV2.ts` and `useAICalibration.ts` to read V2 fields: `baseline_data`, `diagnostic_data`, `phase_age`, `mode_calibrage`, `p50_ndvi`, `scores_detail`. Update `calibration-v2.ts` types.
- [ ] **GREEN** — `tsc --noEmit` passes. Hooks consume V2 shape.

### 29. Update calibration review components for V2 data

- [ ] **RED** — Calibration review components (`Level1Decision`, `Level2Diagnostic`, etc.) reference old data paths from `calibration_data.output`.
- [ ] **ACTION** — Update review components to read from `baseline_data`, `diagnostic_data`, `scores_detail`. Display `phase_age`, `mode_calibrage`, `coefficient_etat_parcelle`, and `message_amelioration` dynamic improvement messages.
- [ ] **GREEN** — `tsc --noEmit` passes. Components render V2 data structure.

### 30. Update recommendation display for 6-bloc structure

- [ ] **RED** — Recommendation components display flat `constat`, `diagnostic`, `action` text fields. V2 uses `bloc_1_constat..bloc_6_suivi` JSONB.
- [ ] **ACTION** — Update recommendation detail components to render 6 structured blocs. Add `mention_responsabilite` disclaimer footer. Handle `priority` as text enum with colored badges (🔴/🟠/🟡/🟢). Show `evaluation_result` when present.
- [ ] **GREEN** — `tsc --noEmit` passes. Component renders all 6 blocs.

---

## Phase 8: Integration Tests

### 31. Rewrite calibration integration test

- [ ] **RED** — Existing `calibration.spec.ts` and `calibration-v2-integration.spec.ts` fail due to schema changes (old column names, old status values).
- [ ] **ACTION** — Rewrite integration tests to use V2 schema: create parcel with `ai_phase = 'ready_calibration'`, start calibration, verify V2 columns populated, verify state transitions through V2 lifecycle.
- [ ] **GREEN** — `npx vitest run calibration` → all tests pass.

### 32. Write recommendation governance integration test

- [ ] **RED** — No integration test exists for recommendation lifecycle. Write test: create recommendation → validate → execute → evaluate → close. Verify `recommendation_events` journal has 4 entries. Run → fails.
- [ ] **ACTION** — Create `test/integration/ai/recommendation-governance.spec.ts`. Test full lifecycle, expiration, rejection with motif, simultaneous limits.
- [ ] **GREEN** — Run test → passes.

### 33. Write diagnostic session integration test

- [ ] **RED** — No test for diagnostic sessions. Write test: trigger operational AI for active parcel, verify `ai_diagnostic_sessions` row created, verify linked `ai_recommendations` rows. Run → fails.
- [ ] **ACTION** — Create `test/integration/ai/diagnostic-session.spec.ts`.
- [ ] **GREEN** — Run test → passes.

---

## Phase 9: Cleanup

### 34. Remove V1 prompt files and dead code

- [ ] **RED** — Old prompt files still exist: `calibration_prompt.ts`, `annual_plan_prompt.ts`, `recommendations_prompt.ts`. Old `CALIBRATION_EXPERT_SYSTEM_PROMPT` constant still importable.
- [ ] **ACTION** — Delete V1 prompt files. Remove any remaining imports of V1 prompt functions across the codebase. Clean up `interfaces.ts` to only export V2-compatible types.
- [ ] **GREEN** — `grep -r "CALIBRATION_EXPERT_SYSTEM_PROMPT\|buildCalibrationPrompt\|buildAnnualPlanPrompt\|buildRecommendationsPrompt" agritech-api/src/ --include="*.ts"` returns 0 results (excluding test mocks). `tsc --noEmit` passes.

### 35. Update alert-taxonomy.ts to match V2 referentiel

- [x] **RED** — `alert-taxonomy.ts` has 6 OLI codes with wrong mappings. V2 referentiel has 20 OLI codes.
- [x] **ACTION** — Rewrote alert-taxonomy.ts to dynamically load from referentiel JSON. 20 OLI codes with structured prescriptions.
- [x] **GREEN** — `ALERT_TAXONOMY` has 20+ OLI entries. `getAlertsForCulture('olivier')` returns 20 items. Each has `seuil_entree` array and `prescription` object.

### 36. Full build verification

- [ ] **RED** — Run `tsc --noEmit` in both `agritech-api/` and `project/`. Check for any remaining compilation errors.
- [ ] **ACTION** — Fix any remaining type mismatches, missing imports, or broken references across the codebase.
- [ ] **GREEN** — `tsc --noEmit` passes in both projects. `cd project && npm run build` succeeds. `cd agritech-api && npm run build` succeeds.
