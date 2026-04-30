# ERPNext Adaptation — Detailed Implementation Plan (v2)

> Generated: 2026-04-29 | Revised after Oracle review
> Source: `ERPNext-ADAPTATION-PLAN.md` (321 lines, 6 phases, 12-16 weeks)
> Exploration: 11 parallel agents across backend, frontend, mobile, API tests, CASL, sequences, module gating

---

## Executive Summary

AgroGina has a **strong foundation** (~35-45% of ERPNext behavioral parity) but significant integration gaps remain. The codebase already has:

- **Stock document lifecycle**: Draft → Submitted → Posted → Cancelled/Reversed (with approval workflow)
- **Stock movements + valuation**: FIFO/LIFO/Moving Average with immutable movement history
- **GL posting**: Stock entries auto-create journal entries via `stock-accounting.service.ts`
- **Reservation engine**: `stock-reservations.service.ts` with full reserve/release/fulfill/expire flow
- **Purchase + Sales orders**: CRUD with status transitions and convert-to-invoice
- **Batch/Serial tracking**: `inventory_batches`, `inventory_serial_numbers`, barcode system
- **Sequence generation**: `SequencesService` with yearly per-org counting (PREFIX-YYYY-NNNNN)
- **Module gating**: `ModuleEntitlementGuard` + `useModuleEnabled()` + `ModuleGate` component
- **CASL permissions**: Subject/action/resource system with role-based ability factory

**Critical gaps:**
1. Reservation engine exists but isn't wired into sales orders
2. No dedicated `purchase_receipts` or `delivery_notes` documents (receipts go straight to stock_entries)
3. Items DTO/schema drift (reorder_level vs reorder_point, missing DTO fields)
4. No partial receipt/delivery tracking
5. No trace reports (barcode → docs, lot journey)
6. No barcode label printing
7. Lifecycle semantics unclear (submit vs post vs approve)
8. PO/SO status enums drift between TS and DB
9. Mobile client has no purchase/sales flows
10. Phase 6 deliverables (UAT pack, SOPs, rollback plan) not planned

---

## Lifecycle Semantics (Critical Decision)

Before implementation, these must be resolved:

### Stock Entry Lifecycle (Current vs ERPNext)
```
CURRENT:
  Draft ──requestApproval──▶ Submitted ──post──▶ Posted
   │                         │                   │
   │◀──reject────────────────┘                   │
   │                                             reverse
   cancel (Draft/Submitted only)                  creates
   │                                             reversal
   ▼                                             │
 Cancelled                                  Reversed (original)
                                                    │
                                               reversal
                                               (new entry)
```

**ERPNext mapping:** ERPNext "submit" ≈ our "post" (the action that creates ledger entries). Our "Submitted" state is an approval gate, not an ERPNext submit.

**Decision for new documents (purchase_receipts, delivery_notes):**
- `Draft` → editable, no stock impact
- `Submitted` → immutable, submit creates stock entry + posts it atomically
- `Cancelled` → for Draft/Submitted only, no stock impact
- No separate approval gate (simplify — approval is on the parent PO/SO, not the receipt/delivery)

### Purchase Order Lifecycle (Fix Required)
```
CURRENT TS enum:  draft → sent → confirmed → receiving → received → completed → cancelled
CURRENT DB enum:  draft → submitted → confirmed → partially_received → received → partially_billed → billed → cancelled
```
**Must align.** Recommendation: DB enum as source of truth, update TS enum to match.

### Sales Order Lifecycle (Fix Required)
```
CURRENT TS enum:  draft → confirmed → processing → shipped → delivered → completed → cancelled
```
Add: `partially_delivered` (from delivery notes).

---

## Phase 1 — Foundation Hardening (Weeks 1-3)

### What Already Exists ✅

| Feature | File(s) |
|---------|---------|
| Stock entry status enum | `stock-entries/dto/create-stock-entry.dto.ts` |
| Submit via approval | `stock-entry-approvals.service.ts` |
| Post endpoint | `stock-entries.controller.ts` `PATCH :id/post` |
| Cancel endpoint | `stock-entries.controller.ts` `PATCH :id/cancel` |
| Reverse endpoint | `stock-entries.controller.ts` `POST :id/reverse` |
| Edit-after-submit blocking | `stock-entries.service.ts` `revalidateBeforePosting()` |
| Stock movements (de facto ledger) | `stock_movements` table |
| Stock valuation | `stock_valuation` table |
| Valuation methods | `consumeValuation*()` in service |
| GL posting | `stock-accounting.service.ts` |
| Items table fields | `items` schema has valuation_method, has_batch_no, has_serial_no, etc. |

