---
sidebar_position: 8
title: "Accounting & Finance"
---

# Accounting & Finance

The AgroGina platform includes a full-featured accounting module built on **double-entry bookkeeping** principles. It provides a chart of accounts with multi-country templates, journal entry management, invoice lifecycle handling, financial reporting, cost center tracking, and worker payment processing -- all scoped to individual organizations via multi-tenant isolation.

## Overview

### Architecture

The accounting system is composed of several NestJS modules that work together:

| Module | Purpose | Base Route |
|--------|---------|------------|
| **Accounts** | Chart of accounts management and country templates | `/accounts` |
| **Journal Entries** | Double-entry journal entries with line items | `/journal-entries` |
| **Accounting Automation** | Auto-generated journal entries from costs, revenue, and payments | `/accounting` |
| **Financial Reports** (journal-entries) | Trial balance, balance sheet, P&L, general ledger, cash flow | `/financial-reports` |
| **Financial Reports** (standalone) | Aged receivables and aged payables reports | `/financial-reports` |
| **Invoices** | Sales and purchase invoice lifecycle | `/invoices` |
| **Quotes** | Customer quotation management | `/quotes` |
| **Sales Orders** | Sales order processing and invoice conversion | `/sales-orders` |
| **Purchase Orders** | Purchase order processing and bill conversion | `/purchase-orders` |
| **Cost Centers** | Cost center hierarchy linked to farms and parcels | `/cost-centers` |
| **Payment Records** | Worker payment calculation, approval, and processing | `/organizations/:orgId/payment-records` |

All endpoints require JWT authentication and organization context via the `X-Organization-Id` header. CASL-based permission decorators (e.g., `@CanReadAccounts()`, `@CanManageJournalEntries()`) enforce role-based access control.

### Key Database Tables

- `accounts` -- chart of accounts (with `organization_id`, `code`, `name`, `account_type`, `account_subtype`, `parent_id`, `is_group`)
- `account_mappings` -- maps business events (cost types, revenue types) to GL accounts
- `journal_entries` -- entry header with `entry_number`, `status`, `total_debit`, `total_credit`
- `journal_items` -- line items with `account_id`, `debit`, `credit`, `cost_center_id`, `farm_id`, `parcel_id`
- `invoices` / `invoice_items` -- invoice headers and line items
- `quotes` / `quote_items` -- quotation headers and line items
- `sales_orders` / `sales_order_items` -- sales order documents
- `purchase_orders` / `purchase_order_items` -- purchase order documents
- `cost_centers` -- hierarchical cost centers linked to farms/parcels
- `payment_records`, `payment_deductions`, `payment_bonuses`, `payment_advances` -- worker payment system

---

## Chart of Accounts

### Multi-Country Templates

The system ships with built-in chart of accounts templates for six countries, each following its national accounting standard:

| Country | Code | Standard | Currency |
|---------|------|----------|----------|
| Morocco | `MA` | CGNC (Code General de Normalisation Comptable) | MAD |
| France | `FR` | PCG (Plan Comptable General) | EUR |
| Tunisia | `TN` | PCN (Plan Comptable National) | TND |
| United States | `US` | US GAAP | USD |
| United Kingdom | `GB` | FRS 102 | GBP |
| Germany | `DE` | HGB (Handelsgesetzbuch) | EUR |

Templates are fetched from the CMS (Strapi) when available. If the CMS is unreachable, the system falls back to local TypeScript data files in `accounts/data/`.

### Account Structure

Each account has the following properties:

| Field | Description |
|-------|-------------|
| `code` | Hierarchical account code (e.g., `701`, `2331`) |
| `name` | Account name (in local language) |
| `account_type` | One of: `Asset`, `Liability`, `Equity`, `Revenue`, `Expense` |
| `account_subtype` | Detailed classification (e.g., `accounts_receivable`, `fixed_asset`, `cash`) |
| `is_group` | `true` for header/parent accounts, `false` for postable accounts |
| `parent_code` | Parent account code establishing the hierarchy |
| `currency_code` | Account-specific currency |

Extended fields on the template type support agriculture-specific metadata:

- `agricultural_category` -- classifies accounts as `crop`, `livestock`, `equipment`, `land`, `supplies`, `labor`, or `general`
- `inventory_valuation_method` -- `FIFO`, `LIFO`, or `WEIGHTED_AVERAGE`
- `depreciation_rate` -- annual depreciation percentage for fixed assets
- `tax_deductible` -- whether expenses are tax-deductible
- Multi-language translations via `name_translations` and `description_translations` (supports `en`, `fr`, `es`, `ar`, `de`, `it`, `pt`)

### Applying a Template

```
POST /accounts/templates/:countryCode/apply
```

Body:
```json
{
  "overwrite": false,
  "includeAccountMappings": true,
  "includeCostCenters": false
}
```

The apply operation runs inside a database transaction:
1. Validates the organization exists
2. Optionally deletes existing accounts if `overwrite` is `true`
3. Inserts all template accounts using `ON CONFLICT (organization_id, code) DO NOTHING`
4. Links parent-child relationships via `parent_id`
5. Optionally copies global `account_mappings` for the country/standard into the organization

### Accounts API

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| `GET` | `/accounts` | `CanReadAccounts` | List all accounts (filterable by `is_active`) |
| `GET` | `/accounts/:id` | `CanReadAccounts` | Get single account |
| `POST` | `/accounts` | `CanManageAccounts` | Create an account |
| `PATCH` | `/accounts/:id` | `CanManageAccounts` | Update an account |
| `DELETE` | `/accounts/:id` | `CanManageAccounts` | Delete an account |
| `POST` | `/accounts/seed-moroccan-chart` | `CanManageAccounts` | Seed legacy Moroccan chart |
| `GET` | `/accounts/templates` | -- | List available country templates |
| `GET` | `/accounts/templates/:countryCode` | -- | Get template details for a country |
| `POST` | `/accounts/templates/:countryCode/apply` | `CanManageAccounts` | Apply template to organization |

**File paths:**
- `agritech-api/src/modules/accounts/accounts.service.ts`
- `agritech-api/src/modules/accounts/accounts.controller.ts`
- `agritech-api/src/modules/accounts/data/types.ts`
- `agritech-api/src/modules/accounts/data/moroccan-chart-of-accounts.ts` (and other country files)

---

## Journal Entries (Double-Entry Bookkeeping)

### Core Principles

Every journal entry enforces the **fundamental accounting equation**: total debits must equal total credits. The service validates this with a tolerance of 0.01 before persisting any entry. If the entry is unbalanced, the request is rejected with a `BadRequestException`.

### Entry Lifecycle

Journal entries follow a three-state lifecycle:

```
draft --> posted --> (immutable)
  |
  +--> cancelled
```

- **Draft**: can be created, updated, and deleted freely
- **Posted**: immutable; records `posted_by` and `posted_at` timestamps
- **Cancelled**: can be reached from any non-cancelled state

Only draft entries can be updated or deleted. Posted entries are permanent and affect financial reports.

### Entry Types

Entries are categorized by type:

| Type | Description |
|------|-------------|
| `expense` | Cost-related entries |
| `revenue` | Income-related entries |
| `transfer` | Internal fund transfers between accounts |
| `adjustment` | Corrections and adjustments |

### Journal Items

Each journal entry contains one or more `journal_items`, each with:

- `account_id` -- the GL account
- `debit` / `credit` -- monetary amounts (one should be zero)
- `cost_center_id` -- optional cost center allocation
- `farm_id` / `parcel_id` -- optional agricultural context for farm-level profitability tracking
- `description` -- line-level description

### Entry Number Generation

Entry numbers are auto-generated via the `SequencesService`, which provides sequential, organization-scoped numbering (e.g., `JE-2024-0001`).

### Filtering and Pagination

The `GET /journal-entries` endpoint supports:

- Pagination: `page`, `pageSize`
- Sorting: `sortBy` (default: `entry_date`), `sortDir` (`asc`/`desc`)
- Date range: `dateFrom` / `dateTo`
- Status filter: `draft`, `posted`, `cancelled`
- Entry type filter: `expense`, `revenue`, `transfer`, `adjustment`
- Dimensional filters: `account_id`, `cost_center_id`, `farm_id`, `parcel_id`
- Text search across `entry_number`, `reference_number`, `remarks`

