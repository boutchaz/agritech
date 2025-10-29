# Accounting Module - Edge Functions Architecture

## Overview

The accounting module uses Supabase Edge Functions (Deno-based serverless functions) to handle complex business logic, ensuring data integrity, proper double-entry bookkeeping, and centralized transaction management.

## Why Edge Functions?

### Benefits

1. **Server-Side Validation**: Complex accounting rules enforced on the server
2. **Atomic Operations**: Multi-step transactions coordinated in one place
3. **Security**: Sensitive calculations hidden from client code
4. **Performance**: Reduced client-side complexity and round trips
5. **Auditability**: Centralized logging of all financial operations
6. **Double-Entry Enforcement**: Guaranteed balance validation before commit

### Design Principles

- **Single Responsibility**: Each function handles one business operation
- **Idempotency**: Safe to retry on failure
- **Validation First**: All input validated before database changes
- **Error Recovery**: Proper rollback on failure
- **Audit Trail**: Every operation logged with user context

## Edge Functions

### 1. create-invoice

**Purpose**: Creates invoices with items and automatic calculations

**File**: `project/supabase/functions/create-invoice/index.ts`

**Request**:
```typescript
POST /create-invoice
Headers:
  Authorization: Bearer <jwt_token>
  x-organization-id: <org_uuid>

Body:
{
  "invoice_type": "sales" | "purchase",
  "party_name": "Customer/Supplier Name",
  "invoice_date": "2024-10-29",
  "due_date": "2024-11-29",
  "items": [
    {
      "item_name": "Product Name",
      "description": "Optional description",
      "quantity": 10,
      "rate": 100.00,
      "account_id": "<account_uuid>",
      "tax_id": "<tax_uuid>",  // optional
      "cost_center_id": "<cost_center_uuid>"  // optional
    }
  ],
  "remarks": "Optional notes"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "invoice_number": "INV-2024-00001",
    "subtotal": 1000.00,
    "total_tax": 200.00,
    "grand_total": 1200.00,
    "status": "draft",
    "items": [...]
  }
}
```

**Operations**:
1. Validates invoice data
2. Calculates subtotal, tax, and grand total
3. Generates sequential invoice number
4. Creates invoice record
5. Creates invoice items
6. Returns full invoice with items

**Error Handling**:
- Validates at least one item exists
- Validates party name provided
- Rolls back invoice if items creation fails
- Returns detailed error messages

---

### 2. post-invoice

**Purpose**: Posts invoice and creates journal entry with double-entry bookkeeping

**File**: `project/supabase/functions/post-invoice/index.ts`

**Request**:
```typescript
POST /post-invoice
Headers:
  Authorization: Bearer <jwt_token>
  x-organization-id: <org_uuid>

Body:
{
  "invoice_id": "<invoice_uuid>",
  "posting_date": "2024-10-29"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Invoice posted successfully",
  "data": {
    "invoice_id": "uuid",
    "journal_entry_id": "uuid"
  }
}
```

**Operations**:

For **Sales Invoice**:
```
Debit:  Accounts Receivable (1120)  1200.00
Credit:   Revenue Account (4xxx)     1000.00
Credit:   Tax Payable (2120)          200.00
```

For **Purchase Invoice**:
```
Debit:  Expense Account (5xxx)       1000.00
Debit:  Tax Receivable (1130)         200.00
Credit:   Accounts Payable (2110)    1200.00
```

**Process**:
1. Fetch invoice with items
2. Validate invoice is in draft status
3. Fetch required GL accounts
4. Create journal entry header
5. Create journal entry lines based on invoice type
6. Database trigger validates debits = credits
7. Update invoice status to "submitted"
8. Post journal entry
9. Link journal entry to invoice

**Error Handling**:
- Only draft invoices can be posted
- Validates required accounts exist
- Rolls back journal entry if lines creation fails
- Ensures debits equal credits (via DB trigger)

---

### 3. allocate-payment

**Purpose**: Allocates payment to invoices and creates corresponding journal entries

**File**: `project/supabase/functions/allocate-payment/index.ts`