### 1A. Items DTO/Schema Alignment (Bug Fix)

**Problem:** DTOs reference `reorder_level` but schema has `reorder_point`. Several schema columns aren't exposed in DTOs.

**Files to modify:**
- `agritech-api/src/modules/items/dto/create-item.dto.ts` — rename `reorder_level` → `reorder_point`, add `has_batch_no`, `has_serial_no`, `maintain_stock`, `has_expiry_date`
- `agritech-api/src/modules/items/dto/update-item.dto.ts` — same
- `agritech-api/src/modules/items/items.service.ts` — pass new fields in create/update

**DB migration:** None needed — columns already exist. Add to `00000000000000_schema.sql` item comments if needed.

### 1B. Stock Entries — Add Missing Lifecycle Columns

**Add to `00000000000000_schema.sql` (declarative):**
```sql
ALTER TABLE stock_entries
  ADD COLUMN IF NOT EXISTS posting_time time,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid REFERENCES auth.users(id);
```

**Files to modify:**
- `agritech-api/src/modules/stock-entries/dto/create-stock-entry.dto.ts` — add `posting_time?`
- `agritech-api/src/modules/stock-entries/stock-entries.service.ts` — set `submitted_at/by` in approval flow, `cancelled_at/by` in cancel, `posting_time` in post
- `agritech-api/src/modules/stock-entries/stock-entry-approvals.service.ts` — set timestamps in approve/reject

### 1C. Stock Ledger Endpoint

**No new table.** `stock_movements` IS the immutable ledger. Add a dedicated read endpoint.

**Files to modify:**
- `agritech-api/src/modules/stock-entries/stock-entries.controller.ts` — add `GET /stock-ledger` (paginated, filterable by item/warehouse/date range)
- `agritech-api/src/modules/stock-entries/stock-entries.service.ts` — add `getStockLedger()` method with enriched joins (item name, warehouse name, entry number, reference)

### 1D. Frontend — Status Display + Actions

**Files to modify:**
- `project/src/components/Stock/StockEntryList.tsx` — status badge column, conditional action buttons
- `project/src/components/Stock/StockEntryDetail.tsx` — status timeline, block edit for non-Draft
- `project/src/components/Stock/StockEntryForm.tsx` — disable fields when not Draft
- `project/src/lib/api/stock.ts` — add `submitStockEntry()`, `cancelStockEntry()`, `reverseStockEntry()`
- `project/src/hooks/useStockEntries.ts` — add mutation hooks

### 1E. Amend Flow

**Problem:** Original plan requires "controlled amend/cancel patterns." Currently no amend exists — only cancel+recreate.

**Files to modify:**
- `agritech-api/src/modules/stock-entries/stock-entries.service.ts` — add `amendStockEntry()`:
  - Only for Submitted (not Posted) entries
  - Creates a copy with status Draft
  - Links original via `amended_from` column
- Add `amended_from uuid REFERENCES stock_entries(id)` column to `stock_entries` in schema
- `agritech-api/src/modules/stock-entries/stock-entries.controller.ts` — add `POST :id/amend`

### 1F. CASL — New Actions

**Files to modify:**
- `agritech-api/src/modules/casl/action.enum.ts` — add `SUBMIT`, `CANCEL`, `APPROVE`, `AMEND`
- `agritech-api/src/modules/casl/casl-ability.factory.ts` — add role grants for new actions on STOCK_ENTRY
- `agritech-api/src/modules/casl/permissions.decorator.ts` — add `CanSubmitStockEntry`, `CanCancelStockEntry`, `CanApproveStockEntry`
- Wire decorators onto stock entry controller endpoints

---

## Phase 2 — Replenishment to Procurement (Weeks 4-6)

### 2A. Fix PO Status Enum Drift (Bug Fix)

**Align TS enum with DB enum:**
- `agritech-api/src/modules/purchase-orders/dto/purchase-order-filters.dto.ts` — update to: `draft → submitted → confirmed → partially_received → received → partially_billed → billed → cancelled`
- `agritech-api/src/modules/purchase-orders/purchase-orders.service.ts` — fix `validateStatusTransition()`, fix `convertToBill()` to use proper statuses, add data migration for existing POs

**Schema change in `00000000000000_schema.sql`:**
```sql
-- Ensure DB enum includes all values
ALTER TYPE purchase_order_status RENAME TO purchase_order_status_old;
CREATE TYPE purchase_order_status AS ENUM (
  'draft', 'submitted', 'confirmed', 'partially_received', 'received',
  'partially_billed', 'billed', 'cancelled'
);
ALTER TABLE purchase_orders ALTER COLUMN status TYPE purchase_order_status
  USING status::text::purchase_order_status;
DROP TYPE purchase_order_status_old;
```