### Journal Entries API

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| `GET` | `/journal-entries` | `CanReadJournalEntries` | List entries with filters and pagination |
| `GET` | `/journal-entries/:id` | `CanReadJournalEntries` | Get entry with items and account details |
| `POST` | `/journal-entries` | `CanCreateJournalEntry` | Create a balanced journal entry |
| `PATCH` | `/journal-entries/:id` | `CanUpdateJournalEntry` | Update a draft entry |
| `POST` | `/journal-entries/:id/post` | `CanUpdateJournalEntry` | Post a draft entry |
| `PATCH` | `/journal-entries/:id/cancel` | `CanUpdateJournalEntry` | Cancel an entry |
| `DELETE` | `/journal-entries/:id` | `CanManageJournalEntries` | Delete a draft entry |

**File paths:**
- `agritech-api/src/modules/journal-entries/journal-entries.service.ts`
- `agritech-api/src/modules/journal-entries/journal-entries-crud.controller.ts`

---

## Accounting Automation

The `AccountingAutomationService` automatically creates journal entries from business events, replacing what were previously database triggers.

### Cost Entry Automation

```
POST /accounting/costs/:id/journal-entry
```

When a cost is recorded, the system:
1. Looks up the expense account via `account_mappings` using `mapping_type = 'cost_type'` and the specific cost type as the key
2. Looks up the cash/bank account via `mapping_type = 'cash'`
3. Creates a balanced journal entry: **Dr. Expense Account / Cr. Cash Account**
4. Validates double-entry balance before inserting
5. Auto-posts the entry

If account mappings are missing, the request fails with a descriptive error (ACID compliance).

### Revenue Entry Automation

```
POST /accounting/revenues/:id/journal-entry
```

Creates a balanced entry: **Dr. Cash Account / Cr. Revenue Account**, using `mapping_type = 'revenue_type'`.

### Worker Payment Automation

When a worker payment is processed (status changed to `paid`), the system automatically:
1. Looks up salary/wages expense accounts via mappings for `labor`, `salary`, or `wages` (with fallback chain)
2. Creates a journal entry: **Dr. Salary/Wages Expense / Cr. Cash Account**
3. Links the entry via `reference_type = 'worker_payment'` and `reference_id`

Unlike cost/revenue automation, missing account mappings for worker payments result in a warning log rather than a failure -- the payment proceeds without a journal entry.

### Account Mapping Resolution

The `getAccountIdByMapping` method follows a two-tier lookup:
1. **Organization-level mapping**: looks for a mapping scoped to the specific organization
2. **Global mapping**: falls back to a global (null `organization_id`) mapping for the organization's country and accounting standard, then resolves the account code to the organization's actual account ID

**File paths:**
- `agritech-api/src/modules/journal-entries/accounting-automation.service.ts`
- `agritech-api/src/modules/journal-entries/journal-entries.controller.ts`

---

## Invoice Management

### Invoice Types

The system supports two invoice types:

- **Sales invoices** (`invoice_type: 'sales'`) -- issued to customers
- **Purchase invoices** (`invoice_type: 'purchase'`) -- received from suppliers

### Invoice Lifecycle

```
draft --> submitted --> partially_paid --> paid
  |          |              |
  |          +--> overdue --+
  |          |
  +--> cancelled
```

Valid status transitions are enforced by `validateInvoiceStatusTransition`:

| From | Allowed Transitions |
|------|---------------------|
| `draft` | `submitted`, `cancelled` |
| `submitted` | `paid`, `partially_paid`, `overdue`, `cancelled` |
| `partially_paid` | `paid`, `overdue`, `cancelled` |
| `overdue` | `paid`, `partially_paid`, `cancelled` |
| `paid` | (terminal) |
| `cancelled` | (terminal) |

Cancellation is blocked if the invoice has been posted to the journal (`journal_entry_id` is set). In that case, a reversing journal entry must be created instead.

### Posting an Invoice

```
POST /invoices/:id/post
```

Posting a draft invoice triggers the following:

1. Fetches the invoice with all line items
2. Resolves required GL accounts by code (e.g., `1200` for Accounts Receivable, `2110` for Accounts Payable)
3. Builds journal lines using the `buildInvoiceLedgerLines` helper:

