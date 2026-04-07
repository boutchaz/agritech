# Tasks: Enhance Demo Data

All tasks modify `agritech-api/src/modules/demo-data/demo-data.service.ts` unless noted.

**Critical rule**: Every inserted record uses real IDs from previously created entities — never hardcoded UUIDs, never `null` when a FK exists.

---

### 1. Fix return types: deliveries, taskExtras, paymentRecords, biologicalAssets

- [x] **RED** — Write `agritech-api/test/demo-data/id-chain.e2e-spec.ts`: seed demo data, then verify: (a) `deliveries` table has rows for the org (existing), (b) `task_categories` has rows (existing), (c) `payment_records` has rows (existing), (d) `biological_assets` has rows (existing). Verify return values are captured in seedDemoData by checking that dependent calls receive non-empty arrays (e.g., delivery_items already exist → confirms deliveries were accessible). Run → test passes (baseline).
- [x] **ACTION** — Change signatures: `createDemoDeliveries` returns `Promise<any[]>` (return `createdDeliveries`), `createDemoTaskExtras` returns `Promise<{ categories: any[] }>` (return inserted categories), `createDemoPaymentRecords` returns `Promise<any[]>` (return inserted records with `.select()`), `createDemoBiologicalAssets` returns `Promise<any[]>` (return `createdAssets`). Update `seedDemoData()` to capture: `const deliveries = await this.createDemoDeliveries(...)`, `const { categories: taskCategories } = await this.createDemoTaskExtras(...)`, `const paymentRecords = await this.createDemoPaymentRecords(...)`, `const biologicalAssets = await this.createDemoBiologicalAssets(...)`.
- [x] **GREEN** — Run test → still passes (no behavior change, just signatures). Verify no TypeScript errors: `cd agritech-api && npx tsc --noEmit`.

---

### 2. Add crop cycle stages and harvest events (FK: crop_cycle_id)

- [x] **RED** — Write `agritech-api/test/demo-data/crop-cycle-depth.e2e-spec.ts`: seed demo data, then query `crop_cycle_stages` joined with `crop_cycles` on `crop_cycle_id` — expect ≥3 rows with all joins resolving (no orphan FKs). Query `harvest_events` joined with `crop_cycles` — expect ≥2 rows. Run → fails (0 rows).
- [x] **ACTION** — Add `createDemoCropCycleStages(cropCycles)` that receives `cropCycles[]` from step 32. For each crop cycle, insert 3-5 stages using `cropCycle.id` as `crop_cycle_id`. Stages: Dormance (completed), Floraison (completed), Nouaison (in_progress), Récolte (pending). Dates derived from crop cycle's `start_date`/`end_date`. Add `createDemoHarvestEvents(cropCycles)` that inserts 2 events per completed cycle using `cropCycle.id`. Wire both after step 32 in `seedDemoData()`, passing `cropCycles`.
- [x] **GREEN** — Run test → all joins resolve, ≥3 stages, ≥2 events.

---

### 3. Add crop templates (FK: organization_id)

- [x] **RED** — Extend crop-cycle-depth test: query `crop_templates` for org — expect ≥2 with non-null `stages` JSONB. Run → fails.
- [x] **ACTION** — Add `createDemoCropTemplates(organizationId)`. Insert: Olives template (perennial, 12 months, stages JSONB with 5 named stages), Agrumes template (perennial, 10 months, 4 stages), Tomates template (annual, 5 months, 4 stages). Each sets `organization_id`, `typical_planting_months`, `typical_harvest_months`. Wire after crop cycle stages.
- [x] **GREEN** — Run test → ≥2 templates with stages JSONB populated.

---

### 4. Add task comments (FK: task_id, user_id, worker_id)

