# Tasks: Generic Accounting Mappings

## Prerequisites
- Existing test infra: Vitest for unit tests
- Existing services: AccountingAutomationService, AccountMappingsService, InvoicesService, PaymentsService

---

### 1. Seed new mapping types for all 6 countries

- [x] **RED** — Query the schema SQL for mapping_type = 'receivable' in account_mappings seed. Confirm: zero rows exist. Assertion: no `receivable`, `payable`, `tax`, `revenue`, `expense` mapping types in the seed SQL.
- [x] **ACTION** — Add INSERT statements to `project/supabase/migrations/00000000000000_schema.sql` for all 6 countries (MA, FR, TN, US, GB, DE) with mapping types: `receivable/trade`, `payable/trade`, `tax/collected`, `tax/deductible`, `revenue/default`, `expense/default`. Use correct account codes per country's chart of accounts.
- [x] **GREEN** — Grep the schema SQL for `receivable/trade` — confirm 6 rows (one per country). Run `cd project && npx supabase db reset` to verify no SQL errors.

---

### 2. Make getAccountIdByMapping a shared utility on AccountingAutomationService

- [x] **RED** — Write test in `agritech-api/src/modules/journal-entries/accounting-automation.service.spec.ts`: call `resolveAccountId(orgId, 'receivable', 'trade')` — method does not exist yet. Test fails.
- [x] **ACTION** — Extract `getAccountIdByMapping` from private to a public method `resolveAccountId(orgId, mappingType, mappingKey)` on `AccountingAutomationService`. Keep the private one as an internal alias for backward compat.
- [x] **GREEN** — Run the test suite for accounting-automation.service — passes. Existing tests still pass.

---

### 3. Refactor invoice posting to resolve accounts via mappings

- [x] **RED** — Write/update test in `agritech-api/src/modules/invoices/invoices.service.spec.ts`: mock `AccountingAutomationService.resolveAccountId` to return account IDs for `receivable/trade`, `tax/collected`, `revenue/default`. Post a sales invoice. Assert journal entry created with those IDs. Test fails (invoices.service doesn't use AccountingAutomationService yet).
- [x] **ACTION** — Inject `AccountingAutomationService` into `InvoicesService`. In `postInvoice()`: replace hardcoded `SALES_ACCOUNT_CODES`/`PURCHASE_ACCOUNT_CODES` lookups with `resolveAccountId()` calls for `receivable/trade`, `payable/trade`, `tax/collected`, `tax/deductible`. For per-item accounts: use `item.account_id` from invoice_items, falling back to `resolveAccountId('revenue', 'default')` for sales or `resolveAccountId('expense', 'default')` for purchase.
- [x] **GREEN** — Run invoices.service.spec.ts — all tests pass. No hardcoded account codes remain in invoices.service.ts.

---

### 4. Update ledger helper to accept resolved accounts instead of per-item income_account_id

- [x] **RED** — Write test in `agritech-api/src/modules/journal-entries/helpers/ledger.helper.spec.ts`: call `buildInvoiceLedgerLines` with items that have `account_id` set (not `income_account_id`). Also test with a `defaultRevenueAccountId` fallback. Assert correct journal lines. Test fails (helper currently requires `income_account_id`).
- [x] **ACTION** — Refactor `buildInvoiceLedgerLines`: rename `income_account_id`→`account_id` on `InvoiceItem` interface. Add `defaultRevenueAccountId`/`defaultExpenseAccountId` to `InvoiceLedgerAccounts`. Per item: use `item.account_id ?? defaultRevenueAccountId` (sales) or `item.account_id ?? defaultExpenseAccountId` (purchase). Throw if neither exists.
- [x] **GREEN** — Run ledger.helper.spec.ts — passes. Run invoices.service.spec.ts — still passes (updated in task 3 to provide new interface).

---

### 5. Refactor payment posting to resolve accounts via mappings

- [x] **RED** — Write/update test in payments.service uses hardcoded codes).
- [x] **ACTION** — Inject `AccountingAutomationService` into `PaymentsService`. Replace hardcoded `LEDGER_CODES = ['1110', '1200', '2110']` with `resolveAccountId()` calls. Remove all `.in('code', ...)` lookups.
- [x] **GREEN** — Run payments service tests — pass. No hardcoded account codes remain in payments.service.ts.

