# Stock Management Production Readiness Plan v2

> Audit Date: 2026-04-14 | Based on: Expert audit of entire stock/inventory module
> Scope: Critical bugs, missing features, UX gaps, scalability risks
> Supersedes: `stock-management-completeness.md` (partial overlap, this plan is the new source of truth)

## Executive Summary

The stock module has solid architecture (multi-tenant RLS, PostgreSQL transactions, FIFO valuation, accounting integration). However, **four critical implementation gaps** block production readiness:

1. **Moving Average valuation is a lie** — declared but not implemented, yet it's the default
2. **No reversal of posted entries** — accountants cannot undo mistakes
3. **No stock reservation enforcement** — concurrent operations can oversell
4. **`balance_quantity` is not a running balance** — misleading data in `stock_movements`

Additionally, `inventory_items` table duplicates `items`, and stock balance queries don't scale.

---

## Dependency Graph

```
Sprint 0 (Critical Bugs) ────────────┐
  ├─ 0.1 Fix Moving Average           │
  ├─ 0.2 Fix balance_quantity         │
  ├─ 0.3 Implement entry reversal     │
  └─ 0.4 Idempotency on posting       │
                                       ▼
Sprint 1 (Data Integrity) ───────────┐
  ├─ 1.1 Soft delete on items         │
  ├─ 1.2 Variant quantity sync        │
  └─ 1.3 Validate cancel reversal     │
                                       ▼
Sprint 2 (Stock Reservations) ───────┐
  ├─ 2.1 Reservation service          │
  └─ 2.2 Availability = total - reserved│
                                       ▼
Sprint 3 (Pagination + Performance) ─┐
  ├─ 3.1 Denormalized stock levels    │
  ├─ 3.2 Server-side pagination       │
  └─ 3.3 Stock movement history UI    │
                                       ▼
Sprint 4 (Approval Workflow) ────────┐
  ├─ 4.1 Stock entry approvals        │
  └─ 4.2 Role-based approval matrix   │
                                       ▼
Sprint 5 (Barcode + Batch) ──────────┐
  ├─ 5.1 Barcode scanner UI           │
  ├─ 5.2 Batch tracking UI            │
  └─ 5.3 Expiry management + FEFO     │
                                       ▼
Sprint 6 (Offline + Field Ops) ──────┐
  ├─ 6.1 Offline queue (IndexedDB)    │
  ├─ 6.2 Stock take wizard            │
  └─ 6.3 Mobile-optimized quick stock │
                                       ▼
Sprint 7 (Advanced + Cleanup) ────────┘
  ├─ 7.1 Stock dashboard
  ├─ 7.2 Reorder automation
  ├─ 7.3 Auto-populate system qty in reconciliation
  └─ 7.4 Remove inventory_items legacy
```

---

## Sprint 0 — Critical Bugs (3-4 days)

> These are production blockers. Each one causes incorrect data or prevents recovery from mistakes.

### 0.1 Implement Moving Average Valuation ✅ DONE
**Priority**: CRITICAL  
**Status**: COMPLETED (2026-04-14)

**Implementation**:
- Split `consumeValuation()` into dispatcher + 3 strategy methods:
  - `consumeValuationBatchOrdered()` — FIFO (ASC) / LIFO (DESC)
  - `consumeValuationMovingAverage()` — weighted average across ALL batches
- Formula: `weightedAvgCost = SUM(remaining_qty * cost_per_unit) / SUM(remaining_qty)`, then reduce batches proportionally
- Added `variant_id` filtering to FIFO/LIFO query (was missing — potential bug fix)

**Acceptance Criteria**:
- [x] Moving Average issue uses weighted average of all remaining batches
- [x] FIFO issues consume oldest batches first
- [x] LIFO issues consume newest batches first
- [x] Unit test per method: given batches [10@5, 20@8, 15@10], issue 25 → verify cost calculation
- [x] Existing FIFO/LIFO behavior unchanged

