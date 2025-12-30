# Accounting Module Guide

## Overview
Full double-entry bookkeeping system with Chart of Accounts, General Ledger, invoices, payments, and financial reporting.

## Core Concepts

### Double-Entry Accounting

Double-Entry Bookkeeping is an accounting system where **every financial transaction affects at least two accounts**, and **Total Debits always equal Total Credits**.

**Fundamental Principle**: For every journal entry, the sum of debit amounts MUST equal the sum of credit amounts.

#### Accounting Equation
```
Assets = Liabilities + Equity
```

This equation remains true after every transaction when using double-entry bookkeeping.

#### Debit and Credit Rules

| Account Type | Increase | Decrease | Normal Balance |
|-------------|----------|----------|----------------|
| **Assets** | Debit | Credit | Debit |
| **Liabilities** | Credit | Debit | Credit |
| **Equity** | Credit | Debit | Credit |
| **Revenue** | Credit | Debit | Credit |
| **Expenses** | Debit | Credit | Debit |

**Examples**:
- **Debit** (Dr): Asset increases, Expense increases, Liability/Equity/Revenue decreases
- **Credit** (Cr): Asset decreases, Expense decreases, Liability/Equity/Revenue increases

#### System Enforcement

The system enforces double-entry at **three levels**:

1. **Database Constraint** (lines [1178-1179](project/supabase/migrations/00000000000000_schema.sql#L1178-L1179)):
   ```sql
   ALTER TABLE journal_entries ADD CONSTRAINT journal_entry_balanced
     CHECK (ABS(total_debit - total_credit) < 0.01);
   ```

2. **Database Trigger** ([20251201000000_fix_journal_entry_totals.sql](project/supabase/migrations/20251201000000_fix_journal_entry_totals.sql)):
   - Automatically calculates `total_debit` and `total_credit` from journal_items
   - Fires after INSERT/UPDATE/DELETE on journal_items
   - Validates balance constraint immediately

3. **Application Validation**:
   - Edge Functions: [post-invoice](project/supabase/functions/post-invoice/index.ts#L161-L171), [allocate-payment](project/supabase/functions/allocate-payment/index.ts#L217-L227)
   - NestJS Service: [accounting-automation.service.ts](agritech-api/src/modules/journal-entries/accounting-automation.service.ts#L103-L111)
   - Validates balance before inserting journal items
   - Rolls back transaction if validation fails

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

The system automatically creates journal entries for common business transactions. All entries follow the double-entry principle.

#### 1. Sales Invoice (Revenue Recognition)

**Business Event**: Customer places an order for 500 MAD worth of produce

**Journal Entry**:
| Account | Debit | Credit | Description |
|---------|-------|--------|-------------|
| 1200 - Accounts Receivable | 500.00 | 0.00 | Invoice #INV-001 receivable |
| 4000 - Sales Revenue | 0.00 | 500.00 | Produce sales |

**Code**: [post-invoice Edge Function](project/supabase/functions/post-invoice/index.ts)

**T-Account View**:
```
    Accounts Receivable (1200)          Sales Revenue (4000)
    -------------------------           --------------------
Dr. |  500.00  |           |        |           | 500.00  Cr.
    |          |           |        |           |
```

---

#### 2. Purchase Invoice (Expense Recognition)

**Business Event**: Purchase fertilizer for 1,000 MAD

**Journal Entry**:
| Account | Debit | Credit | Description |
|---------|-------|--------|-------------|
| 5100 - Fertilizer Expense | 1,000.00 | 0.00 | Fertilizer purchase |
| 2110 - Accounts Payable | 0.00 | 1,000.00 | Invoice #PO-001 payable |

**Code**: [post-invoice Edge Function](project/supabase/functions/post-invoice/index.ts)

---

#### 3. Payment Received (Cash Collection)

**Business Event**: Customer pays invoice of 500 MAD

**Journal Entry**:
| Account | Debit | Credit | Description |
|---------|-------|--------|-------------|
| 1110 - Cash/Bank | 500.00 | 0.00 | Payment received via bank_transfer |
| 1200 - Accounts Receivable | 0.00 | 500.00 | Payment from Customer A |

**Code**: [allocate-payment Edge Function](project/supabase/functions/allocate-payment/index.ts)

**Effect**: Reduces outstanding receivables, increases cash balance

---

#### 4. Payment Made (Cash Disbursement)

**Business Event**: Pay supplier invoice of 1,000 MAD

**Journal Entry**:
| Account | Debit | Credit | Description |
|---------|-------|--------|-------------|
| 2110 - Accounts Payable | 1,000.00 | 0.00 | Payment to Supplier B |
| 1110 - Cash/Bank | 0.00 | 1,000.00 | Payment made via bank_transfer |

**Code**: [allocate-payment Edge Function](project/supabase/functions/allocate-payment/index.ts)

**Effect**: Reduces outstanding payables, decreases cash balance

---

#### 5. Cost Entry (Operating Expense)

**Business Event**: Record labor cost of 200 MAD

**Journal Entry**:
| Account | Debit | Credit | Description |
|---------|-------|--------|-------------|
| 5200 - Labor Expense | 200.00 | 0.00 | Labor cost for harvesting |
| 1110 - Cash/Bank | 0.00 | 200.00 | Payment for labor |

**Code**: [accounting-automation.service.ts](agritech-api/src/modules/journal-entries/accounting-automation.service.ts#L17-L137)

**Note**: Uses account_mappings to dynamically select expense account based on cost_type

---

#### 6. Revenue Entry (Cash Sale)

**Business Event**: Direct cash sale of 300 MAD

**Journal Entry**:
| Account | Debit | Credit | Description |
|---------|-------|--------|-------------|
| 1110 - Cash/Bank | 300.00 | 0.00 | Receipt for harvest_sale |
| 4000 - Sales Revenue | 0.00 | 300.00 | Direct sale revenue |

**Code**: [accounting-automation.service.ts](agritech-api/src/modules/journal-entries/accounting-automation.service.ts#L139-L264)

---

#### 7. Sales Invoice with Tax (VAT)

**Business Event**: Invoice customer for 1,000 MAD + 200 MAD VAT (20%)

**Journal Entry**:
| Account | Debit | Credit | Description |
|---------|-------|--------|-------------|
| 1200 - Accounts Receivable | 1,200.00 | 0.00 | Invoice #INV-002 receivable |
| 4000 - Sales Revenue | 0.00 | 1,000.00 | Produce sales |
| 2150 - Tax Payable (VAT) | 0.00 | 200.00 | Sales tax for INV-002 |

**Code**: [buildInvoiceLedgerLines](project/supabase/functions/_shared/ledger.ts#L63-L123)

**Balance Check**: 1,200.00 Dr = 1,000.00 Cr + 200.00 Cr ✓

---

#### 8. Purchase Invoice with Tax

**Business Event**: Purchase equipment for 5,000 MAD + 1,000 MAD VAT (20%)

**Journal Entry**:
| Account | Debit | Credit | Description |
|---------|-------|--------|-------------|
| 1300 - Equipment (Asset) | 5,000.00 | 0.00 | Equipment purchase |
| 1400 - Tax Receivable (VAT) | 1,000.00 | 0.00 | Purchase tax for PO-002 |
| 2110 - Accounts Payable | 0.00 | 6,000.00 | Invoice #PO-002 payable |

**Code**: [buildInvoiceLedgerLines](project/supabase/functions/_shared/ledger.ts#L123-L174)

**Balance Check**: 5,000.00 Dr + 1,000.00 Dr = 6,000.00 Cr ✓

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

## Common Issues & Troubleshooting

### Unbalanced Journal Entry

**Error Message**: `Journal entry is not balanced: debits=X, credits=Y`

**Causes**:
- Application validation failed before inserting journal_items
- Manual calculation error in journal entry creation
- Rounding errors in multi-line entries

**Solution**:
1. Check the journal_items being inserted:
   ```sql
   SELECT
     SUM(debit) as total_debits,
     SUM(credit) as total_credits,
     SUM(debit) - SUM(credit) as difference
   FROM journal_items
   WHERE journal_entry_id = '<entry_id>';
   ```
2. Verify each line has either debit OR credit (not both)
3. Check for rounding errors (tolerance: 0.01)
4. Review the business logic creating the entry

**Prevention**: The database trigger automatically calculates totals and enforces the constraint

---

### Database Constraint Violation

**Error Message**: `new row for relation "journal_entries" violates check constraint "journal_entry_balanced"`

**Cause**: The database trigger calculated `total_debit` and `total_credit` from journal_items, but they don't match within the 0.01 tolerance

**Solution**:
1. This should never happen if application validation works correctly
2. Check for corrupted data or manual SQL updates
3. Run this query to find problematic entries:
   ```sql
   SELECT
     je.id,
     je.entry_number,
     je.total_debit,
     je.total_credit,
     ABS(je.total_debit - je.total_credit) as difference,
     (SELECT SUM(debit) FROM journal_items WHERE journal_entry_id = je.id) as calculated_debit,
     (SELECT SUM(credit) FROM journal_items WHERE journal_entry_id = je.id) as calculated_credit
   FROM journal_entries je
   WHERE ABS(je.total_debit - je.total_credit) >= 0.01;
   ```

---

### Missing Account Mappings

**Error Message**: `Account mapping missing for cost_type: labor` or `Cash account mapping missing`

**Cause**: The NestJS service requires account_mappings to determine which GL accounts to use for costs/revenues

**Solution**:
1. Check account_mappings table:
   ```sql
   SELECT * FROM account_mappings
   WHERE organization_id = '<org_id>'
   AND mapping_type IN ('cost_type', 'revenue_type', 'cash');
   ```
2. Create missing mappings via UI or SQL:
   ```sql
   INSERT INTO account_mappings (
     organization_id,
     mapping_type,
     mapping_key,
     account_id,
     is_active
   ) VALUES (
     '<org_id>',
     'cost_type',
     'labor',
     '<labor_expense_account_id>',
     true
   );
   ```

---

### Invoice Posting Fails

**Error Message**: `Failed to create journal entry` or `Missing accounts receivable account`

**Cause**: Required GL accounts (1200 Accounts Receivable, 2110 Accounts Payable, etc.) don't exist

**Solution**:
1. Verify required accounts exist:
   ```sql
   SELECT code, name, type
   FROM accounts
   WHERE organization_id = '<org_id>'
   AND code IN ('1110', '1200', '1400', '2110', '2150');
   ```
2. Create missing accounts using Chart of Accounts template
3. Required accounts for invoicing:
   - **1200** - Accounts Receivable (Asset)
   - **2110** - Accounts Payable (Liability)
   - **2150** - Tax Payable/VAT Output (Liability)
   - **1400** - Tax Receivable/VAT Input (Asset)

---

### Payment Allocation Fails

**Error Message**: `Allocations must equal the payment amount` or `One or more invoices not found`

**Causes**:
- Sum of allocations doesn't match payment amount
- Invoices are in wrong organization
- Invoice types don't match payment type (receive vs paid)

**Solution**:
1. Verify payment and allocations:
   ```sql
   SELECT
     p.amount as payment_amount,
     SUM(pa.allocated_amount) as total_allocated,
     p.amount - SUM(pa.allocated_amount) as difference
   FROM accounting_payments p
   LEFT JOIN payment_allocations pa ON p.id = pa.payment_id
   WHERE p.id = '<payment_id>'
   GROUP BY p.id, p.amount;
   ```
2. Check invoice types match:
   - `payment_type = 'receive'` requires `invoice_type = 'sales'`
   - `payment_type = 'paid'` requires `invoice_type = 'purchase'`

---

### Totals Not Updating

**Problem**: `journal_entries.total_debit` and `total_credit` remain 0 after inserting journal_items

**Cause**: Database trigger not installed or disabled

**Solution**:
1. Check if trigger exists:
   ```sql
   SELECT * FROM pg_trigger
   WHERE tgname = 'trg_recalculate_journal_totals';
   ```
2. If missing, apply the migration:
   ```bash
   supabase db push
   ```
3. Manually trigger recalculation for existing entries:
   ```sql
   UPDATE journal_entries je
   SET
     total_debit = (SELECT COALESCE(SUM(debit), 0) FROM journal_items WHERE journal_entry_id = je.id),
     total_credit = (SELECT COALESCE(SUM(credit), 0) FROM journal_items WHERE journal_entry_id = je.id)
   WHERE organization_id = '<org_id>';
   ```

---

### Invoice Total Mismatch

**Error Message**: `Sales invoice debits and credits do not balance` (from [ledger.ts](project/supabase/functions/_shared/ledger.ts))

**Cause**: Rounding error when calculating line items + tax vs grand_total

**Solution**:
1. The `ledger.ts` file uses `roundCurrency()` function for all calculations
2. Check invoice data:
   ```sql
   SELECT
     i.invoice_number,
     i.subtotal,
     i.tax_total,
     i.grand_total,
     SUM(ii.amount) as calculated_subtotal,
     SUM(ii.tax_amount) as calculated_tax
   FROM invoices i
   LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
   WHERE i.id = '<invoice_id>'
   GROUP BY i.id, i.invoice_number, i.subtotal, i.tax_total, i.grand_total;
   ```
3. Verify: `subtotal + tax_total = grand_total`

---

### Missing GL Accounts for Invoices

**Error Message**: `Invoice item <id> missing income account` or `missing expense account`

**Cause**: Invoice items don't have `income_account_id` (for sales) or `expense_account_id` (for purchases)

**Solution**:
1. Set default accounts on invoice items
2. Use product/service catalog with pre-configured GL accounts
3. For sales invoices, ensure all items have `income_account_id`
4. For purchase invoices, ensure all items have `expense_account_id`

## Multi-Currency Support

**Table**: `currencies`

**Fields**:
- `code` - Currency code (USD, EUR, MAD)
- `symbol` - Currency symbol ($, €, DH)
- `exchange_rate` - Rate to base currency

**Usage**: Transactions in foreign currencies converted to base currency for reporting.

## Agricultural Financial Year Accounting

### Multi-Time Dimension Model

The system supports three concurrent time dimensions for agricultural accounting:

1. **Fiscal Year** - Legal/tax year (typically Jan-Dec)
2. **Agricultural Campaign** - Production season (e.g., "Campagne 2024/2025" Sep-Aug)
3. **Crop Cycle** - Individual production cycle from planting to sale

### Database Tables

#### Time Dimension Tables
- `fiscal_years` - Legal fiscal year management with org-specific start months
- `fiscal_periods` - Sub-periods (monthly/quarterly) within fiscal years
- `agricultural_campaigns` - Campagne Agricole entity spanning calendar years

#### Production Cycle Tables
- `crop_cycles` - Production cycles with full cost/revenue attribution
- `crop_cycle_allocations` - Partial cost allocation for shared resources

#### Biological Assets (IAS 41)
- `biological_assets` - Perennial assets (orchards, vineyards, livestock)
- `biological_asset_valuations` - Fair value tracking per IAS 41

### Key Relationships

```
fiscal_years
    └── fiscal_periods
    └── agricultural_campaigns (may span 2 fiscal years)
        └── crop_cycles
            ├── costs (via crop_cycle_id)
            ├── revenues (via crop_cycle_id)
            └── harvest_records (via crop_cycle_id)
```

### Morocco/MENA Specifics

Campaign dates typically:
- **Start**: September (after summer)
- **End**: August (after harvest)

Function `create_morocco_campaign()` generates properly formatted campaigns.

### Hooks

- `useFiscalYears()` - Fetch fiscal years
- `useCurrentFiscalYear()` - Get current fiscal year
- `useCampaigns()` - Fetch agricultural campaigns
- `useCurrentCampaign()` - Get current campaign
- `useCropCycles()` - Fetch crop cycles with filters
- `useCropCyclePnL()` - Fetch P&L by crop cycle
- `useBiologicalAssets()` - Fetch biological assets
- `useBiologicalAssetValuations()` - Fair value history

### Report Views

- `crop_cycle_pnl` - Profitability by crop cycle
- `campaign_summary` - Aggregated campaign metrics
- `fiscal_campaign_reconciliation` - Compare fiscal year vs campaign accounting

### IAS 41 Compliance

Biological assets support:
- Initial recognition at cost
- Subsequent measurement at fair value or cost model
- Fair value levels (1, 2, 3) per IFRS 13
- Depreciation for bearer plants under cost model
- Fair value change tracking with journal entry links

## Global Accounting System (Multi-Country Templates)

### Overview

The system supports worldwide chart of accounts through a template-driven approach:

1. **Global Templates** (`account_templates` table) - Pre-configured chart of accounts for each country/standard
2. **Global Mappings** (`account_mappings` with `organization_id = NULL`) - Country-level account mappings
3. **Organization-Specific Mappings** (`account_mappings` with `organization_id` set) - Org-level overrides

### Supported Countries

Templates are seeded for:
- **MA** (Morocco) - PCEC/CGNC standard
- **TN** (Tunisia) - PCN standard
- **FR** (France) - PCG standard
- **SN** (Senegal) - SYSCOHADA standard
- **US** (United States) - GAAP standard
- **GB** (United Kingdom) - FRS 102 standard

### Template Application Flow

1. Admin selects country template
2. System calls `applyTemplate(countryCode, organizationId)`
3. Accounts are copied from `account_templates` to `accounts` table
4. Default account mappings are created via:
   - `create_task_cost_mappings()` - Maps task types to expense accounts
   - `create_harvest_sales_mappings()` - Maps revenue types and cash accounts

### Account Mappings

**Table**: `account_mappings`

**Dual-Purpose Structure**:
- `organization_id IS NULL` → Global template (country-level)
- `organization_id IS NOT NULL` → Organization-specific override

**Mapping Types**:
- `cost_type` - Maps task types (planting, harvesting, labor) to expense accounts
- `revenue_type` - Maps revenue streams to income accounts
- `harvest_sale` - Maps sale channels (market, export, wholesale) to revenue accounts
- `cash` - Maps cash/bank accounts for payment entries

**API Endpoints** (NestJS):
- `GET /account-mappings` - List org mappings
- `POST /account-mappings` - Create mapping
- `PATCH /account-mappings/:id` - Update mapping
- `DELETE /account-mappings/:id` - Delete mapping
- `POST /account-mappings/initialize?country_code=MA` - Initialize defaults

**Frontend**:
- Route: `/settings/account-mappings`
- Component: `AccountMappingsManagement`

### Cost Centers

**Table**: `cost_centers`

Track costs by organizational unit for profitability analysis.

**Fields**:
- `code` - Unique code within organization
- `name` - Cost center name
- `description` - Optional description
- `parent_id` - For hierarchical cost centers
- `farm_id` - Link to specific farm
- `parcel_id` - Link to specific parcel
- `crop_cycle_id` - Link to crop production cycle

**API Endpoints** (NestJS):
- `GET /cost-centers` - List cost centers
- `POST /cost-centers` - Create cost center
- `PATCH /cost-centers/:id` - Update cost center
- `DELETE /cost-centers/:id` - Delete (fails if used in journal items)

**Frontend**:
- Route: `/settings/cost-centers`
- Component: `CostCenterManagement`

### Database Functions

```sql
-- Get account mapping (falls back to global template)
SELECT * FROM get_account_mapping(org_id, 'cost_type', 'labor');

-- Initialize org mappings from global templates
SELECT initialize_org_account_mappings(org_id, 'MA');

-- Create default task cost mappings
SELECT create_task_cost_mappings(org_id, 'MA');

-- Create default revenue/cash mappings
SELECT create_harvest_sales_mappings(org_id, 'MA');
```

### RLS Policies

Account mappings have proper RLS:
- **Read**: Global templates (org_id IS NULL) readable by all authenticated users
- **Read**: Org-specific mappings only by org members
- **Write**: Only organization admins can create/update/delete org mappings
- **Protected**: Global templates cannot be modified by regular users

## Future Enhancements (Roadmap)
- Bank reconciliation module
- Budget vs. Actual reporting
- Cash flow statement
- Multi-company consolidation
- Advanced cost allocation (overhead, depreciation)
- CMS-driven chart of accounts templates with versioning