**Sales Invoice:**
| Line | Account | Debit | Credit |
|------|---------|-------|--------|
| 1 | Accounts Receivable | Grand Total | -- |
| 2..N | Revenue (per item) | -- | Item Amount |
| N+1 | Tax Payable | -- | Tax Total |

**Purchase Invoice:**
| Line | Account | Debit | Credit |
|------|---------|-------|--------|
| 1..N | Expense/Inventory (per item) | Item Amount | -- |
| N+1 | Tax Receivable | Tax Total | -- |
| N+2 | Accounts Payable | -- | Grand Total |

4. Validates the double-entry balance
5. Creates the journal entry and marks it as `posted`
6. Updates invoice status to `submitted` and links the `journal_entry_id`
7. If items have `item_id` references, creates stock entries (Material Issue for sales, Material Receipt for purchases)

### Invoice Email

```
POST /invoices/:id/send-email
```

Sends invoice details via email to the customer or supplier. The recipient is resolved from the party record or can be overridden in the request body.

### Invoices API

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| `GET` | `/invoices` | `CanReadInvoices` | List invoices with filters and pagination |
| `GET` | `/invoices/:id` | `CanReadInvoices` | Get invoice with line items |
| `POST` | `/invoices` | `CanCreateInvoice` | Create a draft invoice |
| `POST` | `/invoices/:id/post` | `CanUpdateInvoice` | Post invoice (create journal entry + stock) |
| `PATCH` | `/invoices/:id` | `CanUpdateInvoice` | Update a draft invoice |
| `PATCH` | `/invoices/:id/status` | `CanUpdateInvoice` | Update invoice status |
| `DELETE` | `/invoices/:id` | `CanDeleteInvoice` | Delete a draft invoice |
| `POST` | `/invoices/:id/send-email` | `CanUpdateInvoice` | Send invoice via email |

**File paths:**
- `agritech-api/src/modules/invoices/invoices.service.ts`
- `agritech-api/src/modules/invoices/invoices.controller.ts`
- `agritech-api/src/modules/journal-entries/helpers/ledger.helper.ts`

---

## Quotes, Sales Orders, and Purchase Orders

### Quotes

Quotes represent customer proposals that can be converted into sales orders.

**Lifecycle:** `draft` -> `sent` -> `accepted` -> `converted` (terminal). Also: `rejected`, `cancelled`, `expired` (all terminal).

Key features:
- Auto-generated quote numbers via `SequencesService`
- Customer details fetched from the `customers` table
- Tax rates resolved from the `taxes` table when `tax_id` is provided without `tax_rate`
- Line-level discount support (`discount_percent`, `discount_amount`)
- Conversion to sales order via `POST /quotes/:id/convert-to-order` (copies all items)

**File paths:**
- `agritech-api/src/modules/quotes/quotes.service.ts`
- `agritech-api/src/modules/quotes/quotes.controller.ts`

### Sales Orders

Sales orders track confirmed customer orders and can be converted to invoices.

**Lifecycle:** `draft` -> `confirmed` -> `delivered` -> `invoiced` (terminal). Also: `cancelled` (terminal).

Key features:
- Conversion to sales invoices
- Stock issuance (Material Issue) on delivery
- Auto-generated order numbers

**File paths:**
- `agritech-api/src/modules/sales-orders/sales-orders.service.ts`
- `agritech-api/src/modules/sales-orders/sales-orders.controller.ts`

### Purchase Orders

Purchase orders manage supplier procurement and can be converted to purchase invoices (bills).

**Lifecycle:** `draft` -> `submitted` -> `approved` -> `received` -> `billed` (terminal). Also: `cancelled` (terminal).

Key features:
- Conversion to purchase invoices (bills)
- Material receipt creation (stock entry) on goods receipt
- Auto-generated order numbers

**File paths:**
- `agritech-api/src/modules/purchase-orders/purchase-orders.service.ts`
- `agritech-api/src/modules/purchase-orders/purchase-orders.controller.ts`

---

## Financial Reports

The platform provides two sets of financial reports served under the `/financial-reports` route.

### Ledger-Based Reports

These reports aggregate data from posted journal entries and items.

#### Trial Balance

```
GET /financial-reports/trial-balance?as_of_date=2024-12-31
```

Returns all non-group accounts with their debit and credit balances as of the given date. Includes a `totals` object with `is_balanced` indicating whether total debits equal total credits.