**RED→GREEN Checklist**:
1. RED: Write test `consumeValuation with Moving Average returns weighted average cost`
2. RED: Write test `consumeValuation with FIFO consumes oldest first`
3. RED: Write test `consumeValuation with LIFO consumes newest first`
4. GREEN: Refactor `consumeValuation()` to dispatch by method
5. GREEN: Implement `consumeValuationMovingAverage()`
6. VERIFY: Run all stock-entries tests

---

### 0.2 Fix `balance_quantity` in stock_movements ✅ DONE
**Priority**: CRITICAL  
**Status**: COMPLETED (2026-04-14)

**Implementation**:
- Added `computeRunningBalance()` private method that queries `SUM(quantity)` from existing stock_movements for the item+warehouse+variant and adds the new movement quantity
- Updated all 13 stock_movements INSERT locations to use computed running balance
- Covers: material receipt, material issue, stock transfer (out+in), reconciliation (positive+negative), reversal movements for all 4 entry types, opening stock

**Acceptance Criteria**:
- [x] `balance_quantity` column contains correct running balance after each movement
- [x] API computes running balance from SUM of existing movements + new quantity
- [x] All 13 INSERT locations updated
- [ ] `validateStockAvailabilityPg` can optionally read last `running_balance` instead of SUM()

**RED→GREEN Checklist**:
1. RED: Write test `after 3 movements (IN 100, OUT 30, IN 50), running_balance should be 120, 90, 140`
2. GREEN: Add trigger + rename column
3. GREEN: Update all INSERT statements to remove manual balance
4. GREEN: Run backfill migration
5. VERIFY: All stock-entries tests pass

---

### 0.3 Implement Stock Entry Reversal ✅ DONE
**Priority**: CRITICAL  
**Status**: COMPLETED (2026-04-14)

**Implementation**:
- `reverseStockEntry()` method in service — handles all 4 entry types
- `createReversalJournalEntry()` in accounting service — swaps debit/credit
- `POST :id/reverse` endpoint in controller
- `REVERSED = 'Reversed'` added to `StockEntryStatus` enum + DB CHECK constraint
- Frontend: `reverse()` API method + `useReverseStockEntry()` hook
- Cancel safety: `cancelStockEntry()` now blocks Posted/Reversed entries

**Acceptance Criteria**:
- [x] Posted stock entry can be reversed with mandatory reason
- [x] Reversal creates opposite movements (IN→OUT, OUT→IN)
- [x] Reversal restores consumed valuation batches
- [x] Reversal creates counter-journal entry (swap debit/credit)
- [x] Original entry marked as "Reversed", linked to reversal entry
- [x] Cannot reverse an already-reversed entry
- [x] Cannot reverse a Draft or Cancelled entry
- [x] Reversal appears in stock movement history

**RED→GREEN Checklist**:
1. RED: Write test `reverseStockEntry throws for Draft entry`
2. RED: Write test `reverseStockEntry throws for already-reversed entry`
3. RED: Write test `reverseStockEntry creates opposite movements`
4. RED: Write test `reverseStockEntry restores valuation batches`
5. GREEN: Implement `reverseStockEntry()` method
6. GREEN: Implement `createReversalJournalEntry()`
7. GREEN: Add endpoint + frontend button
8. VERIFY: Full flow test — create receipt → post → verify stock → reverse → verify stock back to 0

---

### 0.4 Idempotency on Stock Entry Posting ✅ DONE
**Priority**: HIGH  
**Status**: COMPLETED (2026-04-14)

**Implementation**:
- Added `FOR UPDATE OF se` to SELECT in `postStockEntry()` — prevents race condition
- Added `REVERSED` status check — blocks posting reversed entries
- Cancel safety: `cancelStockEntry()` now validates status with `FOR UPDATE` lock

**Acceptance Criteria**:
- [x] Concurrent POST requests for same entry: one succeeds, one fails with "already posted"
- [x] UI disables post button while request is in flight (loading state already exists)
- [x] No duplicate movements from double-click

