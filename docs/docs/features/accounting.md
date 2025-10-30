# Accounting Module

## Overview

The Accounting Module provides full double-entry bookkeeping capabilities integrated into the AgriTech Platform. It supports Chart of Accounts management, journal entries, invoices (sales and purchase), payments, cost center tracking, and comprehensive financial reporting with multi-currency support.

## Key Features

### Double-Entry Bookkeeping

Full implementation of accounting principles:

- **Balanced Entries** - Every transaction has equal debits and credits
- **Automatic Validation** - Database triggers ensure entries always balance
- **Audit Trail** - Complete history of all transactions
- **Period Closing** - Monthly and annual closing procedures
- **Error Prevention** - Cannot post unbalanced entries
- **Reversal Entries** - Proper correction of posted transactions

### Chart of Accounts

Hierarchical account structure:

#### Account Types

1. **Assets** (Type: 1)
   - Current Assets (Cash, Accounts Receivable, Inventory)
   - Fixed Assets (Land, Buildings, Equipment)
   - Accumulated Depreciation

2. **Liabilities** (Type: 2)
   - Current Liabilities (Accounts Payable, Short-term Loans)
   - Long-term Liabilities (Mortgages, Long-term Loans)

3. **Equity** (Type: 3)
   - Owner's Equity
   - Retained Earnings
   - Current Year Profit/Loss

4. **Revenue** (Type: 4)
   - Crop Sales
   - Service Income
   - Other Income

5. **Expenses** (Type: 5)
   - Cost of Goods Sold
   - Operating Expenses (Labor, Materials, Utilities)
   - Administrative Expenses
   - Financial Expenses

#### Account Structure

- **Account Code** - Hierarchical numbering (e.g., 1000, 1100, 1110)
- **Parent Accounts** - Support for nested account hierarchies
- **Control Accounts** - Summary accounts that roll up sub-accounts
- **Active/Inactive** - Disable accounts without deleting history

### General Ledger

Complete journal entry system:

- **Journal Entries** - Header + line items (debits/credits)
- **Entry Types** - Manual, automated (from invoices, payments, tasks)
- **Status Workflow** - Draft → Posted → Locked
- **Reference Numbers** - Automatic sequential numbering
- **Posting Date** - Separate from entry date for period management
- **Descriptions** - Entry and line-level descriptions
- **Cost Center Allocation** - Link entries to farms/parcels
- **Approval Workflow** - Multi-level approval for large entries

### Invoices

Sales and purchase invoice management:

#### Sales Invoices

- **Customer Management** - Track customer details and credit terms
- **Invoice Items** - Multiple line items with quantities and prices
- **Tax Calculations** - Automatic tax computation
- **Status Tracking** - Draft, submitted, paid, overdue, cancelled
- **Payment Allocation** - Link payments to invoices
- **Aging Reports** - Track overdue invoices
- **Automatic GL Posting** - Creates journal entries on submission

#### Purchase Invoices

- **Supplier Integration** - Links to supplier records
- **Three-way Matching** - Purchase order → Receipt → Invoice (future)
- **Cost Allocation** - Assign to farms/parcels/cost centers
- **Payment Terms** - Track due dates and discounts
- **Approval Workflow** - Multi-level approval required
- **Automatic GL Posting** - Updates accounts payable

#### Invoice Features

- **Sequential Numbering** - Automatic invoice number generation
- **Custom Templates** - Branded invoice designs (future)
- **Recurrence** - Recurring invoices for subscriptions (future)
- **Multi-currency** - Foreign currency invoices with exchange rates
- **PDF Export** - Professional PDF invoice generation
- **Email Delivery** - Send invoices directly to customers (future)

### Payments

Comprehensive payment tracking:

#### Payment Types

- **Received Payments** - Customer payments for sales invoices
- **Made Payments** - Supplier payments for purchase invoices

#### Payment Methods

- Cash
- Check
- Bank Transfer
- Credit Card
- Mobile Money
- Other

#### Payment Features

