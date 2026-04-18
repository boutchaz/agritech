# Stock Management Completeness Plan

> Audit Date: 2026-04-13 | Priority: Production readiness for stock/inventory module
> Scope: All missing features, edge cases, and UX gaps identified in expert audit

## Dependency Graph

```
Phase 0 (Data Integrity) ──────┐
  └─ Soft delete on items        │
                                 ▼
Phase 1 (Core Missing)  ───────┐
  ├─ Server-side pagination     │
  ├─ Stock movement history UI  │
  └─ Stock reservation          │
                                 ▼
Phase 2 (Barcode + Batch) ─────┐
  ├─ Barcode/QR scanning UI     │
  ├─ Batch tracking UI          │
  └─ Expiry management          │
                                 ▼
Phase 3 (Approval + Offline) ──┐
  ├─ Approval workflow          │
  ├─ Offline queue              │
  └─ Stock take workflow        │
                                 ▼
Phase 4 (Advanced + Polish) ────┘
  ├─ Stock dashboard
  ├─ Reorder suggestions
  ├─ Idempotency on posting
  ├─ Materialized stock levels
  └─ Remove inventory_items orphan
```

---

## Phase 0 — Data Integrity (2-3 days)

### 0.1 Soft delete on items and variants
**Priority**: Critical  
**Why**: Hard delete on items cascades to `stock_movements` (ON DELETE CASCADE), destroying audit trail. A deleted item erases historical stock data.  
**Files**:
- `project/supabase/migrations/00000000000000_schema.sql` — Add `deleted_at TIMESTAMPTZ` column to `items`, `item_groups`, `warehouses`
- `agritech-api/src/modules/items/items.service.ts` — Change `deleteItem()` to soft delete (set `deleted_at`), add `WHERE deleted_at IS NULL` to all queries
- `agritech-api/src/modules/warehouses/warehouses.service.ts` — Same pattern
- `project/src/components/Stock/ItemManagement.tsx` — Delete button should soft-delete, add "show inactive" toggle
- `project/src/hooks/useItems.ts` — Default filter `is_active: true` should also exclude `deleted_at IS NOT NULL`

**Acceptance Criteria**:
- [ ] Deleting an item sets `deleted_at` instead of removing the row
- [ ] Stock movements for deleted items remain intact
- [ ] Deleted items hidden from list by default, visible with "show deleted" toggle
- [ ] Deleted items cannot be used in new stock entries (validation in service)

### 0.2 Sync `product_variants.quantity` with stock_movements ledger
**Priority**: High  
**Why**: `product_variants.quantity` is a denormalized cache that can drift from the actual `stock_movements` ledger. Two sources of truth = data corruption.  
**Files**:
- `project/supabase/migrations/00000000000000_schema.sql` — Add trigger `sync_variant_quantity()` that recalculates `product_variants.quantity` from `SUM(stock_movements.quantity)` after every INSERT on `stock_movements`
- Add a one-time migration script to recalculate all existing variant quantities

**Acceptance Criteria**:
- [ ] Trigger auto-updates `product_variants.quantity` on every stock movement
- [ ] One-time backfill script corrects any existing drift
- [ ] Unit test: insert stock movement → verify variant quantity matches

---

## Phase 1 — Core Missing Features (5-7 days)

### 1.1 Server-side pagination on items list
**Priority**: Critical  
**Why**: `useItems()` fetches ALL items then filters client-side. Breaks at 500+ items. `usePaginatedItems` hook exists but unused.  
**Files**:
- `project/src/hooks/useItems.ts` — Switch `ItemManagement.tsx` from `useItems()` to `usePaginatedItems()`
- `project/src/components/Stock/ItemManagement.tsx` — Replace client-side filter logic with server-side query params (search, farm_id, low_stock_only passed to API)
- `project/src/lib/api/items.ts` — Ensure `itemsApi.getAll()` supports pagination params (page, pageSize, filters)
- `agritech-api/src/modules/items/items.controller.ts` — Add `@Query('page')`, `@Query('page_size')` params, return paginated response
- `agritech-api/src/modules/items/items.service.ts` — Implement `LIMIT/OFFSET` with count

**Acceptance Criteria**:
- [ ] Items page loads with server-side pagination (default 25 items/page)
- [ ] Search, farm filter, low stock toggle all use server-side filtering
- [ ] Page loads in <500ms with 1000+ items in DB
- [ ] Pagination controls work correctly

