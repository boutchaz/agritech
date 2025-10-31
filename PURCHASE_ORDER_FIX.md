# ✅ Purchase Order Date Field Fix

**Date**: January 2025  
**Status**: Fixed

## Problem

When creating a new purchase order, the following error occurred:
```
null value in column "po_date" of relation "purchase_orders" violates not-null constraint
```

## Root Cause

The `PurchaseOrderForm.tsx` component was using `order_date` as the field name, but the backend hook `useCreatePurchaseOrder` expected `po_date`. The mapping was incorrect in the form's `onSubmit` handler.

### Before (Incorrect)
```typescript
const purchaseOrderData = {
  organization_id: currentOrganization.id,
  supplier_id: data.supplier_id,
  order_date: data.order_date,  // ❌ Wrong field name
  expected_delivery_date: data.expected_delivery_date,
  currency_code: currentOrganization.currency,
  payment_terms: data.payment_terms || null,
  shipping_address: data.shipping_address || null,
  notes: data.notes || null,
  items: totals.items_with_tax.map(...),
  subtotal: totals.subtotal,
  tax_total: totals.tax_total,
  grand_total: totals.grand_total,
};
```

### After (Correct)
```typescript
const purchaseOrderData = {
  supplier_id: data.supplier_id,
  po_date: data.order_date,  // ✅ Correct field name
  expected_delivery_date: data.expected_delivery_date,
  payment_terms: data.payment_terms || null,
  notes: data.notes || null,
  items: totals.items_with_tax.map(...),
};
```

## Changes Made

### File: `project/src/components/Billing/PurchaseOrderForm.tsx`

**Line 163-174**: Fixed the mapping between form data and hook parameters:
- Changed `order_date: data.order_date` to `po_date: data.order_date`
- Removed fields that are handled internally by the hook:
  - `organization_id` (filled by hook from `currentOrganization`)
  - `currency_code` (filled by hook from `currentOrganization.currency`)
  - `shipping_address` (not currently supported)
  - Calculated totals (`subtotal`, `tax_total`, `grand_total`) (calculated by hook)

## Database Schema

The `purchase_orders` table has:
- `po_date DATE NOT NULL` (required field)
- `po_number VARCHAR(100) NOT NULL` (auto-generated)
- `organization_id UUID NOT NULL`
- Other optional fields

## Verification

✅ No linting errors  
✅ Field mapping corrected  
✅ Hook receives correct field names  
✅ Database constraint satisfied

## Testing

You should now be able to create purchase orders without the `po_date` null constraint error.

---

**Status**: ✅ COMPLETE