### 2B. Purchase Receipts Document (NEW)

**Schema in `00000000000000_schema.sql`:**
```sql
CREATE TABLE IF NOT EXISTS purchase_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  receipt_number text NOT NULL,
  receipt_date date NOT NULL DEFAULT now(),
  purchase_order_id uuid REFERENCES purchase_orders(id),
  supplier_id uuid REFERENCES suppliers(id),
  supplier_name text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','cancelled')),
  subtotal numeric(16,2) DEFAULT 0,
  tax_total numeric(16,2) DEFAULT 0,
  total_amount numeric(16,2) DEFAULT 0,
  stock_entry_id uuid REFERENCES stock_entries(id),
  notes text,
  submitted_at timestamptz,
  submitted_by uuid REFERENCES auth.users(id),
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  CONSTRAINT purchase_receipts_org_number UNIQUE (organization_id, receipt_number)
);
ALTER TABLE purchase_receipts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON purchase_receipts
  FOR ALL USING (is_organization_member(organization_id));
CREATE INDEX idx_purchase_receipts_po ON purchase_receipts(purchase_order_id) WHERE purchase_order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS purchase_receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL DEFAULT gen_random_uuid(),
  purchase_receipt_id uuid NOT NULL REFERENCES purchase_receipts(id) ON DELETE CASCADE,
  purchase_order_item_id uuid REFERENCES purchase_order_items(id),
  line_number int NOT NULL,
  item_id uuid NOT NULL REFERENCES items(id),
  item_name text,
  quantity numeric(16,3) NOT NULL,
  rejected_quantity numeric(16,3) DEFAULT 0,
  accepted_quantity numeric(16,3) GENERATED ALWAYS AS (quantity - rejected_quantity) STORED,
  unit_of_measure text,
  unit_price numeric(16,2) DEFAULT 0,
  amount numeric(16,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  batch_number text,
  warehouse_id uuid REFERENCES warehouses(id),
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE purchase_receipt_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON purchase_receipt_items
  FOR ALL USING (is_organization_member(organization_id));
```

**New backend module:** `agritech-api/src/modules/purchase-receipts/`
- `purchase-receipts.module.ts` — imports `SequencesModule`, `StockEntriesModule`
- `purchase-receipts.controller.ts` — CRUD + `POST :id/submit` + `PATCH :id/cancel`, annotated with `@RequireModule('sales_purchasing')`
- `purchase-receipts.service.ts`:
  - `create()`: pull undelivered PO items, generate receipt number via `SequencesService.generatePurchaseReceiptNumber()`
  - `submit()`: create stock entry (Material Receipt, Posted) via stock-entries service, update PO item `received_quantity`, update PO status
  - `cancel()`: only Draft/Submitted, no stock reversal needed (stock entry only created on submit)
  - `update()`: only Draft
- `dto/create-purchase-receipt.dto.ts`
- `dto/update-purchase-receipt.dto.ts`
- `dto/purchase-receipt-filters.dto.ts` extends `PaginatedQueryDto`

**Sequence registration:**
- `agritech-api/src/modules/sequences/sequences.service.ts` — add to `SequenceType` enum: `PURCHASE_RECEIPT`
- Add config: `{ table: 'purchase_receipts', dateColumn: 'receipt_date', prefix: 'PR' }`
- Add public method: `generatePurchaseReceiptNumber(organizationId)`

**CASL registration:**
- `agritech-api/src/modules/casl/subject.enum.ts` — add `PURCHASE_RECEIPT = 'PurchaseReceipt'`
- `agritech-api/src/modules/casl/resources.ts` — add `purchase_receipts → Subject.PURCHASE_RECEIPT`
- `agritech-api/src/modules/casl/casl-ability.factory.ts` — add grants in both `createForUser()` and `getAbilitiesForUser()`
- `agritech-api/src/modules/casl/permissions.decorator.ts` — add `CanCreatePurchaseReceipt`, etc.

**Module registration:**
- `agritech-api/src/app.module.ts` — register PurchaseReceiptsModule

**Frontend (in existing `project/src/components/Billing/` pattern):**
- `project/src/lib/api/purchase-receipts.ts`
- `project/src/hooks/usePurchaseReceipts.ts`
- `project/src/types/purchase-receipts.ts`
- `project/src/components/Billing/PurchaseReceiptForm.tsx`
- `project/src/components/Billing/PurchaseReceiptDetailDialog.tsx`
- `project/src/routes/_authenticated/(accounting)/accounting/purchase-receipts.tsx` — add to `sales_purchasing` navigation_items

### 2C. Generate PO from Reorder Suggestions