### 1.2 Stock movement history UI (per-item timeline)
**Priority**: High  
**Why**: `stock_movements` table has rich data but NO frontend to view it. Users cannot answer "what happened to this item?"  
**Files**:
- `project/src/components/Stock/ItemStockTimeline.tsx` — New component: timeline view showing every IN/OUT/TRANSFER for an item, grouped by date
- `project/src/components/Stock/ItemManagement.tsx` — Add "History" action button on each item row, opens timeline dialog
- `project/src/hooks/useStockMovements.ts` — New hook wrapping `GET /api/v1/stock-entries/movements/list?item_id=X`
- `project/src/lib/api/stock-entries.ts` — Add `getMovementsByItem(itemId, filters)` method
- Backend endpoint already exists: `GET /api/v1/stock-entries/movements/list`

**Acceptance Criteria**:
- [ ] "History" button on each item opens movement timeline
- [ ] Shows date, type (IN/OUT/TRANSFER), quantity, warehouse, balance after, user who posted
- [ ] Filterable by date range and movement type
- [ ] Balance running total calculated correctly

### 1.3 Stock reservation / commitment
**Priority**: Important  
**Why**: Two workers can issue the same stock simultaneously. UI shows stale quantities. Need optimistic locking at the application level.  
**Files**:
- `project/supabase/migrations/00000000000000_schema.sql` — Add `reserved_quantity NUMERIC DEFAULT 0` to `product_variants`
- `project/supabase/migrations/00000000000000_schema.sql` — Add `stock_reservations` table: `id, organization_id, item_id, variant_id, warehouse_id, quantity, reserved_by, reserved_at, expires_at, status (active/released/fulfilled), reference_type, reference_id`
- `agritech-api/src/modules/items/items.service.ts` — New methods: `reserveStock()`, `releaseStock()`, `fulfillReservation()`
- `agritech-api/src/modules/stock-entries/stock-entries.service.ts` — `validateStockAvailabilityPg()` should subtract `reserved_quantity` from available balance
- `project/src/hooks/useStockReservation.ts` — New hook

**Acceptance Criteria**:
- [ ] Creating a stock entry in Draft state reserves the stock
- [ ] Reserved quantity shown in item details (available = total - reserved)
- [ ] Cancelling a draft entry releases the reservation
- [ ] Posting an entry converts reservation to fulfilled
- [ ] Reservations expire after configurable timeout (default 24h)

---

## Phase 2 — Barcode + Batch Tracking (5-7 days)

### 2.1 Barcode/QR scanning UI
**Priority**: Critical  
**Why**: Farmers can't type item codes with gloves on. Schema already stores barcodes on items and variants. Camera scanning is essential for agricultural operations.  
**Files**:
- `project/src/components/Stock/BarcodeScanner.tsx` — New component: camera-based barcode scanner using `@aspect/barcode-reader` or `html5-qrcode` library
- `project/src/components/Stock/ItemManagement.tsx` — Add scan button in search bar that opens camera, auto-filters items by scanned barcode
- `project/src/components/Stock/StockEntryForm.tsx` — Add scan button in item line items: scan barcode → auto-select item + variant
- `project/src/lib/api/items.ts` — Add `itemsApi.getByBarcode(barcode)` method
- `agritech-api/src/modules/items/items.controller.ts` — Add `GET /items/by-barcode/:barcode` endpoint
- `agritech-api/src/modules/items/items.service.ts` — Query items + variants by barcode, return first match

**Acceptance Criteria**:
- [ ] Scan button in items page search bar opens camera on mobile
- [ ] Scanning a barcode filters to the matching item
- [ ] In stock entry form, scanning auto-fills item, variant, and unit
- [ ] Works on iOS Safari and Android Chrome (camera permissions)
- [ ] Falls back to manual barcode input if camera unavailable

### 2.2 Batch tracking UI
**Priority**: High  
**Why**: Schema fully supports batches (`inventory_batches`, `batch_number` in `stock_entry_items`, `stock_movements`). Frontend has zero batch management.  
**Files**:
- `project/src/components/Stock/BatchManagement.tsx` — New component: list batches, filter by item/status/expiry, view batch details
- `project/src/components/Stock/StockEntryForm.tsx` — Add batch number field with autocomplete from existing batches, expiry date picker
- `project/src/components/Stock/BatchDetail.tsx` — New component: batch timeline (received → issued → expired), current quantity, cost history
- `project/src/hooks/useBatches.ts` — New hooks: `useBatches(filters)`, `useBatchDetail(batchId)`
- `project/src/lib/api/batches.ts` — New API service for batch CRUD
- `agritech-api/src/modules/items/items.controller.ts` — Add batch endpoints: `GET /items/batches`, `GET /items/batches/:id`
- `agritech-api/src/modules/items/items.service.ts` — Batch query methods
- `project/src/routes/_authenticated/(inventory)/stock/batches.tsx` — New route

