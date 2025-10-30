# Billing Cycle: Quotes, Orders, and Bills

The AgriTech Platform implements a complete billing cycle for both sales and purchases, enabling professional quotation, order management, and invoicing workflows.

## Overview

### Sales Cycle
```
Quote (Quotation/Proforma) → Sales Order → Invoice → Payment
```

### Purchase Cycle
```
Purchase Order (PO) → Bill (Purchase Invoice) → Payment
```

## 1. Quotes (Quotations / Proforma Invoices)

Quotes are preliminary documents sent to customers to propose goods or services at specified prices.

### Features

- **Automatic numbering**: QT-YYYY-00001 format
- **Validity period**: Set expiration date for quote
- **Status tracking**: draft → sent → accepted/rejected/expired
- **Convert to Sales Order**: One-click conversion when accepted
- **Tax calculation**: Full tax support per line item
- **Terms & conditions**: Custom payment/delivery terms

### Quote Statuses

| Status | Description |
|--------|-------------|
| `draft` | Being prepared, not yet sent |
| `sent` | Sent to customer (timestamp recorded) |
| `accepted` | Customer accepted the quote |
| `rejected` | Customer rejected the quote |
| `expired` | Validity period has passed |
| `converted` | Successfully converted to Sales Order |
| `cancelled` | Cancelled by user |

### Creating a Quote

```typescript
import { useCreateQuote } from '@/hooks/useQuotes';

const createQuote = useCreateQuote();

await createQuote.mutateAsync({
  customer_id: 'uuid',
  quote_date: '2025-10-30',
  valid_until: '2025-11-30', // 30 days validity
  items: [
    {
      item_name: 'Premium Oranges',
      description: 'Grade A Valencia Oranges',
      quantity: 500,
      rate: 12.50,
      account_id: 'revenue-account-id',
      tax_id: 'vat-20-id',
    },
  ],
  payment_terms: 'Net 30 days',
  delivery_terms: 'FOB Farm',
  terms_and_conditions: 'Quote valid for 30 days...',
});
```

### Converting Quote to Sales Order

```typescript
import { useConvertQuoteToOrder } from '@/hooks/useQuotes';

const convertQuote = useConvertQuoteToOrder();

const salesOrder = await convertQuote.mutateAsync(quoteId);
// Quote status automatically updated to 'converted'
// Sales Order created with status 'confirmed'
```

## 2. Sales Orders

Sales Orders represent confirmed customer orders that need to be fulfilled.

### Features

- **Automatic numbering**: SO-YYYY-00001 format
- **Delivery tracking**: Track delivered vs. pending quantities
- **Partial invoicing**: Create multiple invoices from one order
- **Fulfillment status**: Track processing, delivery, and invoicing
- **Customer PO linking**: Link to customer's purchase order number

### Sales Order Statuses

| Status | Description |
|--------|-------------|
| `draft` | Being prepared |
| `confirmed` | Order confirmed (usually from quote conversion) |
| `processing` | Being processed/prepared for delivery |
| `partially_delivered` | Some items delivered |
| `delivered` | All items delivered |
| `partially_invoiced` | Some items invoiced |
| `invoiced` | Fully invoiced |
| `cancelled` | Cancelled |

### Status Flow

```
draft → confirmed → processing → delivered → invoiced
              ↓                      ↓
         cancelled            partially_invoiced
```

### Converting Sales Order to Invoice

```typescript
import { useConvertOrderToInvoice } from '@/hooks/useSalesOrders';

const convertToInvoice = useConvertOrderToInvoice();

const invoice = await convertToInvoice.mutateAsync({
  orderId: 'uuid',
  invoiceDate: '2025-10-30',
  dueDate: '2025-11-30',
});

// Sales Order status updated to 'invoiced' or 'partially_invoiced'
// Invoice created with link back to Sales Order
```

### Partial Invoicing

The system supports creating multiple invoices from a single sales order:

```typescript
// First invoice for 50% of order
await convertToInvoice.mutateAsync({
  orderId: 'order-uuid',
  invoiceDate: '2025-10-30',
  dueDate: '2025-11-15',
});
// Order status: partially_invoiced

// Second invoice for remaining 50%
await convertToInvoice.mutateAsync({
  orderId: 'order-uuid',
  invoiceDate: '2025-11-05',
  dueDate: '2025-11-30',
});
// Order status: invoiced
```

## 3. Purchase Orders

Purchase Orders are sent to suppliers to order goods or services.

### Features

- **Automatic numbering**: PO-YYYY-00001 format
- **Receipt tracking**: Track received vs. pending quantities
- **Partial billing**: Suppliers can bill in multiple installments
- **Supplier confirmation**: Track submitted and confirmed statuses
- **Delivery address**: Specify warehouse/farm delivery location

### Purchase Order Statuses