**Request**:
```typescript
POST /allocate-payment
Headers:
  Authorization: Bearer <jwt_token>
  x-organization-id: <org_uuid>

Body:
{
  "payment_id": "<payment_uuid>",
  "allocations": [
    {
      "invoice_id": "<invoice_uuid>",
      "allocated_amount": 600.00
    },
    {
      "invoice_id": "<another_invoice_uuid>",
      "allocated_amount": 600.00
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "message": "Payment allocated successfully",
  "data": {
    "payment_id": "uuid",
    "journal_entry_id": "uuid",
    "allocated_amount": 1200.00,
    "unallocated_amount": 0.00
  }
}
```

**Operations**:

For **Payment Received** (from customer):
```
Debit:  Cash/Bank (1110)              1200.00
Credit:   Accounts Receivable (1120)  1200.00
```

For **Payment Made** (to supplier):
```
Debit:  Accounts Payable (2110)       1200.00
Credit:   Cash/Bank (1110)            1200.00
```

**Process**:
1. Fetch payment details
2. Validate total allocations ≤ payment amount
3. Fetch invoices to validate
4. Verify invoice types match payment type
5. Create payment allocation records
6. Update invoice outstanding amounts and status
7. Create journal entry for payment
8. Create journal lines based on payment type
9. Update payment status
10. Post journal entry

**Invoice Status Updates**:
- If `outstanding_amount <= 0.01`: status = "paid"
- Else: status = "partially_paid"

**Error Handling**:
- Validates payment not already allocated
- Ensures total allocated ≤ payment amount
- Validates invoice types match payment type
- Rolls back on any failure

---

### 4. generate-financial-report

**Purpose**: Generates financial reports with real-time calculations

**File**: `project/supabase/functions/generate-financial-report/index.ts`

**Request**:
```typescript
POST /generate-financial-report
Headers:
  Authorization: Bearer <jwt_token>
  x-organization-id: <org_uuid>

Body:
{
  "report_type": "balance_sheet" | "profit_loss" | "trial_balance" | "general_ledger",
  "start_date": "2024-01-01",  // Optional for balance sheet
  "end_date": "2024-10-29",
  "account_id": "<uuid>",  // Required for general_ledger
  "cost_center_id": "<uuid>"  // Optional filter
}
```

**Response for Balance Sheet**:
```json
{
  "success": true,
  "data": {
    "report_type": "Balance Sheet",
    "as_of_date": "2024-10-29",
    "assets": {
      "accounts": [...],  // Hierarchical tree
      "total": 250000.00
    },
    "liabilities": {
      "accounts": [...],
      "total": 150000.00
    },
    "equity": {
      "accounts": [...],
      "total": 100000.00
    },
    "total_liabilities_equity": 250000.00,
    "balanced": true
  }
}
```

**Response for Profit & Loss**:
```json
{
  "success": true,
  "data": {
    "report_type": "Profit & Loss Statement",
    "period": {
      "start_date": "2024-01-01",
      "end_date": "2024-10-29"
    },
    "revenue": {
      "accounts": [...],
      "total": 125430.00
    },
    "expenses": {
      "accounts": [...],
      "total": 87250.00
    },
    "net_profit": 38180.00,
    "profit_margin": 30.4
  }
}
```

**Response for Trial Balance**:
```json
{
  "success": true,
  "data": {
    "report_type": "Trial Balance",
    "as_of_date": "2024-10-29",
    "accounts": [
      {
        "code": "1110",
        "name": "Cash and Bank",
        "account_type": "Asset",
        "debit": 25000.00,
        "credit": 0.00
      },
      ...
    ],
    "total_debit": 375430.00,
    "total_credit": 375430.00,
    "balanced": true
  }
}
```

**Response for General Ledger**:
```json
{
  "success": true,
  "data": {
    "report_type": "General Ledger",
    "account": {
      "code": "1120",
      "name": "Accounts Receivable",
      "type": "Asset"
    },
    "period": {
      "start_date": "2024-01-01",
      "end_date": "2024-10-29"
    },
    "transactions": [
      {
        "date": "2024-10-28",
        "entry_number": "JV-2024-00015",
        "reference": "INV-2024-00045",
        "remarks": "Sales to Customer",
        "debit": 5200.00,
        "credit": 0.00,
        "balance": 5200.00
      },
      ...
    ],
    "opening_balance": 0.00,
    "closing_balance": 12500.00
  }
}
```