**Acceptance Criteria**:
- [ ] Batch list page shows all batches with status, quantities, expiry dates
- [ ] Creating a stock entry with `has_batch_no = true` requires batch number
- [ ] Batch autocomplete suggests existing batch numbers for the selected item
- [ ] Expired batches flagged visually (red badge)
- [ ] Batch detail view shows full movement history

### 2.3 Expiry management + FEFO suggestions
**Priority**: Medium  
**Why**: Agricultural inputs (fertilizers, pesticides) have strict expiry dates. Using expired products is illegal and dangerous.  
**Files**:
- `project/src/components/Stock/ExpiryDashboard.tsx` — New component: items expiring soon (30/60/90 days), expired items alert
- `project/src/components/Stock/StockEntryForm.tsx` — When issuing stock, suggest batches by FEFO (First Expired First Out)
- `project/src/hooks/useExpiryAlerts.ts` — New hook
- `agritech-api/src/modules/items/items.controller.ts` — Add `GET /items/expiry-alerts?days=30` endpoint

**Acceptance Criteria**:
- [ ] Dashboard widget shows items expiring in 30/60/90 days
- [ ] Expired items blocked from being issued (validation error)
- [ ] FEFO suggestion when selecting batch for material issue
- [ ] Email/notification for items expiring soon (integrates with existing notification system)

---

## Phase 3 — Approval + Offline (7-10 days)

### 3.1 Approval workflow for stock entries
**Priority**: Important  
**Why**: `farm_worker` role can currently post unlimited stock movements. Need manager approval for high-value operations and stock transfers.  
**Files**:
- `project/supabase/migrations/00000000000000_schema.sql` — Add `approval_required BOOLEAN DEFAULT false` to `stock_entries`, add `stock_entry_approvals` table: `id, stock_entry_id, requested_by, approved_by, approved_at, rejected_by, rejected_at, rejection_reason, status (pending/approved/rejected)`
- `agritech-api/src/modules/stock-entries/stock-entries.controller.ts` — Add `PATCH /stock-entries/:id/request-approval`, `PATCH /stock-entries/:id/approve`, `PATCH /stock-entries/:id/reject`
- `agritech-api/src/modules/stock-entries/stock-entries.service.ts` — Approval flow logic: auto-approve for org_admin, require approval for farm_worker on transfers and high-value issues
- `project/src/components/Stock/StockEntryList.tsx` — Show approval status badge, add "Pending Approval" filter tab
- `project/src/components/Stock/StockApprovalQueue.tsx` — New component for managers: list pending approvals, approve/reject with notes
- CASL rules in `agritech-api/src/modules/casl/` — Add `approve-stock-entry` action, restrict to `farm_manager` and above

**Acceptance Criteria**:
- [ ] Stock entries from farm_worker require approval before posting
- [ ] farm_manager+ can auto-post (bypass approval)
- [ ] Approval queue shows pending entries with requester, items, quantities
- [ ] Approve/reject with mandatory notes on rejection
- [ ] Notification sent to requester on approval/rejection

### 3.2 Offline queue for stock operations
**Priority**: High (rural Morocco)  
**Why**: Target users have intermittent 3G/4G. A farmer issuing stock offline loses the operation. Need local queue with sync.  
**Files**:
- `project/src/lib/offline-queue.ts` — New module: IndexedDB-backed queue for offline operations using `idb` library
- `project/src/hooks/useOfflineQueue.ts` — New hook: `enqueue(operation)`, `getPending()`, `syncAll()`
- `project/src/contexts/OfflineSyncContext.tsx` — New context: monitors network status, auto-syncs when online
- `project/src/components/Stock/StockEntryForm.tsx` — On submit failure (offline): queue locally, show "Saved offline" toast
- `project/src/components/OfflineQueueIndicator.tsx` — Badge showing pending operations count, manual sync button
- `project/src/main.tsx` — Register sync on `online` event

**Acceptance Criteria**:
- [ ] Stock entry submissions queue in IndexedDB when offline
- [ ] "Saved offline — will sync when connected" toast shown
- [ ] Badge in header shows pending operation count
- [ ] Auto-sync when connectivity restored
- [ ] Manual "Sync Now" button
- [ ] Conflict resolution: server wins on stock quantities (re-validate before posting)

### 3.3 Stock take / physical count workflow
**Priority**: Medium  
**Why**: "Stock Reconciliation" entry type exists in DB but no guided workflow. Farmers need a structured way to count physical stock.  
**Files**:
- `project/src/components/Stock/StockTakeWizard.tsx` — New component: step-by-step wizard
  - Step 1: Select warehouse, select items to count (or all)
  - Step 2: Enter physical quantities per item (supports barcode scanning)
  - Step 3: Review variances (system qty vs physical qty)
  - Step 4: Submit → auto-creates Stock Reconciliation entry with variance data