- **Sequential Numbering** - Automatic payment reference numbers
- **Payment Allocation** - Allocate to one or multiple invoices
- **Partial Payments** - Track partial invoice payments
- **Overpayments** - Handle overpayments and credits
- **Bank Reconciliation** - Match payments to bank statements (future)
- **Payment Status** - Draft, submitted, cleared, bounced
- **Automatic GL Posting** - Updates cash/bank and receivables/payables

### Cost Centers

Track profitability by location:

- **Farm-level Cost Centers** - Track costs and revenues per farm
- **Parcel-level Cost Centers** - Detailed profitability per field
- **Cost Allocation** - Assign journal items to cost centers
- **Profitability Reports** - P&L by cost center
- **Comparative Analysis** - Compare performance across farms/parcels
- **Hierarchical Structure** - Cost centers can roll up to parents

### Financial Reports

Comprehensive reporting suite:

#### Core Reports

1. **Balance Sheet**
   - Assets, Liabilities, Equity at a point in time
   - Comparative periods (YoY, QoQ)
   - Common size analysis (percentages)

2. **Profit & Loss Statement (Income Statement)**
   - Revenues and Expenses for a period
   - Gross Profit, Operating Profit, Net Profit
   - Period-over-period comparison
   - By cost center breakdown

3. **Trial Balance**
   - All account balances for a period
   - Debit and credit columns
   - Verification that books balance

4. **General Ledger Report**
   - Detailed transactions by account
   - Date range filtering
   - Running balance column

5. **Cash Flow Statement**
   - Operating, Investing, Financing activities
   - Direct or indirect method
   - Cash position analysis

#### Accounts Receivable Reports

- **Aged Receivables** - Outstanding invoices by age (30, 60, 90+ days)
- **Customer Statements** - Account statements for customers
- **Sales Analysis** - Sales by customer, product, period

#### Accounts Payable Reports

- **Aged Payables** - Outstanding bills by age
- **Supplier Statements** - Payment history by supplier
- **Purchase Analysis** - Purchases by supplier, category

#### Management Reports

- **Cost Center P&L** - Profitability by farm/parcel
- **Budget vs Actual** - Compare to budget (future)
- **Key Performance Indicators** - Financial KPIs
- **Trend Analysis** - Multi-period trend charts

### Multi-Currency Support

Handle multiple currencies:

- **Base Currency** - Organization's primary currency
- **Foreign Currency Transactions** - Record in original currency
- **Exchange Rates** - Daily exchange rate management
- **Revaluation** - Automatic revaluation of foreign balances
- **Exchange Gain/Loss** - Track forex gains and losses
- **Multi-currency Reports** - Reports in base or foreign currency

### Integration with Other Modules

Seamless integration across platform:

- **Purchase Integration** - Auto-create purchase invoices from inventory purchases
- **Task Integration** - Auto-create expense journal entries from task costs
- **Harvest Integration** - Auto-create revenue entries from harvest sales
- **Inventory Integration** - COGS calculation and inventory valuation
- **Payment Integration** - Link payments to bank accounts

## User Interface

### Accounting Dashboard (`/accounting`)

Main accounting interface provides:

1. **Financial Summary Cards**
   - Total Assets
   - Total Liabilities
   - Total Equity
   - Current Month Revenue
   - Current Month Expenses
   - Net Profit/Loss

2. **Quick Access Tiles**
   - Create Journal Entry
   - Create Sales Invoice
   - Create Purchase Invoice
   - Record Payment
   - View Reports

3. **Recent Activity Feed**
   - Latest journal entries
   - Recent invoices
   - Recent payments
   - Pending approvals

4. **Cash Position Graph**
   - Bank account balances over time
   - Cash flow trend
   - Forecasted cash position

5. **Outstanding Items**
   - Unpaid invoices count and amount
   - Overdue payments alert
   - Pending approvals count

### Chart of Accounts View (`/accounting-accounts`)

Account management interface:

