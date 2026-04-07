# Spec: Additional Entity Coverage

## Capability
After seeding, biological asset valuations, pest reports, calibrations are connected via real FKs.

### Scenario: Biological asset valuations reference real assets and fiscal years
- **GIVEN** demo data has been seeded
- **WHEN** querying `biological_asset_valuations` joined with `biological_assets` and `fiscal_years`
- **THEN** at least 3 valuations exist. Each has valid `biological_asset_id` → existing asset, `organization_id` → org. At least 1 has `fiscal_year_id` → existing fiscal year. `valuation_date` spans multiple quarters showing fair value change over time. `fair_value_change` = `current_fair_value` - `previous_fair_value`.

### Scenario: Pest/disease reports reference real farm, parcels, and user
- **GIVEN** demo data has been seeded
- **WHEN** querying `pest_disease_reports` joined with `farms`, `parcels`, `user_profiles`
- **THEN** at least 2 reports exist. Each has valid `farm_id` → existing farm, `parcel_id` → existing parcel, `reporter_id` → existing user_profile. `severity` uses valid values. `status` uses valid enum.

### Scenario: Calibrations reference real parcels via composite FK
- **GIVEN** demo data has been seeded
- **WHEN** querying `calibrations` joined with `parcels`
- **THEN** at least 2 calibrations exist. Each has valid `parcel_id` + `organization_id` matching an existing parcel. `type` uses valid enum (initial, F2_partial, F3_complete). `mode_calibrage` uses V2 values. `status` is 'validated' for at least 1. Structured JSONB fields (baseline_data, scores_detail) are populated.

### Scenario: Stats, clear, and export include all new tables
- **GIVEN** new entities are seeded
- **WHEN** calling `getDataStats()`
- **THEN** new tables appear in stats with count > 0
- **WHEN** calling `clearDemoData()`
- **THEN** all new table counts drop to 0
- **WHEN** calling `exportOrganizationData()`
- **THEN** exported JSON includes keys for all new tables
