# Calibration Engine V2 — Full 8-Step Sequential Pipeline

## TL;DR

> **Quick Summary**: Replace the simplified V1 calibration (mean/percentile) with a full 8-step sequential engine that processes satellite rasters, weather history, soil/water analyses, and harvest records to produce a comprehensive raw baseline per parcel. Plantation age drives threshold adjustments across all steps. A nutrition option gate (A/B/C) blocks annual plan generation until user confirmation.
> 
> **Deliverables**:
> - 8 Python step modules with TDD (backend-service)
> - NestJS orchestration with state machine (agritech-api)
> - DB migrations (ai_phase states, calibrations columns, GDD weather columns)
> - Frontend: calibration report view, validation flow, nutrition option selector
> - Raster caching infrastructure for intra-parcel zone detection
> 
> **Estimated Effort**: XL (40+ tasks across 5-6 waves)
> **Parallel Execution**: YES — 5 waves with 5-8 tasks per wave
> **Critical Path**: DB migration → Pydantic types → Python steps 1-8 → NestJS orchestration → Frontend

---

## Context

### Original Request
Build a full 8-step sequential calibration engine driven by plantation age, producing a raw calibration baseline document for each parcel. The engine supports 4 crops (olivier, agrumes, avocatier, palmier_dattier) with a generic pipeline and crop-specific reference data. A nutrition option gate (A/B/C) must be confirmed by the user before recommendations can be generated.

### Interview Summary
**Key Discussions**:
- **Pixel data**: Pre-compute and cache rasters (COG) during calibration trigger, not during every sync
- **Compute architecture**: Expand existing Python backend-service with new modules
- **Raw data rule**: Allow computed aggregates (scores, zones) but NO text interpretation/recommendations
- **Flow architecture**: State machine on `parcels.ai_phase` with 5 states
- **Migration strategy**: Clean break from V1 — new calibrations use V2, old records remain
- **GDD storage**: Precompute and store per crop_type in weather_daily_data for 4 AI crops
- **Test strategy**: TDD — tests first for each Python step module
- **Extensibility**: Generic process, crop-specific reference data. New crops added via reference data only.

**Research Findings**:
- Parcel schema already has: `crop_type`, `variety`, `planting_year`, `planting_date`, `planting_system`, `boundary`, `ai_phase`, `ai_nutrition_option`
- `analyses` table exists with soil/plant/water types linked to parcels (JSONB data field)
- `harvest_records` per parcel with quantity + unit
- `crop_ai_references` table with rich JSONB per crop (varieties, thresholds, phenology, Kc, nutrition options)
- `satellite_indices_data` stores only mean_value (no pixel data — major gap for zone detection)
- Current V1 Python calibration is ~50 lines of real logic in `backend-service/app/api/calibration.py`
- Current V1 NestJS orchestrator is 1109 lines handling provisioning + background processing

### Metis Review
**Identified Gaps** (addressed in plan):
- `ai_phase` CHECK constraint only allows 4 values — migration needed for 5 new states
- `confidence_score` has 0-1 CHECK constraint — keep 0-1 in DB, display as 0-100
- Current code jumps directly to `ai_phase='active'` — must add validation + nutrition gates
- Dual analyses tables (`analyses` + `soil_analyses`) — must pick source of truth (using `analyses` as unified table)
- No concurrent calibration protection — use `ai_phase` as lock + timeout recovery
- No per-step minimum data thresholds — define fallback behavior when data insufficient
- Missing planting_year handling — degrade confidence, flag as incomplete
- Nutrition option change after activation — allow transition back to `awaiting_nutrition_option`

---

## Work Objectives

### Core Objective
Replace the V1 calibration engine with a full 8-step sequential pipeline that produces comprehensive raw baseline data for each parcel, gated by user validation and nutrition option confirmation.

### Concrete Deliverables
- 8 Python step modules in `backend-service/app/services/calibration/`
- Pydantic type models for all inputs/outputs
- NestJS CalibrationService V2 orchestration
- DB migration: `ai_phase` states, calibrations columns, GDD weather columns
- Frontend: 4-section calibration report, validation button, nutrition option selector
- TDD test suite for all step modules + integration tests

### Definition of Done
- [ ] `pnpm --filter agritech-api test` passes with calibration V2 tests
- [ ] `pytest backend-service/tests/test_calibration_*.py` passes with all step tests
- [ ] Calibrating a parcel transitions through all 5 `ai_phase` states correctly
- [ ] Calibration report JSON matches defined Pydantic output schema
- [ ] Nutrition option gate blocks plan generation until confirmed
- [ ] Health score (0-100), confidence (0-1), yield potential, zones output correctly

### Must Have
- All 8 calibration steps implemented and tested
- Plantation age drives threshold adjustment via maturity phase model
- Nutrition option auto-suggestion based on soil/water data availability
- Raster-based intra-parcel zone detection (A/B/C/D/E classes)
- 6-component confidence score
- 5-component health score (0-100)
- State machine: disabled → calibrating → awaiting_validation → awaiting_nutrition_option → active
- Minimum data threshold checks per step with degraded-output fallback
- GDD precomputation for 4 AI crops

### Must NOT Have (Guardrails)
- NO text interpretation or recommendations in calibration output — raw data + aggregates only
- NO per-step progress bar in UI — show only: calibrating (spinner), done (report)
- NO calibration history comparison or version diff
- NO admin override of calibration results
- NO batch/bulk calibration of multiple parcels
- NO custom reference data upload or threshold editing
- NO pixel-level raster API or raster visualization in frontend — zones exposed as GeoJSON summary only
- NO scheduled/automatic re-calibration — user-triggered only
- NO `as any` or `@ts-ignore` in TypeScript code
- NO direct Supabase queries in React components — use hooks

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: YES (pytest for Python, Jest for NestJS, Vitest for frontend)
- **Automated tests**: TDD — tests first
- **Framework**: pytest (Python), Jest (NestJS), Vitest (frontend)
- **Each Python step**: RED (failing test with fixture data) → GREEN (implementation) → REFACTOR

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Python backend**: Use Bash (pytest) — Run tests, assert pass counts, check output schemas
- **NestJS API**: Use Bash (Jest + curl) — Run tests, call endpoints, assert responses
- **Frontend**: Use Playwright — Navigate calibration flow, interact with UI, screenshot states
- **DB migrations**: Use Bash (psql/supabase) — Verify schema changes, test constraints

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — types, schemas, migrations, infrastructure):
├── Task 1: Pydantic type models for all 8 steps [quick]
├── Task 2: DB migration — ai_phase states + calibrations columns [quick]
├── Task 3: DB migration — GDD columns on weather_daily_data [quick]
├── Task 4: Calibration output TypeScript types [quick]
├── Task 5: Age adjustment module + maturity phase model [deep]
├── Task 6: Confidence score module (6-component) [deep]
├── Task 7: Test fixtures — deterministic satellite/weather/analysis data [quick]
└── Task 24: Raster storage service (upload/retrieve COG from Supabase Storage) [unspecified-high]

Wave 2 (Python steps 1-4 — data extraction + percentiles + phenology):
├── Task 8: Step 1 — Satellite history extraction (raster fetch + cache) [deep]
├── Task 9: Step 2 — Weather history extraction (GDD, chill hours, extremes) [deep]
├── Task 10: Step 3 — Personalized percentile calculation [deep]
├── Task 11: Step 4 — Historical phenology detection [deep]
└── Task 12: GDD precomputation service for weather data [unspecified-high]

Wave 3 (Python steps 5-8 — analysis + scoring):
├── Task 13: Step 5 — Historical anomaly detection (5-type) [deep]
├── Task 14: Step 6 — Initial yield potential calculation [deep]
├── Task 15: Step 7 — Intra-parcel zone detection (raster → A/B/C/D/E) [ultrabrain]
├── Task 16: Step 8 — Initial health score (5-component composite) [deep]
├── Task 17: Calibration engine orchestrator (8-step sequencer) [deep]
└── Task 18: Python calibration API endpoint V2 [unspecified-high]

Wave 4 (NestJS orchestration + state machine + nutrition gate):
├── Task 19: NestJS CalibrationService V2 — data assembly + Python call [deep]
├── Task 20: State machine logic on parcels.ai_phase [unspecified-high]
├── Task 21: Nutrition option auto-suggestion logic [deep]
├── Task 22: NestJS validation + nutrition option endpoints [unspecified-high]
└── Task 23: Frontend calibration types + API hooks [quick]

Wave 5 (Frontend — report, validation, nutrition gate):
├── Task 25: Calibration report view — 4-section format [visual-engineering]
├── Task 26: Calibration validation flow UI [visual-engineering]
├── Task 27: Nutrition option selector UI [visual-engineering]
├── Task 28: Parcel card AI phase indicators [visual-engineering]
├── Task 29: Integration tests — full state machine flow [deep]
└── Task 30: E2E test — calibration through nutrition option [unspecified-high]

Wave FINAL (Verification — 4 parallel reviews):
├── Task F1: Plan compliance audit [oracle]
├── Task F2: Code quality review [unspecified-high]
├── Task F3: Full QA — calibrate a test parcel end-to-end [unspecified-high]
└── Task F4: Scope fidelity check [deep]

Critical Path: Task 1 → Task 7 → Task 8/9 → Task 10 → Task 11 → Task 13 → Task 17 → Task 19 → Task 25 → F1-F4
Parallel Speedup: ~65% faster than sequential
Max Concurrent: 8 (Wave 1)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 5,6,8-18 | 1 |
| 2 | — | 19,20,22 | 1 |
| 3 | — | 9,12 | 1 |
| 4 | 1 | 23,25 | 1 |
| 5 | 1 | 10,13,14,16 | 1 |
| 6 | 1 | 17,19 | 1 |
| 7 | 1 | 8-16 | 1 |
| 8 | 1,7 | 10,15 | 2 |
| 9 | 1,3,7 | 11,13 | 2 |
| 10 | 1,5,7,8 | 15,16 | 2 |
| 11 | 1,7,9 | 13,16 | 2 |
| 12 | 3 | 9 | 2 |
| 13 | 1,5,7,9,11 | 16,17 | 3 |
| 14 | 1,5,7 | 17 | 3 |
| 15 | 1,7,8,10 | 17 | 3 |
| 16 | 1,5,7,10,11,13 | 17 | 3 |
| 17 | 1,5,6,8-16 | 18 | 3 |
| 18 | 17 | 19 | 3 |
| 19 | 2,6,17,18 | 25,29 | 4 |
| 20 | 2 | 22,26 | 4 |
| 21 | 1 | 22,27 | 4 |
| 22 | 19,20,21 | 26,27 | 4 |
| 23 | 4 | 25,26,27 | 4 |
| 24 | — | 8,15 | 1 |
| 25 | 4,23 | 29 | 5 |
| 26 | 23,22 | 29 | 5 |
| 27 | 23,22 | 29 | 5 |
| 28 | 23,20 | 29 | 5 |
| 29 | 19,25,26,27 | F1-F4 | 5 |
| 30 | 29 | F1-F4 | 5 |

### Agent Dispatch Summary