- [x] **RED** — Write `agritech-api/test/demo-data/task-depth.e2e-spec.ts`: seed demo data, query `task_comments` joined with `tasks` on `task_id` — expect ≥4 rows where join succeeds. At least 1 row has non-null `worker_id` that resolves to `workers`. Run → fails (0 rows).
- [x] **ACTION** — Add `createDemoTaskComments(tasks, workers, userId)`. For each in-progress/completed task (find by `status`), insert 1-2 comments using `task.id`, `userId`, and optionally `worker.id`. Comment types: 'status_update' for in-progress tasks, 'completion_note' for completed, 'issue' for one task. Wire after step 34 in `seedDemoData()`, passing `tasks`, `workers`, `userId`.
- [x] **GREEN** — Run test → ≥4 comments, all FKs resolve.

---

### 5. Add task dependencies (FK: task_id, depends_on_task_id) and equipment (FK: task_id)

- [x] **RED** — Extend task-depth test: query `task_dependencies` joined with `tasks` on both FKs — expect ≥2 with both joins resolving. Query `task_equipment` joined with `tasks` — expect ≥3. Run → fails.
- [x] **ACTION** — Add `createDemoTaskDependencies(tasks)`. Find specific tasks by `task_type`: fertilization `depends_on` irrigation (finish_to_start), harvesting `depends_on` fertilization (finish_to_start, lag 7 days). Uses `task.id` for both columns. Add `createDemoTaskEquipment(tasks)`. For irrigation task → "Pompe irrigation" + "Tuyau goutte-à-goutte", for pruning → "Sécateur électrique", for harvesting → "Caisses récolte" + "Tracteur remorque". All use `task.id`. Wire after step 34.
- [x] **GREEN** — Run test → ≥2 deps with both FK joins, ≥3 equipment entries.

---

### 6. Add task templates (FK: category_id from task_categories)

- [x] **RED** — Extend task-depth test: query `task_templates` joined with `task_categories` on `category_id` — expect ≥3 with join resolving. Run → fails.
- [x] **ACTION** — Add `createDemoTaskTemplates(taskCategories)` that receives `categories[]` from step 34's return value. Insert: "Irrigation standard" → category "Irrigation", "Fertilisation NPK" → category "Traitement", "Récolte manuelle" → category "Récolte". Each uses `category.id` for `category_id`. Wire in `seedDemoData()` after capturing `taskCategories`.
- [x] **GREEN** — Run test → ≥3 templates, all category FK joins resolve.

---

### 7. Add delivery tracking (FK: delivery_id, recorded_by)

- [x] **RED** — Write `agritech-api/test/demo-data/delivery-tracking.e2e-spec.ts`: seed demo data, query `delivery_tracking` joined with `deliveries` on `delivery_id` — expect ≥4 rows. For the 'delivered' delivery, expect ≥3 tracking entries with chronological timestamps. Run → fails (0 rows).
- [x] **ACTION** — Add `createDemoDeliveryTracking(deliveries, userId)` receiving `deliveries[]` from the now-returning step 21. For delivered delivery (`status === 'delivered'`): insert 3 entries (dispatched at departure_time, in_transit +2h, delivered at arrival_time) using `delivery.id` and `userId` as `recorded_by`. For in_transit delivery: insert 2 entries (dispatched, in_transit). Each has `location_name` (Berkane, Route Nationale, destination). Wire after step 21.
- [x] **GREEN** — Run test → ≥4 tracking entries, all FK joins resolve, chronological order.

---

### 8. Add stock movements (FK: item_id, warehouse_id, stock_entry_id) and inventory batches (FK: item_id, supplier_id, purchase_order_id)

- [x] **RED** — Write `agritech-api/test/demo-data/stock-inventory.e2e-spec.ts`: seed demo data, query `stock_movements` joined with `items` and `warehouses` — expect ≥5 with joins resolving. Query `inventory_batches` joined with `items`, at least 1 joined with `suppliers`, at least 1 with `purchase_orders` — expect ≥3. Run → fails.
- [x] **ACTION** — Add `createDemoStockMovements(orgId, warehouse, finishedGoodsWarehouse, items, userId)`. Query `stock_entries` for org to get IDs. Insert IN movements (fertilizer received from PO, linked to stock_entry), OUT movements (fertilizer issued to task), TRANSFER (between warehouses). Each uses real `item.id`, `warehouse.id`, `stockEntry.id`. Dates span 4 weeks. Add `createDemoInventoryBatches(orgId, items, suppliers, purchaseOrders)`. Insert 3 batches: fertilizer batch → `supplier[0].id` + `purchaseOrder[0].id`, seed batch → `supplier[1].id` + `purchaseOrder[1].id`, harvest batch (no supplier). Wire after step 7b, passing items, warehouse, suppliers, purchaseOrders.
- [x] **GREEN** — Run test → ≥5 movements with FK joins, ≥3 batches with FK joins.