**Problem:** Current reorder suggestions return item+stock data, NOT supplier+warehouse grouping.

**Files to modify:**
- `agritech-api/src/modules/stock-entries/stock-entries.service.ts` — enhance `getReorderSuggestions()` to include item's default supplier (`items.supplier_part_number` or a new `default_supplier_id` field)
- `agritech-api/src/modules/stock-entries/stock-entries.controller.ts` — add `POST /reorder-suggestions/generate-po`
- `project/src/lib/api/stock.ts` — add `generatePOFromReorder()`
- `project/src/components/Stock/ReorderSuggestions.tsx` — add "Generate PO" button per supplier group

### 2D. PO Approval Thresholds

**Reuse existing `stock-entry-approvals` pattern.**

**Schema in `00000000000000_schema.sql`:**
```sql
CREATE TABLE IF NOT EXISTS purchase_order_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id uuid NOT NULL REFERENCES purchase_orders(id),
  requested_by uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamptz,
  rejected_by uuid REFERENCES auth.users(id),
  rejected_at timestamptz,
  rejection_reason text,
  created_at timestamptz DEFAULT now()
);
```

**Files to modify:**
- `agritech-api/src/modules/purchase-orders/purchase-orders.service.ts` — auto-request approval when PO total exceeds org threshold (stored in `organization_modules.settings` for `sales_purchasing`)
- `agritech-api/src/modules/purchase-orders/purchase-orders.controller.ts` — add approval endpoints
- `project/src/components/` — extend approval queue UI for POs

### 2E. Partial Receipts

**Already supported by `purchase_receipt_items`** with `quantity` and `rejected_quantity`. The key change is in the submit flow:

- `purchase-receipts.service.ts` submit: update PO item `received_quantity += accepted_quantity` (not full quantity)
- PO status transition: if all items fully received → `received`, else → `partially_received`

---

## Phase 3 — Sales Chain + Reservation (Weeks 7-9)

### 3A. Wire Reservation into Sales Orders

**Files to modify:**
- `agritech-api/src/modules/sales-orders/sales-orders.service.ts`:
  - On `confirmed`: call `stockReservationsService.reserveStock()` for each item
  - On `cancelled`: call `stockReservationsService.releaseReservationsForReference()`
  - On `issueStock()`: call `stockReservationsService.fulfillReservationsForReference()` before creating stock entry
  - Add stock availability validation in `validateStatusTransition()` — reject confirmation if `available < ordered`
- `agritech-api/src/modules/sales-orders/sales-orders.module.ts` — import StockEntriesModule

### 3B. Delivery Notes Document (NEW)

**Schema in `00000000000000_schema.sql`:**
```sql
CREATE TABLE IF NOT EXISTS delivery_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id),
  delivery_note_number text NOT NULL,
  delivery_date date NOT NULL DEFAULT now(),
  sales_order_id uuid REFERENCES sales_orders(id),
  customer_id uuid REFERENCES customers(id),
  customer_name text,
  customer_address text,
  warehouse_id uuid REFERENCES warehouses(id),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','cancelled')),
  subtotal numeric(16,2) DEFAULT 0,
  total_qty numeric(16,3) DEFAULT 0,
  stock_entry_id uuid REFERENCES stock_entries(id),
  notes text,
  submitted_at timestamptz,
  submitted_by uuid REFERENCES auth.users(id),
  cancelled_at timestamptz,
  cancelled_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id),
  CONSTRAINT delivery_notes_org_number UNIQUE (organization_id, delivery_note_number)
);
ALTER TABLE delivery_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON delivery_notes
  FOR ALL USING (is_organization_member(organization_id));
CREATE INDEX idx_delivery_notes_so ON delivery_notes(sales_order_id) WHERE sales_order_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS delivery_note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL DEFAULT gen_random_uuid(),
  delivery_note_id uuid NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
  sales_order_item_id uuid REFERENCES sales_order_items(id),
  line_number int NOT NULL,
  item_id uuid NOT NULL REFERENCES items(id),
  item_name text,
  quantity numeric(16,3) NOT NULL,
  batch_number text,
  warehouse_id uuid REFERENCES warehouses(id),
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE delivery_note_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org_access" ON delivery_note_items
  FOR ALL USING (is_organization_member(organization_id));
```

**Add `partially_delivered` to sales order status enum** in schema.