1. **Account Tree**
   - Hierarchical display of all accounts
   - Expandable/collapsible sections
   - Account type grouping (Assets, Liabilities, etc.)
   - Account code and name
   - Current balance display
   - Active/inactive indicator

2. **Account Actions**
   - Add new account
   - Edit account details
   - Activate/deactivate account
   - View account ledger
   - View account transactions

3. **Account Detail Panel**
   - Account information
   - Parent account
   - Account type and classification
   - Normal balance (debit/credit)
   - Current balance
   - YTD balance
   - Recent transactions

### General Ledger View (`/accounting-journal`)

Journal entry management:

1. **Entry List Table**
   - Entry date and posting date
   - Entry number (sequential)
   - Description
   - Total debit/credit amount
   - Status (draft, posted, locked)
   - Created by
   - Quick actions (view, edit, post, void)

2. **Entry Detail View**
   - Entry header information
   - Line items table:
     - Account code and name
     - Description
     - Debit amount
     - Credit amount
     - Cost center
     - Farm/Parcel
   - Totals row showing debit = credit
   - Attachments (supporting documents)

3. **Create/Edit Entry Form**
   ```typescript
   {
     entry_date: "2024-10-25",
     posting_date: "2024-10-25",
     description: "Monthly depreciation expense",
     reference: "DEP-2024-10",
     items: [
       {
         account_id: "uuid-depreciation-expense",
         description: "Equipment depreciation",
         debit_amount: 500.00,
         credit_amount: 0,
         cost_center_id: "uuid-farm-1"
       },
       {
         account_id: "uuid-accumulated-depreciation",
         description: "Equipment depreciation",
         debit_amount: 0,
         credit_amount: 500.00
       }
     ]
   }
   ```

### Invoices View (`/accounting-invoices`)

Invoice management interface:

1. **Invoice List**
   - Filter by type (sales/purchase)
   - Filter by status
   - Filter by date range
   - Search by invoice number or party name
   - Columns:
     - Invoice number
     - Date
     - Customer/Supplier
     - Total amount
     - Outstanding amount
     - Due date
     - Status
     - Actions

2. **Invoice Detail**
   - Header: customer/supplier, dates, terms
   - Line items: description, quantity, price, tax, total
   - Subtotal, tax, total
   - Payment history
   - Allocation details
   - GL entry reference
   - Download PDF button

3. **Create Invoice Form**
   - Party selection (customer/supplier)
   - Invoice date and due date
   - Payment terms
   - Line items (dynamic add/remove)
   - Tax selection per line
   - Notes and terms
   - Farm/parcel allocation
   - Automatic total calculation

### Payments View (`/accounting-payments`)

Payment management:

1. **Payment List**
   - Filter by type (received/made)
   - Filter by payment method
   - Filter by date range
   - Columns:
     - Payment number
     - Date
     - Party name
     - Amount
     - Payment method
     - Allocated amount
     - Status
     - Actions

2. **Payment Detail**
   - Payment information
   - Party details
   - Allocation to invoices:
     - Invoice number
     - Original amount
     - Outstanding before payment
     - Allocated amount
     - Outstanding after payment
   - GL entry reference

3. **Record Payment Form**
   - Payment type (received/made)
   - Party selection
   - Payment date
   - Amount
   - Payment method
   - Bank account
   - Reference number
   - Allocate to invoices:
     - List of outstanding invoices
     - Select and allocate amounts
     - Auto-allocate button (oldest first)

### Reports View (`/accounting-reports`)

Financial reporting interface:

1. **Report Selection**
   - Report category tabs:
     - Financial Statements
     - Accounts Receivable
     - Accounts Payable
     - Management Reports
   - Report list with descriptions

2. **Report Parameters**
   - Date range selection (From/To)
   - Comparison period (optional)
   - Cost center filter
   - Account filter
   - Currency selection
   - Report format (detailed/summary)

3. **Report Display**
   - Interactive HTML view
   - Expandable sections
   - Drill-down to transactions
   - Export options:
     - PDF (printable)
     - Excel (editable)
     - CSV (data analysis)
   - Email report (future)

