# Spec: Delivery Tracking

## Capability
After seeding, deliveries have tracking history entries connected via real FK IDs.

### Scenario: Delivery tracking entries reference real deliveries and users
- **GIVEN** demo data has been seeded
- **WHEN** querying `delivery_tracking` joined with `deliveries`
- **THEN** at least 4 tracking entries exist, each with a valid `delivery_id` → existing delivery. `recorded_by` → existing user. Status values match delivery lifecycle (dispatched → in_transit → delivered). Timestamps are chronologically ordered per delivery.

### Scenario: Delivered delivery has complete tracking trail
- **GIVEN** demo data has been seeded
- **WHEN** querying `delivery_tracking` for the delivery with status 'delivered'
- **THEN** at least 3 tracking entries exist showing progression: dispatched → in_transit → delivered, with `location_name` populated for each step