**New backend module:** `agritech-api/src/modules/delivery-notes/`
- Same structure as purchase-receipts module
- `submit()`: create stock entry (Material Issue, Posted), fulfill reservations, update SO item `delivered_quantity`, update SO status (fully delivered → `delivered`, partially → `partially_delivered`)
- `cancel()`: for Draft/Submitted only, release reservations, no stock reversal (stock entry only created on submit)
- Sequence: `DELIVERY_NOTE` → `{ table: 'delivery_notes', dateColumn: 'delivery_date', prefix: 'DN' }`
- CASL: `DELIVERY_NOTE = 'DeliveryNote'`, resource `delivery_notes`
- Module gating: `@RequireModule('sales_purchasing')` for sales-facing endpoints

**Frontend (in existing `project/src/components/Billing/` pattern):**
- `project/src/lib/api/delivery-notes.ts`
- `project/src/hooks/useDeliveryNotes.ts`
- `project/src/types/delivery-notes.ts`
- `project/src/components/Billing/DeliveryNoteForm.tsx`
- `project/src/components/Billing/DeliveryNoteDetailDialog.tsx`
- `project/src/components/Billing/SalesOrderDetailDialog.tsx` — add "Create Delivery Note" action
- `project/src/routes/_authenticated/(accounting)/accounting/delivery-notes.tsx`

### 3C. Stock Availability Display

**Files to modify:**
- `agritech-api/src/modules/stock-entries/stock-entries.controller.ts` — add `GET /stock-availability`
- `agritech-api/src/modules/stock-entries/stock-entries.service.ts` — add `getStockAvailability()`:
  - `on_hand` = `warehouse_stock_levels.quantity`
  - `reserved` = `warehouse_stock_levels.reserved_quantity`
  - `available` = `warehouse_stock_levels.available_quantity`
  - `projected` = `available + incoming PO qty - outgoing SO qty`
- `project/src/lib/api/stock.ts` — add API method
- `project/src/components/Stock/InventoryStock.tsx` — add reserved/projected columns
- `project/src/components/Stock/ItemManagement.tsx` — show availability on item detail

### 3D. Invoice from Delivered Qty (Fix)

**Problem:** `convertToInvoice()` currently invoices ordered qty, not delivered qty.

**Files to modify:**
- `agritech-api/src/modules/sales-orders/sales-orders.service.ts` — `convertToInvoice()`: use `delivered_quantity` (not `quantity`) as basis for invoicing
- `agritech-api/src/modules/invoices/invoices.service.ts` — validate that invoice qty ≤ delivered qty

### 3E. Backorder Handling