4. **Report Examples**

   **Balance Sheet:**
   ```
   AgriTech Platform - Balance Sheet
   As of October 31, 2024

   ASSETS
     Current Assets
       Cash and Bank                    $25,000
       Accounts Receivable              $15,000
       Inventory                        $30,000
       Total Current Assets             $70,000

     Fixed Assets
       Land                            $200,000
       Buildings                       $150,000
       Equipment                        $80,000
       Less: Accumulated Depreciation  ($50,000)
       Total Fixed Assets              $380,000

   TOTAL ASSETS                        $450,000

   LIABILITIES
     Current Liabilities
       Accounts Payable                 $12,000
       Short-term Loans                 $20,000
       Total Current Liabilities        $32,000

     Long-term Liabilities
       Mortgage Payable                $150,000
       Total Long-term Liabilities     $150,000

   TOTAL LIABILITIES                   $182,000

   EQUITY
     Owner's Equity                    $200,000
     Retained Earnings                  $50,000
     Current Year Profit                $18,000
   TOTAL EQUITY                        $268,000

   TOTAL LIABILITIES & EQUITY          $450,000
   ```

   **Profit & Loss:**
   ```
   AgriTech Platform - Profit & Loss Statement
   For the Month Ended October 31, 2024

   REVENUE
     Crop Sales                         $45,000
     Service Income                      $5,000
     Total Revenue                      $50,000

   COST OF GOODS SOLD
     Seeds                               $8,000
     Fertilizers                         $6,000
     Pesticides                          $3,000
     Total COGS                         $17,000

   GROSS PROFIT                         $33,000

   OPERATING EXPENSES
     Labor Costs                        $12,000
     Utilities                           $2,000
     Equipment Maintenance               $1,500
     Administrative                      $1,500
     Total Operating Expenses           $17,000

   OPERATING PROFIT                     $16,000

   OTHER INCOME/(EXPENSES)
     Interest Income                       $500
     Interest Expense                   ($2,500)
     Total Other                        ($2,000)

   NET PROFIT                           $14,000
   ```

   **Trial Balance:**
   ```
   AgriTech Platform - Trial Balance
   As of October 31, 2024

   Account Code  Account Name                    Debit        Credit
   ----------------------------------------------------------------
   1000          Cash                          $25,000
   1100          Accounts Receivable           $15,000
   1200          Inventory                     $30,000
   1500          Equipment                     $80,000
   1501          Accumulated Depreciation                    $50,000
   2000          Accounts Payable                            $12,000
   3000          Owner's Equity                             $200,000
   4000          Sales Revenue                               $45,000
   5000          Cost of Goods Sold            $17,000
   5100          Labor Expense                 $12,000
   5200          Utilities Expense              $2,000
   ----------------------------------------------------------------
   TOTALS                                    $181,000     $307,000

   OUT OF BALANCE: ($126,000) ❌
   [This is just an example - real system enforces balance]
   ```

## Usage Guide

### Setting Up Chart of Accounts

Initial setup of accounting system:

1. Navigate to `/accounting-accounts`
2. Click "Initialize Chart of Accounts"
3. Choose template:
   - Standard Agricultural
   - Custom (build from scratch)
4. System creates default accounts:
   - Assets (1000-1999)
   - Liabilities (2000-2999)
   - Equity (3000-3999)
   - Revenue (4000-4999)
   - Expenses (5000-9999)
5. Customize accounts:
   - Edit names for your needs
   - Add sub-accounts
   - Set opening balances
6. Activate accounting module

### Creating a Journal Entry

To record a manual journal entry:

1. Navigate to `/accounting-journal`
2. Click "Create Journal Entry"
3. Fill entry header:
   - Entry date: October 25, 2024
   - Description: "Depreciation for October 2024"
4. Add line items:
   - Line 1:
     - Account: 5500 - Depreciation Expense
     - Debit: $500
     - Description: "Monthly equipment depreciation"
   - Line 2:
     - Account: 1501 - Accumulated Depreciation
     - Credit: $500
     - Description: "Monthly equipment depreciation"