**Operations**:
1. **Balance Sheet**: Calculates account balances as of date, groups by type
2. **Profit & Loss**: Calculates period revenue and expenses, computes net profit
3. **Trial Balance**: Lists all accounts with debit/credit balances, validates balance
4. **General Ledger**: Shows all transactions for specific account with running balance

**Features**:
- Real-time calculations from posted journal entries
- Hierarchical account structure preserved
- Automatic balance validation
- Cost center filtering support
- Running balance calculations

---

## Deployment

### Deploy All Functions

```bash
# Deploy all accounting functions
npx supabase functions deploy create-invoice
npx supabase functions deploy post-invoice
npx supabase functions deploy allocate-payment
npx supabase functions deploy generate-financial-report
```

### Deploy Single Function

```bash
npx supabase functions deploy <function-name>
```

### Test Locally

```bash
# Start local Supabase
npx supabase start

# Serve function locally
npx supabase functions serve create-invoice --env-file .env.local

# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/create-invoice' \
  --header 'Authorization: Bearer <anon_key>' \
  --header 'x-organization-id: <org_id>' \
  --header 'Content-Type: application/json' \
  --data '{"invoice_type":"sales",...}'
```

---

## Client Integration

### Using from React

```typescript
import { supabase } from '@/lib/supabase';

// Create invoice
async function createInvoice(invoiceData: CreateInvoiceRequest) {
  const { data, error } = await supabase.functions.invoke('create-invoice', {
    body: invoiceData,
    headers: {
      'x-organization-id': organizationId,
    },
  });

  if (error) throw error;
  return data;
}

// Post invoice
async function postInvoice(invoiceId: string, postingDate: string) {
  const { data, error } = await supabase.functions.invoke('post-invoice', {
    body: { invoice_id: invoiceId, posting_date: postingDate },
    headers: {
      'x-organization-id': organizationId,
    },
  });

  if (error) throw error;
  return data;
}

// Allocate payment
async function allocatePayment(paymentId: string, allocations: AllocationItem[]) {
  const { data, error } = await supabase.functions.invoke('allocate-payment', {
    body: { payment_id: paymentId, allocations },
    headers: {
      'x-organization-id': organizationId,
    },
  });

  if (error) throw error;
  return data;
}

// Generate report
async function generateReport(reportRequest: GenerateReportRequest) {
  const { data, error } = await supabase.functions.invoke('generate-financial-report', {
    body: reportRequest,
    headers: {
      'x-organization-id': organizationId,
    },
  });

  if (error) throw error;
  return data;
}
```

### Using with TanStack Query

```typescript
import { useMutation, useQuery } from '@tanstack/react-query';

// Mutation for creating invoice
export const useCreateInvoice = () => {
  return useMutation({
    mutationFn: async (invoiceData: CreateInvoiceRequest) => {
      const { data } = await supabase.functions.invoke('create-invoice', {
        body: invoiceData,
        headers: {
          'x-organization-id': getCurrentOrganizationId(),
        },
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['invoices']);
    },
  });
};

// Query for generating report
export const useFinancialReport = (reportRequest: GenerateReportRequest) => {
  return useQuery({
    queryKey: ['financial-report', reportRequest],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke('generate-financial-report', {
        body: reportRequest,
        headers: {
          'x-organization-id': getCurrentOrganizationId(),
        },
      });
      return data;
    },
    enabled: !!reportRequest.report_type,
  });
};
```

---

## Security

### Authentication

All Edge Functions require:
- Valid JWT token in `Authorization` header
- Organization ID in `x-organization-id` header
- User must be authenticated via Supabase Auth

### Authorization

RLS (Row Level Security) policies on database tables ensure:
- Users can only access data from their organizations
- Role-based access controlled via `organization_users` table
- Accounting actions require specific permissions (managed by CASL)

### Data Validation

Each function validates:
- Required fields present
- Data types correct
- Business rules satisfied (e.g., debits = credits)
- Referenced entities exist and belong to organization

