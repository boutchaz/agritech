# ERPNext Adaptation Plan for AgroGina

This plan targets ERPNext behavioral parity using your current stack (NestJS + React + Supabase), without migrating to the Frappe framework.

---

## 0) Goal and Scope

### Primary goal
Make AgroGina operate like ERPNext for inventory, buying, and sales operations with strict document lifecycle, traceability, and valuation consistency.

### In scope
- Stock document lifecycle (`Draft -> Submitted -> Cancelled`)
- Immutable stock ledger as source of truth
- Reorder suggestions to Purchase Order automation
- Buying chain (`Purchase Order -> Purchase Receipt -> Purchase Invoice`)
- Sales chain (`Sales Order -> Delivery Note -> Sales Invoice`)
- Batch/serial enforcement and traceability
- Valuation support (FIFO / Moving Average)
- ERP-grade reports and role/action-level approvals

### Out of scope (initially)
- Full migration to ERPNext/Frappe stack
- Payroll/HR suite
- Advanced CRM marketing automation
- Full MRP/manufacturing planning (unless separately approved)

---

## 1) Program Timeline (12-16 Weeks)

- **Track A:** Inventory Core (lifecycle + ledger + valuation)
- **Track B:** Procurement and Sales document chains
- **Track C:** Traceability, reporting, and governance
- **Track D:** QA/UAT, rollout, and adoption

---

## 2) Phase Plan

## Phase 1 - Foundation Hardening (Weeks 1-3)

### Objectives
- Enforce ERP-style posting controls
- Make stock ledger authoritative
- Keep current barcode/inventory UX working

### Workstreams
- Add stock document lifecycle statuses and posting guards
- Create immutable stock ledger entries on submit
- Implement cancel as reversal entries (never destructive deletes)
- Block edit-after-submit except controlled amend/cancel patterns
- Validate warehouse/item/UOM consistency before submit

### Deliverables
- Status machine and submit/cancel endpoints live
- Ledger table populated from all stock movements
- Compatibility preserved with existing inventory pages

### Acceptance criteria
- Submitted docs are immutable
- Cancel creates exact reversing impact
- On-hand quantities match ledger aggregate for sampled warehouses/items

---

## Phase 2 - Replenishment to Procurement (Weeks 4-6)

### Objectives
- Convert reorder signals into executable procurement documents
- Establish end-to-end buying traceability

### Workstreams
- Implement `Generate PO` from reorder suggestions
- Group reorder lines by supplier + warehouse
- Build/complete `PO -> Receipt -> Invoice` lifecycle
- Track partial receipts and outstanding balances
- Add approval thresholds for higher-value POs

### Deliverables
- One-click reorder-to-draft-PO flow
- Linked receipt and invoice documents
- Traceability from stock receipts back to PO source lines

### Acceptance criteria
- Reorder entries generate valid draft POs
- Partial receipts update pending qty correctly
- Receipt submit writes stock ledger entries

---

## Phase 3 - Sales Chain + Reservation (Weeks 7-9)

### Objectives
- Implement ERP-style outbound flow with allocation and reservation

### Workstreams
- Build/complete `Sales Order -> Delivery Note -> Sales Invoice`
- Reserve stock on confirmed SO
- Expose `on_hand`, `reserved`, `available`, `projected`
- Handle partial deliveries and backorder generation
- Add warehouse-level allocation strategy

### Deliverables
- Full sales chain with linked references
- Reservation engine with shortage visibility

### Acceptance criteria
- Confirmed SO reduces available qty (not on-hand)
- Delivery submit reduces on-hand and posts ledger
- Delivery cancel restores consistency

---

## Phase 4 - Valuation + Accounting Coupling (Weeks 10-12)

### Objectives
- Ensure inventory value and COGS parity with ERP behavior

### Workstreams
- Add valuation methods: FIFO and Moving Average
- Compute valuation at posting-time from method rules
- Auto-post accounting journal entries for key stock/sales/purchase events
- Implement reversal accounting entries on cancel
- Build stock-to-accounting reconciliation checks

### Deliverables
- Deterministic valuation engine
- Posting hooks to accounting layer
- Reconciliation report for variance analysis

### Acceptance criteria
- Repeat transaction sequence yields same valuation outputs
- COGS generated according to policy
- Reconciliation variance within tolerance threshold

---

## Phase 5 - Traceability and Compliance (Weeks 13-14)

### Objectives
- Reach audit-ready inventory traceability

### Workstreams
- Enforce mandatory batch/serial capture per item settings
- Implement expiry and FEFO policy support
- Complete barcode traceability (`scanned_barcode` -> stock docs)
- Add barcode label template printing
- Add trace reports (lot journey, serial movement history)