5. Verify entry balances (debit = credit)
6. Click "Save as Draft" or "Post"
7. If posted, entry is locked and updates account balances

### Creating a Sales Invoice

To bill a customer:

1. Navigate to `/accounting-invoices`
2. Click "Create Sales Invoice"
3. Fill invoice details:
   ```typescript
   {
     invoice_type: "sales",
     party_name: "ABC Farm Coop",
     invoice_date: "2024-10-25",
     due_date: "2024-11-25",
     payment_terms: "Net 30",
     items: [
       {
         description: "Wheat - Grade A",
         quantity: 1000,
         unit: "kg",
         unit_price: 0.50,
         tax_id: "uuid-vat-20",
         total: 500.00
       },
       {
         description: "Corn - Yellow",
         quantity: 500,
         unit: "kg",
         unit_price: 0.40,
         tax_id: "uuid-vat-20",
         total: 200.00
       }
     ]
   }
   ```
4. System calculates:
   - Subtotal: $700.00
   - Tax (20%): $140.00
   - Total: $840.00
5. Click "Save as Draft" or "Submit"
6. If submitted, system creates GL entry:
   - DR: Accounts Receivable $840
   - CR: Sales Revenue $700
   - CR: VAT Payable $140

### Recording a Payment

To record customer payment:

1. Navigate to `/accounting-payments`
2. Click "Record Payment Received"
3. Fill payment details:
   ```typescript
   {
     payment_type: "received",
     party_name: "ABC Farm Coop",
     payment_date: "2024-10-30",
     amount: 840.00,
     payment_method: "bank_transfer",
     bank_account_id: "uuid-main-bank",
     reference: "TXN-20241030-123"
   }
   ```
4. Allocate to invoices:
   - System shows outstanding invoices for customer
   - Select invoice INV-2024-1025 ($840.00)
   - Allocate full amount
5. Click "Submit Payment"
6. System creates GL entry:
   - DR: Bank Account $840
   - CR: Accounts Receivable $840
7. Invoice status updates to "Paid"

### Running Financial Reports

To generate Balance Sheet:

1. Navigate to `/accounting-reports`
2. Select "Balance Sheet" report
3. Set parameters:
   - As of Date: October 31, 2024
   - Comparison: September 30, 2024 (optional)
   - Format: Detailed
4. Click "Generate Report"
5. Review report in browser
6. Export to PDF for filing or Excel for analysis

### Cost Center Profitability Analysis

To analyze farm profitability:

1. Navigate to `/accounting-reports`
2. Select "Profit & Loss by Cost Center"
3. Set parameters:
   - From: January 1, 2024
   - To: October 31, 2024
   - Cost Centers: Select specific farms or "All"
4. Generate report
5. Review P&L for each farm:
   - Revenue by farm
   - Direct costs by farm
   - Allocated overhead
   - Net profit by farm
6. Identify most/least profitable farms
7. Make data-driven decisions on resource allocation

## API Integration

### Database Schema

**Accounts Table:**
```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type INTEGER NOT NULL, -- 1=Asset, 2=Liability, 3=Equity, 4=Revenue, 5=Expense
  account_subtype TEXT,
  parent_account_id UUID REFERENCES accounts(id),

  description TEXT,
  normal_balance TEXT CHECK (normal_balance IN ('debit', 'credit')),
  is_control_account BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  currency TEXT DEFAULT 'USD',
  tax_id UUID REFERENCES taxes(id),

  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(organization_id, code)
);
```

