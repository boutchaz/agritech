# Accounting Module Guide

## Overview
Full double-entry bookkeeping system with Chart of Accounts, General Ledger, invoices, payments, and financial reporting.

## Core Concepts

### Double-Entry Accounting
Every transaction has two sides:
- **Debit** (Dr): Asset increases, liability/equity decreases
- **Credit** (Cr): Asset decreases, liability/equity increases

**Rule**: Total debits must equal total credits for every journal entry.

### Account Types
1. **Assets** - Things the organization owns (Cash, Inventory, Equipment)
2. **Liabilities** - Things the organization owes (Loans, Payables)
3. **Equity** - Owner's stake (Capital, Retained Earnings)
4. **Revenue** - Income from operations (Sales, Services)
5. **Expenses** - Costs of operations (Salaries, Utilities, Materials)

## Database Tables

### Chart of Accounts
**Table**: `accounts`

Hierarchical structure:
- Parent account (e.g., "Current Assets")
  - Child accounts (e.g., "Cash", "Accounts Receivable")

**Key Fields**:
- `code` - Account number (e.g., "1000", "5000")
- `name` - Account name
- `type` - Asset, Liability, Equity, Revenue, Expense
- `parent_id` - Parent account for hierarchy
- `is_active` - Active/inactive status

### Journal Entries
**Tables**: `journal_entries` (header), `journal_items` (lines)