On delivery note submit, if SO still has undelivered qty:
- SO status → `partially_delivered`
- No automatic backorder creation (deferred — explicit scope decision per original plan's "Handle partial deliveries and backorder generation")

---

## Phase 4 — Valuation + Accounting Coupling (Weeks 10-12)

### 4A. Valuation Method Enforcement

**Files to modify:**
- `agritech-api/src/modules/stock-entries/stock-entries.service.ts` — in `processStockMovementsPg()`, look up item's `valuation_method` from DB and use it (override per-line only if item has no method set)

### 4B. Stock-to-Accounting Reconciliation Report

**Files to modify:**
- `agritech-api/src/modules/stock-entries/stock-entries.service.ts` — enhance `getStockGlReconciliation()`:
  - Add variance % calculation
  - Add configurable tolerance threshold (from `organization_modules.settings`)
  - Per-warehouse breakdown
- `project/src/components/Stock/StockReportsDashboard.tsx` — add reconciliation section

### 4C. Valuation Tests

**New file:** `agritech-api/src/modules/stock-entries/__tests__/stock-entries.valuation.spec.ts`
- FIFO: same receipt sequence → same COGS
- Moving Average: same receipt sequence → same average
- Reversal: cancel → valuation restored
- Edge cases: negative stock, expired batches, zero-cost items

---

## Phase 5 — Traceability and Compliance (Weeks 13-14)

### 5A. Enforce Batch/Serial per Item Settings

**Files to modify:**
- `agritech-api/src/modules/stock-entries/stock-entries.service.ts` — in `validateStockEntry()`:
  - If `item.has_batch_no = true` → require `batch_number` on each item line
  - If `item.has_serial_no = true` → require `serial_number` on each item line

### 5B. FEFO Policy Enforcement

**Files to modify:**
- `agritech-api/src/modules/stock-entries/stock-entries.service.ts` — in `processMaterialIssuePg()`:
  - If `item.has_expiry_date = true` → sort batches by expiry ASC (FEFO)
  - Auto-assign batch numbers to issue lines
  - Block expired batch issuance when item policy enabled

### 5C. Barcode Trace Report

**Problem:** No endpoint to trace barcode → all linked documents.

**Files to modify:**
- `agritech-api/src/modules/barcode/barcode.controller.ts` — add `GET /barcodes/:barcode/trace`
- `agritech-api/src/modules/barcode/barcode.service.ts` — add `traceBarcode()`:
  - Look up in `item_barcodes`/`variant_barcodes`
  - Find all `stock_entry_items` with `scanned_barcode`
  - Join to `stock_entries` → `purchase_orders`/`sales_orders`/`delivery_notes` via `reference_type`/`reference_id`
- `project/src/components/Stock/BarcodeTraceReport.tsx` — enter barcode → show document chain

### 5D. Lot Journey Report

**Files to modify:**
- `agritech-api/src/modules/stock-entries/stock-entries.controller.ts` — add `GET /batches/:batchNumber/journey`
- `agritech-api/src/modules/stock-entries/stock-entries.service.ts` — add `getBatchJourney()`:
  - Query `stock_movements` WHERE `batch_number = :batchNumber`
  - Enrich with stock_entry details (entry_number, entry_type, reference)
  - Return chronological movement history
- Extend `project/src/components/Stock/BatchManagement.tsx` with "View Journey" action

### 5E. Serial Movement History

**Files to modify:**
- `agritech-api/src/modules/stock-entries/stock-entries.controller.ts` — add `GET /serials/:serialNumber/history`
- `agritech-api/src/modules/stock-entries/stock-entries.service.ts` — add `getSerialHistory()`:
  - Query `stock_movements` WHERE `serial_number = :serialNumber`
  - Enrich with stock_entry details
- `project/src/components/Stock/BatchManagement.tsx` — add serial history view

### 5F. Barcode Label Template Printing

**New frontend component:** `project/src/components/Stock/BarcodeLabelPrint.tsx`
- Uses `react-jsbarcode` (already installed) to generate printable labels
- Supports batch labels, item labels, location labels
- Print via browser `window.print()` with CSS `@media print` layout

---

## Phase 6 — UAT, Performance, and Rollout (Weeks 15-16)

### 6A. Module Gating (Reuse Existing Infrastructure)

**NOT a new feature flag table.** Use existing `organization_modules` + `ModuleEntitlementGuard` + `useModuleEnabled()`.

**New module slugs needed** (add to `modules` table seed data):
- `purchase_receipts` — controls purchase receipt visibility
- `delivery_notes` — controls delivery note visibility

**Or:** Add to existing `sales_purchasing` module's `navigation_items` array so existing gating covers them.

**Decision needed:** Separate modules vs. sub-features of `sales_purchasing`. Recommendation: sub-features for simpler rollout.

### 6B. Performance Indexes

**Add to `00000000000000_schema.sql`:**
```sql
CREATE INDEX IF NOT EXISTS idx_stock_movements_item_warehouse ON stock_movements(organization_id, item_id, warehouse_id, movement_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_batch ON stock_movements(batch_number) WHERE batch_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_entry_items_barcode ON stock_entry_items(scanned_barcode) WHERE scanned_barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_entry_items_serial ON stock_entry_items(serial_number) WHERE serial_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_purchase_receipts_po ON purchase_receipts(purchase_order_id) WHERE purchase_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_delivery_notes_so ON delivery_notes(sales_order_id) WHERE sales_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_stock_reservations_ref ON stock_reservations(reference_type, reference_id) WHERE reference_type IS NOT NULL;
```

### 6C. UAT Scenarios

**New test files in `api-tests/src/tests/`:**
- `erpnext/procure-to-stock.spec.ts` — Reorder → PO → Receipt → Stock increase
- `erpnext/order-to-delivery.spec.ts` — SO → Delivery Note → Stock decrease
- `erpnext/cancel-reversal.spec.ts` — Cancel receipt/delivery → stock restored
- `erpnext/reservation.spec.ts` — SO confirmation → available qty reduced → delivery fulfills
- `erpnext/valuation-determinism.spec.ts` — Repeat transactions → same valuation

### 6D. UAT Sign-Off Pack

**New file:** `docs/uat/erpnext-uat-checklist.md`
- Per-phase acceptance criteria with pass/fail columns
- Go-live checklist: feature flags, data migration, user training, rollback plan
- Monitoring baselines: stock ledger query time, stock balance accuracy

### 6E. Rollback Plan

- Each phase's schema changes use `IF NOT EXISTS` / `IF EXISTS` for reversibility
- Feature gating allows disabling new modules without code rollback
- Stock movements are immutable — no data corruption risk from rollback
- Document: rollback SQL scripts per phase in `docs/uat/rollback-scripts/`

### 6F. SOP / Training

**New files:**
- `docs/sop/stock-entry-lifecycle.md` — how to create, submit, cancel, reverse stock entries
- `docs/sop/purchase-receipt-workflow.md` — PO → Receipt → Invoice flow
- `docs/sop/delivery-note-workflow.md` — SO → Delivery → Invoice flow
- `docs/sop/batch-serial-tracking.md` — batch/serial enforcement and FEFO

---

## Reporting Plan (From Original — Was Missing)

### ERP Baseline Reports (Phase 1-2)
| Report | Source | Status |
|--------|--------|--------|
| Stock Ledger | `GET /stock-ledger` | New in 1C |
| Stock Balance | `warehouse_stock_levels` + enrichment | Needs endpoint |
| Projected Quantity | `GET /stock-availability` | New in 3C |
| Item Movement Summary | `GET /stock-entries/movements/list` | Exists, needs enrichment |
| Stock Aging | `GET /stock-entries/aging` | Exists |

**New endpoint needed:** `GET /reports/stock-balance` — aggregate `warehouse_stock_levels` with item details, grouped by warehouse/item.

### Management KPIs (Phase 4-6)
| KPI | Calculation | Status |
|-----|------------|--------|
| Stockout rate | days with zero available / total days | Needs implementation |
| Inventory turns | COGS / average inventory value | Needs implementation |
| Reorder cycle time | PO created → Receipt received (avg days) | Needs implementation |
| Receiving lead-time variance | expected vs actual receipt date | Needs implementation |
| Shrinkage/spoilage | reconciliation variance | Exists partially |

**New files:**
- `agritech-api/src/modules/reports/` — new module for KPI calculations
- `project/src/components/Stock/StockReportsDashboard.tsx` — extend with KPI widgets

---

## Mobile Client Impact

### Current Mobile Inventory Code
- `mobile/src/lib/api/inventory.ts` — calls `/items`, `/warehouses`, `/stock-entries`, `/stock-entries/movements/list`
- `mobile/src/hooks/useInventory.ts` — React Query hooks
- `mobile/src/types/inventory.ts` — types for stock entries (Material Receipt/Issue/Transfer/Reconciliation only)
- `mobile/app/(drawer)/(inventory)/entries/new.tsx` — single-line-item form, hardcoded to current types

### Mobile Updates Needed
| Phase | Change |
|-------|--------|
| 2B | Add purchase receipt API/hooks/types/screens |
| 3B | Add delivery note API/hooks/types/screens |
| 5C | Add barcode trace API/hooks/screen |
| All | Extend `entries/new.tsx` for new document types |

---

## API Test Updates

### Current Coverage
- `api-tests/src/tests/inventory/inventory.api.spec.ts` — items, warehouses, stock entries, opening balances
- `api-tests/src/tests/delivery-reception/delivery-reception.api.spec.ts` — reception workflow

### New Tests Needed
| Phase | Test File |
|-------|-----------|
| 2A | `api-tests/src/tests/inventory/po-status-alignment.spec.ts` |
| 2B | `api-tests/src/tests/inventory/purchase-receipts.spec.ts` |
| 3B | `api-tests/src/tests/inventory/delivery-notes.spec.ts` |
| 3A | `api-tests/src/tests/inventory/reservation.spec.ts` |
| 5C | `api-tests/src/tests/inventory/barcode-trace.spec.ts` |

---

## Cross-Cutting: Audit Logging

**Add triggers for new tables** in their schema definitions:
```sql
CREATE TRIGGER purchase_receipts_audit AFTER INSERT OR UPDATE OR DELETE ON purchase_receipts
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER delivery_notes_audit AFTER INSERT OR UPDATE OR DELETE ON delivery_notes
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
```

---

## Cross-Cutting: i18n

**New keys needed in all 3 languages:**
- `project/src/locales/{en,fr,ar}/stock.json` — lifecycle statuses, amend, ledger, availability, batch journey, barcode trace
- `project/src/locales/{en,fr,ar}/accounting.json` — purchase receipt, delivery note, partial receipt/delivery

---

## Implementation Priority & Dependencies

```
Phase 1 (Foundation) — No external dependencies
  1A: Items DTO fix           ← start immediately
  1B: Lifecycle columns       ← parallel with 1A
  1C: Stock ledger endpoint   ← parallel with 1A
  1D: Frontend status UI      ← depends on 1B, 1C
  1E: Amend flow              ← depends on 1B
  1F: CASL new actions        ← parallel with 1A

Phase 2 (Procurement)
  2A: PO status fix           ← start immediately (parallel with Phase 1)
  2B: Purchase receipts       ← depends on 2A, sequences, CASL
  2C: Generate PO from reorder ← depends on 1A (items DTO)
  2D: PO approvals            ← depends on 2A
  2E: Partial receipts        ← depends on 2B

Phase 3 (Sales)
  3A: Wire reservation        ← depends on Phase 1 (stable lifecycle)
  3B: Delivery notes          ← depends on 3A, sequences, CASL
  3C: Availability display    ← depends on 3A
  3D: Invoice from delivered  ← depends on 3B
  3E: Backorder status        ← depends on 3B

Phase 4 (Valuation)
  4A: Valuation enforcement   ← depends on Phase 1
  4B: Reconciliation report   ← depends on 4A
  4C: Valuation tests         ← depends on 4A

Phase 5 (Traceability)
  5A: Batch/serial enforcement ← depends on Phase 1
  5B: FEFO enforcement        ← depends on 5A
  5C: Barcode trace           ← no dependencies (can parallel)
  5D: Lot journey             ← no dependencies (can parallel)
  5E: Serial history          ← no dependencies (can parallel)
  5F: Barcode label printing  ← no dependencies (can parallel)

Phase 6 (Rollout)
  6A: Module gating config    ← depends on all above
  6B: Performance indexes     ← depends on new tables (2B, 3B)
  6C: UAT scenarios           ← depends on all above
  6D: UAT sign-off pack       ← depends on 6C
  6E: Rollback plan           ← depends on schema changes
  6F: SOP / Training          ← depends on all above
```

---

## New Files Summary

### Backend
| File | Phase |
|------|-------|
| `agritech-api/src/modules/purchase-receipts/` (5 files) | 2B |
| `agritech-api/src/modules/delivery-notes/` (5 files) | 3B |
| `agritech-api/src/modules/reports/` (new module, Phase 5) | 5 |
| `agritech-api/src/modules/stock-entries/__tests__/stock-entries.valuation.spec.ts` | 4C |

### Frontend
| File | Phase |
|------|-------|
| `project/src/components/Billing/PurchaseReceiptForm.tsx` | 2B |
| `project/src/components/Billing/PurchaseReceiptDetailDialog.tsx` | 2B |
| `project/src/components/Billing/DeliveryNoteForm.tsx` | 3B |
| `project/src/components/Billing/DeliveryNoteDetailDialog.tsx` | 3B |
| `project/src/components/Stock/BarcodeTraceReport.tsx` | 5C |
| `project/src/components/Stock/BarcodeLabelPrint.tsx` | 5F |
| `project/src/lib/api/purchase-receipts.ts` | 2B |
| `project/src/lib/api/delivery-notes.ts` | 3B |
| `project/src/hooks/usePurchaseReceipts.ts` | 2B |
| `project/src/hooks/useDeliveryNotes.ts` | 3B |
| `project/src/types/purchase-receipts.ts` | 2B |
| `project/src/types/delivery-notes.ts` | 3B |

### Mobile
| File | Phase |
|------|-------|
| `mobile/src/lib/api/purchase-receipts.ts` | 2B |
| `mobile/src/lib/api/delivery-notes.ts` | 3B |
| `mobile/src/hooks/usePurchaseReceipts.ts` | 2B |
| `mobile/src/hooks/useDeliveryNotes.ts` | 3B |
| `mobile/src/types/purchase-receipts.ts` | 2B |
| `mobile/src/types/delivery-notes.ts` | 3B |

### Tests
| File | Phase |
|------|-------|
| `api-tests/src/tests/inventory/purchase-receipts.spec.ts` | 2B |
| `api-tests/src/tests/inventory/delivery-notes.spec.ts` | 3B |
| `api-tests/src/tests/inventory/reservation.spec.ts` | 3A |
| `api-tests/src/tests/erpnext/*.spec.ts` (5 files) | 6C |

### Docs
| File | Phase |
|------|-------|
| `docs/uat/erpnext-uat-checklist.md` | 6D |
| `docs/uat/rollback-scripts/*.sql` | 6E |
| `docs/sop/stock-entry-lifecycle.md` | 6F |
| `docs/sop/purchase-receipt-workflow.md` | 6F |
| `docs/sop/delivery-note-workflow.md` | 6F |
| `docs/sop/batch-serial-tracking.md` | 6F |

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| PO status enum migration breaks existing data | High | Data migration script to remap statuses before deploy |
| Reservation race conditions (concurrent SOs) | High | `SELECT ... FOR UPDATE` in transaction, or optimistic locking |
| Valuation method change affects COGS | High | Module gating (phase 4), cutover baseline, reconciliation |
| Lifecycle semantics mismatch (submit vs post) | High | Resolved in this plan (Section: Lifecycle Semantics) |
| Partial receipt/delivery complexity | Medium | Supported in schema, incremental implementation |
| Feature gating bypass | Low | Existing `ModuleEntitlementGuard` + `useModuleEnabled()` |
| Mobile client lag behind web | Medium | Mobile API layer is thin — parallel updates feasible |