**Journal Entries Table:**
```sql
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  entry_number TEXT,
  entry_date DATE NOT NULL,
  posting_date DATE NOT NULL,
  description TEXT,
  reference TEXT,

  status TEXT DEFAULT 'draft', -- draft, posted, void
  entry_type TEXT DEFAULT 'manual', -- manual, invoice, payment, automated

  total_debit NUMERIC DEFAULT 0,
  total_credit NUMERIC DEFAULT 0,
  is_balanced BOOLEAN GENERATED ALWAYS AS (total_debit = total_credit) STORED,

  source_document_type TEXT, -- invoice, payment, task, etc.
  source_document_id UUID,

  posted_by UUID REFERENCES user_profiles(id),
  posted_at TIMESTAMPTZ,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT check_balanced CHECK (status != 'posted' OR is_balanced)
);
```

**Journal Items Table:**
```sql
CREATE TABLE journal_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_entry_id UUID REFERENCES journal_entries(id) ON DELETE CASCADE,

  line_number INTEGER,
  account_id UUID REFERENCES accounts(id) NOT NULL,
  description TEXT,

  debit_amount NUMERIC DEFAULT 0 CHECK (debit_amount >= 0),
  credit_amount NUMERIC DEFAULT 0 CHECK (credit_amount >= 0),

  cost_center_id UUID REFERENCES cost_centers(id),
  farm_id UUID REFERENCES farms(id),
  parcel_id UUID REFERENCES parcels(id),

  currency TEXT DEFAULT 'USD',
  exchange_rate NUMERIC DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT check_debit_or_credit CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR
    (credit_amount > 0 AND debit_amount = 0)
  )
);
```

**Invoices Table:**
```sql
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  invoice_number TEXT,
  invoice_type TEXT NOT NULL, -- sales, purchase
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,

  party_name TEXT NOT NULL, -- Customer or Supplier name
  party_contact TEXT,
  party_email TEXT,
  party_address TEXT,

  subtotal NUMERIC DEFAULT 0,
  tax_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  outstanding_amount NUMERIC DEFAULT 0,

  payment_terms TEXT,
  status TEXT DEFAULT 'draft', -- draft, submitted, paid, overdue, cancelled

  farm_id UUID REFERENCES farms(id),
  parcel_id UUID REFERENCES parcels(id),
  cost_center_id UUID REFERENCES cost_centers(id),

  notes TEXT,
  terms_conditions TEXT,

  journal_entry_id UUID REFERENCES journal_entries(id),

  submitted_by UUID REFERENCES user_profiles(id),
  submitted_at TIMESTAMPTZ,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Accounting API Client:**

The platform provides a comprehensive API client at `/Users/boutchaz/Documents/CodeLovers/agritech/project/src/lib/accounting-api.ts` with functions for:

- `getAccounts()` - Fetch chart of accounts
- `createAccount()` - Add new account
- `getInvoices()` - Fetch invoices with filters
- `createInvoice()` - Create sales/purchase invoice
- `createPayment()` - Record payment
- `createJournalEntry()` - Create manual journal entry
- `getAccountBalances()` - Get account balances for reporting
- `getLedger()` - Get general ledger transactions
- `getInvoiceAging()` - Get aged receivables/payables

## Code Examples

### Creating a Journal Entry

```typescript
import { accountingApi } from '@/lib/accounting-api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const CreateJournalEntry = () => {
  const queryClient = useQueryClient();

  const createEntry = useMutation({
    mutationFn: (data: CreateJournalEntryInput) => {
      return accountingApi.createJournalEntry(
        data,
        organizationId,
        userId
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success('Journal entry created');
    }
  });

  const handleSubmit = () => {
    createEntry.mutate({
      entry_date: new Date('2024-10-25'),
      posting_date: new Date('2024-10-25'),
      description: 'Monthly depreciation',
      items: [
        {
          account_id: depreciation_expense_account_id,
          debit_amount: 500,
          credit_amount: 0,
          description: 'Equipment depreciation'
        },
        {
          account_id: accumulated_depreciation_account_id,
          debit_amount: 0,
          credit_amount: 500,
          description: 'Equipment depreciation'
        }
      ]
    });
  };
};
```

### Generating Financial Reports

```typescript
import { accountingApi } from '@/lib/accounting-api';

