# ERPNext Adaptation — UAT Checklist

## Phase 1: Foundation Hardening

| # | Test Case | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 1.1 | Stock entry lifecycle: Draft → Submitted → Posted → Cancelled | Status transitions follow enum rules | | |
| 1.2 | Amend cancelled entry creates new Draft copy | New entry with `amended_from` reference | | |
| 1.3 | Stock ledger endpoint returns movements | `GET /stock-entries/stock-ledger` with correct filters | | |
| 1.4 | Status badges render correctly in UI | Color + icon per status | | |
| 1.5 | Submit/Cancel/Amend buttons appear per status | Draft: Submit. Submitted: Cancel. Cancelled: Amend. | | |
| 1.6 | CASL actions work: Submit, Cancel, Approve, Amend | Only authorized roles can perform actions | | |

## Phase 2: Replenishment to Procurement

| # | Test Case | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 2.1 | PO status enum matches DB | draft → submitted → confirmed → received → billed → cancelled | | |
| 2.2 | Create purchase receipt from PO | Items pre-populated, validates remaining qty | | |
| 2.3 | Submit purchase receipt → stock entry created | Material Receipt posted, PO status updated | | |
| 2.4 | Cancel submitted purchase receipt → stock reversed | Stock entry reversed, PO status reverted | | |
| 2.5 | Generate PO from reorder suggestions | Creates PO with items below reorder point | | |
| 2.6 | PO approval threshold | Auto-approves below threshold, requires approval above | | |
| 2.7 | Purchase receipt list page loads | Paginated, filterable by status/search/date | | |
| 2.8 | Purchase receipt detail dialog | Shows items, status, submit/cancel actions | | |

## Phase 3: Sales Chain + Reservation

| # | Test Case | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 3.1 | SO confirm → stock reserved | `reserved_quantity` increases, `available_quantity` decreases | | |
| 3.2 | SO cancel → reservations released | Reservations removed, quantities restored | | |
| 3.3 | SO status enum aligned | draft → confirmed → processing → partially_delivered → delivered → partially_invoiced → invoiced → cancelled | | |
| 3.4 | Create delivery note from SO | Validates undelivered qty, pre-populates items | | |
| 3.5 | Submit delivery note → stock issued | Material Issue posted, SO `delivered_quantity` updated | | |
| 3.6 | Submit delivery note → SO status updated | `partially_delivered` or `delivered` based on remaining qty | | |
| 3.7 | Submit delivery note → reservations fulfilled | Reservations marked as fulfilled | | |
| 3.8 | Cancel delivery note → stock reversed | Material Issue reversed, SO quantities reverted | | |
| 3.9 | Convert to invoice uses delivered qty | Only delivered (not ordered) quantity invoiced | | |
| 3.10 | Stock availability endpoint | `GET /stock-entries/stock-availability` returns correct available qty | | |
| 3.11 | Delivery note list page loads | Paginated, filterable, mobile responsive | | |
| 3.12 | Delivery note detail dialog | Shows items, status, submit/cancel actions | | |
| 3.13 | SO detail dialog uses new status values | No `shipped`/`completed` references | | |

## Phase 4: Valuation + Accounting

| # | Test Case | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 4.1 | Valuation method enforced | Items use their configured valuation method (FIFO/Moving Average) | | |
| 4.2 | Reconciliation report with variance % | `variance_percent`, `tolerance_threshold`, `within_tolerance` returned | | |
| 4.3 | Reconciliation warehouse breakdown | Per-warehouse physical vs GL values shown | | |
| 4.4 | FIFO determinism | Same receipt sequence → same COGS | | |
| 4.5 | Moving Average determinism | Same receipt sequence → same average cost | | |
| 4.6 | Valuation reversal | Cancel → stock_valuation quantities restored | | |

## Phase 5: Traceability

| # | Test Case | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 5.1 | Batch number required when item.has_batch_no = true | Validation error if missing | | |
| 5.2 | Serial number required when item.has_serial_no = true | Validation error if missing | | |
| 5.3 | FEFO: expired batches skipped | Issues from non-expired batches first | | |
| 5.4 | FEFO: all batches expired → error | BadRequestException thrown | | |
| 5.5 | Batch journey endpoint | `GET /batches/:batchNumber/journey` returns chronological movements | | |
| 5.6 | Serial history endpoint | `GET /serials/:serialNumber/history` returns chronological movements | | |
| 5.7 | Barcode label print component | Renders printable labels | | |

## Phase 6: Performance + Rollout

| # | Test Case | Expected Result | Pass/Fail | Notes |
|---|-----------|----------------|-----------|-------|
| 6.1 | Performance indexes exist | All 7 indexes created in schema | | |
| 6.2 | Module gating for purchase_receipts | Hidden when module disabled | | |
| 6.3 | Module gating for delivery_notes | Hidden when module disabled | | |