#### Balance Sheet

```
GET /financial-reports/balance-sheet?as_of_date=2024-12-31
```

Returns accounts categorized into three sections:
- **Assets** -- accounts with `account_type = 'asset'` (displayed as debit balance)
- **Liabilities** -- accounts with `account_type = 'liability'` (displayed as credit balance)
- **Equity** -- accounts with `account_type = 'equity'` (displayed as credit balance)

The `is_balanced` flag verifies: `Total Assets = Total Liabilities + Total Equity`.

#### Profit & Loss Statement

```
GET /financial-reports/profit-loss?start_date=2024-01-01&end_date=2024-12-31
```

Returns revenue and expense accounts for the specified period with calculated `net_income` (Total Revenue - Total Expenses).

#### General Ledger

```
GET /financial-reports/general-ledger/:accountId?start_date=2024-01-01&end_date=2024-12-31
```

Returns the transaction history for a specific account, including:
- Opening balance (calculated from all posted entries before `start_date`)
- Each transaction with running balance
- Closing balance

#### Cash Flow Statement

```
GET /financial-reports/cash-flow?start_date=2024-01-01&end_date=2024-12-31
```

Uses the **indirect method**:
- **Operating activities**: starts with net income, adjusts for depreciation and working capital changes (accounts receivable, accounts payable, inventory)
- **Investing activities**: changes in fixed assets
- **Financing activities**: changes in long-term debt and equity

Working capital changes are derived by comparing balance sheet snapshots at the start and end of the period, using `account_subtype` to identify relevant accounts (e.g., `accounts_receivable`, `trade_payable`, `inventory`).

#### Account Summary

```
GET /financial-reports/account-summary?as_of_date=2024-12-31
```

Returns aggregate balances grouped by `account_type` (Asset, Liability, Equity, Revenue, Expense).

#### Account Balance

```
GET /financial-reports/account-balance/:accountId?as_of_date=2024-12-31
```

Returns the balance for a single account.

### Aged Reports

These reports analyze outstanding invoices by age bucket.

#### Aged Receivables

```
GET /financial-reports/aged-receivables?as_of_date=2024-12-31
```

Analyzes outstanding sales invoices (status: `submitted`, `partially_paid`, `overdue`) grouped into age buckets:

| Bucket | Days Overdue |
|--------|-------------|
| `current` | 0 |
| `1-30` | 1-30 |
| `31-60` | 31-60 |
| `61-90` | 61-90 |
| `over-90` | 90+ |

Includes both a total summary and a breakdown by party (customer).

#### Aged Payables

```
GET /financial-reports/aged-payables?as_of_date=2024-12-31
```

Same structure as aged receivables but for outstanding purchase invoices.

**File paths:**
- `agritech-api/src/modules/journal-entries/financial-reports.service.ts` (trial balance, balance sheet, P&L, general ledger, cash flow)
- `agritech-api/src/modules/journal-entries/financial-reports.controller.ts`
- `agritech-api/src/modules/financial-reports/financial-reports.service.ts` (aged receivables/payables)
- `agritech-api/src/modules/financial-reports/financial-reports.controller.ts`

---

## Cost Centers

Cost centers allow organizations to track expenses by organizational unit, linked optionally to specific farms and parcels. This enables farm-level and parcel-level profitability analysis.

### Structure

Each cost center has:

| Field | Description |
|-------|-------------|
| `code` | Unique code within the organization |
| `name` | Display name |
| `description` | Optional description |
| `parent_id` | Parent cost center for hierarchical structure |
| `farm_id` | Optional link to a farm |
| `parcel_id` | Optional link to a parcel |
| `is_active` | Active/inactive flag |

Cost centers are referenced by journal items (`journal_items.cost_center_id`) and invoice items (`invoice_items.cost_center_id`), enabling cost allocation across the general ledger.

A cost center cannot be deleted if it is referenced by any journal items.

### Cost Centers API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/cost-centers` | List cost centers (filterable by `is_active`, `search`) |
| `GET` | `/cost-centers/:id` | Get single cost center |
| `POST` | `/cost-centers` | Create a cost center |
| `PATCH` | `/cost-centers/:id` | Update a cost center |
| `DELETE` | `/cost-centers/:id` | Delete a cost center (blocked if in use) |