- **Wave 1**: 8 tasks — T1,T2,T3,T4,T7 → `quick`, T5,T6 → `deep`, T24 → `unspecified-high`
- **Wave 2**: 5 tasks — T8,T9,T10,T11 → `deep`, T12 → `unspecified-high`
- **Wave 3**: 6 tasks — T13,T14,T16,T17 → `deep`, T15 → `ultrabrain`, T18 → `unspecified-high`
- **Wave 4**: 5 tasks — T19,T21 → `deep`, T20,T22 → `unspecified-high`, T23 → `quick`
- **Wave 5**: 6 tasks — T25,T26,T27,T28 → `visual-engineering`, T29 → `deep`, T30 → `unspecified-high`
- **FINAL**: 4 tasks — F1 → `oracle`, F2,F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Pydantic Type Models for All 8 Calibration Steps

  **What to do**:
  - Create `backend-service/app/services/calibration/types.py` with Pydantic V2 models
  - Define input/output models for each step:
    - `Step1Output`: satellite time series per index (date, values[]), cloud coverage stats, interpolated gaps
    - `Step2Output`: weather time series (daily + monthly aggregates), GDD cumulative, chill hours, extreme events list
    - `Step3Output`: percentile table (P10/P25/P50/P75/P90 per index, global + per phenological period), mean, std
    - `Step4Output`: phenology dates (dormancy exit, peak, plateau, decline, dormancy entry), inter-annual variability, GDD correlations
    - `Step5Output`: anomaly list (date, type, severity, cross-referenced weather event, excluded from reference flag)
    - `Step6Output`: yield potential (min/max range, method used, reference bracket, historical average if available)
    - `Step7Output`: zone classification (per-pixel class A/B/C/D/E as GeoJSON FeatureCollection, surface % per class, spatial pattern type)
    - `Step8Output`: health score (0-100, 5 component breakdown with individual scores)
  - Define `CalibrationInput` master model (all data assembled by NestJS)
  - Define `CalibrationOutput` master model (all 8 step outputs + confidence + metadata)
  - Define `MaturityPhase` enum: juvenile, entree_production, pleine_production, maturite_avancee, senescence
  - Define `NutritionOption` enum: A, B, C with associated conditions
  - Write TDD tests first: test model validation, test serialization/deserialization, test required vs optional fields

  **Must NOT do**:
  - No business logic in type models — pure data structures
  - No database access patterns
  - No text interpretation fields (e.g., no `health_description: str`)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex type system requiring careful design of 10+ interrelated Pydantic models
  - **Skills**: []
  - **Skills Evaluated but Omitted**:
    - `design-system`: Domain is backend Python types, not UI

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3, 4, 5, 6, 7)
  - **Blocks**: Tasks 5, 6, 8-18 (all Python steps depend on these types)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `backend-service/app/api/calibration.py:14-69` — Existing Pydantic models (CalibrationRunRequest, SatelliteReading, WeatherReading) — follow this pattern
  - `backend-service/app/api/calibration.py:252-269` — CalibrationRunResponse model structure
  - `backend-service/app/models/schemas.py` — Existing schema patterns in the project

  **API/Type References**:
  - `project/src/types/ai-references.ts:1-84` — CropType, ThresholdBand, YieldByAge, NutritionOptionBase — the TypeScript equivalents that calibration output must be compatible with
  - `project/src/types/ai-references.ts:61-71` — YieldByAge with age bracket keys like '3-5_ans', '6-10_ans' — Python models must produce compatible structures

  **External References**:
  - Pydantic V2 docs: model_validator, field_validator, computed fields

  **WHY Each Reference Matters**:
  - The existing calibration models show the naming convention and validation patterns used
  - The TypeScript ai-references types define the reference data structure that calibration must read and produce compatible output for

  **Acceptance Criteria**:
  - [ ] `pytest backend-service/tests/test_calibration_types.py` → PASS
  - [ ] All 8 StepOutput models validate with realistic fixture data
  - [ ] CalibrationOutput model serializes to JSON matching expected schema
  - [ ] MaturityPhase enum covers all 5 phases with age range methods

  **QA Scenarios**:

  ```
  Scenario: Step output models validate with fixture data
    Tool: Bash (pytest)
    Preconditions: types.py created with all models
    Steps:
      1. Run: cd backend-service && python -m pytest tests/test_calibration_types.py -v
      2. Assert: all tests pass
      3. Assert: model count >= 12 (8 step outputs + CalibrationInput + CalibrationOutput + MaturityPhase + NutritionOption)
    Expected Result: 0 failures, all models validate
    Evidence: .sisyphus/evidence/task-1-types-validation.txt

  Scenario: Invalid data rejected by models
    Tool: Bash (pytest)
    Preconditions: types.py with validation rules
    Steps:
      1. Test CalibrationInput with missing crop_type → ValidationError
      2. Test Step8Output with health_score=150 → ValidationError (must be 0-100)
      3. Test MaturityPhase.from_age(planting_year=None) → returns None/unknown
    Expected Result: All validation errors raised correctly
    Evidence: .sisyphus/evidence/task-1-types-validation-errors.txt
  ```

  **Commit**: YES (group with Wave 1)
  - Message: `feat(calibration): add V2 Pydantic type models for 8-step pipeline`
  - Files: `backend-service/app/services/calibration/types.py`, `backend-service/tests/test_calibration_types.py`
  - Pre-commit: `cd backend-service && python -m pytest tests/test_calibration_types.py`

- [ ] 2. DB Migration — ai_phase States + Calibrations Columns

  **What to do**:
  - Create migration `project/supabase/migrations/2026MMDD_calibration_v2_schema.sql`
  - ALTER `parcels.ai_phase` CHECK constraint: DROP old, ADD new with values `('disabled', 'calibrating', 'awaiting_validation', 'awaiting_nutrition_option', 'active', 'paused')`
  - ALTER `calibrations` table — ADD columns:
    - `health_score NUMERIC CHECK (health_score >= 0 AND health_score <= 100)`
    - `yield_potential_min NUMERIC`
    - `yield_potential_max NUMERIC`
    - `data_completeness_score NUMERIC CHECK (data_completeness_score >= 0 AND data_completeness_score <= 100)`
    - `maturity_phase TEXT CHECK (maturity_phase IN ('juvenile', 'entree_production', 'pleine_production', 'maturite_avancee', 'senescence', 'unknown'))`
    - `anomaly_count INTEGER DEFAULT 0`
    - `calibration_version TEXT DEFAULT 'v2'`
  - Keep existing columns (baseline_ndvi, baseline_ndre, baseline_ndmi, confidence_score 0-1, zone_classification, phenology_stage) for backward compatibility
  - Add RLS policies for new columns (inherit from existing calibrations policies)
  - Use `DO $$ ... END $$` blocks for safe constraint manipulation (pattern from existing migration)
  - Write TDD test: verify constraints accept valid values, reject invalid

  **Must NOT do**:
  - Do NOT drop old ai_phase values in same migration — keep 'calibration' and 'paused' temporarily
  - Do NOT change confidence_score range (keep 0-1)
  - Do NOT modify existing RLS policies — only add for new columns

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: SQL migration with known patterns, following existing migration style
  - **Skills**: [`supabase-skill`]
    - `supabase-skill`: Supabase migration patterns and RLS policy syntax

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3, 4, 5, 6, 7)
  - **Blocks**: Tasks 19, 20, 22 (NestJS needs new schema)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `project/supabase/migrations/20260312000000_agromind_ia.sql:25-71` — Safe constraint manipulation with DO $$ blocks, exactly the pattern to follow
  - `project/supabase/migrations/20260312000000_agromind_ia.sql:90-111` — Calibrations table creation with CHECK constraints
  - `project/supabase/migrations/20260312140000_relax_calibrations_constraints.sql` — How to ALTER existing calibrations constraints

  **WHY Each Reference Matters**:
  - The agromind_ia migration shows the exact DO $$ pattern for safely dropping and recreating CHECK constraints
  - The relax migration shows how to handle existing calibrations table modifications

  **Acceptance Criteria**:
  - [ ] Migration applies without error on fresh and existing DB
  - [ ] `parcels.ai_phase` accepts all 6 new values
  - [ ] `calibrations.health_score` accepts 0-100, rejects 150
  - [ ] `calibrations.maturity_phase` accepts all 6 enum values

  **QA Scenarios**:

  ```
  Scenario: Migration applies cleanly
    Tool: Bash (supabase)
    Preconditions: Local Supabase running with existing schema
    Steps:
      1. Run: cd project && pnpm db:reset
      2. Assert: migration applied without errors
      3. Run SQL: INSERT INTO calibrations (..., health_score, maturity_phase) VALUES (..., 85, 'pleine_production') → succeeds
      4. Run SQL: UPDATE parcels SET ai_phase = 'awaiting_validation' WHERE id = 'test' → succeeds
    Expected Result: All inserts/updates succeed
    Evidence: .sisyphus/evidence/task-2-migration-apply.txt

  Scenario: Constraints reject invalid values
    Tool: Bash (psql)
    Preconditions: Migration applied
    Steps:
      1. INSERT calibration with health_score=150 → CHECK violation error
      2. UPDATE parcel with ai_phase='invalid_state' → CHECK violation error
      3. INSERT calibration with maturity_phase='wrong' → CHECK violation error
    Expected Result: All invalid values rejected with constraint errors
    Evidence: .sisyphus/evidence/task-2-constraint-validation.txt
  ```

  **Commit**: YES (group with Wave 1)
  - Message: `feat(calibration): add V2 schema migration for ai_phase states and calibration columns`
  - Files: `project/supabase/migrations/2026MMDD_calibration_v2_schema.sql`
  - Pre-commit: `cd project && pnpm db:reset`