- `project/src/routes/_authenticated/(inventory)/stock/stock-take.tsx` — New route
- `agritech-api/src/modules/stock-entries/stock-entries.service.ts` — Enhance reconciliation posting to auto-calculate variance and adjust stock

**Acceptance Criteria**:
- [ ] Guided 4-step wizard for physical stock count
- [ ] System quantity pre-filled, user enters physical count
- [ ] Variance highlighted (positive = found extra, negative = missing)
- [ ] Submitting creates a "Stock Reconciliation" entry with all items
- [ ] Posting adjusts stock levels to match physical count

---

## Phase 4 — Advanced Features + Polish (5-7 days)

### 4.1 Stock dashboard with summary cards
**Priority**: Medium  
**Files**:
- `project/src/components/Stock/StockReportsDashboard.tsx` — Enhance existing component with:
  - Total stock value (sum of valuation)
  - Low stock items count (with link to filtered view)
  - Pending stock entries count
  - Recent movements (last 7 days)
  - Top items by movement frequency
  - Warehouse utilization (% capacity used)
- `agritech-api/src/modules/items/items.service.ts` — Add `getStockDashboardData(organizationId)` aggregation query

### 4.2 Reorder suggestions (auto-purchase from low stock)
**Priority**: Medium  
**Files**:
- `project/supabase/migrations/00000000000000_schema.sql` — Add `reorder_point NUMERIC` and `reorder_quantity NUMERIC` to `items` table
- `project/src/components/Stock/ReorderSuggestions.tsx` — New component: list items below reorder point, "Generate PO" button
- `agritech-api/src/modules/items/items.service.ts` — Add `getReorderSuggestions(organizationId)` 
- Integration with existing purchase orders module

### 4.3 Idempotency on stock entry posting
**Priority**: Medium  
**Why**: Double-clicking "Post" creates duplicate stock movements.  
**Files**:
- `agritech-api/src/modules/stock-entries/stock-entries.service.ts` — Add idempotency key check: if `posted_at` is already set, return existing result instead of re-posting
- `project/src/components/Stock/StockEntryList.tsx` — Disable post button while request is in flight, add loading spinner

### 4.4 Materialized view for stock levels
**Priority**: Low (performance optimization)  
**Files**:
- `project/supabase/migrations/00000000000000_schema.sql` — Create materialized view `mv_stock_levels` that pre-computes balance per item/warehouse/variant
- Add refresh trigger on stock_movements insert (or periodic refresh via pg_cron)
- `agritech-api/src/modules/items/items.service.ts` — Read from materialized view for dashboard/list queries instead of `SUM(quantity)`

### 4.5 Remove `inventory_items` legacy table
**Priority**: Low (cleanup)  
**Files**:
- Verify no code references `inventory_items` table
- Add migration to drop table (or deprecate with warning)
- Remove any unused hooks/API methods

---

## Effort Summary

| Phase | Duration | Items | Dependencies |
|-------|----------|-------|-------------|
| Phase 0 — Data Integrity | 2-3 days | 2 | None |
| Phase 1 — Core Missing | 5-7 days | 3 | Phase 0 |
| Phase 2 — Barcode + Batch | 5-7 days | 3 | Phase 1.1 (pagination) |
| Phase 3 — Approval + Offline | 7-10 days | 3 | Phase 1.2 (history UI) |
| Phase 4 — Advanced + Polish | 5-7 days | 5 | Phase 2, 3 |
| **Total** | **24-34 days** | **16** | |

## Recommended Execution Order

```
Week 1:    Phase 0 (soft delete + variant sync)
Week 2-3:  Phase 1 (pagination + history + reservation)
Week 3-4:  Phase 2.1 (barcode scanning — unblocks farm workers)
Week 4-5:  Phase 2.2-2.3 (batch tracking + expiry)
Week 5-7:  Phase 3 (approval + offline + stock take)
Week 7-8:  Phase 4 (dashboard + reorder + polish)
```

## CEO Decisions Required

Before implementation begins, these decisions need validation:

1. **Barcode library choice**: `html5-qrcode` (free, widely used) vs `@aspect/barcode-reader` (paid, better performance) vs native iOS/Android scanner API?
2. **Offline sync conflict resolution**: Server-wins (simpler, safer) or merge (complex, better UX for concurrent edits)?
3. **Approval matrix**: Which roles require approval for which entry types? Proposed:
   - `farm_worker`: All entries require approval
   - `farm_manager`: Auto-approve, except transfers > 10,000 MAD value
   - `organization_admin`: Auto-approve everything
4. **`inventory_items` table**: Remove entirely or keep as simplified view for small farms?
5. **Phase priority**: Is barcode scanning (Phase 2.1) more urgent than approval workflow (Phase 3.1) for your current users?
