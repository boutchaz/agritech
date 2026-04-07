# Spec: Worker Payment Depth

## Capability
After seeding, workers have payment advances, bonuses, deductions, and metayage — all connected via real FK IDs.

### Scenario: Payment advances reference real workers and farm
- **GIVEN** demo data has been seeded
- **WHEN** querying `payment_advances` joined with `workers` and `farms`
- **THEN** at least 2 advances exist. Each has valid `worker_id` → existing worker, `farm_id` → existing farm. `approved_by` and `paid_by` → existing user (for approved/paid ones). Status uses valid enum values.

### Scenario: Payment bonuses reference real payment records
- **GIVEN** demo data has been seeded
- **WHEN** querying `payment_bonuses` joined with `payment_records`
- **THEN** at least 2 bonuses exist. Each has valid `payment_record_id` → existing payment record from step 35. `bonus_type` uses valid enum (performance, attendance, quality, productivity, other).

### Scenario: Payment deductions reference real payment records
- **GIVEN** demo data has been seeded
- **WHEN** querying `payment_deductions` joined with `payment_records`
- **THEN** at least 2 deductions exist. Each has valid `payment_record_id` → existing payment record. `deduction_type` uses valid enum (cnss, tax, advance_repayment, equipment_damage, other).

### Scenario: Metayage settlements reference real workers, farm, parcels
- **GIVEN** demo data has been seeded
- **WHEN** querying `metayage_settlements` joined with `workers`, `farms`, `parcels`
- **THEN** at least 1 settlement exists. Has valid `worker_id`, `farm_id`, `parcel_id`, `organization_id`, and `created_by` — all pointing to existing records. `calculation_basis` is a valid enum. Financial amounts are self-consistent (net_revenue = gross_revenue - total_charges, worker_share_amount = net_revenue × worker_percentage/100).