---

### 9. Add payment advances (FK: worker_id, farm_id) + bonuses/deductions (FK: payment_record_id) + metayage (FK: worker_id, farm_id, parcel_id)

- [x] **RED** — Write `agritech-api/test/demo-data/worker-pay-depth.e2e-spec.ts`: seed demo data, query `payment_advances` joined with `workers` and `farms` — expect ≥2. Query `payment_bonuses` joined with `payment_records` — expect ≥2. Query `payment_deductions` joined with `payment_records` — expect ≥2. Query `metayage_settlements` joined with `workers`, `farms`, `parcels` — expect ≥1. Run → fails.
- [x] **ACTION** — Add: `createDemoPaymentAdvances(orgId, farmId, workers, userId)` — 2 advances for daily workers, using `worker.id`, `farm.id`, `userId` as approved_by/paid_by. `createDemoPaymentBonusesAndDeductions(paymentRecords)` — receives `paymentRecords[]` from now-returning step 35. For paid record: bonus(performance, 200), bonus(quality, 300), deduction(cnss, 500), deduction(advance_repayment, 500). Each uses `paymentRecord.id`. `createDemoMetayage(orgId, farmId, workers, parcels, harvests, userId)` — 1 settlement: olive parcel worker gets 30% share, using `worker[2].id`, `farm.id`, `parcel[0].id`, `harvest.id` context. Wire: advances after step 35, bonuses/deductions after step 35 (using paymentRecords), metayage after step 35.
- [x] **GREEN** — Run test → all counts met, all FK joins resolve.

---

### 10. Add biological asset valuations (FK: biological_asset_id, fiscal_year_id)

- [x] **RED** — Write `agritech-api/test/demo-data/bio-valuations.e2e-spec.ts`: seed demo data, query `biological_asset_valuations` joined with `biological_assets` — expect ≥3 with `valuation_date` spanning ≥2 different months. At least 1 has `fiscal_year_id` → resolved join with `fiscal_years`. Run → fails.
- [x] **ACTION** — Add `createDemoBioAssetValuations(orgId, biologicalAssets)` receiving `biologicalAssets[]` from now-returning step 26. Query `fiscal_years` for org to get IDs. For each asset, insert 2 valuations (Q3 and Q4) using `asset.id` and `fiscalYear.id`. Show fair value appreciation: olives 125000→132000, citrus 95000→102000. `fair_value_change = current - previous`. Wire after step 26.
- [x] **GREEN** — Run test → ≥3 valuations, all FK joins, dates span multiple months.

---

### 11. Add pest/disease reports (FK: farm_id, parcel_id, reporter_id)

- [x] **RED** — Write `agritech-api/test/demo-data/pest-reports.e2e-spec.ts`: seed demo data, query `pest_disease_reports` joined with `farms`, `parcels`, `user_profiles` — expect ≥2 with all joins resolving. Run → fails.
- [x] **ACTION** — Add `createDemoPestReports(orgId, farmId, parcels, userId)`. Insert: (1) Mouche de l'olive on `parcels[0].id`, severity 'medium', status 'treated', treatment_applied "Piège à phéromones", reporter_id = userId. (2) Pucerons on `parcels[1].id`, severity 'low', status 'monitoring'. Both use `farm.id`, `parcel.id`, and `userId` as reporter_id (references user_profiles). Wire after step 37.
- [x] **GREEN** — Run test → ≥2 reports, all FK joins resolve.

---

### 12. Add calibrations (composite FK: parcel_id + organization_id)

