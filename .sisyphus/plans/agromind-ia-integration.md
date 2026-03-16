# AgromindIA Integration Plan (P0, TDD)

Date: 2026-03-12  
Owner: Execution session in this repo  
Source spec: `AGROMIND_IA_INTEGRATION_SPECS_v2.docx`

## 1) Final Decisions (Locked)

1. Build one end-to-end plan covering all 5 phases from the spec.
2. Implement P0 only.
3. Use TDD for backend and frontend.
4. Use existing reference JSON files in `referentials/` (see `referentials/README.md`):
   - `referentials/DATA_OLIVIER.json`
   - `referentials/DATA_AGRUMES.json`
   - `referentials/DATA_AVOCATIER.json`
   - `referentials/DATA_PALMIER_DATTIER.json`
5. Satellite indices already computed (including NIRv/NDRE/MSI/GCI), so no index-computation rewrite.
6. Satellite ingestion trigger is manual from UI; AI pipeline starts after manual sync completes.

## 2) Scope Boundaries

### In Scope (P0)

- Supabase schema additions and table extensions for AI workflow:
  - Add AI columns to `parcels`
  - Extend `satellite_indices_data` baseline fields
  - Extend `performance_alerts` for AI alert metadata
  - Add recommendation FK to `product_applications`
  - New tables: `calibrations`, `ai_recommendations`, `annual_plans`, `plan_interventions`, `crop_ai_references`
- NestJS modules (new):
  - `ai-references`
  - `calibration`
  - `ai-diagnostics`
  - `ai-alerts`
  - `ai-recommendations`
  - `annual-plan`
- NestJS module extensions:
  - `parcels` (AI activation/deactivation/dashboard endpoints)
  - `satellite-indices` (post-insert/post-sync AI analysis trigger)
- FastAPI backend-service extension:
  - Add `/api/calibration/*` routes for heavy calibration computations
  - Reuse existing `/api/weather/*` routes and services
- Frontend routes under production parcel scope:
  - `project/src/routes/_authenticated/(production)/parcels.$parcelId.ai.tsx`
  - `project/src/routes/_authenticated/(production)/parcels.$parcelId.ai.index.tsx`
  - `project/src/routes/_authenticated/(production)/parcels.$parcelId.ai.calibration.tsx`
  - `project/src/routes/_authenticated/(production)/parcels.$parcelId.ai.alerts.tsx`
  - `project/src/routes/_authenticated/(production)/parcels.$parcelId.ai.recommendations.tsx`
  - `project/src/routes/_authenticated/(production)/parcels.$parcelId.ai.plan.tsx`
  - `project/src/routes/_authenticated/(production)/parcels.$parcelId.ai.plan.index.tsx`
  - `project/src/routes/_authenticated/(production)/parcels.$parcelId.ai.plan.summary.tsx`
  - `project/src/routes/_authenticated/(production)/parcels.$parcelId.ai.weather.tsx`
- Frontend components and API hooks for AI dashboard, calibration, alerts, recommendations, plan.
- Background jobs:
  - Weather fetch/update jobs
  - AI analysis pipeline trigger and batch fallbacks
  - Plan reminder and weather verification jobs

### Out of Scope (P1 excluded)

- `water_analyses` table
- `foliar_analyses` table
- Yield forecast page (`/parcels/:id/ai/yield`)
- Recalibration module and F2/F3 forms
- Multi-variable yield model implementation

## 3) Existing Systems to Reuse (Do Not Duplicate)

1. Existing calibration-like logic in `agritech-api/src/modules/ai-reports/ai-reports.service.ts` (`validateAnalysis`, `aggregateParcelData`).
2. Existing alerts lifecycle table and APIs in `production-intelligence`:
   - `agritech-api/src/modules/production-intelligence/*`
   - table `performance_alerts`
3. Existing weather storage and weather APIs:
   - DB tables already exist: `weather_daily_data`, `weather_derived_data`, `weather_forecasts`
   - FastAPI routes already exist in `backend-service/app/api/weather.py` under `/api/weather/*`
4. Existing manual satellite sync flow (the one used by UI):
   - `project/src/lib/satellite-api.ts` (`startTimeSeriesSync`, `getTimeSeriesSyncStatus`)
   - `agritech-api/src/modules/satellite-indices/satellite-proxy.controller.ts` (`POST /indices/timeseries-sync`, status polling)
   - `agritech-api/src/modules/satellite-indices/satellite-cache.service.ts` (`startParcelSync`, `runParcelSyncInBackground`)