- [ ] 3. DB Migration — GDD Columns on weather_daily_data

  **What to do**:
  - Create migration `project/supabase/migrations/2026MMDD_weather_gdd_columns.sql`
  - ALTER `weather_daily_data` — ADD columns:
    - `gdd_olivier NUMERIC` (base temp 10.0°C)
    - `gdd_agrumes NUMERIC` (base temp 13.0°C)
    - `gdd_avocatier NUMERIC` (base temp 10.0°C)
    - `gdd_palmier_dattier NUMERIC` (base temp 18.0°C)
    - `chill_hours NUMERIC` (hours below 7.2°C, universal formula)
  - GDD formula per row: `MAX(0, ((temperature_max + temperature_min) / 2) - tbase)`
  - Chill hours: if temperature_min < 7.2 AND temperature_max > 0, estimate chill hours from daily temperature curve
  - Add index on `(latitude, longitude, date)` if not exists (for efficient GDD accumulation queries)
  - These columns will be populated by a service (Task 12), not by the migration itself

  **Must NOT do**:
  - Do NOT populate GDD values in the migration — only add columns
  - Do NOT add GDD for crops beyond the 4 AI-enabled ones

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple ALTER TABLE migration
  - **Skills**: [`supabase-skill`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 9, 12
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `project/supabase/migrations/00000000000000_schema.sql:5505-5532` — crop_types table with tbase values for each crop
  - `project/supabase/migrations/20260312000000_agromind_ia.sql:8-12` — ALTER TABLE ADD COLUMN IF NOT EXISTS pattern

  **WHY Each Reference Matters**:
  - The crop_types table documents the exact tbase values to use for each GDD column
  - The agromind migration shows the safe ADD COLUMN IF NOT EXISTS pattern

  **Acceptance Criteria**:
  - [ ] Migration applies without error
  - [ ] All 5 new columns exist on weather_daily_data
  - [ ] Columns accept NULL (populated later by service)

  **QA Scenarios**:

  ```
  Scenario: GDD columns added
    Tool: Bash (psql)
    Preconditions: Migration applied
    Steps:
      1. SELECT column_name FROM information_schema.columns WHERE table_name='weather_daily_data' AND column_name LIKE 'gdd_%'
      2. Assert: 4 rows returned (gdd_olivier, gdd_agrumes, gdd_avocatier, gdd_palmier_dattier)
      3. UPDATE weather_daily_data SET gdd_olivier = 5.2 WHERE date = '2025-06-01' → succeeds
    Expected Result: Columns exist and accept numeric values
    Evidence: .sisyphus/evidence/task-3-gdd-columns.txt
  ```

  **Commit**: YES (group with Wave 1)
  - Message: `feat(weather): add GDD and chill hours columns for AI crops`
  - Files: `project/supabase/migrations/2026MMDD_weather_gdd_columns.sql`

- [x] 4. Calibration Output TypeScript Types

  **What to do**:
  - Create `project/src/types/calibration-v2.ts` with TypeScript interfaces matching the Python Pydantic models
  - Define interfaces:
    - `CalibrationV2Output` — master output with all 8 step results
    - `SpectralPercentiles` — P10/P25/P50/P75/P90 per index, per phenological period
    - `PhenologyDates` — mean dates for dormancy exit, peak, plateau, decline, dormancy entry
    - `AnomalyRecord` — date, type (5 types), severity, weather cross-reference
    - `YieldPotential` — min/max range, method, reference bracket
    - `ZoneClassification` — GeoJSON FeatureCollection type for A/B/C/D/E zones
    - `HealthScore` — composite 0-100 with 5 component breakdown
    - `ConfidenceScore` — 6 components with individual scores
    - `CalibrationReport` — 4-section report structure (executive, detailed, anomalies, recommendations)
    - `NutritionOptionSuggestion` — suggested option (A/B/C) with rationale data
  - Export `MaturityPhase` type matching Python enum
  - Add to `project/src/lib/query-keys.ts` — calibration V2 query keys
  - Write tests: type assertion tests using `satisfies` keyword

  **Must NOT do**:
  - No `as any` — full type safety
  - No runtime validation (that's Zod's job, added in frontend tasks)
  - No API client logic — just types

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Pure type definitions, no logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 23, 25
  - **Blocked By**: Task 1 (must match Python models)

  **References**:

  **Pattern References**:
  - `project/src/types/ai-references.ts:1-84` — Existing reference type patterns (NumericRange, ThresholdBand)
  - `project/src/types/reports.ts` — Report type structure patterns
  - `project/src/types/analysis.ts:1-242` — Analysis type patterns (SoilAnalysisData, WaterAnalysisData)

  **WHY Each Reference Matters**:
  - ai-references.ts shows how to type complex nested agronomic data structures
  - analysis.ts shows the pattern for typed JSONB data fields

  **Acceptance Criteria**:
  - [ ] `pnpm --filter agriprofy type-check` passes with new types
  - [ ] All interfaces match Python Pydantic model field names and types
  - [ ] No `any` type usage

  **QA Scenarios**:

  ```
  Scenario: TypeScript types compile without errors
    Tool: Bash (tsc)
    Preconditions: calibration-v2.ts created
    Steps:
      1. Run: cd project && npx tsc --noEmit src/types/calibration-v2.ts
      2. Assert: 0 errors
    Expected Result: Clean compilation
    Evidence: .sisyphus/evidence/task-4-types-compile.txt
  ```

  **Commit**: YES (group with Wave 1)
  - Message: `feat(calibration): add V2 TypeScript type definitions`
  - Files: `project/src/types/calibration-v2.ts`

- [x] 5. Age Adjustment Module + Maturity Phase Model

  **What to do**:
  - Create `backend-service/app/services/calibration/age_adjustment.py`
  - Implement `determine_maturity_phase(planting_year: int | None, crop_type: str, reference_data: dict) -> MaturityPhase`
  - Implement `get_threshold_adjustment(phase: MaturityPhase) -> dict[str, float]` returning multipliers per index
  - Generic 5-phase model with crop-specific age boundaries from reference data:
    - Read age brackets from `crop_ai_references.reference_data` (e.g., `varietes[].rendement_kg_arbre` keys)
    - Map age brackets to maturity phases based on yield curve shape
    - Default boundaries if reference data doesn't specify: juvenile(0-5), entree(5-10), pleine(10-40), maturite(40-60), senescence(60+)
  - Threshold adjustment multipliers per phase:
    - juvenile: all thresholds × 0.7-0.8 (lowered 20-30%)
    - entree_production: progressive normalization (interpolate from 0.8 to 1.0)
    - pleine_production: multiplier = 1.0 (standard)
    - maturite_avancee: multiplier = 0.95 (slightly lowered)
    - senescence: multiplier = 0.8-0.9 (lowered 10-20%)
  - Handle missing planting_year: return `MaturityPhase.UNKNOWN` with multiplier 1.0 + flag
  - Handle intensive varieties with `'declin'` and `'arrachage'` in yield curves
  - TDD: write tests first with fixture data for each crop

  **Must NOT do**:
  - No text interpretation (e.g., "Your plantation is too old")
  - No database access — pure function taking data as input

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex agronomic logic mapping age brackets to maturity phases across 4 crops
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 10, 13, 14, 16
  - **Blocked By**: Task 1 (types)

  **References**:

  **Pattern References**:
  - `project/src/types/ai-references.ts:61-71` — YieldByAge type with age bracket keys — the Python module must parse these
  - `project/src/types/ai-references.ts:107-109` — OlivierVariety.rendement_kg_arbre and duree_vie_economique — example of variety-specific lifecycle data
  - `backend-service/app/api/calibration.py:27-37` — VALID_CROP_TYPES and VALID_SYSTEM_TYPES — reuse these constants

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_calibration_age_adjustment.py` → PASS
  - [ ] 25-year old Picholine Marocaine → pleine_production → multiplier 1.0
  - [ ] 3-year old any crop → juvenile → multiplier 0.7-0.8
  - [ ] 50-year old Arbosana → special case (déclin/arrachage)
  - [ ] Missing planting_year → UNKNOWN phase, multiplier 1.0, flag set

  **QA Scenarios**:

  ```
  Scenario: Age adjustment produces correct phases per crop
    Tool: Bash (pytest)
    Steps:
      1. Run: cd backend-service && python -m pytest tests/test_calibration_age_adjustment.py -v
      2. Assert: tests cover all 5 phases + unknown + special cases
    Expected Result: All pass, coverage of all maturity phases
    Evidence: .sisyphus/evidence/task-5-age-adjustment.txt

  Scenario: Missing age handles gracefully
    Tool: Bash (pytest)
    Steps:
      1. Call determine_maturity_phase(planting_year=None, ...) → MaturityPhase.UNKNOWN
      2. Call get_threshold_adjustment(UNKNOWN) → multiplier 1.0 everywhere
    Expected Result: No exception, graceful degradation
    Evidence: .sisyphus/evidence/task-5-missing-age.txt
  ```

  **Commit**: YES (group with Wave 1)
  - Message: `feat(calibration): add age adjustment and maturity phase model`
  - Files: `backend-service/app/services/calibration/age_adjustment.py`, `backend-service/tests/test_calibration_age_adjustment.py`

- [x] 6. Confidence Score Module (6-Component)

  **What to do**:
  - Create `backend-service/app/services/calibration/confidence.py`
  - Implement `calculate_confidence_score(data: ConfidenceInput) -> ConfidenceOutput` with 6 components:
    1. **Satellite history (30pts)**: 36+ months = 30, 24-36 = 20, 12-24 = 10, <12 = 5
    2. **Soil analysis (20pts)**: complete <2 years = 20, partial = 10, absent = 0
    3. **Water analysis (15pts)**: complete = 15, partial = 8, absent = 0
    4. **Yield history (20pts)**: 5+ years = 20, 3-4 = 15, 1-2 = 8, none = 0
    5. **Complete profile (10pts)**: prorated by field completion (crop_type, variety, planting_year, planting_system, boundary = 2pts each)
    6. **Data coherence (5pts)**: no incoherence = 5, minor = 2, major = 0
  - Return both total score (0-100 for display) and normalized (0-1 for DB storage)
  - Return per-component breakdown for transparency
  - Define what "complete" vs "partial" means for soil/water analysis:
    - Soil complete: pH + EC + organic_matter + N + P + K all present
    - Water complete: pH + EC + SAR + chloride + sodium all present
  - TDD: test each component scoring individually + composite

  **Must NOT do**:
  - No database queries — receives pre-fetched data
  - No interpretation text

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Multi-component scoring system with specific rules per data type
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 17, 19
  - **Blocked By**: Task 1 (types)

  **References**:

  **Pattern References**:
  - `backend-service/app/api/calibration.py:409-421` — Existing V1 confidence calculation — this is what we're replacing
  - `project/src/types/analysis.ts:18-79` — SoilAnalysisData fields — defines what "complete" soil analysis means
  - `project/src/types/analysis.ts:141-208` — WaterAnalysisData fields — defines what "complete" water analysis means

  **WHY Each Reference Matters**:
  - The V1 confidence calc shows the current simplistic approach (coverage ratio × stability)
  - The analysis types define the exact fields we check for completeness scoring

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_calibration_confidence.py` → PASS
  - [ ] Full data (36mo satellite + complete soil <2y + complete water + 5y yield + complete profile + coherent) → score 100
  - [ ] Minimum data (6mo satellite + no soil + no water + no yield + partial profile) → score ~15-20
  - [ ] Per-component breakdown adds up to total

  **QA Scenarios**:

  ```
  Scenario: Confidence score with full data
    Tool: Bash (pytest)
    Steps:
      1. Provide fixture with 36+ months satellite, complete soil <2y, complete water, 5+ years yield, all profile fields filled, no incoherence
      2. Assert: total_score = 100, normalized = 1.0
      3. Assert: components = {satellite: 30, soil: 20, water: 15, yield: 20, profile: 10, coherence: 5}
    Expected Result: Perfect score
    Evidence: .sisyphus/evidence/task-6-confidence-full.txt

  Scenario: Confidence score with minimal data
    Tool: Bash (pytest)
    Steps:
      1. Provide fixture with 8 months satellite, no soil, no water, no yield, only crop_type filled
      2. Assert: total ≈ 17 (satellite:5 + soil:0 + water:0 + yield:0 + profile:2 + coherence:5 + some rounding)
    Expected Result: Low but non-zero score
    Evidence: .sisyphus/evidence/task-6-confidence-minimal.txt
  ```

  **Commit**: YES (group with Wave 1)
  - Message: `feat(calibration): add 6-component confidence score module`
  - Files: `backend-service/app/services/calibration/confidence.py`, `backend-service/tests/test_calibration_confidence.py`

- [x] 7. Test Fixtures — Deterministic Satellite/Weather/Analysis Data

  **What to do**:
  - Create `backend-service/tests/fixtures/calibration_fixtures.py`
  - Build deterministic test data for all 8 calibration steps:
    - **Satellite fixture**: 24 months of NDVI/NIRv/NDMI/NDRE/EVI/MSAVI/MSI/GCI values for a known parcel (sine-wave pattern simulating seasonal variation)
    - **Weather fixture**: 24 months of daily Tmin/Tmax/precip/ET0/humidity/wind/solar data for same location
    - **Soil analysis fixture**: complete analysis JSON matching SoilAnalysisData type
    - **Water analysis fixture**: complete analysis JSON matching WaterAnalysisData type
    - **Harvest records fixture**: 5 years of yield records for the parcel (kg, tonnes)
    - **Crop reference fixture**: subset of olivier reference data from crop_ai_references
    - **Parcel context fixture**: crop_type=olivier, variety=picholine_marocaine, planting_year=2000, system=intensif
  - Each fixture must produce KNOWN, PREDICTABLE outputs when processed by each step
  - Document expected outputs alongside fixtures
  - These fixtures are used by ALL subsequent step tests

  **Must NOT do**:
  - No random data — everything deterministic
  - No live API calls in fixtures
  - No DB dependency

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Data assembly, not complex logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 8-16
  - **Blocked By**: Task 1 (needs type models to validate fixtures)

  **References**:

  **Pattern References**:
  - `agritech-api/src/modules/calibration/fixtures/test-fixture.ts` — Existing NestJS test fixtures for calibration
  - `agritech-api/src/modules/calibration/fixtures/calibration.fixture.spec.ts` — How fixtures are tested in NestJS

  **Acceptance Criteria**:
  - [ ] All fixtures importable and type-valid against Pydantic models
  - [ ] Satellite fixture spans 24 months with 8 indices per date
  - [ ] Weather fixture covers same period with all required fields
  - [ ] Known expected outputs documented for each step

  **QA Scenarios**:

  ```
  Scenario: Fixtures load and validate
    Tool: Bash (pytest)
    Steps:
      1. Import fixtures, validate against Pydantic models
      2. Assert: satellite data has >= 48 data points (biweekly over 24 months)
      3. Assert: weather data has >= 700 daily records
      4. Assert: harvest records span 5 distinct years
    Expected Result: All fixtures valid
    Evidence: .sisyphus/evidence/task-7-fixtures-validation.txt
  ```

  **Commit**: YES (group with Wave 1)
  - Message: `test(calibration): add deterministic test fixtures for V2 pipeline`
  - Files: `backend-service/tests/fixtures/calibration_fixtures.py`

- [x] 8. Step 1 — Satellite History Extraction (Raster Fetch + Cache)

  **What to do**:
  - Create `backend-service/app/services/calibration/step1_satellite_extraction.py`
  - Implement `extract_satellite_history(parcel_boundary, date_range, storage_client) -> Step1Output`
  - Logic:
    1. Query Sentinel-2 catalog (CDSE/GEE) for all images overlapping parcel AOI in date range (12-36 months)
    2. Filter images with >20% cloud cover over AOI using SCL band
    3. For each valid image: clip to parcel boundary, compute 8 indices per pixel (NDVI, NIRv, NDMI, NDRE, EVI, MSAVI, MSI, GCI)
    4. Store full raster as COG in Supabase Storage: `calibration-rasters/{org_id}/{parcel_id}/{date}/{index}.tif`
    5. Extract per-pixel statistics: build time series for each index
    6. Detect outliers (>3 standard deviations from 30-day moving average)
    7. Interpolate linearly for missing dates with maximum 15-day gap
  - Also extract the existing mean_value time series from `satellite_indices_data` as fallback
  - Return: time series per index (dates + values), cloud coverage stats, outlier flags, interpolated date markers, raster storage paths
  - TDD: test with mock raster data (numpy arrays), test cloud masking, test outlier detection, test interpolation

  **Must NOT do**:
  - No live GEE/CDSE calls in tests — mock the provider
  - No storing raw band data — only computed index rasters

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex raster processing with cloud masking, time series analysis, and storage integration
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 9, 10, 11, 12)
  - **Blocks**: Tasks 10, 15 (percentiles and zones need satellite data)
  - **Blocked By**: Tasks 1, 7, 24 (types, fixtures, raster storage)

  **References**:

  **Pattern References**:
  - `backend-service/app/services/satellite/utils/index_calculator.py` — Existing index computation from bands — REUSE this
  - `backend-service/app/services/satellite/utils/statistics.py` — Existing statistical analysis for satellite data
  - `backend-service/app/services/satellite/providers/cdse_provider.py` — CDSE provider for raw band access
  - `backend-service/app/services/satellite/providers/gee_provider.py` — GEE provider alternative
  - `backend-service/app/services/cloud_masking.py` — Existing cloud masking service

  **WHY Each Reference Matters**:
  - index_calculator already computes NDVI, NIRv, etc. from raw bands — must reuse, not rewrite
  - cloud_masking has the SCL band filtering logic — extend for per-pixel masking

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_calibration_step1.py` → PASS
  - [ ] 24-month fixture produces valid time series for all 8 indices
  - [ ] Cloudy images (>20% over AOI) filtered out
  - [ ] Outliers (>3σ) flagged in output
  - [ ] Linear interpolation fills gaps ≤15 days

  **QA Scenarios**:

  ```
  Scenario: Satellite extraction with clean data
    Tool: Bash (pytest)
    Steps:
      1. Feed 24 months of mock satellite data (50 valid images)
      2. Assert: Step1Output has 8 index time series
      3. Assert: each time series has ≥40 data points (some filtered by cloud)
      4. Assert: interpolated gaps marked
    Expected Result: Complete time series output
    Evidence: .sisyphus/evidence/task-8-step1-extraction.txt

  Scenario: Heavy cloud coverage (>60% images filtered)
    Tool: Bash (pytest)
    Steps:
      1. Feed data where 70% of images have >20% cloud cover
      2. Assert: only clean images used
      3. Assert: output flags low data quality
    Expected Result: Degraded but valid output
    Evidence: .sisyphus/evidence/task-8-step1-cloudy.txt
  ```

  **Commit**: YES (group with Wave 2)
  - Message: `feat(calibration): implement Step 1 satellite history extraction with raster caching`
  - Files: `backend-service/app/services/calibration/step1_satellite_extraction.py`, tests

- [x] 9. Step 2 — Weather History Extraction (GDD, Chill Hours, Extremes)

  **What to do**:
  - Create `backend-service/app/services/calibration/step2_weather_extraction.py`
  - Implement `extract_weather_history(weather_data, crop_type, tbase) -> Step2Output`
  - Logic:
    1. Receive daily weather records (already fetched by NestJS from weather_daily_data)
    2. Compute monthly/seasonal precipitation totals
    3. Compute monthly GDD accumulations: `GDD_daily = max(0, (Tmax + Tmin) / 2 - tbase)`
    4. Compute winter chill hours: Modified Utah model or simple threshold (<7.2°C)
    5. Identify extreme events:
       - Late frost: Tmin < crop's frost_threshold after March 1st
       - Heatwave: Tmax > crop's heat_threshold for 3+ consecutive days
       - Prolonged drought: <5mm precipitation for 30+ consecutive days
       - High wind: wind_speed_max > 60 km/h
    6. Compute cumulative GDD curve for phenology correlation
  - TDD: test GDD calculation, chill hour calculation, extreme event detection

  **Must NOT do**:
  - No API calls to weather services — receives pre-fetched data
  - No interpretation of weather impact on crops

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Multi-formula weather computation with extreme event detection
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 11, 13 (phenology and anomaly detection need weather)
  - **Blocked By**: Tasks 1, 3, 7 (types, GDD schema, fixtures)

  **References**:

  **Pattern References**:
  - `backend-service/app/api/calibration.py:244-250` — Existing WeatherReading model — extend with more fields
  - `project/supabase/migrations/00000000000000_schema.sql:5523-5532` — crop_types with tbase, frost_threshold, heat_threshold, chill_hours_min/max

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_calibration_step2.py` → PASS
  - [ ] GDD accumulation correct for olivier (tbase=10°C)
  - [ ] Chill hours detected in winter months
  - [ ] At least 1 extreme event detected in 24-month fixture

  **QA Scenarios**:

  ```
  Scenario: Weather extraction with known data
    Tool: Bash (pytest)
    Steps:
      1. Feed 24 months of weather fixture
      2. Assert: monthly precipitation totals correct
      3. Assert: GDD accumulation increases through growing season
      4. Assert: extreme events list non-empty (fixture includes a heatwave)
    Expected Result: All weather metrics computed correctly
    Evidence: .sisyphus/evidence/task-9-step2-weather.txt
  ```

  **Commit**: YES (group with Wave 2)
  - Message: `feat(calibration): implement Step 2 weather extraction with GDD and extremes`
  - Files: `backend-service/app/services/calibration/step2_weather_extraction.py`, tests