- [x] **RED** — Write `agritech-api/test/demo-data/calibrations.e2e-spec.ts`: seed demo data, query `calibrations` joined with `parcels` via `parcel_id` — expect ≥2 with join resolving. At least 1 with status 'validated' and non-null `baseline_data`. Run → fails.
- [x] **ACTION** — Add `createDemoCalibrations(orgId, parcels, userId)`. Insert: (1) Olives parcel: type 'initial', status 'validated', mode_calibrage 'calibrage_complet', phase_age 'pleine_production', confidence_score 82, health_score 75, populated baseline_data/scores_detail/diagnostic_data JSONB. (2) Citrus parcel: type 'initial', mode_calibrage 'calibrage_progressif', status 'validated', phase_age 'entree_production'. Both use `parcel.id` and `organizationId` (composite FK). Optionally update `parcels.ai_phase = 'active'` for these parcels. Wire after step 37.
- [x] **GREEN** — Run test → ≥2 calibrations, composite FK resolves, JSONB populated.

---

### 13. Update stats, clear, export/import for all new tables

- [x] **RED** — Write `agritech-api/test/demo-data/coverage.e2e-spec.ts`: seed demo data, call `getDataStats()`. Assert these tables have count > 0: `crop_cycle_stages`, `harvest_events`, `crop_templates`, `task_comments`, `task_dependencies`, `task_equipment`, `task_templates`, `delivery_tracking`, `stock_movements`, `inventory_batches`, `payment_advances`, `payment_bonuses`, `payment_deductions`, `metayage_settlements`, `biological_asset_valuations`, `pest_disease_reports`, `calibrations`. Call `clearDemoData()`, re-check stats — all should be 0. Run → fails (tables missing from stats/clear).
- [x] **ACTION** — Add all 17 table names to: (a) `getDataStats()` tables array, (b) `clearDemoData()` delete sequence in correct FK order (children before parents), (c) `clearDemoDataOnly()` same, (d) `exportOrganizationData()` table list, (e) `importOrganizationData()` table list. Ensure delete order handles: `crop_cycle_stages` before `crop_cycles`, `delivery_tracking` before `deliveries`, `payment_bonuses`/`payment_deductions` before `payment_records`, `biological_asset_valuations` before `biological_assets`.
- [x] **GREEN** — Run test → all 17 tables appear in stats > 0, all drop to 0 after clear.

---

### 14. Frontend: update STAT_ICONS and translations for new entity types

- [x] **RED** — Check: `project/src/routes/_authenticated/(settings)/settings.danger-zone.tsx` STAT_ICONS does not contain keys for `crop_cycle_stages`, `harvest_events`, `crop_templates`, `task_comments`, `task_dependencies`, `task_equipment`, `task_templates`, `delivery_tracking`, `stock_movements`, `inventory_batches`, `payment_advances`, `payment_bonuses`, `payment_deductions`, `metayage_settlements`, `biological_asset_valuations`, `pest_disease_reports`, `calibrations`. Assertion: these keys are absent from the STAT_ICONS record.
- [x] **ACTION** — Add missing keys to STAT_ICONS map: `crop_cycle_stages: Sprout`, `harvest_events: CalendarCheck`, `crop_templates: FileTemplate`, `task_comments: MessageSquare`, `task_dependencies: GitBranch`, `task_equipment: Wrench`, `task_templates: ClipboardList`, `delivery_tracking: Truck`, `stock_movements: ArrowLeftRight`, `inventory_batches: Layers`, `payment_advances: Banknote`, `payment_bonuses: Gift`, `payment_deductions: MinusCircle`, `metayage_settlements: Handshake`, `biological_asset_valuations: TrendingUp`, `pest_disease_reports: Bug`, `calibrations: Target`. Add `dangerZone.stats.<key>` translation keys to `en/common.json`, `fr/common.json`, `ar/common.json`.
- [x] **GREEN** — Verify STAT_ICONS contains all 8 new keys (org_id tables only). Run `cd project && npx tsc --noEmit` → no type errors.