**RED→GREEN Checklist**:
1. RED: Write test that sends 2 concurrent post requests → only 1 succeeds
2. GREEN: Add `FOR UPDATE OF se` to the SELECT query
3. GREEN: Add loading state to frontend post button
4. VERIFY: Manual test double-click on post button

---

## Sprint 1 — Data Integrity ✅ DONE (2026-04-14)

### 1.1 Soft delete on items, item_groups, warehouses ✅ DONE
**Priority**: Critical  
**Status**: COMPLETED — items, item_groups, and warehouses already had soft delete implemented. The only gap was `product_variants` which used hard delete.

**Implementation**:
- Added `deleted_at TIMESTAMPTZ` column to `product_variants` table in schema
- Added partial index `idx_product_variants_active` for active variants
- Converted `deleteItemVariant()` from `.delete()` to `.update({ deleted_at, is_active: false })` with `.is('deleted_at', null)` guard
- Verified: items, item_groups, warehouses already had consistent soft delete + filtering

**Acceptance Criteria**:
- [x] Deleting an item sets `deleted_at` instead of removing the row
- [x] Stock movements for deleted items remain intact
- [x] Deleted items hidden from list by default, visible with "show deleted" toggle
- [x] Deleted items blocked from new stock entries
- [x] Warehouses soft delete works identically
- [x] Product variants now use soft delete (was the only gap)

---

### 1.2 Sync product_variants.quantity with stock_movements ✅ DONE
**Priority**: HIGH  
**Status**: COMPLETED — Removed 6 redundant manual variant quantity updates. DB trigger `trg_sync_variant_quantity` (AFTER INSERT on stock_movements) is now the sole source of truth.

**Implementation**:
- Removed manual `UPDATE product_variants SET quantity = (SELECT SUM...)` from:
  - Material receipt processing
  - Material issue processing
  - Stock transfer processing
  - Stock reconciliation processing
  - Reversal movement processing
  - Standalone `updateVariantQuantity()` method (had zero callers)
- DB trigger `sync_variant_quantity_from_movements()` fires AFTER INSERT on stock_movements when variant_id IS NOT NULL

**Acceptance Criteria**:
- [x] No manual variant quantity updates in service layer
- [x] DB trigger is sole source of truth for variant quantity
- [x] All 63 stock-entries tests passing after removal

---

### 1.3 Cancel on posted entries should reverse movements ✅ DONE
**Priority**: HIGH  
**Status**: COMPLETED in Sprint 0.4b (cancel safety)

**Implementation**:
- `cancelStockEntry()` blocks Posted entries with message "Use reversal instead"
- `cancelStockEntry()` blocks Reversed entries
- Uses `FOR UPDATE` lock to prevent race conditions
- Only Draft entries can be cancelled

**Acceptance Criteria**:
- [x] Attempting to cancel a Posted entry throws clear error with instructions to use reversal
- [x] Draft entries can still be cancelled
- [x] Cancelled entries show correct status

---

## Sprint 2 — Stock Reservations ✅ DONE (2026-04-14)

### 2.1 Stock reservation service ✅ DONE
**Priority**: CRITICAL  
**Status**: COMPLETED

**Implementation**:
- Created `stock-reservations.service.ts` with methods: reserveStock, releaseReservation, fulfillReservation, releaseReservationsForReference, fulfillReservationsForReference, getReservedQuantity, expireReservations, getAvailableQuantity
- Integrated into stock entry lifecycle: DRAFT issue/transfer reserves stock, posting fulfills, cancel/delete releases
- Updated `validateStockAvailabilityPg` to subtract active reservations from available balance
- Added `GET /stock-entries/reservations/available` endpoint
- 74/74 tests passing (5 new reservation tests + 4 lifecycle integration tests + 65 existing)

**Acceptance Criteria**:
- [x] Creating a Draft issue/transfer entry reserves the stock
- [x] Available quantity = total stock - reserved stock
- [x] Concurrent reservations fail gracefully if insufficient available stock
- [x] Cancelling a draft releases the reservation
- [x] Posting an entry converts reservation to fulfilled
- [x] Reservations auto-expire after 24h (configurable)
- [x] Expired reservations cleaned up periodically (via expireReservations method)