---

### 6. Wire applyTemplate to initialize account mappings

- [x] **RED** — Write/update test in accounts.service.spec.ts`: after `applyTemplate('MA', orgId)`, query `account_mappings` for the org. Assert rows exist for `receivable/trade`, `payable/trade`, etc. with non-null `account_id`. Test fails (applyTemplate currently returns `account_mappings_created: 0`).
- [x] **ACTION** — In `AccountsService.applyTemplate()`: after inserting accounts, call `AccountMappingsService.initializeDefaultMappings(orgId, countryCode)`. Import and inject `AccountMappingsService` into `AccountsModule`. Return actual count in `account_mappings_created`.
- [x] **GREEN** — Run accounts.service.spec.ts — passes. `account_mappings_created` > 0 in result.

---

### 7. Add missing mapping types to initializeDefaultMappings

- [x] **RED** — Write test in account-mappings.service.spec.ts`: call `initializeDefaultMappings(orgId, 'MA')`. Assert org mappings include `receivable/trade` with `account_id` resolved to the org's account with code `3420`. Test fails (global templates for these types don't exist yet in test DB, but seed from task 1 provides them).
- [x] **ACTION** — Verify `initializeDefaultMappings` correctly copies from global templates including the new mapping types from task 1. Fix any issues with the org context lookup (`accounting_standard` field — MA uses both 'PCEC' and 'CGNC' in different places; normalize to one).
- [x] **GREEN** — Run account-mappings.service.spec.ts — passes. All new mapping types are initialized with correct account_ids.

---

### 8. Normalize accounting_standard: PCEC vs CGNC for Morocco

- [x] **RED** — Check: search codebase for 'CGNC' and 'PCEC' — both are used for Morocco. The chart template says 'CGNC', the mapping seeds say 'PCEC'. This mismatch means `initializeDefaultMappings` won't find global templates. Assertion: grep confirms inconsistency.
- [x] **ACTION** — Standardize Morocco to one value everywhere (recommend 'PCEC' since it's used in the seeds). Update the Moroccan chart template metadata and the `getFallbackTemplate` legacy path to use 'PCEC'. Or vice versa — pick one and align.
- [x] **GREEN** — Grep for Morocco accounting_standard — only one value used across seeds, chart templates, and org defaults.

---

### 9. End-to-end integration test: Morocco invoice posting

- [x] **RED** — Wrote integration test `agritech-api/test/integration/accounting/invoice-posting-e2e.spec.ts`: creates real org → applies MA template → creates sales invoice → posts invoice → asserts journal entry uses CGNC codes (3420 for AR, 7111 for revenue). Test initially failed: `variant_id` column doesn't exist in `invoice_items` table, FK constraint on `created_by` requiring real auth user.
- [x] **ACTION** — Fixed `invoices.service.ts`: removed `variant_id` from two insert operations (create and update) since column doesn't exist in DB schema. Test setup creates real auth.users via Supabase admin API and uses object ref pattern so auth guard closure always sees current userId.
- [x] **GREEN** — E2E test passes. Morocco org posts invoice with correct CGNC accounts (3420=AR, 7111=revenue). Double-entry balanced.

---

### 10. End-to-end integration test: France invoice posting

- [x] **RED** — France test case included in same E2E spec: creates org → applies FR template → creates sales invoice → posts → asserts journal uses PCG codes (411 for AR, 701 for revenue). Failed initially alongside MA test due to same `variant_id` and auth user issues.
- [x] **ACTION** — Same fixes as task 9 resolved France test. No country-specific issues discovered — FR template and mappings work correctly out of the box.
- [x] **GREEN** — E2E test passes. French org posts invoice with correct PCG accounts (411=AR, 701=revenue). Double-entry balanced.

---

## Summary

```
Task 1:  Seed data (new mapping types)
Task 8:  Normalize MA standard (PCEC vs CGNC)
Task 2:  Public resolveAccountId method
Task 4:  Ledger helper refactor
Task 3:  Invoice posting → mappings
Task 5:  Payment posting → mappings
Task 6:  applyTemplate → init mappings
Task 7:  Verify initializeDefaultMappings works
Task 9:  E2E Morocco
Task 10: E2E France
```

Recommended execution order: 1 → 8 → 2 → 4 → 3 → 5 → 6 → 7 → 9 → 10