- [x] 10. Step 3 — Personalized Percentile Calculation

  **What to do**:
  - Create `backend-service/app/services/calibration/step3_percentile_calculation.py`
  - Implement `calculate_percentiles(satellite_data: Step1Output, phenology_config, age_adjustment) -> Step3Output`
  - Logic:
    1. For each spectral index, group all historical values
    2. Calculate P10, P25, P50 (median), P75, P90 plus mean and standard deviation
    3. If history > 24 months: segment by phenological period (dormancy, growth, flowering, maturation) and compute percentiles per segment
    4. Apply age-based threshold adjustment from maturity phase multipliers
    5. Assign operational meaning: P10=critical alert, P25=vigilance, P40=low normal, P50=reference, P60=high normal, P75=excellent, P90=possible excess
    6. Cross-validate against crop reference generic thresholds as guard-rails
  - TDD: test global percentiles, test per-period segmentation, test age adjustment application

  **Must NOT do**:
  - No interpretation of what percentile means for the parcel
  - No recommendation based on percentile position

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Statistical computation with phenological segmentation and age adjustment
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 15, 16
  - **Blocked By**: Tasks 1, 5, 7, 8

  **References**:

  **Pattern References**:
  - `backend-service/app/api/calibration.py:450-471` — Existing V1 percentile calculation — replace and extend
  - `backend-service/app/api/calibration.py:78-231` — PHENOLOGY_CONFIG — crop-specific month→stage mapping for segmentation

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_calibration_step3.py` → PASS
  - [ ] 8 indices × (P10/P25/P50/P75/P90/mean/std) = 56 values minimum
  - [ ] Per-period percentiles computed when history > 24 months
  - [ ] Age adjustment multipliers applied to threshold boundaries

  **Commit**: YES (group with Wave 2)
  - Message: `feat(calibration): implement Step 3 personalized percentile calculation`
  - Files: `backend-service/app/services/calibration/step3_percentile_calculation.py`, tests

- [x] 11. Step 4 — Historical Phenology Detection

  **What to do**:
  - Create `backend-service/app/services/calibration/step4_phenology_detection.py`
  - Implement `detect_phenology(satellite_data: Step1Output, weather_data: Step2Output) -> Step4Output`
  - Logic:
    1. Analyze NIRv (or NDVI) curve for each available year
    2. Smooth the curve using Savitzky-Golay filter (scipy.signal)
    3. Identify characteristic dates per year:
       - Dormancy exit: first sustained NDVI increase > threshold after winter minimum
       - Vegetation peak: annual NDVI maximum
       - Summer plateau: period where NDVI stays within ±5% of peak
       - Autumn decline: first sustained NDVI decrease > threshold after plateau
       - Dormancy entry: annual NDVI minimum (winter)
    4. Calculate mean dates for each characteristic point across years
    5. Compute inter-annual variability (standard deviation of dates)
    6. Correlate each characteristic point with cumulative GDD
  - TDD: test date detection on synthetic seasonal curves, test GDD correlation

  **Must NOT do**:
  - No TIMESAT or complex curve fitting (Savitzky-Golay is sufficient for V1)
  - No phenology prediction — only historical detection

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Signal processing (smoothing, peak/valley detection) on time series
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 13, 16
  - **Blocked By**: Tasks 1, 7, 9

  **References**:

  **Pattern References**:
  - `backend-service/app/api/calibration.py:366-387` — Existing phenology stage lookup (month-based) — this is what we're replacing with curve analysis

  **External References**:
  - scipy.signal.savgol_filter — for time series smoothing
  - scipy.signal.argrelextrema — for peak/valley detection

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_calibration_step4.py` → PASS
  - [ ] Detects dormancy exit, peak, plateau, decline, dormancy entry from sine-wave fixture
  - [ ] Inter-annual variability < 30 days for stable fixture
  - [ ] GDD correlation computed for each characteristic point

  **Commit**: YES (group with Wave 2)
  - Message: `feat(calibration): implement Step 4 historical phenology detection`
  - Files: `backend-service/app/services/calibration/step4_phenology_detection.py`, tests