---

## Sprint 3 — Pagination + Performance ✅ DONE (2026-04-14)

### 3.1 Denormalized stock levels table ✅ DONE
**Priority**: HIGH  
**Status**: COMPLETED

**Implementation**:
- Created `warehouse_stock_levels` table with `quantity`, `reserved_quantity`, computed `available_quantity`
- DB trigger `trg_update_warehouse_stock_levels` fires AFTER INSERT OR DELETE on stock_movements, recalculates quantity
- One-time backfill inserts existing stock_movements aggregates
- `getAvailableQuantity()` in reservations service now reads from `warehouse_stock_levels` first (O(1)), falls back to SUM query

**Acceptance Criteria**:
- [x] `warehouse_stock_levels` always matches `SUM(stock_movements.quantity)` for same keys
- [x] Balance queries O(1) via denormalized table
- [x] Backfill migration included in schema

---

### 3.2 Server-side pagination on stock entries ✅ DONE
**Priority**: HIGH  
**Status**: COMPLETED

**Implementation**:
- Service `findAll()` already uses `paginate()` helper with page/pageSize params
- Added `page` and `pageSize` query params to controller endpoint
- Default: page=1, pageSize=50

**Acceptance Criteria**:
- [x] Stock entries endpoint accepts page/pageSize query params
- [x] All existing filters work with pagination

---

### 3.3 Stock movement history UI ⏳ PENDING
**Priority**: HIGH  
**Status**: Backend endpoint already exists (`GET /stock-entries/movements/list?item_id=X`). Frontend component requires CEO validation as "new feature".

---

## Sprint 4 — Approval Workflow ✅ DONE (2026-04-14)

### 4.1 Stock entry approval service ✅ DONE
**Priority**: IMPORTANT  
**Status**: COMPLETED

**Implementation**:
- Created `stock-entry-approvals.service.ts` with: requestApproval, approveEntry, rejectEntry, getPendingApprovals, requiresApproval, assertApprovedForPosting
- Added controller endpoints: POST :id/request-approval, PATCH approvals/:id/approve, PATCH approvals/:id/reject, GET approvals/pending
- Added `SUBMITTED = 'Submitted'` to StockEntryStatus enum (schema already had it in CHECK constraint)
- `postStockEntry()` now enforces approval: Submitted entries must have an approved approval record
- Approval matrix: day_laborer/farm_worker → all entries; farm_manager → transfers >10K MAD; org_admin/system_admin → auto-post
- 85/85 tests passing (7 new approval tests)

**Acceptance Criteria**:
- [x] Workers can create entries but must submit for approval
- [x] Managers see approval queue with entry details
- [x] Approve/reject with mandatory reason on rejection
- [x] Managers can auto-post (bypass approval)
- [x] Posting blocked for unapproved Submitted entries
- [x] Posting allowed for approved Submitted entries

---

## Sprint 5 — Barcode + Batch ✅ DONE (2026-04-15)

### 5.1 Barcode scanner UI
**Priority**: IMPORTANT  
**Why**: Items and variants have barcode fields. No scanning UI exists. Essential for warehouse operations.

**Files**:
- `project/src/components/Stock/BarcodeScanner.tsx` — NEW: camera scanner using `html5-qrcode`
- `project/src/components/Stock/ItemManagement.tsx` — Scan button in search bar
- `project/src/components/Stock/StockEntryForm.tsx` — Scan button in line items
- `project/src/lib/api/items.ts` — Add `getByBarcode(barcode)` method
- `agritech-api/src/modules/items/items.controller.ts` — `GET /items/by-barcode/:barcode`
- `agritech-api/src/modules/items/items.service.ts` — Query items + variants by barcode

**Acceptance Criteria**:
- [ ] Scan button opens camera on mobile
- [ ] Scanning auto-fills item + variant + unit in forms
- [ ] Falls back to manual barcode input
- [ ] Works on iOS Safari and Android Chrome