5. Existing scheduled cache warmup flow (keep separate from manual trigger):
   - `agritech-api/src/modules/satellite-indices/satellite-sync.service.ts`

## 4) Architecture and Guardrails

### Mandatory Patterns

- NestJS data access: `DatabaseModule` + `DatabaseService.getAdminClient()` (not ad-hoc supabase client creation).
- Organization scoping: require `organizationId` from header/route and enforce membership checks.
- Route style: keep current TanStack dot-notation route files under `project/src/routes/_authenticated/(production)/`.
- Query style: TanStack Query with stable query keys and `staleTime` (5 min default for AI/satellite/weather reads).
- Type safety: no `as any`, no ignore directives.

### Critical Guardrails

- Do not build parallel alert systems; AI alerts persist in extended `performance_alerts` with `is_ai_generated=true`.
- Do not build new weather table stack for P0 (reuse existing weather tables).
- Do not bypass existing auth/guards conventions in NestJS controllers.
- Do not break current parcel detail tabs; add AI tab(s) additively in `project/src/routes/_authenticated/(production)/parcels.$parcelId.tsx`.

## 5) API Contract (Target Endpoints)

### NestJS (new/extended, all under `/api/v1`)

#### Parcels extension
- `POST /parcels/:parcelId/ai/activate`
- `POST /parcels/:parcelId/ai/deactivate`
- `GET /parcels/:parcelId/ai/dashboard`

#### Calibration
- `POST /parcels/:parcelId/calibration/start`
- `GET /parcels/:parcelId/calibration`
- `GET /parcels/:parcelId/calibration/report`
- `POST /parcels/:parcelId/calibration/validate`
- `GET /parcels/:parcelId/calibration/percentiles`
- `GET /parcels/:parcelId/calibration/zones`

#### AI diagnostics
- `GET /parcels/:parcelId/ai/diagnostics`
- `GET /parcels/:parcelId/ai/phenology`
- `GET /parcels/:parcelId/ai/water-balance`
- `GET /parcels/:parcelId/ai/trends`

#### AI alerts
- `GET /parcels/:parcelId/ai/alerts`
- `GET /parcels/:parcelId/ai/alerts/active`
- `PATCH /ai/alerts/:alertId/acknowledge`
- `PATCH /ai/alerts/:alertId/resolve`

#### AI recommendations
- `GET /parcels/:parcelId/ai/recommendations`
- `GET /ai/recommendations/:id`
- `PATCH /ai/recommendations/:id/validate`
- `PATCH /ai/recommendations/:id/reject`
- `PATCH /ai/recommendations/:id/execute`
- `GET /ai/recommendations/:id/evaluation`

#### Annual plan
- `GET /parcels/:parcelId/ai/plan`
- `GET /parcels/:parcelId/ai/plan/calendar`
- `GET /parcels/:parcelId/ai/plan/summary`
- `POST /parcels/:parcelId/ai/plan/validate`
- `GET /parcels/:parcelId/ai/plan/interventions`
- `PATCH /ai/plan/interventions/:id/execute`
- `POST /parcels/:parcelId/ai/plan/regenerate`

#### AI references
- `GET /ai/references/:cropType`
- `GET /ai/references/:cropType/varieties`
- `GET /ai/references/:cropType/bbch`
- `GET /ai/references/:cropType/alerts`
- `GET /ai/references/:cropType/npk-formulas`

### FastAPI (backend-service)

#### Reuse existing
- `GET /api/weather/historical`
- `GET /api/weather/forecast`
- Existing weather-derived endpoints in `backend-service/app/api/weather.py`

#### Add (P0)
- `POST /api/calibration/run`
- `POST /api/calibration/percentiles`
- `POST /api/calibration/detect-anomalies`
- `POST /api/calibration/classify-zones`
- `POST /api/calibration/phenology`

## 6) Data Model Work (Migration Plan)

Create one additive migration file in `project/supabase/migrations/` with:

1. ALTER `parcels` add:
   - `ai_phase text default 'disabled'`
   - `ai_calibration_id uuid`
   - `ai_nutrition_option text default 'A'`
   - `ai_production_target text`
   - `ai_enabled boolean default false`
2. ALTER `satellite_indices_data` add:
   - `baseline_position text`
   - `is_significant_deviation boolean`
   - `trend_direction text`
   - `trend_duration_days integer`
3. ALTER `performance_alerts` add AI fields from spec:
   - `alert_code`, `category`, `priority`, `entry_threshold`, `exit_threshold`, `trigger_data`, `satellite_reading_id`, `is_ai_generated`, `action_delay`
   - Also resolve existing table constraints for AI inserts:
     - `alert_type` currently has a CHECK constraint in `00000000000000_schema.sql`.
     - `severity` currently has a CHECK constraint (`info|warning|critical`).
   - Decision for this implementation: keep `severity` mapped to existing values, and expand `alert_type` CHECK to include P0 AI alert values used by the new diagnostics/alerts modules.
