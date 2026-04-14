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

### 0.1 Implement Moving Average Valuation
**Priority**: CRITICAL  
**Why**: `items.valuation_method` defaults to `'Moving Average'` but `consumeValuation()` treats it as FIFO (line 1351: `method === ValuationMethod.MOVING_AVERAGE ? 'created_at ASC' : ...`). Moving Average should NOT consume specific batches — it should calculate a weighted average cost across all remaining stock. Every item using the default method is valued incorrectly.

**Current behavior (WRONG)**:
```typescript
// stock-entries.service.ts line 1350-1353
const orderBy =
  method === ValuationMethod.FIFO || method === ValuationMethod.MOVING_AVERAGE
    ? 'created_at ASC'    // ← Moving Average falls through to FIFO!
    : 'created_at DESC';
```

**Correct behavior**:
- Moving Average: Issue cost = `(SUM(remaining_quantity * cost_per_unit) / SUM(remaining_quantity))` across all batches. Consume from batches proportionally or oldest-first (doesn't matter for cost since it's averaged).
- Only FIFO and LIFO should consume specific batches.

**Files to modify**:
- `agritech-api/src/modules/stock-entries/stock-entries.service.ts`
  - Split `consumeValuation()` into `consumeValuationFIFO/LIFO()` and `consumeValuationMovingAverage()`
  - Moving Average: query weighted average cost, create single movement entry at that cost, reduce all batches proportionally
- `agritech-api/src/modules/stock-entries/stock-entries.service.spec.ts` — Add tests for each valuation method

**Acceptance Criteria**:
- [ ] Moving Average issue uses weighted average of all remaining batches
- [ ] FIFO issues consume oldest batches first
- [ ] LIFO issues consume newest batches first
- [ ] Unit test per method: given batches [10@5, 20@8, 15@10], issue 25 → verify cost calculation
- [ ] Existing FIFO/LIFO behavior unchanged

**RED→GREEN Checklist**:
1. RED: Write test `consumeValuation with Moving Average returns weighted average cost`
2. RED: Write test `consumeValuation with FIFO consumes oldest first`
3. RED: Write test `consumeValuation with LIFO consumes newest first`
4. GREEN: Refactor `consumeValuation()` to dispatch by method
5. GREEN: Implement `consumeValuationMovingAverage()`
6. VERIFY: Run all stock-entries tests

---

### 0.2 Fix `balance_quantity` in stock_movements
**Priority**: CRITICAL  
**Why**: `balance_quantity` column is set to the movement quantity (line 599: `balance_quantity: item.quantity`), NOT the running balance after the movement. This makes the column misleading — anyone reading it thinks "this is the balance after this movement" but it's just the movement amount. Reports and UIs that rely on this column will show wrong data.

**Current (WRONG)**:
```typescript
// Material Receipt - line 599
balance_quantity: item.quantity,        // = movement qty, not running balance
// Material Issue - line 707
balance_quantity: -item.quantity,       // = negative movement qty
```

**Correct approach**:
1. Calculate running balance: `SELECT COALESCE(SUM(quantity), 0) + new_quantity FROM stock_movements WHERE item_id=$1 AND warehouse_id=$2`
2. Set `balance_quantity` = running balance after this movement
3. OR: rename column to `movement_quantity` and add a DB trigger to maintain a separate `running_balance` column

**Recommended**: Option 2 — DB trigger maintains `running_balance`. This is the standard ERP pattern.

**Files to modify**:
- `project/supabase/migrations/00000000000000_schema.sql` — Rename `balance_quantity` to `running_balance`, add trigger function `calculate_running_balance()` that computes balance after each INSERT
- `agritech-api/src/modules/stock-entries/stock-entries.service.ts` — Remove manual `balance_quantity` from all INSERT statements, let trigger handle it
- Backfill migration: `UPDATE stock_movements SET running_balance = (SELECT SUM(quantity) FROM stock_movements sm2 WHERE sm2.item_id = stock_movements.item_id AND sm2.warehouse_id = stock_movements.warehouse_id AND sm2.created_at <= stock_movements.created_at)`

