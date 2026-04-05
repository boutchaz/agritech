# Spec: Schema Rewrite

## Capability: Rewrite AI-related DB tables to V2 data model

### S1. Parcel ai_phase uses V2 lifecycle states
- **GIVEN** the schema migration file
- **WHEN** the `parcels` table `ai_phase` column is defined
- **THEN** CHECK constraint allows exactly: `'awaiting_data', 'ready_calibration', 'calibrating', 'calibrated', 'awaiting_nutrition_option', 'active', 'archived'`

### S2. Calibrations table has V2 columns
- **GIVEN** the schema migration file
- **WHEN** the `calibrations` table is created
- **THEN** it includes columns: `type` (initial/F2_partial/F3_complete), `mode_calibrage` (V2 engine modes), `phase_age` (4 phases), `p50_ndvi`, `p50_nirv`, `p50_ndmi`, `p50_ndre`, `p10_ndvi`, `p10_ndmi`, `coefficient_etat_parcelle`, `diagnostic_data JSONB`, `baseline_data JSONB`, `anomalies_data JSONB`, `scores_detail JSONB`, `rapport_fr TEXT`, `rapport_ar TEXT`, `validated_by_user BOOLEAN`, `validated_at TIMESTAMPTZ`

### S3. ai_diagnostic_sessions table exists
- **GIVEN** the schema migration file
- **WHEN** parsed for CREATE TABLE statements
- **THEN** `ai_diagnostic_sessions` table exists with: `id UUID PK`, `parcel_id FK`, `organization_id`, `calibration_id FK`, `chemin` (A_plan_standard/B_recommendations/C_observation), `engine_output JSONB`, `date_analyse DATE`, `status`, `created_at`
- **AND** RLS is enabled with `is_organization_member()` policy

### S4. ai_recommendations table has V2 structure
- **GIVEN** the schema migration file
- **WHEN** the `ai_recommendations` table is defined
- **THEN** it includes: `session_id FK` to ai_diagnostic_sessions, `alert_code VARCHAR`, `priority` (urgent/priority/vigilance/info), `status` (proposed/validated/waiting/executed/evaluated/closed/rejected/expired), `type`, `theme`, `bloc_1_constat JSONB`, `bloc_2_diagnostic JSONB`, `bloc_3_action JSONB`, `bloc_4_fenetre JSONB`, `bloc_5_conditions JSONB`, `bloc_6_suivi JSONB`, `expires_at TIMESTAMPTZ`, `evaluated_at TIMESTAMPTZ`, `evaluation_result` (effective/partially_effective/not_effective)

### S5. recommendation_events journal table exists
- **GIVEN** the schema migration file
- **WHEN** parsed for CREATE TABLE statements
- **THEN** `recommendation_events` table exists with: `id UUID PK`, `recommendation_id FK`, `parcel_id`, `organization_id`, `from_status`, `to_status`, `decider` (ia/user), `motif TEXT`, `created_at TIMESTAMPTZ`
- **AND** has index on `recommendation_id`
- **AND** RLS is enabled

### S6. annual_plans and plan_interventions have V2 columns
- **GIVEN** the schema migration file
- **WHEN** the `annual_plans` table is defined
- **THEN** it includes: `calibration_id FK`, `season VARCHAR`, `nutrition_option` (A/B/C), `yield_target_t_ha`, `dose_n_kg_ha`, `dose_p_kg_ha`, `dose_k_kg_ha`, `dose_mg_kg_ha`, `monthly_calendar JSONB`, `budget_estimate_dh`, `validated_by_user BOOLEAN`

### S7. TypeScript types regenerated
- **GIVEN** schema changes applied via `db:reset`
- **WHEN** `db:generate-types` is run
- **THEN** `project/src/types/database.types.ts` reflects all new tables and columns without errors
