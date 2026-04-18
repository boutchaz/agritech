# AgromindIA Integration — Learnings

## 2026-03-12 Session Start

### Codebase Patterns
- NestJS modules: `DatabaseModule` import → `DatabaseService.getAdminClient()` (never ad-hoc supabase client)
- Controller pattern: `@Controller('name')`, `@UseGuards(JwtAuthGuard, OrganizationGuard)`, org ID from `req.headers['x-organization-id']`
- Cron pattern: `@Cron('0 8 * * *', { name: 'job-name', timeZone: 'UTC' })` via `ScheduleModule.forRoot()`
- Frontend routes: TanStack dot-notation under `project/src/routes/_authenticated/(production)/`
- API clients: flat files in `project/src/lib/api/*.ts`
- TanStack Query: `staleTime: 5 * 60 * 1000` required, `enabled: !!param` required

### Existing Systems to Reuse (DO NOT DUPLICATE)
- `ai-reports` module: has `validateAnalysis()`, `aggregateParcelData()` — import, don't recreate
- `production-intelligence` module: owns `performance_alerts` CRUD — extend, don't parallel
- Weather tables: `weather_daily_data`, `weather_derived_data`, `weather_forecasts` — already exist
- FastAPI weather: `backend-service/app/api/weather.py` — already has `/api/weather/*`
- Manual satellite sync: `satellite-cache.service.ts` → `startParcelSync()` → `runParcelSyncInBackground()`

### Migration Pattern
- Single monolithic migration file: `project/supabase/migrations/00000000000000_schema.sql` (15K lines)
- New migration: additive file in same directory
- RLS: `is_organization_member(organization_id)` function
- Indexes: `idx_tablename_column` naming

### JSON Reference Files
- Location: `referentials/` — DATA_OLIVIER.json, DATA_AGRUMES.json, DATA_AVOCATIER.json, DATA_PALMIER_DATTIER.json (see referentials/README.md)
- Structure: metadata, varietes[], seuils_satellite, stades_bbch, alertes, plan_annuel, fertilisation
- Key gotcha: rendement_kg_arbre values can be `"declin"` or `"arrachage"` (strings, not numbers) for super-intensif varieties
- Agrumes uses `especes` + nested `varietes.oranges[]` etc (different from olivier flat `varietes[]`)

### Alert Constraints
- `performance_alerts.alert_type` has CHECK constraint — must expand it for AI alert types
- `performance_alerts.severity` CHECK: `info|warning|critical` — map AI severities to these
- AI alerts use `is_ai_generated=true` column to partition from production-intelligence alerts

### Seed Script
- Location: `agritech-api/scripts/seed-ai-references.ts`
- Run: `pnpm --filter agritech-api ts-node scripts/seed-ai-references.ts`
- Upsert 4 rows into `crop_ai_references` table

### app.module.ts
- 92 modules already registered — new modules must be added to imports array
- `ScheduleModule.forRoot()` already imported via satellite-indices module

## [2026-03-12] T0.1: TypeScript Interfaces
- Key structural differences between crops: olivier and avocatier expose flat `varietes[]`, agrumes splits `varietes` by category under `oranges`, `petits_agrumes`, `citrons`, `pomelos`, and palmier dattier adds unique top-level `caracteristiques_generales`, `exigences_climatiques`, `tolerance_salinite`, `pollinisation`, and `nutrition` sections.
- Gotchas found: `rendement_kg_arbre` is not uniform and must accept numeric ranges plus `'declin' | 'arrachage'`; several fields switch between scalar and range forms (`gdd_cumul`, gel thresholds, citrus maturity fields), and plan/calendar sections vary per crop with crop-specific month keys and nested payload shapes.

## [2026-03-12] T0.2: Acceptance Fixtures
- Fixture structure: canonical olive parcel metadata plus deterministic 30-day satellite and weather series with expected calibration output in a single exported fixture object.
- NDVI thresholds used: DATA_OLIVIER.json intensif NDVI optimal [0.4, 0.6], vigilance 0.35, alerte 0.3.
- Test pattern used: Jest describe/it expectations in src/modules with direct fixture import and output-shape assertions.

## [2026-03-12] T0.3: AgromindIA P0 Migration
- `performance_alerts.alert_type` currently allows `yield_underperformance`, `forecast_variance`, `quality_issue`, `cost_overrun`, `revenue_shortfall`, and `benchmark_deviation`; expanding it safely is easiest via a DO block that drops any existing `alert_type` check on `performance_alerts` by inspecting `pg_constraint`, then re-adds a named replacement constraint.
- `product_applications` already exists in the monolithic schema with its own trigger and org-scoped RLS, so the additive migration should only append `ai_recommendation_id` plus a deferred FK instead of redefining the table.
- `crop_ai_references` is a global reference table with no `organization_id`; use authenticated read plus service-role write policies as the practical exception to the usual `is_organization_member(organization_id)` RLS pattern.
- Local `pnpm --filter agriprofy db:reset` and `pnpm --filter agriprofy db:generate-types` both require Docker Desktop in this repo; if Docker is down, `db:generate-types` with shell redirection can truncate `project/src/types/database.types.ts`, so restore it immediately from git before continuing.