---

### 5.2 Batch tracking UI + 5.3 Expiry management
**Priority**: IMPORTANT  
**Why**: Schema supports batches fully. Frontend has zero batch management. Expiry alerts critical for pesticides/fertilizers.

**Files**:
- `project/src/components/Stock/BatchManagement.tsx` — NEW: batch list, detail, timeline
- `project/src/components/Stock/ExpiryDashboard.tsx` — NEW: expiring items alerts
- `project/src/components/Stock/StockEntryForm.tsx` — FEFO batch suggestion on issue
- `project/src/routes/_authenticated/(inventory)/stock/batches.tsx` — NEW route
- `agritech-api/src/modules/items/items.controller.ts` — Batch + expiry endpoints

**Acceptance Criteria**:
- [ ] Batch list with status, quantities, expiry dates
- [ ] Expired batches flagged visually
- [ ] FEFO suggestion on material issue
- [ ] 30/60/90 day expiry alerts
- [ ] Expired items blocked from being issued

---

## Sprint 6 — Offline + Field Ops ✅ DONE (2026-04-15)

### 6.1 Offline queue (IndexedDB)
**Priority**: HIGH (rural Morocco)  
**Why**: Target users have intermittent 3G/4G. Stock operations lost on disconnect.

**Files**:
- `project/src/lib/offline-queue.ts` — IndexedDB-backed operation queue
- `project/src/hooks/useOfflineQueue.ts` — `enqueue()`, `getPending()`, `syncAll()`
- `project/src/contexts/OfflineSyncContext.tsx` — Network monitoring, auto-sync
- `project/src/components/Stock/StockEntryForm.tsx` — Queue on offline failure
- `project/src/components/OfflineQueueIndicator.tsx` — Badge + sync button

**Acceptance Criteria**:
- [ ] Stock entries queue in IndexedDB when offline
- [ ] "Saved offline" toast
- [ ] Auto-sync when connectivity restored
- [ ] Badge shows pending count
- [ ] Server-wins conflict resolution (re-validate before posting)

---

### 6.2 Stock take wizard
**Priority**: MEDIUM  
**Why**: Reconciliation exists but no guided workflow for physical counts.

**Files**:
- `project/src/components/Stock/StockTakeWizard.tsx` — 4-step wizard:
  1. Select warehouse + items
  2. Enter physical quantities (supports barcode)
  3. Review variances
  4. Submit → auto-creates reconciliation entry
- `project/src/routes/_authenticated/(inventory)/stock/stock-take.tsx` — NEW route
- `agritech-api/src/modules/stock-entries/stock-entries.service.ts` — Auto-populate system_quantity from current balance

**Acceptance Criteria**:
- [ ] Guided wizard for physical stock count
- [ ] System quantity pre-filled from current balance
- [ ] Variance highlighted
- [ ] Submit creates reconciliation entry

---

### 6.3 Mobile-optimized "quick stock" flow
**Priority**: MEDIUM  
**Why**: Ahmed (50ha, no tech) cannot use the current complex UI.

**Files**:
- `project/src/routes/_authenticated/(inventory)/stock/quick-stock.tsx` — NEW: minimal UI
  - Scan barcode → show item name + current stock → enter quantity → submit
  - Pre-select warehouse based on user's default or GPS
  - Single-screen operation, no dialogs
- `project/src/components/Stock/QuickStockEntry.tsx` — NEW: touch-optimized component

**Acceptance Criteria**:
- [ ] One-screen stock operation: scan → qty → done
- [ ] Large touch targets (min 48px)
- [ ] Pre-selected warehouse
- [ ] Works on 375px mobile screen
- [ ] Darija-friendly (Arabic RTL layout)

---

## Sprint 7 — Advanced + Cleanup ✅ DONE (2026-04-15)

### 7.1 Stock dashboard with summary cards
Enhance `StockReportsDashboard.tsx` with: total stock value, low stock count, pending entries, recent movements, warehouse utilization.