| Status | Description |
|--------|-------------|
| `draft` | Being prepared |
| `submitted` | Submitted to supplier (timestamp recorded) |
| `confirmed` | Supplier confirmed the PO |
| `partially_received` | Some items received |
| `received` | All items received |
| `partially_billed` | Supplier billed partially |
| `billed` | Fully billed |
| `cancelled` | Cancelled |

### Creating a Purchase Order

```typescript
import { useCreatePurchaseOrder } from '@/hooks/usePurchaseOrders';

const createPO = useCreatePurchaseOrder();

await createPO.mutateAsync({
  supplier_id: 'uuid',
  po_date: '2025-10-30',
  expected_delivery_date: '2025-11-15',
  items: [
    {
      item_name: 'Fertilizer NPK 15-15-15',
      description: '50kg bags',
      quantity: 100,
      rate: 250.00,
      account_id: 'expense-account-id',
      tax_id: 'vat-20-id',
    },
  ],
  payment_terms: 'Net 45 days',
  delivery_terms: 'Delivered to farm',
  supplier_quote_ref: 'SQ-2025-123',
});
```

### Converting Purchase Order to Bill

```typescript
import { useConvertPOToBill } from '@/hooks/usePurchaseOrders';

const convertToBill = useConvertPOToBill();

const bill = await convertToBill.mutateAsync({
  poId: 'uuid',
  invoiceDate: '2025-10-30',
  dueDate: '2025-12-15',
});

// PO status updated to 'billed' or 'partially_billed'
// Purchase Invoice created with link back to PO
```

## 4. Invoices (Final Billing Documents)

Invoices are the final billing documents created from Sales Orders (sales invoices) or Purchase Orders (bills/purchase invoices).

### Linking

- **Sales Invoices**: Linked to Sales Orders via `sales_order_id`
- **Purchase Invoices**: Linked to Purchase Orders via `purchase_order_id`

### Features

- Full tax calculation with per-line tax amounts
- Payment tracking and allocation
- Journal entry creation for accounting
- PDF generation and printing
- Email delivery to customers/suppliers

## Database Schema

### Quotes Table

```sql
CREATE TABLE quotes (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  quote_number VARCHAR(100) UNIQUE,
  quote_date DATE NOT NULL,
  valid_until DATE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  customer_name VARCHAR(255) NOT NULL,
  subtotal DECIMAL(15, 2),
  tax_total DECIMAL(15, 2),
  grand_total DECIMAL(15, 2),
  status quote_status DEFAULT 'draft',
  sales_order_id UUID, -- Link when converted
  ...
);
```

### Sales Orders Table

```sql
CREATE TABLE sales_orders (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  order_number VARCHAR(100) UNIQUE,
  order_date DATE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  customer_name VARCHAR(255) NOT NULL,
  subtotal DECIMAL(15, 2),
  tax_total DECIMAL(15, 2),
  grand_total DECIMAL(15, 2),
  invoiced_amount DECIMAL(15, 2) DEFAULT 0,
  outstanding_amount DECIMAL(15, 2),
  status sales_order_status DEFAULT 'draft',
  quote_id UUID REFERENCES quotes(id), -- Source quote
  ...
);
```

### Purchase Orders Table

```sql
CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL,
  po_number VARCHAR(100) UNIQUE,
  po_date DATE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  supplier_name VARCHAR(255) NOT NULL,
  subtotal DECIMAL(15, 2),
  tax_total DECIMAL(15, 2),
  grand_total DECIMAL(15, 2),
  billed_amount DECIMAL(15, 2) DEFAULT 0,
  outstanding_amount DECIMAL(15, 2),
  status purchase_order_status DEFAULT 'draft',
  ...
);
```

## Workflow Examples

### Example 1: Complete Sales Cycle

```typescript
// 1. Customer requests quote
const quote = await createQuote.mutateAsync({
  customer_id: 'cust-123',
  quote_date: '2025-10-30',
  valid_until: '2025-11-30',
  items: [/* ... */],
});

// 2. Send quote to customer
await updateQuoteStatus.mutateAsync({
  quoteId: quote.id,
  status: 'sent',
});

// 3. Customer accepts
await updateQuoteStatus.mutateAsync({
  quoteId: quote.id,
  status: 'accepted',
});

// 4. Convert to Sales Order
const order = await convertQuoteToOrder.mutateAsync(quote.id);

// 5. Mark as processing
await updateSalesOrderStatus.mutateAsync({
  orderId: order.id,
  status: 'processing',
});

// 6. Deliver goods
await updateSalesOrderStatus.mutateAsync({
  orderId: order.id,
  status: 'delivered',
});

// 7. Create invoice
const invoice = await convertOrderToInvoice.mutateAsync({
  orderId: order.id,
  invoiceDate: '2025-11-01',
  dueDate: '2025-12-01',
});

// 8. Post invoice to create journal entry
await postInvoice.mutateAsync({
  invoice_id: invoice.id,
  posting_date: '2025-11-01',
});

// 9. Record payment when received
await createPayment.mutateAsync({
  payment_type: 'received',
  party_id: 'cust-123',
  party_name: 'Customer Name',
  amount: invoice.grand_total,
  payment_date: '2025-12-01',
  payment_method: 'bank_transfer',
});
```