4. ALTER `product_applications` add:
   - `ai_recommendation_id uuid`
   - Foreign key: `REFERENCES ai_recommendations(id) ON DELETE SET NULL`
5. CREATE table `calibrations`
6. CREATE table `ai_recommendations`
7. CREATE table `annual_plans`
8. CREATE table `plan_interventions`
9. CREATE table `crop_ai_references`
10. Add indexes from spec and RLS policies using existing `is_organization_member(organization_id)` pattern where required.
11. Enable realtime on: `calibrations`, `performance_alerts`, `ai_recommendations`, `plan_interventions`.

## 7) Work Breakdown (Waves + Dependencies)

### Wave 0: Foundation Readiness

T0.1: Create DTO/JSON mapping notes for all 4 reference files and document mapping outputs for crop types.  
QA: read-only validation using fixtures from `DATA_*.json`; expected output is one canonical crop mapping per supported crop (`olivier`, `agrumes`, `avocatier`, `palmier_dattier`).

T0.2: Define deterministic acceptance fixtures (parcel + satellite + weather inputs + expected calibration/diagnostic outputs).  
QA: fixtures committed and used by at least one NestJS unit test and one FastAPI pytest; both must pass.

Depends on: none.

### Wave 1: Database + References

T1.1: Add migration (all ALTER/CREATE/index/RLS/realtime) in `project/supabase/migrations/`.  
QA: `pnpm --filter agriprofy db:reset && pnpm --filter agriprofy db:generate-types`; expect reset success and generated types include new tables/columns.

T1.2: Add seed script for `crop_ai_references` using root JSON files at `agritech-api/scripts/seed-ai-references.ts`.  
QA: run `pnpm --filter agritech-api ts-node scripts/seed-ai-references.ts`, then verify 4 rows exist with expected crop_type values and non-null JSON data.

T1.3: Expose read-only `ai-references` module in NestJS (`agritech-api/src/modules/ai-references/`).  
QA: `pnpm --filter agritech-api test`; endpoint smoke checks for `/api/v1/ai/references/:cropType` return 200 for all 4 crop types.

Depends on: T0.1.

### Wave 2: Calibration and Diagnostics Core

T2.1: Add FastAPI `/api/calibration/*` compute routes in `backend-service/app/api/` and place tests in a new `backend-service/tests/` package.  
QA: `pytest backend-service/tests -k calibration -v`; all new calibration tests pass.

T2.2: Add NestJS `calibration` module orchestrating FastAPI and persistence into `calibrations`.  
QA: `pnpm --filter agritech-api test`; calibration start/status/validate endpoints pass unit + integration tests.

T2.3: Add `ai-diagnostics` module implementing scenario matrix A-H + trend/baseline logic.  
QA: deterministic fixture tests verify scenario detection and confidence output.

Depends on: T1.1, T1.2, T1.3.

### Wave 3: Alerts and Recommendations

T3.1: Add `ai-alerts` module (writes/updates extended `performance_alerts` rows).  
QA: tests verify AI alerts insert without violating `alert_type`/`severity` constraints and support acknowledge/resolve lifecycle.

T3.2: Add `ai-recommendations` module (constat/diagnostic/action/conditions/suivi).  
QA: tests verify status lifecycle transitions and recommendation weather condition checks.

T3.3: Link recommendation execution to `product_applications.ai_recommendation_id`.  
QA: execution flow test creates product application row with FK to recommendation and passes FK integrity checks.

Depends on: T2.3.

### Wave 4: Annual Plan + Jobs

T4.1: Add `annual-plan` module and plan generation algorithm.  
QA: tests verify plan + interventions generation for at least one fixture crop and one season.

T4.2: Add jobs:
- Weather fetch/update job
- Pipeline trigger hook after manual parcel sync completion (hooking to manual flow in `satellite-cache.service.ts` after sync status reaches `completed`)
- Plan reminder job
- Forecast update job
- Recommendation weather verification job
QA: trigger manual parcel sync via existing endpoint and assert exactly one idempotent AI pipeline run per parcel/date; cron job tests verify scheduled handlers run without side effects duplication.

Depends on: T3.2.

### Wave 5: Frontend Routes and Components

T5.1: Add AI tab in `project/src/routes/_authenticated/(production)/parcels.$parcelId.tsx`.  
QA: route navigation tests verify tab appears and routes correctly.

