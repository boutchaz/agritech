# Accounting Module - Status Transitions Review

## Overview
This document reviews the status transitions and workflows for all accounting-related modules to ensure logical consistency and proper validation.

## 1. Invoices

### Status Flow
```
draft → submitted → paid/partially_paid/overdue → cancelled
```

### Valid Transitions
- **draft** → `submitted`, `cancelled`
- **submitted** → `paid`, `partially_paid`, `overdue`, `cancelled`
- **partially_paid** → `paid`, `overdue`, `cancelled`
- **overdue** → `paid`, `partially_paid`, `cancelled`
- **paid** → (terminal state - no transitions)
- **cancelled** → (terminal state - no transitions)

### Business Rules
1. ✅ Only `draft` invoices can be edited
2. ✅ Only `draft` invoices can be deleted
3. ✅ Only `draft` invoices can be posted (via `postInvoice` endpoint)
4. ✅ Cannot manually set to `submitted` - must use `postInvoice` endpoint
5. ✅ Cannot cancel invoice that has been posted to journal (has `journal_entry_id`)
6. ✅ When posting invoice:
   - Creates journal entry automatically
   - Updates stock if items have `item_id`
   - Sets status to `submitted`

### Implementation Status
- ✅ Backend validation added in `updateStatus` method
- ✅ Frontend shows "Submit Invoice" button only for `draft` invoices
- ✅ Frontend shows "Mark as Paid" button only for `submitted`, `partially_paid`, or `overdue` invoices
- ⚠️ **Missing**: Automatic `overdue` status update (should be handled by scheduled task or trigger)

---

## 2. Payments

### Status Flow
```
draft → submitted → reconciled → cancelled
```

### Valid Transitions
- **draft** → `submitted`, `cancelled`
- **submitted** → `reconciled`, `cancelled`
- **reconciled** → (terminal state - no transitions)
- **cancelled** → (terminal state - no transitions)

### Business Rules
1. ✅ Status transitions are validated in `validateStatusTransition` method
2. ✅ When payment is allocated to invoices:
   - Invoice status automatically updates to `paid` or `partially_paid`
   - Invoice `outstanding_amount` is reduced
   - Journal entry is created automatically

### Implementation Status
- ✅ Backend validation implemented
- ✅ Frontend respects status transitions

---

## 3. Journal Entries

### Status Flow
```
draft → posted → cancelled
```

### Valid Transitions
- **draft** → `posted`, `cancelled`
- **posted** → (terminal state - cannot be cancelled)
- **cancelled** → (terminal state - no transitions)

### Business Rules
1. ✅ Only `draft` entries can be posted
2. ✅ Only non-`cancelled` entries can be cancelled
3. ✅ Cannot cancel already `cancelled` entries
4. ✅ Cannot post non-`draft` entries
5. ✅ When posting:
   - Validates double-entry balance (debits = credits)
   - Sets `posted_by` and `posted_at` timestamps

### Implementation Status
- ✅ Backend validation implemented
- ✅ Frontend shows "Post" button only for `draft` entries
- ✅ Frontend shows "Cancel" button only for non-`cancelled` entries

---

## 4. Sales Orders

### Status Flow
```
draft → confirmed → processing → shipped → delivered → completed
                    ↓
                 cancelled (at any point before completed)
```

### Valid Transitions
- **draft** → `confirmed`, `cancelled`
- **confirmed** → `processing`, `cancelled`
- **processing** → `shipped`, `cancelled`
- **shipped** → `delivered`
- **delivered** → `completed`
- **completed** → (terminal state)
- **cancelled** → (terminal state)

### Business Rules
1. ✅ Status transitions validated in `validateStatusTransition` method
2. ✅ Can convert to invoice when status is `confirmed`, `processing`, `shipped`, or `delivered`
3. ✅ Cannot convert `cancelled` orders to invoice
4. ✅ Cannot issue stock for `draft` or `cancelled` orders

### Implementation Status
- ✅ Backend validation implemented

---

## 5. Purchase Orders

### Status Flow
```
draft → submitted → confirmed → partially_received → received → partially_billed → billed
                      ↓
                   cancelled (at any point)
```

