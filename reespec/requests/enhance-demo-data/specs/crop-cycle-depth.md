# Spec: Crop Cycle Depth

## Capability
After seeding, crop cycles have stages and harvest events connected via real FKs, and crop templates exist for planning.

### Scenario: Crop cycle stages are connected to crop cycles
- **GIVEN** demo data has been seeded
- **WHEN** querying `crop_cycle_stages` joined with `crop_cycles`
- **THEN** at least 3 stages exist, each with a valid `crop_cycle_id` pointing to an existing crop cycle, `stage_order` is unique per cycle, and stages have realistic dates within the crop cycle's date range

### Scenario: Harvest events reference crop cycles
- **GIVEN** demo data has been seeded
- **WHEN** querying `harvest_events` joined with `crop_cycles`
- **THEN** at least 2 harvest events exist, each with a valid `crop_cycle_id`, and `harvest_date` falls within the cycle's date range

### Scenario: Crop templates exist with stage definitions
- **GIVEN** demo data has been seeded
- **WHEN** querying `crop_templates` for the organization
- **THEN** at least 2 templates exist (Olives, Agrumes) with `stages` JSONB containing ordered stage definitions, `typical_planting_months` and `typical_harvest_months` arrays populated