**Acceptance Criteria**:
- [ ] `running_balance` column contains correct running balance after each movement
- [ ] Backfill migration corrects all existing rows
- [ ] DB trigger auto-computes on INSERT
- [ ] API no longer sets balance manually
- [ ] `validateStockAvailabilityPg` can optionally read last `running_balance` instead of SUM()

**RED→GREEN Checklist**:
1. RED: Write test `after 3 movements (IN 100, OUT 30, IN 50), running_balance should be 120, 90, 140`
2. GREEN: Add trigger + rename column
3. GREEN: Update all INSERT statements to remove manual balance
4. GREEN: Run backfill migration
5. VERIFY: All stock-entries tests pass

---

### 0.3 Implement Stock Entry Reversal
**Priority**: CRITICAL  
**Why**: Posted entries CANNOT be reversed. If someone posts a Material Receipt with wrong cost or quantity, the only option is direct DB manipulation. This is the #1 reason accountants reject an ERP. Every professional inventory system has reversal/credit notes.

**Implementation approach**: 
- Create a new stock entry of the OPPOSITE type that reverses the original
- Original entry gets status `Reversed` (new enum value)
- Reversal entry links to original via `reference_type: 'reversal'`, `reference_id: original_id`
- All movements, valuations, and journal entries are automatically created for the reversal

**Files to modify**:
- `agritech-api/src/modules/stock-entries/dto/create-stock-entry.dto.ts`
  - Add `REVERSED = 'Reversed'` to `StockEntryStatus` enum
  - Add DB CHECK constraint: `CHECK (status IN ('Draft', 'Submitted', 'Posted', 'Cancelled', 'Reversed'))`
- `agritech-api/src/modules/stock-entries/stock-entries.controller.ts`
  - Add `@Post(':id/reverse')` endpoint with reason parameter
- `agritech-api/src/modules/stock-entries/stock-entries.service.ts`
  - New method `reverseStockEntry(id, organizationId, userId, reason)`
  - Logic:
    1. Validate original exists, is Posted, not already reversed
    2. Check no subsequent reversal exists
    3. Create reversal entry (opposite movements: IN→OUT, OUT→IN, Transfer→Reverse Transfer)
    4. Re-consume valuation (restore batches that were consumed)
    5. Create reversal journal entry (swap debit/credit)
    6. Mark original as Reversed
- `agritech-api/src/modules/stock-entries/stock-accounting.service.ts`
  - New method `createReversalJournalEntry()` — swaps debit/credit from original
- `project/src/lib/api/stock.ts` — Add `reverse(id, reason)` API method
- `project/src/hooks/useStockEntries.ts` — Add `useReverseStockEntry()` mutation hook
- `project/src/components/Stock/StockEntryDetail.tsx` — Add "Reverse" button (only for Posted entries)
- `project/src/components/Stock/StockEntryList.tsx` — Show "Reversed" badge

**Acceptance Criteria**:
- [ ] Posted stock entry can be reversed with mandatory reason
- [ ] Reversal creates opposite movements (IN→OUT, OUT→IN)
- [ ] Reversal restores consumed valuation batches
- [ ] Reversal creates counter-journal entry (swap debit/credit)
- [ ] Original entry marked as "Reversed", linked to reversal entry
- [ ] Cannot reverse an already-reversed entry
- [ ] Cannot reverse a Draft or Cancelled entry
- [ ] Reversal appears in stock movement history

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

### 0.4 Idempotency on Stock Entry Posting
**Priority**: HIGH  
**Why**: Double-clicking "Post" creates duplicate stock movements. No check prevents this.

**Files to modify**:
- `agritech-api/src/modules/stock-entries/stock-entries.service.ts`
  - `postStockEntry()`: Check `posted_at` at the START of the transaction with `FOR UPDATE` lock on the stock_entry row. If already posted, throw `BadRequestException('Already posted')`.
  - Actually: line 342 already checks `if (stockEntry.status === StockEntryStatus.POSTED)` BUT the SELECT doesn't use `FOR UPDATE`, creating a race condition window.