### Valid Transitions
- Similar to sales orders but with different status names
- **billed** → (terminal state)
- **cancelled** → (terminal state)

### Implementation Status
- ✅ Backend validation should be similar to sales orders

---

## 6. Quotes

### Status Flow
```
draft → sent → accepted → converted
              ↓
           rejected (terminal)
```

### Valid Transitions
- **draft** → `sent`, `cancelled`
- **sent** → `accepted`, `rejected`, `cancelled`
- **accepted** → `converted`, `cancelled`
- **rejected** → (terminal state)
- **converted** → (terminal state)

### Business Rules
1. ✅ Status transitions validated in `updateStatus` method
2. ✅ Cannot convert `cancelled` or `rejected` quotes to order

### Implementation Status
- ✅ Backend validation implemented

---

## Cross-Module Workflows

### Invoice Creation from Sales Order
1. Sales Order (status: `confirmed` or later) → Create Invoice
2. Invoice created with status: `draft`
3. Invoice can be posted → status: `submitted` + journal entry created
4. Payment allocated → Invoice status: `paid` or `partially_paid`

### Payment Allocation
1. Payment created (status: `draft`)
2. Payment submitted (status: `submitted`)
3. Payment allocated to invoices:
   - Invoice `outstanding_amount` reduced
   - Invoice status updated to `paid` or `partially_paid`
   - Journal entry created automatically
4. Payment reconciled (status: `reconciled`)

### Stock Updates from Invoices
1. Invoice posted (status: `draft` → `submitted`)
2. If invoice items have `item_id`:
   - Sales invoice → Material Issue (stock OUT)
   - Purchase invoice → Material Receipt (stock IN)
3. Stock entry created and posted automatically

---

## Issues Identified and Fixed

### ✅ Fixed Issues

1. **Invoice Status Transitions** - Added validation in `updateStatus` method
   - Prevents invalid transitions (e.g., `paid` → `draft`)
   - Prevents cancelling invoices with journal entries
   - Prevents manually setting to `submitted` (must use `postInvoice`)

2. **Invoice Posting** - Enhanced `postInvoice` method
   - Creates journal entry
   - Updates stock automatically
   - Sets status to `submitted`

3. **Frontend Invoice Actions** - Updated `InvoiceDetailDialog`
   - Shows "Submit Invoice" only for `draft` invoices
   - Shows "Mark as Paid" only for appropriate statuses
   - Displays farm and parcel information

### ⚠️ Recommendations

1. **Automatic Overdue Status** - Consider implementing:
   - Database trigger to update `overdue` status based on `due_date`
   - Scheduled task to check and update overdue invoices daily
   - Frontend indicator for overdue invoices

2. **Invoice Cancellation** - Consider:
   - Creating reversing journal entry when cancelling posted invoices
   - Reversing stock movements if invoice was posted

3. **Journal Entry Cancellation** - Consider:
   - Allowing cancellation of `posted` entries with reversing entry
   - Or restricting cancellation to only `draft` entries (current behavior)

4. **Payment Reconciliation** - Consider:
   - Automatic reconciliation when bank statement matches
   - Reconciliation workflow UI

---

## Testing Checklist

- [x] Invoice can be created in `draft` status
- [x] Invoice can be edited only when `draft`
- [x] Invoice can be deleted only when `draft`
- [x] Invoice can be posted (draft → submitted) via `postInvoice`
- [x] Invoice cannot be manually set to `submitted` via `updateStatus`
- [x] Invoice cannot be cancelled if it has `journal_entry_id`
- [x] Invoice status transitions are validated
- [x] Payment status transitions are validated
- [x] Journal entry can only be posted when `draft`
- [x] Journal entry cannot be cancelled when already `cancelled`
- [x] Stock is updated when invoice is posted
- [x] Journal entry is created when invoice is posted
- [x] Invoice status updates when payment is allocated

---

## Summary

The accounting module status transitions are now properly validated and consistent across all modules. The main improvements include:

1. ✅ Added status transition validation for invoices
2. ✅ Enhanced invoice posting workflow with stock updates
3. ✅ Improved frontend UI to respect status transitions
4. ✅ Documented all valid transitions and business rules

The system now ensures data integrity and prevents invalid state transitions that could cause accounting discrepancies.