- [x] 12. GDD Precomputation Service for Weather Data

  **What to do**:
  - Create `backend-service/app/services/calibration/gdd_service.py`
  - Implement `precompute_gdd(latitude, longitude, crop_type) -> int` (count of rows updated)
  - Logic:
    1. Query weather_daily_data for given lat/lon where gdd_{crop_type} IS NULL
    2. For each row: GDD = max(0, ((temperature_max + temperature_min) / 2) - tbase)
    3. Chill hours: estimate from daily min/max temps using simplified Utah model
    4. Batch UPDATE weather_daily_data with computed values
  - Add API endpoint: `POST /api/calibration/precompute-gdd` (called by NestJS during calibration)
  - Also create a batch endpoint for backfilling existing weather data
  - TDD: test GDD formula, test batch update

  **Must NOT do**:
  - No deletion of existing data
  - No computation for non-AI crops

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: DB batch operations with formula computation
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: Task 9 (weather extraction reads precomputed GDD)
  - **Blocked By**: Task 3 (GDD columns must exist)

  **References**:

  **Pattern References**:
  - `agritech-api/src/modules/calibration/calibration.service.ts:374-452` — How weather data is provisioned and stored
  - `project/supabase/migrations/00000000000000_schema.sql:5523-5532` — tbase values per crop

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_gdd_service.py` → PASS
  - [ ] GDD for Tmax=30, Tmin=20, tbase=10 → GDD=15
  - [ ] GDD for Tmax=8, Tmin=2, tbase=10 → GDD=0
  - [ ] Batch update doesn't modify rows that already have GDD values

  **Commit**: YES (group with Wave 2)
  - Message: `feat(calibration): add GDD precomputation service`
  - Files: `backend-service/app/services/calibration/gdd_service.py`, tests

- [x] 13. Step 5 — Historical Anomaly Detection (5-Type)

  **What to do**:
  - Create `backend-service/app/services/calibration/step5_anomaly_detection.py`
  - Implement `detect_anomalies(satellite: Step1Output, weather: Step2Output, phenology: Step4Output, age_adjustment) -> Step5Output`
  - Detect 5 anomaly types:
    1. **Sudden drop**: >25% index decrease in <15 days → frost, hail, disease
    2. **Progressive decline**: sustained decline over months → drought, deficiency
    3. **Abnormal values**: values outside P5-P95 of historical distribution → exceptional year
    4. **Trend break**: significant change in baseline level → practice change (pruning, irrigation change)
    5. **Spatial heterogeneity**: sudden increase in intra-parcel variance → localized issue
  - For each detected anomaly:
    - Record date, type, severity (critique/urgente/vigilance)
    - Cross-reference with weather data (did a frost event coincide with the drop?)
    - Cross-reference with user-declared changes if available
    - Mark period for exclusion from normal reference calculations
  - If >50% of history is anomalous → flag calibration as "limited"
  - Handle special cases: water source change, irrigation regime change, extreme climate events, major interventions (severe pruning causes 30-50% NDVI drop lasting 12-24 months)
  - TDD: test each anomaly type detection individually

  **Must NOT do**:
  - No interpretation of anomaly causes beyond weather cross-reference
  - No recommendation for corrective action

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex multi-type anomaly detection with weather cross-referencing
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (partially — needs Step 1, 2, 4 outputs)
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 16, 17
  - **Blocked By**: Tasks 1, 5, 7, 9, 11

  **References**:

  **Pattern References**:
  - `backend-service/app/api/calibration.py:343-363` — Existing V1 anomaly detection (z-score only) — this is what we're extending
  - `backend-service/app/api/calibration.py:281-301` — DetectAnomaliesRequest/Response models

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_calibration_step5.py` → PASS
  - [ ] Sudden 30% NDVI drop detected as anomaly type 1
  - [ ] 3-month progressive decline detected as type 2
  - [ ] Weather cross-reference links frost event to NDVI drop
  - [ ] >50% anomalous history → calibration flagged as "limited"

  **QA Scenarios**:

  ```
  Scenario: Multi-type anomaly detection
    Tool: Bash (pytest)
    Steps:
      1. Feed fixture with injected anomalies: sudden drop at month 8, progressive decline months 15-18, and one extreme value at month 20
      2. Assert: 3 anomalies detected with correct types
      3. Assert: weather cross-reference present for drop (fixture has frost event at month 8)
      4. Assert: anomalous periods excluded from reference percentile dates
    Expected Result: All 3 anomalies detected and characterized
    Evidence: .sisyphus/evidence/task-13-anomaly-detection.txt
  ```

  **Commit**: YES (group with Wave 3)
  - Message: `feat(calibration): implement Step 5 historical anomaly detection`
  - Files: `backend-service/app/services/calibration/step5_anomaly_detection.py`, tests

- [x] 14. Step 6 — Initial Yield Potential Calculation

  **What to do**:
  - Create `backend-service/app/services/calibration/step6_yield_potential.py`
  - Implement `estimate_yield_potential(harvest_records, satellite: Step1Output, age_adjustment, crop_reference) -> Step6Output`
  - Two methods:
    1. **If real yield history ≥3 years**: potential = average of 3 best years × 1.1
    2. **If no/insufficient yield history**: estimation based on cumulative NIRvP × crop-specific coefficients from reference data, validated against age-bracketed yield ranges per variety
  - Age-bracketed yield reference lookup:
    - Use `crop_ai_references.reference_data.varietes[].rendement_kg_arbre` for the matching variety
    - Map parcel age to the correct bracket (e.g., '11-20_ans')
    - Handle 'declin' and 'arrachage' special values for intensive varieties
  - Yield normalization: convert harvest_records quantity (kg/tonnes/etc.) to t/ha using parcel area
  - Cross-validation: if satellite-derived estimate diverges >50% from age-reference range → flag incoherence
  - Return: estimated yield (min/max range), method used, reference bracket, confidence flag

  **Must NOT do**:
  - No yield prediction for future seasons — only potential estimation
  - Frame as initial estimate, not promise

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Dual-method yield estimation with cross-validation
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 1, 5, 7

  **References**:

  **Pattern References**:
  - `project/src/types/ai-references.ts:61-71` — YieldByAge type with age bracket keys
  - `project/src/types/ai-references.ts:107` — OlivierVariety.rendement_kg_arbre — the actual yield curve data structure
  - `project/supabase/migrations/00000000000000_schema.sql:2537-2577` — harvest_records table structure (quantity, unit, parcel_id)

  **WHY Each Reference Matters**:
  - YieldByAge defines the exact bracket keys to parse (e.g., '3-5_ans': [2, 5])
  - harvest_records structure shows how yield is stored (quantity + unit, needs normalization)

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_calibration_step6.py` → PASS
  - [ ] Method 1 (history): 5 years of [10, 12, 8, 15, 11] t/ha → potential = avg(15,12,11) × 1.1 ≈ 13.9 t/ha
  - [ ] Method 2 (satellite): NIRvP-based estimate falls within age bracket range
  - [ ] Picholine Marocaine age 25 → bracket '21-40_ans' → reference [40, 70] kg/tree
  - [ ] Arbosana age 45 → bracket '40+' → 'arrachage' special case handled

  **Commit**: YES (group with Wave 3)
  - Message: `feat(calibration): implement Step 6 yield potential estimation`
  - Files: `backend-service/app/services/calibration/step6_yield_potential.py`, tests

- [x] 15. Step 7 — Intra-Parcel Zone Detection (Raster → A/B/C/D/E)

  **What to do**:
  - Create `backend-service/app/services/calibration/step7_zone_detection.py`
  - Implement `detect_zones(raster_paths: list[str], storage_client) -> Step7Output`
  - Logic:
    1. Load cached raster files (COG) from Supabase Storage for the parcel (12+ months of NIRv/NDVI)
    2. Compute median vigor map: per-pixel median NIRv (or NDVI) over all available dates
    3. Classify each pixel into 5 classes using parcel-specific percentiles:
       - A (>P90): very vigorous
       - B (P75-P90): vigorous
       - C (P25-P75): normal
       - D (P10-P25): weak
       - E (<P10): problematic
    4. Calculate surface percentage in each class
    5. Identify spatial patterns: gradient (directional change), spots (isolated clusters), lines (linear features like irrigation lines/rows)
    6. Output as GeoJSON FeatureCollection where each feature is a zone polygon with class attribute
  - Use rasterio for COG reading, numpy for computation, shapely/fiona for GeoJSON generation
  - TDD: test with synthetic raster data (numpy arrays with known spatial patterns)

  **Must NOT do**:
  - No raster visualization or tile serving
  - No frontend-accessible raster API
  - Pattern detection should be simple (connected components) not ML-based

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Spatial raster processing, percentile-based classification, GeoJSON generation — requires careful numerical and spatial logic
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 1, 7, 8, 10

  **References**:

  **Pattern References**:
  - `backend-service/app/services/satellite/utils/statistics.py` — Existing statistical computation patterns for satellite data
  - `backend-service/app/services/satellite/utils/visualization.py` — Existing raster visualization utilities

  **External References**:
  - rasterio: COG reading, coordinate transform
  - numpy: median computation, percentile-based classification
  - shapely/fiona or geojson: FeatureCollection output

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_calibration_step7.py` → PASS
  - [ ] Synthetic raster with gradient → detected as gradient pattern
  - [ ] 5-class distribution sums to 100%
  - [ ] GeoJSON output has valid geometry per zone
  - [ ] Class boundaries match percentile-based thresholds

  **Commit**: YES (group with Wave 3)
  - Message: `feat(calibration): implement Step 7 intra-parcel zone detection`
  - Files: `backend-service/app/services/calibration/step7_zone_detection.py`, tests