**Fix**: Add `FOR UPDATE` to the SELECT in `postStockEntry()`:
```sql
SELECT se.*, ... FROM stock_entries se ... WHERE se.id = $1 AND se.organization_id = $2
GROUP BY se.id
FOR UPDATE OF se
```

**Acceptance Criteria**:
- [ ] Concurrent POST requests for same entry: one succeeds, one fails with "already posted"
- [ ] UI disables post button while request is in flight
- [ ] No duplicate movements from double-click

**RED→GREEN Checklist**:
1. RED: Write test that sends 2 concurrent post requests → only 1 succeeds
2. GREEN: Add `FOR UPDATE OF se` to the SELECT query
3. GREEN: Add loading state to frontend post button
4. VERIFY: Manual test double-click on post button

---

## Sprint 1 — Data Integrity (2-3 days)

### 1.1 Soft delete on items, item_groups, warehouses
**Priority**: Critical  
**Why**: Hard delete on items cascades to `stock_movements` (ON DELETE CASCADE), destroying audit trail. `items` table already has `deleted_at` column but the service layer doesn't consistently filter by it. `warehouses` has it too.

**Files**:
- `agritech-api/src/modules/items/items.service.ts` — Ensure ALL queries include `.is('deleted_at', null)` filter. `deleteItem()` should set `deleted_at` + `is_active = false`.
- `agritech-api/src/modules/warehouses/warehouses.service.ts` — Already filters `deleted_at IS NULL` (verified), but `delete()` should be soft delete.
- `agritech-api/src/modules/stock-entries/stock-entries.service.ts` — `revalidateBeforePosting()` already warns about inactive items. Enhance: block posting if item has `deleted_at` set.
- `project/src/components/Stock/ItemManagement.tsx` — Delete button soft-deletes, add "Show inactive" toggle
- `project/src/hooks/useItems.ts` — Default queries exclude `deleted_at IS NOT NULL`

**Acceptance Criteria**:
- [ ] Deleting an item sets `deleted_at` instead of removing the row
- [ ] Stock movements for deleted items remain intact
- [ ] Deleted items hidden from list by default, visible with "show deleted" toggle
- [ ] Deleted items blocked from new stock entries
- [ ] Warehouses soft delete works identically

---

### 1.2 Sync product_variants.quantity with stock_movements
**Priority**: HIGH  
**Why**: Variant quantity is updated both by the service layer (line 630-643) AND by a DB trigger (`sync_variant_quantity_from_movements`). Double-writing creates race conditions.

**Fix**: Remove the manual UPDATE in the service layer (lines 630-643, 712-724, 849-860, 1065-1077). Rely solely on the DB trigger `trg_sync_variant_quantity`.

**Files**:
- `agritech-api/src/modules/stock-entries/stock-entries.service.ts` — Remove all manual `UPDATE product_variants SET quantity = ...` blocks (4 occurrences)
- Verify DB trigger `trg_sync_variant_quantity` handles all cases (it should, it fires AFTER INSERT)
- Add one-time backfill: `UPDATE product_variants SET quantity = (SELECT COALESCE(SUM(quantity), 0) FROM stock_movements WHERE item_id = product_variants.item_id AND variant_id = product_variants.id)`

**Acceptance Criteria**:
- [ ] No manual variant quantity updates in service layer
- [ ] DB trigger is sole source of truth for variant quantity
- [ ] Backfill corrects any existing drift
- [ ] Unit test: insert stock movement → verify variant quantity auto-updates

---

### 1.3 Cancel on posted entries should reverse movements
**Priority**: HIGH  
**Why**: `cancelStockEntry()` only sets status to 'Cancelled' but doesn't check if the entry was already posted. If it was posted, the movements exist but won't be reversed. Currently only Draft entries should be cancellable, but the code doesn't enforce this clearly.

**Files**:
- `agritech-api/src/modules/stock-entries/stock-entries.service.ts`
  - `cancelStockEntry()`: Add explicit check: if `status === 'Posted'`, throw error "Posted entries must be reversed, not cancelled"
  - This is the safety net before 0.3 (reversal) is implemented