---

## Error Handling

### Standard Error Response

```json
{
  "success": false,
  "error": "Detailed error message"
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| Missing authorization header | No JWT provided | Include Authorization header |
| Missing organization ID | No x-organization-id header | Include organization ID header |
| Unauthorized | Invalid/expired JWT | Re-authenticate user |
| Invoice not found | Invalid invoice ID | Verify invoice exists |
| Only draft invoices can be posted | Invoice already posted | Check invoice status |
| Total allocated exceeds payment | Allocation validation failed | Reduce allocation amounts |
| Debits do not equal credits | Journal entry unbalanced | Check calculations (should not happen) |

---

## Database Functions Required

These PostgreSQL functions must exist in the database:

### generate_invoice_number

```sql
CREATE OR REPLACE FUNCTION generate_invoice_number(
  p_organization_id UUID,
  p_invoice_type VARCHAR
) RETURNS VARCHAR AS $$
DECLARE
  v_count INT;
  v_prefix VARCHAR;
  v_number VARCHAR;
BEGIN
  IF p_invoice_type = 'sales' THEN
    v_prefix := 'INV';
  ELSE
    v_prefix := 'BILL';
  END IF;

  SELECT COUNT(*) + 1 INTO v_count
  FROM invoices
  WHERE organization_id = p_organization_id
    AND invoice_type = p_invoice_type
    AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE);

  v_number := v_prefix || '-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(v_count::TEXT, 5, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;
```

### get_account_balance

```sql
CREATE OR REPLACE FUNCTION get_account_balance(
  p_account_id UUID,
  p_end_date DATE
) RETURNS DECIMAL AS $$
DECLARE
  v_balance DECIMAL;
BEGIN
  SELECT COALESCE(SUM(debit - credit), 0) INTO v_balance
  FROM journal_entry_lines jel
  JOIN journal_entries je ON je.id = jel.journal_entry_id
  WHERE jel.account_id = p_account_id
    AND je.posting_date <= p_end_date
    AND je.status = 'posted';

  RETURN v_balance;
END;
$$ LANGUAGE plpgsql;
```

### get_account_balance_period

```sql
CREATE OR REPLACE FUNCTION get_account_balance_period(
  p_account_id UUID,
  p_start_date DATE,
  p_end_date DATE
) RETURNS DECIMAL AS $$
DECLARE
  v_balance DECIMAL;
BEGIN
  SELECT COALESCE(SUM(debit - credit), 0) INTO v_balance
  FROM journal_entry_lines jel
  JOIN journal_entries je ON je.id = jel.journal_entry_id
  WHERE jel.account_id = p_account_id
    AND je.posting_date BETWEEN p_start_date AND p_end_date
    AND je.status = 'posted';

  RETURN v_balance;
END;
$$ LANGUAGE plpgsql;
```

---

## Monitoring & Logging

### View Function Logs

```bash
# View logs for specific function
npx supabase functions logs create-invoice --tail

# View all function logs
npx supabase functions logs --tail
```

### Metrics to Monitor

- Function invocation count
- Error rate
- Average execution time
- Database query performance
- Failed transactions

---

## Future Enhancements

1. **Batch Operations**: Create multiple invoices/payments in one call
2. **Recurring Invoices**: Automatic invoice generation on schedule
3. **Multi-Currency Support**: Currency conversion in Edge Functions
4. **Advanced Reports**: Cash flow, aged receivables/payables
5. **Export Functions**: PDF/Excel generation on server
6. **Webhook Integration**: Notify external systems of accounting events
7. **Approval Workflows**: Multi-step approval via Edge Functions
8. **Period Closing**: Month/year-end closing with validation

---

## Summary

Edge Functions provide:
- ✅ Centralized business logic
- ✅ Server-side validation
- ✅ Atomic multi-step operations
- ✅ Double-entry bookkeeping enforcement
- ✅ Real-time financial calculations
- ✅ Secure, scalable architecture
- ✅ Clean separation of concerns

This architecture ensures data integrity, proper accounting practices, and maintainable code while keeping the client-side simple and focused on presentation.