### Example 2: Purchase Cycle

```typescript
// 1. Create Purchase Order
const po = await createPurchaseOrder.mutateAsync({
  supplier_id: 'supp-456',
  po_date: '2025-10-30',
  expected_delivery_date: '2025-11-15',
  items: [/* ... */],
});

// 2. Submit to supplier
await updatePurchaseOrderStatus.mutateAsync({
  poId: po.id,
  status: 'submitted',
});

// 3. Supplier confirms
await updatePurchaseOrderStatus.mutateAsync({
  poId: po.id,
  status: 'confirmed',
});

// 4. Goods received
await updatePurchaseOrderStatus.mutateAsync({
  poId: po.id,
  status: 'received',
});

// 5. Supplier sends bill
const bill = await convertPOToBill.mutateAsync({
  poId: po.id,
  invoiceDate: '2025-11-15',
  dueDate: '2025-12-30',
});

// 6. Post bill
await postInvoice.mutateAsync({
  invoice_id: bill.id,
  posting_date: '2025-11-15',
});

// 7. Pay supplier
await createPayment.mutateAsync({
  payment_type: 'paid',
  party_id: 'supp-456',
  party_name: 'Supplier Name',
  amount: bill.grand_total,
  payment_date: '2025-12-30',
  payment_method: 'bank_transfer',
});
```

## Hooks API Reference

### useQuotes()

```typescript
const { data: quotes, isLoading, error } = useQuotes(status?);
```

Fetch all quotes, optionally filtered by status.

### useCreateQuote()

```typescript
const createQuote = useCreateQuote();
await createQuote.mutateAsync({ customer_id, quote_date, valid_until, items, ... });
```

Create a new quote with automatic tax calculation.

### useConvertQuoteToOrder()

```typescript
const convertQuote = useConvertQuoteToOrder();
const salesOrder = await convertQuote.mutateAsync(quoteId);
```

Convert an accepted quote to a sales order.

### useSalesOrders()

```typescript
const { data: orders, isLoading, error } = useSalesOrders(status?);
```

Fetch all sales orders, optionally filtered by status.

### useConvertOrderToInvoice()

```typescript
const convertToInvoice = useConvertOrderToInvoice();
const invoice = await convertToInvoice.mutateAsync({ orderId, invoiceDate, dueDate });
```

Convert a sales order to an invoice (supports partial invoicing).

### usePurchaseOrders()

```typescript
const { data: pos, isLoading, error } = usePurchaseOrders(status?);
```

Fetch all purchase orders, optionally filtered by status.

### useCreatePurchaseOrder()

```typescript
const createPO = useCreatePurchaseOrder();
await createPO.mutateAsync({ supplier_id, po_date, items, ... });
```

Create a new purchase order with automatic tax calculation.

### useConvertPOToBill()

```typescript
const convertToBill = useConvertPOToBill();
const bill = await convertToBill.mutateAsync({ poId, invoiceDate, dueDate });
```

Convert a purchase order to a bill (purchase invoice).

## Benefits

### For Sales

1. **Professional quotations**: Send detailed quotes with terms and validity
2. **Traceability**: Track quote → order → invoice → payment
3. **Partial fulfillment**: Invoice in multiple installments
4. **Customer satisfaction**: Clear process from quote to delivery

### For Purchases

1. **Purchase control**: Formal PO approval process
2. **Receipt tracking**: Match received goods to POs
3. **Budget management**: Track committed vs. actual spending
4. **Supplier relations**: Professional procurement workflow

### For Accounting

1. **Complete audit trail**: Every transaction linked
2. **Accurate costing**: Match actual costs to orders
3. **Revenue recognition**: Invoice based on delivery
4. **Financial reporting**: Clear AR/AP tracking

## Best Practices

1. **Always create quotes first** for new customers or non-standard orders
2. **Set realistic validity periods** (typically 30 days for quotes)
3. **Convert promptly** when quotes are accepted
4. **Track delivery status** before invoicing
5. **Use partial invoicing** for large orders or phased delivery
6. **Record receipts** before converting POs to bills
7. **Maintain reference numbers** (customer PO, supplier quote ref)
8. **Review before submitting** POs to suppliers

## Future Enhancements

- **Email templates**: Auto-send quotes/orders/invoices
- **PDF generation**: Branded documents
- **Approval workflows**: Multi-level approval for large POs
- **Delivery notes**: Generate packing slips from orders
- **Goods receipt notes**: Formal receipt documentation
- **Contract management**: Long-term supply agreements
- **Price lists**: Automated quote generation from catalogs
- **Recurring orders**: Template-based repeat orders

## See Also

- [Invoices](/features/invoicing)
- [Payments](/features/payments)
- [Tax Calculations](/testing/tax-calculations)
- [Accounting Module](/features/accounting)