**Acceptance Criteria**:
- [ ] Attempting to cancel a Posted entry throws clear error with instructions to use reversal
- [ ] Draft entries can still be cancelled
- [ ] Cancelled entries show correct status

---

## Sprint 2 — Stock Reservations (3-4 days)

### 2.1 Stock reservation service
**Priority**: CRITICAL  
**Why**: `stock_reservations` table exists with full schema but NO service implementation. Without reservations, concurrent sales orders can oversell the same stock. Two workers can issue the same item simultaneously.

**Files to create/modify**:
- `agritech-api/src/modules/stock-entries/stock-reservations.service.ts` — NEW
  - `reserveStock(itemId, variantId, warehouseId, quantity, reservedBy, referenceType, referenceId, expiresInMs = 86400000)` — Creates reservation, validates quantity available
  - `releaseReservation(reservationId)` — Sets status to 'released'
  - `fulfillReservation(reservationId)` — Sets status to 'fulfilled'
  - `expireReservations()` — Cron job: set expired reservations to 'expired' status
  - `getReservedQuantity(itemId, variantId, warehouseId)` — Returns SUM of active reservations
- `agritech-api/src/modules/stock-entries/stock-reservations.controller.ts` — NEW (minimal, mostly internal)
- `agritech-api/src/modules/stock-entries/stock-entries.module.ts` — Register new service
- `agritech-api/src/modules/stock-entries/stock-entries.service.ts`
  - `validateStockAvailabilityPg()` — Subtract reserved quantity from available balance
  - `createStockEntry()` — When creating Draft for issue/transfer, reserve the stock
  - `postStockEntry()` — Fulfill the reservation on posting
  - `cancelStockEntry()` — Release the reservation on cancellation
  - `deleteStockEntry()` — Release the reservation on deletion
- `agritech-api/src/modules/sales-orders/sales-orders.service.ts` — Reserve stock on sales order creation (if stockable items)

**Acceptance Criteria**:
- [ ] Creating a Draft issue/transfer entry reserves the stock
- [ ] Available quantity = total stock - reserved stock
- [ ] Concurrent reservations fail gracefully if insufficient available stock
- [ ] Cancelling a draft releases the reservation
- [ ] Posting an entry converts reservation to fulfilled
- [ ] Reservations auto-expire after 24h (configurable)
- [ ] Expired reservations cleaned up periodically

**RED→GREEN Checklist**:
1. RED: Test `reserveStock throws if insufficient available (total - reserved < requested)`
2. RED: Test `concurrent reservations don't oversell`
3. GREEN: Implement reservation service
4. GREEN: Integrate with stock entry lifecycle
5. GREEN: Add expiry cron job
6. VERIFY: Create 2 concurrent material issues for same item → second should fail

---

## Sprint 3 — Pagination + Performance (3-4 days)

### 3.1 Denormalized stock levels table
**Priority**: HIGH  
**Why**: Every stock availability check computes `SUM(quantity)` across ALL movements for an item+warehouse+variant. After 2 years of operations, this scan is O(n) with growing n. Need a materialized snapshot.

**Implementation**:
- Create `warehouse_stock_levels` table: `organization_id, item_id, variant_id, warehouse_id, quantity, reserved_quantity, available_quantity, last_movement_at, updated_at`
- DB trigger on `stock_movements` INSERT/DELETE updates the levels table
- One-time backfill from existing movements
- `validateStockAvailabilityPg` reads from this table instead of SUM()

**Files**:
- `project/supabase/migrations/00000000000000_schema.sql` — Add table + triggers
- `agritech-api/src/modules/stock-entries/stock-entries.service.ts` — Use `warehouse_stock_levels` for balance queries
- `agritech-api/src/modules/items/items.service.ts` — Use for stock level API responses

**Acceptance Criteria**:
- [ ] `warehouse_stock_levels` always matches `SUM(stock_movements.quantity)` for same keys
- [ ] Balance queries O(1) instead of O(n)
- [ ] Backfill migration completes in <60s for 100K movements
- [ ] Dashboard stock levels load in <200ms