- [x] 16. Step 8 — Initial Health Score (5-Component Composite)

  **What to do**:
  - Create `backend-service/app/services/calibration/step8_health_score.py`
  - Implement `calculate_health_score(percentiles: Step3Output, zones: Step7Output, phenology: Step4Output, anomalies: Step5Output, age_adjustment) -> Step8Output`
  - 5 weighted components:
    1. **Vegetative vigor (30%)**: median NIRv position vs crop reference (P50 close to optimal = high score)
    2. **Spatial homogeneity (20%)**: % surface in class C or better (A+B+C percentage)
    3. **Temporal stability (15%)**: low inter-annual variance = good (inverse of coefficient of variation)
    4. **Hydric state (20%)**: NDMI position vs percentiles (P50 NDMI in reference range = high score)
    5. **Nutritional state (15%)**: NDRE position vs percentiles (P50 NDRE in reference range = high score)
  - Each component scored 0-100 individually
  - Composite = weighted sum: `30*vigor/100 + 20*homogeneity/100 + 15*stability/100 + 20*hydric/100 + 15*nutritional/100`
  - Interpretation bands (labels only, NO text advice):
    - 80-100: excellent
    - 60-80: good
    - 40-60: medium
    - 20-40: weak
    - 0-20: critical
  - TDD: test each component individually, test composite calculation

  **Must NOT do**:
  - NO text interpretation ("Your parcel needs...")
  - Band labels are enum values, not user-facing text

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Multi-component scoring with weighted aggregation
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (but needs inputs from previous steps)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 17
  - **Blocked By**: Tasks 1, 5, 7, 10, 11, 13

  **References**:

  **Pattern References**:
  - `backend-service/app/api/calibration.py:389-447` — Existing V1 calibration run (simple mean/percentile/confidence) — this is what we're replacing with the 5-component composite

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_calibration_step8.py` → PASS
  - [ ] Perfect fixture data → health_score ≈ 85-95
  - [ ] Stressed fixture (low NDVI, high variance, poor zones) → health_score ≈ 20-30
  - [ ] Component breakdown weights sum to 100
  - [ ] Each component independently scored 0-100

  **Commit**: YES (group with Wave 3)
  - Message: `feat(calibration): implement Step 8 health score composite`
  - Files: `backend-service/app/services/calibration/step8_health_score.py`, tests

- [x] 17. Calibration Engine Orchestrator (8-Step Sequencer)

  **What to do**:
  - Create `backend-service/app/services/calibration/engine.py`
  - Implement `run_calibration_v2(input: CalibrationInput) -> CalibrationOutput`
  - Sequential orchestration:
    1. Validate input data (minimum requirements per step)
    2. Step 1: Satellite extraction → Step1Output
    3. Step 2: Weather extraction → Step2Output (parallel with Step 1)
    4. Step 3: Percentile calculation (needs Step 1 + age_adjustment) → Step3Output
    5. Step 4: Phenology detection (needs Step 1 + Step 2) → Step4Output
    6. Step 5: Anomaly detection (needs Steps 1-4 + age_adjustment) → Step5Output
    7. Step 6: Yield potential (needs harvest data + Step 1 + age_adjustment) → Step6Output
    8. Step 7: Zone detection (needs Step 1 rasters + Step 3 percentiles) → Step7Output
    9. Step 8: Health score (needs Steps 3,4,5,7) → Step8Output
    10. Confidence score (needs all data availability checks) → ConfidenceOutput
    11. Assemble CalibrationOutput with all step results + metadata
  - Per-step error handling:
    - If a step fails due to insufficient data: produce degraded output with quality flag, continue to next step
    - If a step fails with exception: log error, skip step, degrade confidence score
    - Never fail the entire calibration for a single step failure (unless Step 1 fails — no satellite data = no calibration)
  - Track processing time per step
  - TDD: test full pipeline with fixture data, test partial failure scenarios

  **Must NOT do**:
  - No database access — pure computation pipeline
  - No parallelism optimization (keep sequential for V1, optimize later)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex orchestration with error handling and degraded mode
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on all previous Python tasks)
  - **Parallel Group**: Wave 3 (but late in wave)
  - **Blocks**: Task 18
  - **Blocked By**: Tasks 1, 5, 6, 8-16 (all step modules)

  **References**:

  **Pattern References**:
  - `backend-service/app/api/calibration.py:389-447` — V1 run_calibration endpoint — replace with V2 engine call
  - `agritech-api/src/modules/calibration/calibration.service.ts:489-580` — NestJS V1 computation flow — shows what data NestJS sends

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_calibration_engine.py` → PASS
  - [ ] Full fixture data → CalibrationOutput with all 8 step outputs populated
  - [ ] Missing satellite data → CalibrationError("Insufficient satellite data")
  - [ ] Missing harvest data → Step 6 degraded (satellite-only method), other steps unaffected
  - [ ] Processing time tracked per step

  **Commit**: YES (group with Wave 3)
  - Message: `feat(calibration): implement V2 calibration engine orchestrator`
  - Files: `backend-service/app/services/calibration/engine.py`, tests

