# Accounting vs Billing - Duplicate Logic Analysis

## Summary

**Answer: YES, there IS duplicate logic between Accounting and Billing modules, but it's in the DATA LAYER, not the UI layer.**

---

## Module Separation

### Accounting Module (`/accounting-*`)
- **Purpose**: Financial recording and double-entry bookkeeping
- **Features**: 
  - Chart of Accounts
  - **Invoices** (sales and purchase)
  - Payments
  - Journal Entries
  - Financial Reports

### Billing Cycle (`/billing-*`)
- **Purpose**: Sales/business process workflow
- **Features**:
  - **Quotes** → Sales Orders → (creates Invoices)
  - **Purchase Orders** → (creates Invoices)

### Relationship
- **Shared Table**: Both use the same `invoices` table
- **Workflow**: `Quotes → Sales Orders → Invoices` (billing creates, accounting manages)
- **Link**: Invoices have `sales_order_id` and `purchase_order_id` foreign keys

---

## Duplicate Logic Found

### 1. Invoice Creation Logic (DUPLICATED)

**Location 1**: Accounting Module
- **File**: `project/src/hooks/useInvoices.ts`
- **Hook**: `useCreateInvoice()`
- **Used by**: `accounting-invoices.tsx` → `InvoiceForm` component
- **Purpose**: Create invoices manually from scratch

**Location 2**: Billing Module - Sales Orders
- **File**: `project/src/hooks/useSalesOrders.ts`
- **Hook**: `useConvertOrderToInvoice()` (lines 130-240)
- **Used by**: `SalesOrderDetailDialog.tsx`
- **Purpose**: Convert sales order to invoice

**Location 3**: Billing Module - Purchase Orders
- **File**: `project/src/hooks/usePurchaseOrders.ts`
- **Hook**: `useConvertPOToBill()` (lines 231-339)
- **Used by**: `PurchaseOrderDetailDialog.tsx`
- **Purpose**: Convert purchase order to bill (purchase invoice)

### Duplicate Code Pattern

All three hooks do similar operations:

```typescript
// 1. Generate invoice number
const { data: invoiceNumber } = await supabase.rpc('generate_invoice_number', {
  p_organization_id: currentOrganization.id,
  p_invoice_type: 'sales' | 'purchase',
});

// 2. Create invoice record
const { data: invoice } = await supabase
  .from('invoices')
  .insert({
    organization_id,
    invoice_number,
    invoice_type,
    party_name,
    invoice_date,
    due_date,
    subtotal,
    tax_total,
    grand_total,
    // ... more fields
  });

// 3. Create invoice items
await supabase
  .from('invoice_items')
  .insert(invoiceItems);
```

**This logic is duplicated 3 times** with slight variations!

---

## What's NOT Duplicated

### UI Components (Correctly Separated)

1. **Accounting**:
   - `InvoiceForm` - Full form for creating invoices manually
   - `InvoiceDetailDialog` - View invoice details
   - Used in `/accounting-invoices` route

2. **Billing**:
   - `SalesOrderDetailDialog` - Has "Create Invoice" button
   - `PurchaseOrderDetailDialog` - Has "Create Bill" button
   - **No invoice form** - Just direct conversion hooks
   - Invoices created from orders don't use InvoiceForm

3. **API Layer**:
   - `accounting-api.ts` has `createInvoice()` method
   - But billing hooks don't use it - they duplicate the logic

---

## Problems Identified

### 1. Code Duplication
- Invoice creation logic exists in 3 places
- Changes to invoice creation logic need to be made in 3 places
- Risk of bugs and inconsistencies

### 2. No Shared Service
- Billing hooks should use the accounting API/utility
- Or create a shared invoice creation service

### 3. Different Approaches
- Accounting: Full form with validation (`InvoiceForm`)
- Billing: Direct hook call with hardcoded dates
- Inconsistent user experience

---

## Recommendations

### Option 1: Use Shared Invoice Creation Service (Recommended)

Create a shared service that all modules use:

```typescript
// lib/invoice-service.ts
export async function createInvoiceFromOrder(order: SalesOrder | PurchaseOrder, options: {
  invoiceDate: string;
  dueDate: string;
  type: 'sales' | 'purchase';
}) {
  // Centralized invoice creation logic
  // Handles both sales and purchase orders
}
```

**Refactor**:
- `useCreateInvoice()` → Uses invoice service
- `useConvertOrderToInvoice()` → Uses invoice service
- `useConvertPOToBill()` → Uses invoice service

### Option 2: Use Existing Accounting API

**Refactor billing hooks to use `accounting-api.createInvoice()`:**

```typescript
// In useSalesOrders.ts
import { accountingApi } from '@/lib/accounting-api';

export function useConvertOrderToInvoice() {
  return useMutation({
    mutationFn: async ({ orderId, invoiceDate, dueDate }) => {
      const order = await fetchSalesOrder(orderId);
      
      // Use accounting API instead of duplicating
      const invoice = await accountingApi.createInvoice({
        invoice_type: 'sales',
        party_name: order.customer_name,
        // ... map order fields to invoice
      }, organizationId, userId);
      
      // Update order status
      await updateOrderInvoicedStatus(orderId);
      
      return invoice;
    }
  });
}
```

### Option 3: Unified Invoice Form with Pre-fill

Create a unified invoice form that can:
- Create invoices from scratch (current behavior)
- Pre-fill from sales orders (new)
- Pre-fill from purchase orders (new)

**Implementation**:
- Modify `InvoiceForm` to accept optional `sourceOrder` prop
- Billing dialogs open `InvoiceForm` with pre-filled data instead of direct conversion

---

## Impact Assessment

### Current State
- ✅ UI is properly separated (no duplication)
- ❌ Data layer has 3x duplicate invoice creation logic
- ❌ Maintenance burden (changes in 3 places)
- ❌ Potential for bugs/inconsistencies

### After Refactoring
- ✅ Single source of truth for invoice creation
- ✅ Consistent behavior across modules
- ✅ Easier to maintain and test
- ✅ Better error handling in one place

---

## Files to Refactor

### High Priority
1. `project/src/hooks/useSalesOrders.ts` - `useConvertOrderToInvoice()`
2. `project/src/hooks/usePurchaseOrders.ts` - `useConvertPOToBill()`
3. `project/src/hooks/useInvoices.ts` - `useCreateInvoice()`

### New/Modified Files
1. Create: `project/src/lib/invoice-service.ts` (shared service)
2. Or modify: `project/src/lib/accounting-api.ts` (use existing)

---

## Conclusion

**Yes, there is duplicate logic** between Accounting and Billing modules, specifically:

1. **Invoice creation logic** is duplicated in 3 hooks
2. The **UI is correctly separated** (no duplication there)
3. The **shared `invoices` table** is correct (as designed)
4. **Recommendation**: Extract invoice creation to a shared service/API

The duplication is in the **data access layer**, not the presentation layer. This is a good candidate for refactoring to improve maintainability.