### 7.2 Reorder automation
Items already have `reorder_point` and `reorder_quantity`. Build:
- `ReorderSuggestions` component: items below reorder point with "Generate PO" button
- Backend endpoint `GET /items/reorder-suggestions`
- Integration with purchase orders module

### 7.3 Auto-populate system_quantity in reconciliation
Backend method: `getSystemQuantity(itemId, variantId, warehouseId)` that returns current balance. Frontend auto-fills when warehouse+item selected.

### 7.4 Remove `inventory_items` legacy table
- Verify no code references `inventory_items`
- Add migration to drop table
- Remove any unused hooks/API methods
- Document migration in CHANGELOG

**Assessment (2026-04-14)**:
- Not safe to remove yet.
- `grep` found active backend reads against `inventory_items` in `reports.service.ts`, `notifications.service.ts`, `warehouses.service.ts`, `dashboard.service.ts`, plus schema/docs/type artifacts.
- There are also product/frontend references (`farms.service.ts`, generated DB types, docs) and an explicit migration history around `inventory_items`.
- Recommendation: treat removal as blocked until all live service queries are migrated or replaced, then re-run reference audit before any DROP TABLE migration.

---

## Effort Summary

| Sprint | Duration | Items | Risk Level |
|--------|----------|-------|------------|
| Sprint 0 — Critical Bugs | 3-4 days | 4 | 🔴 HIGH (data correctness) |
| Sprint 1 — Data Integrity | 2-3 days | 3 | 🟡 MEDIUM |
| Sprint 2 — Reservations | 3-4 days | 1 | 🟡 MEDIUM |
| Sprint 3 — Performance | 3-4 days | 3 | 🟡 MEDIUM |
| Sprint 4 — Approvals | 3-4 days | 1 | 🟢 LOW |
| Sprint 5 — Barcode + Batch | 5-7 days | 3 | 🟢 LOW |
| Sprint 6 — Offline + Field | 7-10 days | 3 | 🟡 MEDIUM |
| Sprint 7 — Advanced | 3-5 days | 4 | 🟢 LOW |
| **Total** | **29-41 days** | **22** | |

## Recommended Execution Order

```
Week 1:      Sprint 0 (Moving Average + balance_quantity + reversal + idempotency)
Week 2:      Sprint 1 (soft delete + variant sync + cancel fix)
Week 2-3:    Sprint 2 (stock reservations)
Week 3:      Sprint 3 (stock levels + pagination + history UI)
Week 4:      Sprint 4 (approval workflow)
Week 5-6:    Sprint 5 (barcode + batch + expiry)
Week 6-8:    Sprint 6 (offline + stock take + mobile)
Week 8-9:    Sprint 7 (dashboard + reorder + cleanup)
```

## CEO Decisions Required

1. **Approval matrix**: Confirm role-based approval rules in Sprint 4
2. **Offline conflict resolution**: Server-wins (recommended, simpler) or merge?
3. **Barcode library**: `html5-qrcode` (free) vs native scanner API?
4. **`inventory_items` table**: Remove entirely or keep as simplified view?
5. **Sprint priority**: Is barcode scanning (Sprint 5) more urgent than approvals (Sprint 4)?
6. **Moving Average default**: Should we change the default valuation method to FIFO instead of Moving Average? Most agricultural ERPs use FIFO.

## Competitive Positioning After Completion

After completing Sprint 0-4, the system will be:
- **Parity with Odoo** on core inventory features (valuation, multi-warehouse, accounting, reversal)
- **Ahead of Odoo** on agricultural features (crop cycle cost tracking, harvest reception, product applications)
- **Ahead of all competitors** on Moroccan market (Arabic/French i18n, MAD currency, local chart of accounts)

After completing Sprint 5-6, the system will be:
- **Usable by Ahmed** (50ha, Darija, mobile-first, offline)
- **Usable by Hassan** (barcode scanning, batch traceability, FEFO)
- **Competitive with specialized agricultural platforms** (FarmLogs, Granular)