- [x] 18. Python Calibration API Endpoint V2

  **What to do**:
  - Add new endpoint to `backend-service/app/api/calibration.py` (or create new file `backend-service/app/api/calibration_v2.py`)
  - `POST /api/calibration/v2/run` — accepts CalibrationInput, returns CalibrationOutput
  - `POST /api/calibration/v2/precompute-gdd` — triggers GDD precomputation for a location + crop
  - Register new router in `backend-service/app/main.py`
  - Keep V1 endpoints functional (clean break = new endpoints, not replacing old ones)
  - Input validation: crop_type must be in VALID_CROP_TYPES, satellite readings minimum count, etc.
  - Error responses: structured error JSON with step that failed, reason

  **Must NOT do**:
  - Do NOT delete V1 endpoints — keep for backward compatibility during transition
  - Do NOT add database access in Python endpoints — NestJS provides all data

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: API endpoint wiring with FastAPI patterns
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after Task 17)
  - **Blocks**: Task 19
  - **Blocked By**: Task 17

  **References**:

  **Pattern References**:
  - `backend-service/app/api/calibration.py:389-447` — V1 endpoint pattern to follow
  - `backend-service/app/main.py` — Router registration pattern

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_calibration_v2_api.py` → PASS
  - [ ] POST /api/calibration/v2/run with fixture data → 200 with CalibrationOutput
  - [ ] POST /api/calibration/v2/run with missing required fields → 422
  - [ ] V1 endpoints still functional

  **Commit**: YES (group with Wave 3)
  - Message: `feat(calibration): add V2 API endpoints`
  - Files: `backend-service/app/api/calibration_v2.py` or modified calibration.py, main.py, tests

- [x] 19. NestJS CalibrationService V2 — Data Assembly + Python Call

  **What to do**:
  - Update `agritech-api/src/modules/calibration/calibration.service.ts`
  - Add new method `startCalibrationV2(parcelId, organizationId, dto) -> CalibrationRecord`
  - Data assembly:
    1. Fetch parcel context (crop_type, variety, planting_year, planting_system, boundary)
    2. Fetch satellite indices from satellite_indices_data (all indices, 36 months)
    3. Fetch weather data from weather_daily_data (same period)
    4. Fetch soil analyses from analyses table WHERE parcel_id AND analysis_type='soil' (latest)
    5. Fetch water analyses from analyses table WHERE parcel_id AND analysis_type='water' (latest)
    6. Fetch harvest records from harvest_records WHERE parcel_id (all years)
    7. Fetch crop AI references from crop_ai_references WHERE crop_type
    8. Compute parcel age from planting_year
    9. Trigger GDD precomputation via Python endpoint if needed
    10. Assemble CalibrationInput and POST to /api/calibration/v2/run
  - Background processing pattern: create calibration record → set ai_phase='calibrating' → assemble + call Python in background → update record + ai_phase on completion/failure
  - Store result: typed columns (health_score, yield_potential_min/max, etc.) + full CalibrationOutput in calibration_data JSONB
  - Error recovery: 10-minute timeout, auto-mark failed, reset ai_phase to 'disabled'
  - Concurrent protection: check ai_phase is not already 'calibrating' before starting

  **Must NOT do**:
  - Do NOT call V1 Python endpoint — use V2
  - Do NOT skip data assembly steps (fetch everything, even if empty)

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex data assembly from 7+ tables, background processing, error handling
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 20, 21, 24)
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 25, 29
  - **Blocked By**: Tasks 2, 6, 17, 18

  **References**:

  **Pattern References**:
  - `agritech-api/src/modules/calibration/calibration.service.ts:119-150` — V1 startCalibration pattern — extend, don't replace
  - `agritech-api/src/modules/calibration/calibration.service.ts:209-309` — Background provisioning pattern to follow
  - `agritech-api/src/modules/calibration/calibration.service.ts:762-820` — fetchSatelliteReadings + fetchWeatherReadings — extend with analyses + harvest
  - `agritech-api/src/modules/calibration/calibration.service.ts:990-1026` — postCalibrationApi pattern for calling Python backend

  **WHY Each Reference Matters**:
  - V1 patterns show the established conventions for data fetching, background processing, and Python API calls
  - The provisioning pattern (lines 209-309) is the template for background calibration with error recovery

  **Acceptance Criteria**:
  - [ ] `pnpm --filter agritech-api test -- --testPathPattern=calibration` → PASS
  - [ ] Data assembled from all 7 sources (satellite, weather, soil, water, harvest, crop ref, parcel)
  - [ ] Python V2 endpoint called with complete CalibrationInput
  - [ ] CalibrationOutput stored in both typed columns and JSONB
  - [ ] ai_phase transitions: disabled → calibrating → (awaiting_validation on success / disabled on failure)

  **QA Scenarios**:

  ```
  Scenario: Full calibration with V2 engine
    Tool: Bash (Jest + curl)
    Steps:
      1. Run NestJS calibration V2 tests
      2. Assert: all data sources queried (mock Supabase calls verified)
      3. Assert: Python V2 endpoint called with correct payload shape
      4. Assert: result stored with health_score, yield_potential columns populated
    Expected Result: Full pipeline executes
    Evidence: .sisyphus/evidence/task-19-nestjs-v2.txt
  ```

  **Commit**: YES (group with Wave 4)
  - Message: `feat(calibration): add NestJS V2 orchestration with full data assembly`
  - Files: `agritech-api/src/modules/calibration/calibration.service.ts`, tests

- [x] 20. State Machine Logic on parcels.ai_phase

  **What to do**:
  - Create `agritech-api/src/modules/calibration/calibration-state-machine.ts`
  - Define valid transitions:
    - `disabled → calibrating` (trigger: user starts calibration, requires planting_year set)
    - `calibrating → awaiting_validation` (trigger: calibration completes successfully)
    - `calibrating → disabled` (trigger: calibration fails)
    - `awaiting_validation → awaiting_nutrition_option` (trigger: user validates baseline)
    - `awaiting_nutrition_option → active` (trigger: user confirms nutrition option)
    - `active → awaiting_nutrition_option` (trigger: user wants to change nutrition option)
    - `active → calibrating` (trigger: user requests recalibration)
    - `active → disabled` (trigger: user disables AI)
    - `any → disabled` (trigger: admin reset or planting_year changed)
  - Implement `transitionPhase(parcelId, fromPhase, toPhase, organizationId)` with guard checks
  - Invalid transitions throw BadRequestException
  - Each transition updates `parcels.ai_phase` via Supabase
  - Boundary change detection: if parcel boundary changes while ai_phase != 'disabled', auto-reset to 'disabled'
  - TDD: test all valid transitions, test invalid transition rejection

  **Must NOT do**:
  - No optimistic transitions — server authoritative
  - No transition without guard check

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: State machine with guard conditions, moderate complexity
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 22, 26
  - **Blocked By**: Task 2 (DB migration with new ai_phase values)

  **References**:

  **Pattern References**:
  - `agritech-api/src/modules/calibration/calibration.service.ts:565-577` — Current ai_phase update (jumps to 'active') — replace with state machine
  - `project/supabase/migrations/20260312000000_agromind_ia.sql:1-6` — ai_phase column definition

  **Acceptance Criteria**:
  - [ ] All 9 valid transitions succeed
  - [ ] Invalid transition (e.g., disabled → active) throws BadRequestException
  - [ ] Boundary change resets ai_phase to 'disabled'

  **Commit**: YES (group with Wave 4)
  - Message: `feat(calibration): implement ai_phase state machine`
  - Files: `agritech-api/src/modules/calibration/calibration-state-machine.ts`, tests

- [x] 21. Nutrition Option Auto-Suggestion Logic

  **What to do**:
  - Create `agritech-api/src/modules/calibration/nutrition-option.service.ts`
  - Implement `suggestNutritionOption(parcelId, organizationId) -> NutritionOptionSuggestion`
  - Rule-based suggestion:
    1. Check for saline conditions FIRST (Option C takes priority):
       - Query latest water analysis: if EC (ec_ds_per_m) > 2.5 dS/m (olivier) or >1.5 dS/m (agrumes/avocatier) → suggest C
       - Query latest soil analysis: if salinity_level (EC) > 3 dS/m (olivier) or >2 dS/m (others) → suggest C
    2. Check for soil analysis availability (Option A vs B):
       - Query analyses WHERE parcel_id AND analysis_type='soil' AND analysis_date > NOW() - 2 years
       - If exists AND water analysis available → suggest A
       - If no soil analysis OR analysis > 3 years old → suggest B
    3. For palmier dattier: most tolerant, Option C threshold higher (no explicit threshold in reference)
  - Return: suggested option (A/B/C), rationale data (what triggered the suggestion), alternative options with eligibility flags
  - TDD: test each rule branch

  **Must NOT do**:
  - No automatic selection — always a suggestion for user to confirm
  - No text recommendation — structured data only

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex rule-based logic with multiple data source queries and crop-specific thresholds
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 22, 27
  - **Blocked By**: Task 1 (type definitions for NutritionOption)

  **References**:

  **Pattern References**:
  - `project/src/types/ai-references.ts:160-179` — OlivierNutritionOptionA/B/C definitions with conditions
  - `project/src/types/ai-references.ts:405-413` — OlivierWaterCeThreshold — water CE thresholds for olive
  - `project/src/types/analysis.ts:141-208` — WaterAnalysisData.ec_ds_per_m — the field to check for salinity

  **WHY Each Reference Matters**:
  - ai-references.ts defines the exact conditions for each nutrition option per crop
  - analysis.ts shows the exact field names to query for soil/water analysis data

  **Acceptance Criteria**:
  - [ ] `pnpm --filter agritech-api test -- --testPathPattern=nutrition` → PASS
  - [ ] Parcel with CE_eau=3.0 for olivier → suggest Option C
  - [ ] Parcel with complete soil <2y + water → suggest Option A
  - [ ] Parcel with no soil analysis → suggest Option B
  - [ ] All 3 options returned with eligibility flags

  **Commit**: YES (group with Wave 4)
  - Message: `feat(calibration): implement nutrition option auto-suggestion`
  - Files: `agritech-api/src/modules/calibration/nutrition-option.service.ts`, tests

- [x] 22. NestJS Validation + Nutrition Option Endpoints

  **What to do**:
  - Update `agritech-api/src/modules/calibration/calibration.controller.ts`
  - Add/update endpoints:
    - `POST /calibration/:parcelId/start-v2` — triggers V2 calibration (guards: ai_phase must be 'disabled' or 'active' for recalibration)
    - `POST /calibration/:id/validate` — validates baseline (guards: ai_phase must be 'awaiting_validation')
    - `GET /calibration/:parcelId/nutrition-suggestion` — returns nutrition option suggestion
    - `POST /calibration/:id/nutrition-option` — confirms nutrition option (guards: ai_phase must be 'awaiting_nutrition_option')
    - `GET /calibration/:parcelId/report` — returns calibration report with all sections
  - Each endpoint uses state machine for phase transitions
  - Proper DTO validation with class-validator
  - Organization-scoped (multi-tenant) — all operations check organization_id

  **Must NOT do**:
  - No endpoint for admin override
  - No batch operations

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: REST endpoint wiring with guards and DTOs
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO (needs 19, 20, 21)
  - **Parallel Group**: Wave 4 (late)
  - **Blocks**: Tasks 26, 27
  - **Blocked By**: Tasks 19, 20, 21

  **References**:

  **Pattern References**:
  - `agritech-api/src/modules/calibration/calibration.controller.ts` — Existing controller with route structure, decorators, guards
  - `agritech-api/src/modules/calibration/dto/start-calibration.dto.ts` — Existing DTO pattern

  **Acceptance Criteria**:
  - [ ] All 5 endpoints return correct responses
  - [ ] Phase guard violations return 400 with clear message
  - [ ] Multi-tenant: organization_id enforced on all operations

  **Commit**: YES (group with Wave 4)
  - Message: `feat(calibration): add V2 validation and nutrition option endpoints`
  - Files: `agritech-api/src/modules/calibration/calibration.controller.ts`, DTOs, tests

- [x] 23. Frontend Calibration Types + API Hooks

  **What to do**:
  - Create `project/src/lib/api/calibration-v2.ts` — API client functions for V2 endpoints
  - Create `project/src/hooks/useCalibrationV2.ts` — TanStack Query hooks:
    - `useStartCalibrationV2(parcelId)` — mutation for starting calibration
    - `useCalibrationReport(parcelId)` — query for calibration report
    - `useValidateCalibration(calibrationId)` — mutation for validation
    - `useNutritionSuggestion(parcelId)` — query for nutrition option suggestion
    - `useConfirmNutritionOption(calibrationId)` — mutation for nutrition confirmation
    - `useCalibrationPhase(parcelId)` — query for current ai_phase (realtime subscription)
  - All hooks follow existing patterns: staleTime, queryKey from query-keys.ts, error handling via toast
  - Add query keys to `project/src/lib/query-keys.ts`
  - Proper cache invalidation on mutations

  **Must NOT do**:
  - No UI components in this task — only types and hooks
  - No `as any`

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Following established hook patterns
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 25, 26, 27
  - **Blocked By**: Task 4 (TypeScript types)

  **References**:

  **Pattern References**:
  - `project/src/hooks/useAICalibration.ts` — Existing calibration hooks — extend pattern
  - `project/src/lib/api/ai-calibration.ts` — Existing API client for calibration
  - `project/src/lib/query-keys.ts` — Query key naming convention

  **Acceptance Criteria**:
  - [ ] `pnpm --filter agriprofy type-check` → 0 errors
  - [ ] All hooks follow TanStack Query patterns (staleTime, enabled, queryKey)
  - [ ] Mutations invalidate correct query keys

  **Commit**: YES (group with Wave 4)
  - Message: `feat(calibration): add V2 frontend API hooks and types`
  - Files: `project/src/lib/api/calibration-v2.ts`, `project/src/hooks/useCalibrationV2.ts`, query-keys.ts

- [x] 24. Raster Storage Service (Upload/Retrieve COG from Supabase Storage)

  **What to do**:
  - Create `backend-service/app/services/calibration/raster_storage.py`
  - Implement:
    - `upload_raster(org_id, parcel_id, date, index_name, raster_data: np.ndarray, transform, crs) -> str` — saves as COG to Supabase Storage bucket `calibration-rasters`
    - `download_raster(org_id, parcel_id, date, index_name) -> tuple[np.ndarray, transform, crs]` — retrieves COG
    - `list_rasters(org_id, parcel_id) -> list[RasterMetadata]` — lists available rasters
    - `cleanup_rasters(org_id, parcel_id, keep_latest_months=24) -> int` — retention cleanup
  - Storage path: `{org_id}/{parcel_id}/{date}/{index_name}.tif`
  - Use rasterio for COG creation, Supabase Storage client for upload/download
  - Create storage bucket in migration if not exists
  - TDD: test with small synthetic rasters, mock Supabase Storage

  **Must NOT do**:
  - No public access to rasters — storage is internal only
  - No frontend download endpoint

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: File storage integration with rasterio
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 8, 15 (satellite extraction and zone detection need raster storage)
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `backend-service/app/services/supabase_service.py` — Existing Supabase service client
  - `backend-service/test_supabase_storage.py` — Existing tests for Supabase storage operations

  **Acceptance Criteria**:
  - [ ] `pytest tests/test_raster_storage.py` → PASS
  - [ ] Upload + download roundtrip preserves raster data
  - [ ] List returns correct metadata for stored rasters
  - [ ] Cleanup removes old rasters, keeps recent

  **Commit**: YES (group with Wave 4)
  - Message: `feat(calibration): add raster storage service for COG files`
  - Files: `backend-service/app/services/calibration/raster_storage.py`, tests

- [x] 25. Calibration Report View — 4-Section Format

  **What to do**:
  - Update `project/src/routes/_authenticated/(production)/parcels.$parcelId.ai.calibration.tsx`
  - Build 4-section calibration report matching spec:
    1. **Executive Summary**: health score (large number + band label), confidence level (progress bar), estimated yield potential (range), key strengths and attention points (from zone + anomaly data)
    2. **Detailed Analysis**: vegetative vigor chart (NIRv/NDVI over time with percentile bands), hydric state chart (NDMI/MSI), nutritional state chart (NDRE), spatial homogeneity (zone distribution pie chart), phenological timeline
    3. **Detected Anomalies**: list of past events with date, type badge, severity indicator, weather cross-reference
    4. **Calibration Improvement**: list of missing data (no soil analysis = "add soil analysis"), recommended field verifications, confidence improvement path
  - All data comes from `useCalibrationReport(parcelId)` hook — no direct API calls
  - Responsive layout, follows existing design system
  - Use existing chart components (TimeSeriesChart, etc.) where possible
  - Show ai_phase state prominently (calibrating spinner, awaiting validation banner, etc.)

  **Must NOT do**:
  - NO text recommendations ("You should irrigate more")
  - NO pixel-level raster display
  - No custom chart library — use existing Recharts/chart components

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Complex data visualization UI with charts, maps, and responsive layout
  - **Skills**: [`design-system`]
    - `design-system`: Ensures visual consistency with existing UI patterns

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5 (with Tasks 26, 27, 28)
  - **Blocks**: Task 29
  - **Blocked By**: Tasks 4, 23

  **References**:

  **Pattern References**:
  - `project/src/components/AIReportSection/AIReportPreview.tsx` — Existing AI report display — follow this layout pattern
  - `project/src/components/AIReportSection/CalibrationStatusPanel.tsx` — Existing calibration status UI
  - `project/src/components/TimeSeriesChart.tsx` — Existing time series chart component
  - `project/src/components/SatelliteAnalysisView/TimeSeriesChart.tsx` — Satellite-specific chart with percentile bands
  - `project/src/routes/_authenticated/(production)/parcels.$parcelId.ai.calibration.tsx` — Existing calibration route page

  **WHY Each Reference Matters**:
  - AIReportPreview shows the established report layout conventions
  - TimeSeriesChart is the reusable chart component for time series with band overlays
  - The existing calibration route is the file to modify

  **Acceptance Criteria**:
  - [ ] `pnpm --filter agriprofy type-check` → 0 errors
  - [ ] 4 report sections visible when calibration is completed
  - [ ] Health score displayed as large number with band badge
  - [ ] At least 1 chart renders with percentile bands

  **QA Scenarios**:

  ```
  Scenario: Calibration report renders all sections
    Tool: Playwright
    Preconditions: Parcel with completed V2 calibration in test DB
    Steps:
      1. Navigate to /parcels/{parcelId}/ai/calibration
      2. Assert: section "Executive Summary" visible with health score number
      3. Assert: section "Detailed Analysis" visible with at least 1 chart
      4. Assert: section "Detected Anomalies" visible (may be empty list)
      5. Assert: section "Improvement" visible with data completeness info
      6. Screenshot: full page
    Expected Result: All 4 sections render without errors
    Evidence: .sisyphus/evidence/task-25-report-view.png

  Scenario: Report handles incomplete calibration gracefully
    Tool: Playwright
    Steps:
      1. Navigate to parcel with ai_phase='calibrating'
      2. Assert: spinner/loading state shown, not empty report
      3. Navigate to parcel with ai_phase='disabled'
      4. Assert: "Start Calibration" button shown
    Expected Result: Each phase has appropriate UI
    Evidence: .sisyphus/evidence/task-25-report-states.png
  ```

  **Commit**: YES (group with Wave 5)
  - Message: `feat(calibration): add 4-section calibration report view`
  - Files: `project/src/routes/_authenticated/(production)/parcels.$parcelId.ai.calibration.tsx`, components

- [x] 26. Calibration Validation Flow UI

  **What to do**:
  - Update calibration report page to include validation flow:
    - When ai_phase='awaiting_validation': show prominent "Valider et activer" button at bottom of report
    - Button click calls `useValidateCalibration` mutation
    - On success: transition to 'awaiting_nutrition_option' → show nutrition option selector
    - On error: show error toast, keep current state
  - Add confirmation dialog: "Êtes-vous sûr de vouloir valider ce calibrage?" with summary of key metrics
  - Add "Relancer le calibrage" button to re-run calibration if user is unsatisfied
  - Realtime subscription on parcels.ai_phase for live state updates (already in supabase_realtime)

  **Must NOT do**:
  - No manual score editing
  - No skip validation

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Interactive UI flow with state transitions and confirmations
  - **Skills**: [`design-system`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5
  - **Blocks**: Task 29
  - **Blocked By**: Tasks 23, 22

  **References**:

  **Pattern References**:
  - `project/src/components/AIReportSection/AIReportGenerator.tsx` — Existing AI report generation button pattern
  - `project/src/components/ai/CalibrationCard.tsx` — Existing calibration card with action buttons

  **Acceptance Criteria**:
  - [ ] "Valider" button visible only when ai_phase='awaiting_validation'
  - [ ] Clicking validates → phase transitions to 'awaiting_nutrition_option'
  - [ ] "Relancer" button triggers new calibration

  **QA Scenarios**:

  ```
  Scenario: User validates calibration baseline
    Tool: Playwright
    Steps:
      1. Navigate to parcel with ai_phase='awaiting_validation'
      2. Assert: "Valider et activer" button visible
      3. Click button → confirmation dialog appears
      4. Confirm → loading state → phase changes to 'awaiting_nutrition_option'
      5. Assert: nutrition option selector appears
    Expected Result: Smooth transition through validation
    Evidence: .sisyphus/evidence/task-26-validation-flow.png
  ```

  **Commit**: YES (group with Wave 5)
  - Message: `feat(calibration): add calibration validation flow UI`
  - Files: calibration route page, components

- [x] 27. Nutrition Option Selector UI

  **What to do**:
  - Create `project/src/components/ai/NutritionOptionSelector.tsx`
  - When ai_phase='awaiting_nutrition_option':
    - Fetch nutrition suggestion via `useNutritionSuggestion(parcelId)`
    - Display 3 option cards (A/B/C) with:
      - Option name and short description (from reference data, localized)
      - Visual indicator of system suggestion (highlighted/recommended badge)
      - Eligibility status (eligible/not-eligible based on available data)
      - Key differences (fertigation %, foliar %, biostimulant adjustments)
    - Pre-select the suggested option
    - User can click any eligible option to select it
    - "Confirmer" button calls `useConfirmNutritionOption`
    - On success: ai_phase → 'active'
  - Allow user to override suggestion (even select a non-suggested option if eligible)
  - Show tooltip explaining why each option is/isn't suggested

  **Must NOT do**:
  - No detailed comparison table (keep it simple — 3 cards)
  - No annual plan preview at this stage

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Interactive card selection UI with conditional states
  - **Skills**: [`design-system`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5
  - **Blocks**: Task 29
  - **Blocked By**: Tasks 23, 22

  **References**:

  **Pattern References**:
  - `project/src/types/ai-references.ts:160-179` — OlivierNutritionOptionA/B/C — display data source
  - `project/src/components/ai/CalibrationCard.tsx` — Card component pattern to follow

  **Acceptance Criteria**:
  - [ ] 3 option cards rendered with correct data
  - [ ] Suggested option pre-selected with visual indicator
  - [ ] "Confirmer" transitions to ai_phase='active'
  - [ ] Override works (select non-suggested option)

  **QA Scenarios**:

  ```
  Scenario: User confirms suggested nutrition option
    Tool: Playwright
    Steps:
      1. Navigate to parcel with ai_phase='awaiting_nutrition_option'
      2. Assert: 3 option cards visible
      3. Assert: one card has "Recommandé" badge
      4. Click "Confirmer" with pre-selected option
      5. Assert: ai_phase transitions to 'active'
    Expected Result: Nutrition option confirmed, phase active
    Evidence: .sisyphus/evidence/task-27-nutrition-selector.png

  Scenario: User overrides suggestion
    Tool: Playwright
    Steps:
      1. Navigate to parcel with suggested Option A
      2. Click Option B card to select it
      3. Click "Confirmer"
      4. Assert: parcels.ai_nutrition_option = 'B'
    Expected Result: Override works correctly
    Evidence: .sisyphus/evidence/task-27-nutrition-override.png
  ```

  **Commit**: YES (group with Wave 5)
  - Message: `feat(calibration): add nutrition option selector UI`
  - Files: `project/src/components/ai/NutritionOptionSelector.tsx`, integration in calibration route

- [x] 28. Parcel Card AI Phase Indicators

  **What to do**:
  - Update `project/src/components/ParcelCard.tsx` to show AI phase status
  - Show small badge/indicator on parcel card based on ai_phase:
    - `disabled`: no indicator (or subtle "AI" with gray dot)
    - `calibrating`: pulsing dot + "Calibrage en cours"
    - `awaiting_validation`: orange dot + "En attente de validation"
    - `awaiting_nutrition_option`: orange dot + "Option nutrition requise"
    - `active`: green dot + "AI Active"
  - Also update `project/src/components/ai/AIStatusBadge.tsx` if it exists for the new phases
  - Translate phase labels (fr, en, ar) in locale files

  **Must NOT do**:
  - No detailed info on card — just badge. Details on parcel detail page.

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI component update with phase-based rendering
  - **Skills**: [`design-system`]

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 5
  - **Blocks**: Task 29
  - **Blocked By**: Tasks 23, 20

  **References**:

  **Pattern References**:
  - `project/src/components/ParcelCard.tsx` — Existing parcel card to update
  - `project/src/components/ai/AIStatusBadge.tsx` — Existing AI status badge
  - `project/src/locales/` — Translation file structure (en, fr, ar)

  **Acceptance Criteria**:
  - [ ] All 5 phases display correct indicator
  - [ ] Colors: gray (disabled), blue pulse (calibrating), orange (awaiting), green (active)
  - [ ] Translations available in fr, en, ar

  **Commit**: YES (group with Wave 5)
  - Message: `feat(calibration): add AI phase indicators to parcel cards`
  - Files: `project/src/components/ParcelCard.tsx`, AIStatusBadge, locale files

- [x] 29. Integration Tests — Full State Machine Flow

  **What to do**:
  - Create integration test that exercises the complete flow:
    1. Create test parcel with ai_phase='disabled', planting_year=2000, crop_type='olivier'
    2. Start calibration → verify ai_phase='calibrating'
    3. Mock Python V2 response → verify ai_phase='awaiting_validation'
    4. Validate calibration → verify ai_phase='awaiting_nutrition_option'
    5. Get nutrition suggestion → verify suggestion is Option A/B/C based on test data
    6. Confirm nutrition option → verify ai_phase='active'
    7. Verify calibration report endpoint returns complete data
  - Test error paths:
    - Start calibration with ai_phase='active' → should allow (recalibration)
    - Start calibration with ai_phase='calibrating' → should reject (concurrent protection)
    - Validate with ai_phase='disabled' → should reject
  - NestJS integration test with mocked Supabase and Python backend

  **Must NOT do**:
  - No live Python backend calls in integration tests
  - No live Supabase calls — use mocked client

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex integration test covering all state transitions
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 (after frontend tasks)
  - **Blocks**: Tasks F1-F4
  - **Blocked By**: Tasks 19, 25, 26, 27

  **References**:

  **Pattern References**:
  - `agritech-api/src/modules/calibration/calibration.integration.spec.ts` — Existing integration test pattern
  - `agritech-api/src/modules/calibration/fixtures/test-fixture.ts` — Test fixture pattern

  **Acceptance Criteria**:
  - [ ] Full flow test passes: disabled → calibrating → awaiting_validation → awaiting_nutrition_option → active
  - [ ] All error paths tested and rejected correctly
  - [ ] Calibration report contains all 8 step outputs

  **Commit**: YES (group with Wave 5)
  - Message: `test(calibration): add V2 integration tests for full state machine flow`
  - Files: integration test files

- [x] 30. E2E Test — Calibration Through Nutrition Option

  **What to do**:
  - Create `project/e2e/calibration-v2.spec.ts` using Playwright
  - End-to-end test exercising the full user journey:
    1. Login as farm_manager
    2. Navigate to a parcel with AI disabled
    3. Click "Start Calibration" button
    4. Wait for calibration to complete (poll ai_phase or use realtime)
    5. Verify calibration report renders with 4 sections
    6. Click "Valider et activer"
    7. Verify nutrition option selector appears
    8. Select suggested option and confirm
    9. Verify ai_phase = 'active'
    10. Verify parcel card shows green "AI Active" badge
  - Test with a pre-seeded test parcel that has satellite + weather data
  - Use test fixtures for Python backend responses (mock the Python service)

  **Must NOT do**:
  - No live satellite/weather API calls in E2E
  - No testing of Python computation (that's unit tested separately)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: E2E test with Playwright, moderate complexity
  - **Skills**: [`playwright`]
    - `playwright`: Browser automation for E2E testing

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 (after Task 29)
  - **Blocks**: Tasks F1-F4
  - **Blocked By**: Task 29

  **References**:

  **Pattern References**:
  - `project/e2e/subscription.spec.ts` — Existing E2E test pattern

  **Acceptance Criteria**:
  - [ ] Full user journey completes without errors
  - [ ] All 5 phase transitions visible in UI
  - [ ] Total test time < 60 seconds (with mocked backend)

  **Commit**: YES (group with Wave 5)
  - Message: `test(calibration): add V2 E2E test for full calibration flow`
  - Files: `project/e2e/calibration-v2.spec.ts`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` (project/), linter, `pytest` (backend-service/), `pnpm --filter agritech-api test`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code. Check AI slop: excessive comments, over-abstraction, generic names.
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Tests [N pass/N fail] | VERDICT`

- [ ] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill) — BLOCKED: requires running services
  Start from clean state. Trigger calibration on a test parcel with known data. Verify all 5 ai_phase transitions. Verify calibration report has all 8 output sections. Test nutrition option auto-suggestion. Test validation flow. Save screenshots to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | Edge Cases [N tested] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec. Check "Must NOT do" compliance. Detect cross-task contamination. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Contamination [CLEAN/N issues] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

Commits grouped by wave:
- **Wave 1**: `feat(calibration): add V2 type definitions and DB migrations`
- **Wave 2**: `feat(calibration): implement satellite + weather + percentile + phenology steps`
- **Wave 3**: `feat(calibration): implement anomaly + yield + zones + health steps + orchestrator`
- **Wave 4**: `feat(calibration): add NestJS V2 orchestration + state machine + nutrition gate`
- **Wave 5**: `feat(calibration): add frontend report view + validation + nutrition option UI`

---

## Success Criteria

### Verification Commands
```bash
# Python step tests
cd backend-service && pytest tests/test_calibration_*.py -v  # Expected: ALL PASS

# NestJS tests
pnpm --filter agritech-api test -- --testPathPattern=calibration  # Expected: ALL PASS

# Frontend type-check
pnpm --filter agriprofy type-check  # Expected: 0 errors

# DB migration verify
# Expected: ai_phase accepts all 5 states, calibrations has new columns
```

### Final Checklist
- [ ] All 8 calibration steps produce correct output for test fixture data
- [ ] State machine transitions: disabled → calibrating → awaiting_validation → awaiting_nutrition_option → active
- [ ] Nutrition option auto-suggested from soil/water data
- [ ] Health score composite = 30% vigor + 20% homogeneity + 15% stability + 20% hydric + 15% nutritional
- [ ] Confidence score = satellite(30) + soil(20) + water(15) + yield(20) + profile(10) + coherence(5)
- [ ] Zone classification A/B/C/D/E from median raster
- [ ] Age-adjusted thresholds applied per maturity phase
- [ ] Missing planting_year degrades confidence by up to 10 points
- [ ] All "Must NOT Have" guardrails respected