const BalanceSheetReport = ({ asOfDate }: { asOfDate: Date }) => {
  const { data: accountBalances } = useQuery({
    queryKey: ['account-balances', organizationId, asOfDate],
    queryFn: () => accountingApi.getAccountBalances(organizationId, asOfDate)
  });

  const balanceSheet = useMemo(() => {
    if (!accountBalances) return null;

    const assets = accountBalances.filter(a => a.account_type === 1);
    const liabilities = accountBalances.filter(a => a.account_type === 2);
    const equity = accountBalances.filter(a => a.account_type === 3);

    return {
      totalAssets: assets.reduce((sum, a) => sum + a.balance, 0),
      totalLiabilities: liabilities.reduce((sum, a) => sum + a.balance, 0),
      totalEquity: equity.reduce((sum, a) => sum + a.balance, 0),
      assets,
      liabilities,
      equity
    };
  }, [accountBalances]);

  return (
    <div className="balance-sheet">
      <h1>Balance Sheet as of {formatDate(asOfDate)}</h1>

      <section className="assets">
        <h2>ASSETS</h2>
        {balanceSheet.assets.map(account => (
          <div key={account.id} className="account-line">
            <span>{account.name}</span>
            <span>{formatCurrency(account.balance)}</span>
          </div>
        ))}
        <div className="total">
          <strong>Total Assets</strong>
          <strong>{formatCurrency(balanceSheet.totalAssets)}</strong>
        </div>
      </section>

      {/* Similar sections for Liabilities and Equity */}
    </div>
  );
};
```

## Best Practices

### Chart of Accounts Design

1. **Logical structure** - Group related accounts together
2. **Consistent coding** - Use meaningful, consistent account codes
3. **Granularity** - Balance detail vs simplicity
4. **Scalability** - Leave room for future accounts
5. **Documentation** - Document account purposes

### Journal Entry Management

1. **Clear descriptions** - Describe what, why, and who
2. **Support documents** - Attach invoices, receipts, etc.
3. **Regular posting** - Post entries promptly
4. **Review before posting** - Double-check amounts and accounts
5. **Reversals not deletions** - Correct errors with reversing entries

### Invoice and Payment Processing

1. **Timely invoicing** - Invoice immediately after delivery
2. **Clear terms** - State payment terms clearly
3. **Follow up** - Monitor and follow up on overdue invoices
4. **Accurate allocation** - Properly allocate payments to invoices
5. **Bank reconciliation** - Reconcile bank accounts monthly

### Financial Close Process

1. **Month-end checklist** - Follow consistent closing procedures
2. **Reconciliations** - Reconcile all balance sheet accounts
3. **Accruals** - Record accrued expenses and revenues
4. **Review** - Review financial statements for accuracy
5. **Lock periods** - Lock closed periods to prevent changes

## Related Features

- [Inventory](./inventory.md) - Purchase invoices integration
- [Task Management](./task-management.md) - Expense tracking
- [Farm Management](./farm-management.md) - Cost center tracking

## Troubleshooting

### Journal Entry Won't Post

**Issue:** Cannot post journal entry

**Solutions:**
- Verify entry is balanced (total debit = total credit)
- Check all required fields are filled
- Ensure posting date is not in locked period
- Verify user has permission to post entries

### Invoice Total Incorrect

**Issue:** Invoice total doesn't match line items

**Solutions:**
- Check database triggers are working
- Manually recalculate subtotal and taxes
- Verify tax rates are correct
- Review line item quantities and prices

### Report Shows Incorrect Balances

**Issue:** Financial report balances don't match expectations

**Solutions:**
- Verify all entries are posted
- Check date range is correct
- Ensure no entries are in draft status
- Run trial balance to verify books balance
- Review recent transactions for errors

### Payment Not Updating Invoice

**Issue:** Payment recorded but invoice still shows as unpaid

**Solutions:**
- Verify payment allocation is correct
- Check payment status is "submitted"
- Ensure invoice and payment are in same organization
- Review database triggers for payment_allocations
- Manually update outstanding_amount if needed
