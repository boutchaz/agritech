# Equipment Asset Registry — Spec

## Capability: Create equipment asset

### GIVEN a farm manager with accounting configured
### WHEN they create an equipment asset with name "Massey Ferguson 8S.265", category "tractor", brand "Massey Ferguson", purchase_price 1500000
### THEN the asset appears in the equipment list with status "available" and is visible only within their organization

## Capability: List equipment with filters

### GIVEN an organization with 5 equipment assets (3 tractors, 1 sprayer, 1 pump)
### WHEN the user filters by category "tractor"
### THEN only the 3 tractors are displayed

## Capability: Soft delete equipment

### GIVEN an equipment asset with no linked maintenance records
### WHEN the user deletes it
### THEN the asset is marked is_active=false and no longer appears in the list

---

# Maintenance Tracking — Spec

## Capability: Log maintenance event with cost

### GIVEN a tractor "Massey Ferguson 8S.265" and accounting is configured (equipment_maintenance mapping exists)
### WHEN the user logs an oil change with cost 2500 MAD
### THEN a maintenance record is created AND a journal entry is posted (Dr. maintenance expense 2500, Cr. cash 2500) AND the maintenance record has journal_entry_id set

## Capability: Log maintenance event without cost

### GIVEN a tractor "Massey Ferguson 8S.265"
### WHEN the user logs a visual inspection with cost 0
### THEN a maintenance record is created with no journal entry

## Capability: Delete maintenance event reverses journal entry

### GIVEN a posted maintenance event with journal_entry_id set
### WHEN the user deletes the maintenance event
### THEN the journal entry is reversed (via AccountingAutomationService.createReversalEntry) AND the maintenance record is soft-deleted

## Capability: View maintenance history for equipment

### GIVEN a tractor with 3 maintenance events (oil change, tire replacement, inspection)
### WHEN the user opens the equipment maintenance view
### THEN all 3 events are listed chronologically with type, date, cost, and vendor

## Capability: Next service reminder fields

### GIVEN an oil change logged with next_service_date=2026-06-01 and next_service_hours=500
### WHEN the user views the equipment detail
### THEN the next service info is displayed alongside the current hour meter reading

---

# Accounting Integration — Spec

## Capability: Maintenance cost hits GL via account mappings

### GIVEN an organization with account mapping cost_type=equipment_maintenance → expense account 61xxx
### WHEN a maintenance event with cost > 0 is created
### THEN a balanced, posted journal entry exists with reference_type='equipment_maintenance' and cost_center_id if specified

## Capability: Missing mapping prevents creation

### GIVEN an organization WITHOUT equipment_maintenance account mapping
### WHEN a maintenance event with cost > 0 is created
### THEN the operation fails with a clear error message asking to configure the mapping

## Capability: Maintenance costs roll into profitability

### GIVEN a tractor with 3 maintenance events (costs: 2500, 8000, 500) all linked to cost_center_id for Farm A
### WHEN profitability is calculated for Farm A
### THEN the 3 maintenance costs appear as equipment_maintenance expenses in the profitability report

---

# Multi-Tenancy — Spec

## Capability: Data isolation between organizations

### GIVEN two organizations each with their own equipment
### WHEN Org A lists equipment
### THEN only Org A's equipment is returned (RLS enforced)