### Deliverables
- End-to-end trace from receipt to issue
- Compliance-friendly batch/serial reporting

### Acceptance criteria
- Full lot genealogy query works
- Expired batch issuance blocked when policy enabled
- Barcode trace report resolves linked documents

---

## Phase 6 - UAT, Performance, and Rollout (Weeks 15-16)

### Objectives
- Validate reliability and user readiness before broad rollout

### Workstreams
- UAT scenarios for procure-to-stock, order-to-delivery, cancellation reversals
- Performance tuning (indexes, query plans, report pagination)
- Feature-flagged staged rollout by organization
- SOP/training preparation for managers/operators

### Deliverables
- UAT sign-off pack
- Go-live checklist and rollback plan
- Monitoring dashboards and alerting baselines

### Acceptance criteria
- Critical UAT pass rate >= 95%
- No Sev-1 open defects at go-live
- Teams trained and operational

---

## 3) Data Model Changes (Minimum Set)

### Core inventory
- `stock_entries`: `status`, `posting_date`, `posting_time`, `submitted_at/by`, `cancelled_at/by`, `purpose`
- `stock_entry_items`: `valuation_rate`, `amount`, `batch_id`, `serial_no`, `scanned_barcode`
- `stock_ledger_entries` (new/extended immutable table): voucher linkage, quantity delta, valuation context

### Procurement and sales
- `purchase_orders`, `purchase_receipts`, `purchase_invoices`: statuses, references, approval fields
- `sales_orders`, `delivery_notes`, `sales_invoices`: statuses, references, reservation fields

### Item controls
- `items`: `valuation_method`, `has_batch_no`, `has_serial_no`, safety stock/reorder policy fields

---

## 4) API Surface (Minimum)

### Inventory lifecycle
- `POST /stock-entries/:id/submit`
- `POST /stock-entries/:id/cancel`
- `GET /stock-ledger`

### Replenishment and buying
- `POST /reorder-suggestions/generate-po`
- CRUD/lifecycle endpoints for PO, Receipt, Invoice

### Sales
- CRUD/lifecycle endpoints for SO, Delivery, Invoice
- Reservation/projection endpoints

### Traceability
- Batch/serial movement endpoints
- Barcode trace endpoint (`barcode -> linked docs/events`)

---

## 5) Security and Governance

- Keep strict tenant scoping (`x-organization-id`) in every endpoint/query
- Introduce action-level permissions by doctype:
  - create, read, update, submit, cancel, amend, approve
- Add audit logs for:
  - status transitions
  - approval/rejection actions
  - manual overrides and exception paths

---

## 6) Reporting Plan

### ERP baseline reports
- Stock Ledger
- Stock Balance
- Projected Quantity
- Item Movement Summary
- Stock Aging

### Management KPIs
- Stockout rate
- Inventory turns
- Reorder cycle time
- Receiving lead-time variance
- Shrinkage/spoilage indicators

---

## 7) QA Strategy

### Unit
- Lifecycle state transitions
- Valuation calculators
- Reservation and projection formulas

### Integration
- Submit/cancel side effects on ledger and balances
- Procurement/sales chain link integrity

### End-to-end
- Reorder -> PO -> Receipt -> Stock increase
- SO -> Delivery -> Stock decrease
- Cancel/reversal integrity

### Data quality audits
- Stock balance equals ledger aggregate
- Inventory valuation reconciles with accounting totals

---

## 8) Risks and Mitigations

- **Ledger/report query performance**
  - Mitigation: targeted indexes, pagination, optional snapshots
- **Backward compatibility disruption**
  - Mitigation: compatibility DTOs and phased enforcement
- **Valuation migration mismatch**
  - Mitigation: cutover baseline and reconciliation scripts
- **Adoption friction**
  - Mitigation: pilot rollout, SOPs, in-app guidance

---

## 9) Rollout Strategy

1. Pilot org: lifecycle + ledger only
2. Enable reorder-to-PO and buying chain
3. Enable sales chain + reservations
4. Enable valuation/accounting coupling
5. General rollout and legacy path deprecation

Use feature flags per module with rollback switches.

---

## 10) Suggested Ticket Backlog Skeleton

Each ticket should include:
- Title
- Type (`DB` / `API` / `UI` / `QA` / `Docs`)
- Description
- Dependencies
- Acceptance tests
- Risk and estimate

Example ticket:
- **Title:** Add stock entry submit endpoint
- **Type:** API
- **Acceptance:**
  - Draft submits successfully
  - Submitted entry cannot be edited
  - Ledger entries created on submit
  - Validation errors returned with clear reason

---

## Reference
- ERPNext product/module baseline: [ERPNext Introduction](https://docs.frappe.io/erpnext/introduction)