---

### 3.2 Server-side pagination on stock entries and items
**Priority**: HIGH  
**Why**: Stock entries list fetches ALL then filters client-side. Breaks at scale.

**Files**:
- `project/src/components/Stock/StockEntryList.tsx` — Server-side pagination controls
- `project/src/components/Stock/ItemManagement.tsx` — Server-side pagination controls
- `project/src/hooks/useStockEntries.ts` — Pass page/pageSize to API
- `agritech-api/src/modules/stock-entries/stock-entries.controller.ts` — Add page/pageSize query params
- `agritech-api/src/modules/stock-entries/stock-entries.service.ts` — `findAll()` already uses `paginate()` — verify it works correctly

**Acceptance Criteria**:
- [ ] Stock entries page loads with server-side pagination (default 25/page)
- [ ] Items page same
- [ ] All existing filters work with pagination
- [ ] Page loads in <500ms with 10K+ entries

---

### 3.3 Stock movement history UI (per-item timeline)
**Priority**: HIGH  
**Why**: No frontend to view stock movements. Users can't answer "what happened to this item?"

**Files**:
- `project/src/components/Stock/ItemStockTimeline.tsx` — Timeline view showing every IN/OUT/TRANSFER, grouped by date, with running balance
- `project/src/components/Stock/ItemManagement.tsx` — Add "History" action button
- `project/src/hooks/useStockMovements.ts` — Already exists, verify it works
- Backend already serves: `GET /api/v1/stock-entries/movements/list?item_id=X`

**Acceptance Criteria**:
- [ ] "History" button opens movement timeline
- [ ] Shows date, type, quantity, warehouse, running balance, user
- [ ] Filterable by date range and movement type
- [ ] Running balance calculated correctly

---

## Sprint 4 — Approval Workflow (3-4 days)

### 4.1 Stock entry approval service
**Priority**: IMPORTANT  
**Why**: `stock_entry_approvals` table exists but no service. Any user can post entries directly.

**Files to create/modify**:
- `agritech-api/src/modules/stock-entries/stock-entry-approvals.service.ts` — NEW
  - `requestApproval(stockEntryId, requestedBy)` — Creates approval request, sets entry status to 'Submitted'
  - `approveEntry(approvalId, approvedBy)` — Sets approval status to approved
  - `rejectEntry(approvalId, rejectedBy, reason)` — Sets approval status to rejected
  - `getPendingApprovals(organizationId)` — List pending approvals for managers
- `agritech-api/src/modules/stock-entries/stock-entries.controller.ts`
  - `POST :id/request-approval`
  - `PATCH /approvals/:id/approve`
  - `PATCH /approvals/:id/reject`
  - `GET /approvals/pending`
- `agritech-api/src/modules/stock-entries/stock-entries.service.ts`
  - `postStockEntry()` — Check if approval required. If so, entry must have approved status before posting.
- CASL rules: `approve-stock-entry` action restricted to `farm_manager+`
- `project/src/components/Stock/StockApprovalQueue.tsx` — NEW: manager approval queue
- `project/src/components/Stock/StockEntryList.tsx` — Show approval status badge

**Approval matrix** (CEO to validate):
| Role | Auto-post | Requires Approval |
|------|-----------|-------------------|
| day_laborer, farm_worker | ❌ | All entries |
| farm_manager | ✅ | Transfers > 10,000 MAD |
| organization_admin | ✅ | Never |

**Acceptance Criteria**:
- [ ] Workers can create entries but must submit for approval
- [ ] Managers see approval queue with entry details
- [ ] Approve/reject with mandatory reason on rejection
- [ ] Notification to requester on approval/rejection
- [ ] Managers can auto-post (bypass approval)

---

## Sprint 5 — Barcode + Batch (5-7 days)

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

## Sprint 6 — Offline + Field Ops (7-10 days)

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

## Sprint 7 — Advanced + Cleanup (3-5 days)

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
