# Design: Enhance Demo Data

## Approach

All work happens in `agritech-api/src/modules/demo-data/demo-data.service.ts` (10.3K lines). We fix the **ID chain** so every new entity references real parent IDs, then add new `createDemo*` methods for missing entities.

## Critical Principle: Connected Data via Real FK IDs

**Every record must be wired to its parent via a real ID from a previous insert — never hardcoded, never null when a FK exists.**

The current seeder already follows this pattern for some entities (e.g., tasks → parcels, invoices → sales_orders). But several methods return `void` instead of data, breaking the chain for downstream entities. We fix this first.

## Key Decisions

### D1: Fix return types to propagate IDs

These existing methods must change from `void` → returning data:

| Method | Currently returns | Must return | Needed by |
|--------|------------------|-------------|-----------|
| `createDemoDeliveries` | `void` | `deliveries[]` | delivery_tracking |
| `createDemoTaskExtras` | `void` | `{ categories, timeLogs }` | task_templates, task_comments |
| `createDemoPaymentRecords` | `void` | `paymentRecords[]` | payment_bonuses, payment_deductions |
| `createDemoBiologicalAssets` | `void` | `biologicalAssets[]` | biological_asset_valuations |

The `seedDemoData()` orchestrator must capture these return values and pass them to new downstream methods.

### D2: FK wiring map for every new entity

```
crop_cycle_stages
  └── crop_cycle_id  → cropCycles[n].id  (from step 32)

harvest_events
  └── crop_cycle_id  → cropCycles[n].id  (from step 32)

crop_templates
  └── organization_id  → organizationId

task_comments
  ├── task_id    → tasks[n].id           (from step 5)
  ├── user_id    → userId                (from auth)
  └── worker_id  → workers[n].id         (from step 3)

task_dependencies
  ├── task_id            → tasks[n].id   (from step 5)
  └── depends_on_task_id → tasks[m].id   (from step 5, different task)

task_equipment
  └── task_id → tasks[n].id              (from step 5)

task_templates
  └── category_id → taskCategories[n].id (from step 34)

delivery_tracking
  ├── delivery_id  → deliveries[n].id    (from step 21)
  └── recorded_by  → userId              (from auth)

stock_movements
  ├── item_id         → items[n].id          (from step 7)
  ├── warehouse_id    → warehouse.id         (from step 7)
  ├── stock_entry_id  → stockEntries[n].id   (from step 7b, queried)
  └── created_by      → userId

inventory_batches
  ├── item_id             → items[n].id           (from step 7)
  ├── supplier_id         → suppliers[n].id        (from step 8)
  └── purchase_order_id   → purchaseOrders[n].id   (from step 11)

payment_advances
  ├── worker_id    → workers[n].id   (from step 3)
  ├── farm_id      → farm.id         (from step 1)
  ├── approved_by  → userId
  └── paid_by      → userId

payment_bonuses
  └── payment_record_id → paymentRecords[n].id  (from step 35)

payment_deductions
  └── payment_record_id → paymentRecords[n].id  (from step 35)

metayage_settlements
  ├── worker_id  → workers[n].id   (from step 3)
  ├── farm_id    → farm.id         (from step 1)
  ├── parcel_id  → parcels[n].id   (from step 2)
  └── created_by → userId

biological_asset_valuations
  ├── biological_asset_id → biologicalAssets[n].id  (from step 26)
  ├── fiscal_year_id      → fiscalYears[n].id       (queried from step 18)
  └── journal_entry_id    → null (optional, skip)

pest_disease_reports
  ├── farm_id      → farm.id       (from step 1)
  ├── parcel_id    → parcels[n].id (from step 2)
  └── reporter_id  → userId        (user_profiles FK)

calibrations
  ├── parcel_id        → parcels[n].id   (from step 2)
  └── organization_id  → organizationId  (composite FK with parcel)
```

### D3: Insertion order in seedDemoData()

New calls go after their dependencies. Existing step numbers for reference:

```
Step 5   tasks         →  (later) task_comments, task_dependencies, task_equipment
Step 7   items/warehouse →  (later) stock_movements, inventory_batches
Step 8   suppliers      →  (later) inventory_batches.supplier_id
Step 11  purchaseOrders →  (later) inventory_batches.purchase_order_id
Step 21  deliveries     →  NEW: delivery_tracking (in same method or right after)
Step 26  bioAssets      →  NEW: biological_asset_valuations
Step 32  cropCycles     →  NEW: crop_cycle_stages, harvest_events
Step 34  taskExtras     →  NEW: task_templates (needs category IDs from this step)
Step 35  paymentRecords →  NEW: payment_bonuses, payment_deductions
NEW standalone (after step 37):
  - calibrations (needs parcels)
  - pest_disease_reports (needs farm, parcels, userId)
  - metayage_settlements (needs workers, farm, parcels, harvests)
  - payment_advances (needs workers, farm)
  - stock_movements (needs items, warehouse)
  - inventory_batches (needs items, suppliers, purchaseOrders)
  - crop_templates (needs organizationId only)
```

### D4: Stats, clear, and export/import coverage
Add all new tables to `getDataStats()`, `clearDemoData()`, `clearDemoDataOnly()`, and `exportOrganizationData()`/`importOrganizationData()`.

## Risks

| Risk | Mitigation |
|------|-----------|
| FK constraint failures | Every method receives parent IDs; guard with `if (!parent?.id) return` |
| Circular FK (parcels ↔ calibrations) | Insert calibrations after parcels; update parcel.ai_calibration_id separately |
| 10K+ line file | Each method is self-contained; future refactor to seeds/ dir |
| Return type changes break callers | Methods currently return void — changing to return data is backwards-compatible |

## Tradeoffs

- **Modifying existing method signatures** (void → data): Necessary evil to propagate IDs. Low risk — these are private methods only called from seedDemoData().
- **Querying inserted data vs passing it**: For stock_entries (step 7b doesn't return IDs), we query the DB after insert. Prefer passing IDs when possible.