**File paths:**
- `agritech-api/src/modules/cost-centers/cost-centers.service.ts`
- `agritech-api/src/modules/cost-centers/cost-centers.controller.ts`

---

## Payment Records (Worker Payments)

The payment records module handles the complete lifecycle of worker compensation, from calculation through approval to payment processing with automatic journal entry creation.

### Worker Payment Types

Payment types are constrained by worker type:

| Worker Type | Allowed Payment Types |
|-------------|-----------------------|
| `fixed_salary` | `monthly_salary`, `bonus`, `overtime`, `advance` |
| `daily_worker` | `daily_wage`, `bonus`, `overtime`, `advance` |
| `metayage` | `metayage_share`, `bonus`, `advance` |

### Payment Calculation

```
POST /organizations/:orgId/payment-records/calculate
```

The system calculates payments differently based on worker type:

- **Fixed salary**: prorates monthly salary based on the number of days in the period
- **Daily worker**: aggregates from `work_records` and `piece_work_records` tables, falling back to `daily_rate * days` if no records exist
- **Metayage** (sharecropping): retrieves the worker's share amount from `metayage_settlements`

Advance deductions are calculated as the lesser of outstanding advance balances and the gross payment amount.

### Payment Lifecycle

```
pending --> approved --> paid
```

1. **Create** (`POST /organizations/:orgId/payment-records`): validates worker type, checks for overlapping periods, calculates amounts, inserts bonuses and deductions into separate tables
2. **Approve** (`PATCH .../payment-records/:id/approve`): records `approved_by` and timestamp
3. **Process** (`PATCH .../payment-records/:id/process`): marks as `paid`, deducts advance balances (FIFO order), creates journal entry, updates metayage settlement status, sends notification to worker

### Advance Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `.../payment-records/advances` | Request a salary advance |
| `PATCH` | `.../payment-records/advances/:id/approve` | Approve or reject an advance |
| `PATCH` | `.../payment-records/advances/:id/pay` | Mark advance as paid |
| `GET` | `.../payment-records/advances/list` | List advances with filters |

Advances support installment-based deduction plans. Outstanding balances are automatically deducted from future payments when the payment is processed.

### Payment Records API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `.../payment-records` | List payments (filter by status, type, worker, farm, period) |
| `GET` | `.../payment-records/:id` | Get payment with deductions and bonuses |
| `GET` | `.../payment-records/worker/:workerId` | Get payments for a worker |
| `GET` | `.../payment-records/worker/:workerId/history` | Get worker payment history |
| `GET` | `.../payment-records/statistics/summary` | Get payment statistics |
| `POST` | `.../payment-records/calculate` | Calculate payment for a worker/period |
| `POST` | `.../payment-records` | Create a payment record |
| `PATCH` | `.../payment-records/:id/approve` | Approve a payment |
| `PATCH` | `.../payment-records/:id/process` | Process (pay) a payment |

**File paths:**
- `agritech-api/src/modules/payment-records/payment-records.service.ts`
- `agritech-api/src/modules/payment-records/payment-records.controller.ts`

---

## Integration Points

### Invoice-to-Stock Integration

When an invoice is posted:
- **Sales invoices** create a `MATERIAL_ISSUE` stock entry (deduct inventory) for items with `item_id`
- **Purchase invoices** create a `MATERIAL_RECEIPT` stock entry (add inventory) for items with `item_id`

Stock entries are created via `StockEntriesService` and target the organization's default active warehouse.

### Quote-to-Order-to-Invoice Flow

The system supports a complete sales pipeline:

1. **Quote** (proposal) -> `POST /quotes/:id/convert-to-order` -> **Sales Order**
2. **Sales Order** -> convert to **Sales Invoice**
3. **Sales Invoice** -> `POST /invoices/:id/post` -> **Journal Entry** + **Stock Entry**

Similarly for procurement:

1. **Purchase Order** -> convert to **Purchase Invoice** (bill)
2. **Purchase Invoice** -> `POST /invoices/:id/post` -> **Journal Entry** + **Stock Entry**

### Notifications

- Worker payment processing triggers in-app notifications to the worker via `NotificationsService`
- Invoice posting can trigger email notifications via `sendInvoiceEmail`
- Purchase order status changes trigger notifications
