# Brief: Generic Accounting Mappings

## Problem

The accounting module has two parallel systems for resolving GL accounts:

1. **AccountingAutomationService** — uses `account_mappings` table to resolve accounts by `(mapping_type, mapping_key)`. Works generically for costs, revenue, worker payments. Falls back from org-specific → global template.

2. **Hardcoded account codes** — invoice posting (`invoices.service.ts`) and payment posting (`payments.service.ts`) look up accounts by hardcoded US GAAP codes (`1200`, `2110`, `2150`, `1400`, `1110`). These codes don't exist in the Moroccan chart (PCEC uses `3420`, `4410`, `4455`, `5141`). **Invoice/payment posting is broken for ALL countries including Morocco.**

Additionally:
- The `account_mappings` seed only has `cost_type`, `revenue_type`, `cash` mapping types — no `receivable`, `payable`, `tax_collected`, `tax_deductible`.
- The ledger helper (`buildInvoiceLedgerLines`) requires `income_account_id`/`expense_account_id` per invoice item, but the DB schema (`invoice_items`) only has `account_id` — schema/code mismatch.
- The Settings UI at `/settings/account-mappings` exists but isn't wired to initialize mappings or used by any posting flow.
- `applyTemplate()` returns `account_mappings_created: 0` — it never actually creates account mappings when applying a country template.

## Goals

1. **One unified account resolution path**: all accounting flows (costs, revenue, invoices, payments, stock) resolve GL accounts through `account_mappings` via `getAccountIdByMapping()`.
2. **Seed all required mapping types**: add `receivable`, `payable`, `tax_collected`, `tax_deductible`, `default_revenue`, `default_expense` to global templates for all 6 countries (MA, FR, TN, US, GB, DE).
3. **Invoice posting works end-to-end**: post a sales or purchase invoice → journal entry created with correct country-specific accounts.
4. **Payment posting works end-to-end**: post a payment → journal entry created with correct country-specific accounts.
5. **Account mappings initialized on template apply**: when an org applies a country template, org-level `account_mappings` rows are created (linked to actual `account_id`s).
6. **Settings UI functional**: org admins can view and override account mappings.

## Non-Goals

- Tax rate management per country (separate concern)
- Invoice numbering compliance per country
- Currency handling
- Legal field requirements per country (ICE, SIRET, etc.)
- New mapping types for stock (already has its own `stock_account_mappings` table)

## Impact

- Unblocks all accounting flows for non-Moroccan orgs
- Fixes currently broken invoice/payment posting for Moroccan orgs
- Makes the system genuinely multi-country for accounting