T5.2: Add AI route layout and pages (dashboard, calibration, alerts, recommendations, plan, weather).  
QA: each route has loading/error/empty/data coverage in component/route tests.

T5.3: Add API clients following existing flat pattern in `project/src/lib/api/` (for example `ai-calibration.ts`, `ai-alerts.ts`, `ai-recommendations.ts`, `ai-plan.ts`, `ai-references.ts`).  
QA: API client tests validate endpoint paths, request payloads, and response typing.

T5.4: Add hooks/components under `project/src/hooks/` and `project/src/components/ai/`.  
QA: hook tests cover query keys and invalidation behavior; component tests cover key user actions.

Depends on: T3.1, T3.2, T4.1.

### Wave 6: End-to-End Hardening

T6.1: Add integration tests (NestJS + FastAPI contracts).  
QA: end-to-end contract tests pass for calibration -> diagnostics -> alerts -> recommendations -> plan chain.

T6.2: Add frontend route/hook/component tests.  
QA: `pnpm --filter agriprofy test` passes including new AI test suites.

T6.3: Run full verification and fix regressions.  
QA: all commands in Section 10 pass; no regressions in existing parcel/satellite/weather routes.

Depends on: T5.4.

## 8) TDD Strategy (Mandatory)

### Backend TDD

- NestJS unit tests:
  - `agritech-api/src/modules/calibration/*.spec.ts`
  - `agritech-api/src/modules/ai-diagnostics/*.spec.ts`
  - `agritech-api/src/modules/ai-alerts/*.spec.ts`
  - `agritech-api/src/modules/ai-recommendations/*.spec.ts`
  - `agritech-api/src/modules/annual-plan/*.spec.ts`
  - `agritech-api/src/modules/ai-references/*.spec.ts`
- FastAPI tests:
  - `backend-service/tests/test_calibration_run.py`
  - `backend-service/tests/test_calibration_percentiles.py`
  - `backend-service/tests/test_calibration_phenology.py`

### Frontend TDD

- Hook tests for each API client hook.
- Route-level tests for each new `parcels.$parcelId.ai.*.tsx` route.
- Component tests for cards/charts/forms to cover loading/error/empty/data states.

## 9) Acceptance Criteria (Executable)

1. Migration applies cleanly and schema includes all P0 additions.
2. Seed inserts/updates 4 rows in `crop_ai_references`.
3. AI activation endpoint rejects unsupported crops with 400.
4. Calibration run stores baseline data and confidence score.
5. Diagnostic run produces scenario and confidence.
6. Alerts generation writes AI alerts with hysteresis fields populated.
7. Recommendation execution creates traceability via `product_applications.ai_recommendation_id`.
8. Annual plan generation creates `annual_plans` and `plan_interventions` rows.
9. Frontend AI dashboard loads parcel AI status, active alerts, latest recommendation, plan summary.
10. Existing production pages remain functional (no regressions in parcel/satellite/weather routes).

## 10) Verification Commands

Run from repo root unless noted.

### Database
- `pnpm --filter agriprofy db:reset`
- `pnpm --filter agriprofy db:generate-types`

### NestJS
- `pnpm --filter agritech-api test`
- `pnpm --filter agritech-api build`

### FastAPI
- `pytest backend-service/tests -k calibration -v`

### Frontend
- `pnpm --filter agriprofy type-check`
- `pnpm --filter agriprofy test`
- `pnpm --filter agriprofy build`

## 11) Risks and Mitigations

1. Risk: duplicate calibration logic between `ai-reports` and new modules.  
   Mitigation: reuse/shared utility extraction before adding new algorithm paths.
2. Risk: alert semantics divergence with `production-intelligence`.  
   Mitigation: one table (`performance_alerts`) with explicit `is_ai_generated` partition.
3. Risk: crop mapping failures for free-text parcel crop fields.  
   Mitigation: strict mapping function and activation-time validation with clear user errors.
4. Risk: manual sync trigger timing races.  
   Mitigation: idempotent pipeline trigger + locking on parcel + reading date.

## 12) Explicit Non-Goals

- P1 recalibration and yield forecasting UI/modeling.
- Water/foliar analysis table implementation in this milestone.
- New external weather providers.
- Generic plugin framework for AI logic.

## 13) Kickoff Checklist

1. Create migration and run local reset.
2. Seed references and validate query endpoints.
3. Implement calibration vertical slice (FastAPI + NestJS + one frontend route).
4. Expand to diagnostics/alerts/recommendations/plan.
5. Harden with TDD and full verification.