**Journal Entry** (Header):
- `entry_number` - Auto-generated sequential number
- `entry_date` - Transaction date
- `description` - Entry description
- `reference` - External reference (invoice #, etc.)
- `total_debit` / `total_credit` - Auto-calculated totals
- `status` - draft, posted, void

**Journal Items** (Lines):
- `account_id` - Account being debited/credited
- `debit` / `credit` - Amounts (one must be 0)
- `description` - Line-level description
- `cost_center_id` - Optional farm/parcel allocation

**Triggers**: Auto-validate balance (`total_debit = total_credit`)

### Invoices
**Tables**: `invoices` (header), `invoice_items` (lines)

**Invoice Types**: `sale` (Accounts Receivable), `purchase` (Accounts Payable)

**Invoice** (Header):
- `invoice_number` - Auto-generated
- `invoice_type` - sale or purchase
- `invoice_date` - Date issued
- `due_date` - Payment due date
- `customer_id` / `supplier_id` - Trading partner
- `subtotal`, `tax_amount`, `total` - Auto-calculated
- `outstanding_balance` - Remaining unpaid amount
- `status` - draft, sent, paid, overdue, void

**Invoice Items** (Lines):
- `description` - Item/service description
- `quantity`, `unit_price` - Pricing
- `tax_rate` - Applicable tax rate
- `amount` - Line total (auto-calculated)

**Triggers**: Auto-update totals on item changes

### Payments
**Tables**: `payments` (header), `payment_allocations` (matching)

**Payment** (Header):
- `payment_number` - Auto-generated
- `payment_date` - Date of payment
- `payment_type` - receipt (customer), payment (supplier)
- `amount` - Total payment amount
- `payment_method` - cash, bank_transfer, cheque, card
- `bank_account_id` - Bank account used
- `reference` - Bank reference, cheque number

**Payment Allocations** (Matching):
- `payment_id` - Payment being allocated
- `invoice_id` - Invoice being paid
- `amount` - Amount allocated to this invoice

**Flow**: Payment → Allocate to invoice(s) → Auto-update `outstanding_balance`

### Cost Centers
**Table**: `cost_centers`

Track costs by farm/parcel for profitability analysis.

**Fields**:
- `name` - Cost center name
- `code` - Unique code
- `type` - farm, parcel, project
- `farm_id` / `parcel_id` - Link to operations

**Usage**: Attach `cost_center_id` to journal items to track costs

### Bank Accounts
**Table**: `bank_accounts`

Manage organization bank accounts linked to GL.

**Fields**:
- `account_name` - Bank account name
- `bank_name` - Financial institution
- `account_number` - Account #
- `currency_id` - Account currency
- `gl_account_id` - Link to Chart of Accounts (Cash account)
- `opening_balance`, `current_balance`

## Integration with Operations

### Automatic Journal Creation

**Purchases** → Journal Entry:
```
Dr. Inventory (or Expense)     1,000
  Cr. Accounts Payable             1,000
```

**Harvests (Sales)** → Journal Entry:
```
Dr. Accounts Receivable        5,000
  Cr. Sales Revenue                5,000
```

**Task Costs** → Journal Entry:
```
Dr. Cost of Goods Sold         500
  Cr. Cash / Payables              500
```

**Payment Received** → Journal Entry:
```
Dr. Cash                       5,000
  Cr. Accounts Receivable          5,000
```

## Financial Reports

### Balance Sheet
**Assets = Liabilities + Equity**

Shows financial position at a point in time.

### Profit & Loss (Income Statement)
**Revenue - Expenses = Net Income**

Shows profitability over a period.

### Trial Balance
List of all accounts with debit/credit balances.

Verification: Total debits = Total credits

### Aged Receivables/Payables
Invoices grouped by age (current, 30 days, 60 days, 90+ days).

## Hooks and Components

### Hooks
- `useAccounts()` - Fetch chart of accounts
- `useJournalEntries()` - Fetch journal entries
- `useInvoices()` - Fetch invoices
- `useInvoicesByType(type)` - Fetch by type (sale/purchase)
- `usePayments()` - Fetch payments

**Location**: `src/hooks/`

### Components
- Accounting dashboard - Overview
- Chart of Accounts editor
- Journal entry form
- Invoice form (sales/purchase)
- Payment form with allocation
- Financial reports viewers

**Location**: `src/components/Accounting/` (or similar)

## Workflows

### Create Invoice
1. Draft invoice with items
2. Calculate totals (subtotal + tax)
3. Post invoice (creates journal entry)
4. Send to customer/record from supplier
5. Track outstanding balance

### Record Payment
1. Create payment record
2. Allocate to one or more invoices
3. Auto-update invoice `outstanding_balance`
4. Create journal entry (Cash Dr, A/R Cr)

### Manual Journal Entry
1. Create journal entry header
2. Add journal items (debits and credits)
3. Verify total_debit = total_credit
4. Post entry

## Best Practices

### Data Entry
- Always verify debits = credits before posting
- Use descriptive references and descriptions
- Attach cost centers for profitability tracking
- Use consistent account codes

### Reconciliation
- Regularly reconcile bank accounts
- Match payments to invoices promptly
- Review aged receivables/payables monthly

### Reporting
- Run Trial Balance to verify integrity
- Generate P&L monthly to track profitability
- Review Balance Sheet quarterly

### Security
- Restrict posting permissions to accounting roles
- Audit trail for all changes (created_by, updated_by)
- Void entries instead of deleting (preserve history)

## Common Issues

**Unbalanced journal entry**: Check that `total_debit = total_credit`. Trigger will prevent posting.

**Invoice total mismatch**: Trigger auto-calculates. If manual override needed, check calculation logic.

**Payment allocation fails**: Ensure payment amount >= allocated amounts. Check invoice status (must not be void).

**Missing GL accounts**: Create accounts first in Chart of Accounts before creating journals.

## Multi-Currency Support

**Table**: `currencies`

**Fields**:
- `code` - Currency code (USD, EUR, MAD)
- `symbol` - Currency symbol ($, €, DH)
- `exchange_rate` - Rate to base currency

**Usage**: Transactions in foreign currencies converted to base currency for reporting.

## Future Enhancements (Roadmap)
- Bank reconciliation module
- Budget vs. Actual reporting
- Cash flow statement
- Multi-company consolidation
- Advanced cost allocation (overhead, depreciation)
