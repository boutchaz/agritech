# Design: Generic Accounting Mappings

## Architecture Decision: Unified Account Resolution

All accounting flows resolve accounts through `AccountingAutomationService.getAccountIdByMapping()`.

```
┌──────────────────┐
│ invoice.service   │──┐
├──────────────────┤   │
│ payment.service   │──┤    ┌─────────────────────────────┐
├──────────────────┤   ├───▶│ getAccountIdByMapping()     │
│ costs/revenue     │──┤    │                             │
├──────────────────┤   │    │ 1. Check org account_mappings│
│ worker payments   │──┤    │ 2. Fallback → global tpl    │
├──────────────────┤   │    │ 3. Resolve account_code→id  │
│ harvests          │──┘    └─────────────────────────────┘
└──────────────────┘
```

**No service directly looks up accounts by hardcoded code.** Period.

## New Mapping Types

Current seed has: `cost_type`, `revenue_type`, `cash`

Adding:

| mapping_type      | mapping_key         | Purpose                                  | Example (MA/PCEC) |
|-------------------|---------------------|------------------------------------------|--------------------|
| `receivable`      | `trade`             | AR for sales invoices                    | 3420               |
| `payable`         | `trade`             | AP for purchase invoices                 | 4410               |
| `tax`             | `collected`         | TVA collected on sales                   | 4457               |
| `tax`             | `deductible`        | TVA deductible on purchases              | 4456               |
| `revenue`         | `default`           | Default revenue account for invoice items| 7111               |
| `expense`         | `default`           | Default expense account for invoice items| 6111               |

These are seeded per country in the schema migration for all 6 countries.

## Invoice Posting Flow (Revised)

```
postInvoice(invoiceId, orgId, userId, postingDate)
│
├── Fetch invoice + items
│
├── Resolve accounts via mappings:
│   ├── Sales:  receivable/trade, tax/collected
│   ├── Purchase: payable/trade, tax/deductible
│   └── Per-item: item.account_id OR revenue/default (sales) OR expense/default (purchase)
│
├── Build journal lines (ledger helper)
│   └── Updated to accept resolved account IDs instead of per-item income_account_id
│
├── Validate double-entry
│
└── Insert journal entry + items, update invoice status
```

## Payment Posting Flow (Revised)

```
postPayment(paymentId, orgId, ...)
│
├── Resolve accounts via mappings:
│   ├── cash/bank (already exists in mappings)
│   ├── receivable/trade (for received payments)
│   └── payable/trade (for made payments)
│
└── Build journal lines (ledger helper - already works)
```

## Ledger Helper Changes

`buildInvoiceLedgerLines` currently requires `income_account_id` per item. Change to:
- Accept a `defaultRevenueAccountId` / `defaultExpenseAccountId` 
- Per-item `account_id` (from `invoice_items.account_id`) overrides the default
- If neither exists → throw clear error

## Template Apply Changes

`applyTemplate()` currently creates accounts but skips account mappings. Add:
1. After inserting accounts, call `accountMappingsService.initializeDefaultMappings(orgId, countryCode)`
2. This copies global template mappings → org-level, resolving `account_code` → `account_id`

## Schema Changes

- **No new tables** — `account_mappings` table already has the right structure
- **No column changes** — `invoice_items.account_id` already exists
- **Only new seed data** — INSERT rows for new mapping types per country
- Fix unique constraint: global mappings have `organization_id IS NULL` so the org-level unique index doesn't conflict

## Risk: Missing Account Codes

When org applies template, some mapping `account_code` values may not match any account in the chart. Strategy:
- `initializeDefaultMappings` already handles this — sets `account_id = null` when code not found
- Invoice posting checks for null and throws descriptive error: "Configure account mapping for receivable/trade"
- Settings UI shows unmapped entries with warning badge