## [2026-03-12] T1.2: Seed Script
- JSON metadata.version field location: `metadata.version` in all four crop JSON files in `referentials/` (`DATA_OLIVIER.json`, etc.).
- Supabase env vars used: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- Upsert conflict key: `crop_type`

## [2026-03-12] T1.3: ai-references NestJS Module
- Controller prefix used: `@Controller('ai/references')` with `{ data: ... }` responses for full reference and subsection endpoints.
- Guard used: `@UseGuards(JwtAuthGuard)` only; no organization guard because crop references are global.
- Service pattern: inject `DatabaseService`, call `getAdminClient()`, validate crop type first, query `crop_ai_references`, then extract `reference_data` or subsection keys (`varietes`/`especes`, `stades_bbch`, `alertes`, `fertilisation`).

## [2026-03-12] T2.1: FastAPI Calibration Routes
- Router prefix: /api/calibration
- Dependencies used: numpy, pydantic
- Phenology stages for olivier: Jan-Feb=repos_vegetatif, Mar-Apr=debourrement, May-Jun=floraison, Jul-Aug=nouaison, Sep-Oct=grossissement, Nov-Dec=maturation

## [2026-03-12] T2.2: NestJS Calibration Module
- FastAPI URL env var: SATELLITE_SERVICE_URL
- HTTP client used: fetch
- Calibration flow: load parcel + crop/system + last-90-day satellite/weather inputs + NDVI thresholds, call `/api/calibration/run`, persist completed record in `calibrations`, then update `parcels.ai_calibration_id`; percentiles/zones reuse last-90-day NDVI values against FastAPI `/api/calibration/percentiles` and `/api/calibration/classify-zones`.

## [2026-03-12] T2.3: ai-diagnostics Module
- Scenario matrix: A-H based on NDVI/NDRE/NDMI thresholds
- Trend classification: slope thresholds +/-0.001
- Water balance: precip - et0

## [2026-03-12] T3.1: ai-alerts Module
- Alert types used: ai_drought_stress, ai_frost_risk, ai_heat_stress, ai_pest_risk, ai_nutrient_deficiency, ai_yield_warning, ai_phenology_alert, ai_salinity_alert
- Severity mapping: info|warning|critical
- Partition from production-intelligence: is_ai_generated=true filter

## [2026-03-12] T3.2: ai-recommendations Module
- Status lifecycle: pending -> validated/rejected, validated -> executed
- Evaluation: links to product_applications via ai_recommendation_id FK

## [2026-03-12] T3.3: Recommendation Execution -> product_applications FK
- product_applications NOT NULL columns: organization_id, farm_id, product_id, application_date, quantity_used, area_treated
- FK column: ai_recommendation_id

## [2026-03-12] T4.1: annual-plan Module
- plan_annuel structure in JSON:  maps .. to monthly component payloads; olive entries expose , , , , and  keys with nullable values.
- Intervention types generated: one persisted monthly bundle per month, with  composed from the non-null component keys (fallback ) and / carrying the normalized monthly details.

- Correction: `plan_annuel.calendrier_type_intensif` maps `jan`..`dec` to monthly component payloads; olive entries expose `NPK`, `micro`, `biostim`, `phyto`, and `irrigation` keys with nullable values.
- Correction: one persisted monthly bundle is created per month, with `intervention_type` composed from the non-null component keys (fallback `monthly_monitoring`) and `description`/`notes` carrying the normalized monthly details.

## [2026-03-12] T4.2: ai-jobs Module
- Cron schedules: daily weather fetch 06:00 UTC, weekly forecast update 07:00 UTC Monday, daily AI pipeline trigger 08:00 UTC, monthly plan reminder 09:00 UTC on day 1, daily recommendation verification 10:00 UTC.
- Per-parcel error isolation: try/catch per parcel so one failing parcel does not stop the rest of the batch.
- ScheduleModule: already registered via satellite-indices module.

## [2026-03-12] T5.1-T5.4: Frontend AI Integration
- Tab added at: `project/src/routes/_authenticated/(production)/parcels.$parcelId.tsx`
- API base URL pattern: `/api/v1/parcels/:parcelId/ai/*` (and `/api/v1/ai/references/*`)
- Route structure: `/_authenticated/(production)/parcels/$parcelId/ai/*`
- Components created: `AIStatusBadge`, `CalibrationCard`, `AlertCard`, `RecommendationCard`, `PlanInterventionCard`
- Hooks created: `useAICalibration`, `useAIDiagnostics`, `useAIAlerts`, `useAIRecommendations`, `useAIPlan`
- API clients created: `ai-calibration.ts`, `ai-alerts.ts`, `ai-recommendations.ts`, `ai-plan.ts`, `ai-references.ts`

## [2026-03-12] T6.1: Integration Tests
- NestJS integration pattern: mock DatabaseService chain
- FastAPI integration: TestClient sequential calls
- Successfully tested React components using Vitest and @testing-library/react.
- Mocked lucide-react icons to avoid SVG rendering issues in tests.
- Mocked @tanstack/react-query hooks (useQuery, useMutation, useQueryClient) and custom hooks (useAuth) to test custom hooks in isolation.
- Used expect(element).toBeDefined() instead of toBeInTheDocument() as @testing-library/jest-dom is not configured by default.
