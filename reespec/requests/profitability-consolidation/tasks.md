# Tasks — Profitability Consolidation

## Phase 1: Multi-tenancy fixes (safety first)

### 1. Fix missing organization_id filters in getParcelProfitability

- [ ] **RED** — Write `api-tests/src/tests/profitability/parcel-profitability-org-filter.api.spec.ts`: create costs, revenues, journal entries, and work records for org A's parcel. Call `GET /profitability/parcel/:parcelId` with org B's header. Assert all arrays are empty and totals are 0. Run `npx playwright test parcel-profitability-org-filter` → test fails (data leaks across orgs).
- [ ] **ACTION** — In `profitability.service.ts` `getParcelProfitability()`: add `.eq('organization_id', organizationId)` to (1) costs query ~line 325, (2) revenues query ~line 339, (3) work_records query ~line 645, (4) add `.eq('journal_entries.organization_id', organizationId)` to expense journal_items query ~line 507, (5) revenue journal_items query ~line 537.
- [ ] **GREEN** — Run `npx playwright test parcel-profitability-org-filter` → test passes. No cross-org data leakage.

---

## Phase 2: Mandatory journal entries (enforce the invariant)

### 2. Make createCost fail if account mappings are missing

- [ ] **RED** — Write `api-tests/src/tests/profitability/mandatory-journal-cost.api.spec.ts`: call `POST /profitability/costs` with a cost_type that has no account_mappings. Assert 400 response. Assert no cost row was inserted. Run test → fails (currently returns 201 with silent swallow).
- [ ] **ACTION** — In `profitability.service.ts` `createCost()`: before inserting the cost, call `this.accountingAutomationService.resolveAccountId(organizationId, 'cost_type', costType)` and `resolveAccountId(organizationId, 'cash', 'bank')`. If either returns null, throw `BadRequestException('Account mappings not configured for cost_type: ${costType}')`. Remove the try/catch silent swallow around journal entry creation — let it throw.
- [ ] **GREEN** — Run `npx playwright test mandatory-journal-cost` → test passes. Costs without mappings are rejected.

### 3. Make createRevenue fail if account mappings are missing

- [ ] **RED** — Write `api-tests/src/tests/profitability/mandatory-journal-revenue.api.spec.ts`: call `POST /profitability/revenues` with a revenue_type that has no account_mappings. Assert 400 response. Assert no revenue row was inserted. Run test → fails.
- [ ] **ACTION** — In `profitability.service.ts` `createRevenue()`: same pattern as task 2 — validate mappings exist before insert, remove silent swallow.
- [ ] **GREEN** — Run `npx playwright test mandatory-journal-revenue` → test passes.

---

## Phase 3: Operational modules create journal entries

### 4. Add journal entry creation to product_applications

- [ ] **RED** — Write `api-tests/src/tests/product-applications/product-application-journal.api.spec.ts`: create a product application with cost > 0 and valid account mappings. Assert a journal_entry was created with reference_type 'cost'. Assert journal_items debit materials expense, credit cash. Also test: create without mappings → 400. Run test → fails.
- [ ] **ACTION** — In `product-applications.module.ts`: import `JournalEntriesModule`. In `product-applications.service.ts`: inject `AccountingAutomationService`. In `createProductApplication()`: after successful insert, call `createJournalEntryFromCost(orgId, applicationId, 'materials', totalCost, applicationDate, description, userId, parcelId)`. Before insert, validate mappings exist — throw if missing.
- [ ] **GREEN** — Run `npx playwright test product-application-journal` → test passes.

### 5. Add journal entry creation to harvest_records

- [ ] **RED** — Write `api-tests/src/tests/harvests/harvest-journal.api.spec.ts`: create a harvest with estimated_revenue > 0 and valid account mappings. Assert a journal_entry was created with reference_type 'revenue'. Assert journal_items debit cash, credit harvest revenue. Also test: create without mappings → 400. Run test → fails.
- [ ] **ACTION** — In `harvests.service.ts` `create()`: `AccountingAutomationService` is already injected. After successful insert, call `createJournalEntryFromRevenue(orgId, harvestId, 'harvest', estimatedRevenue, harvestDate, description, userId, parcelId)`. Before insert, validate mappings exist — throw if missing.
- [ ] **GREEN** — Run `npx playwright test harvest-journal` → test passes.

### 6. Add journal entry creation to work_records (via completeTask)

- [ ] **RED** — Write `api-tests/src/tests/tasks/work-record-journal.api.spec.ts`: complete a task that creates work records with total_payment > 0 and valid account mappings. Assert journal_entries created for each work record with reference_type 'cost'. Assert journal_items debit labor expense, credit cash. Also test: complete task without labor mapping → 400. Run test → fails.
- [ ] **ACTION** — In `tasks.service.ts` `completeTask()`: `AccountingAutomationService` is already injected. For each work record created with total_payment > 0, call `createJournalEntryFromCost(orgId, workRecordId, 'labor', totalPayment, workDate, description, userId, parcelId)`. Before creating work records, validate labor mapping exists — throw if missing.
- [ ] **GREEN** — Run `npx playwright test work-record-journal` → test passes.

### 7. Add journal entry creation to metayage_settlements

- [ ] **RED** — Write `api-tests/src/tests/workers/metayage-journal.api.spec.ts`: create a metayage settlement with amount > 0 and valid account mappings. Assert a journal_entry was created with reference_type 'revenue'. Also test: create without mappings → 400. Run test → fails.
- [ ] **ACTION** — In `workers.module.ts`: import `JournalEntriesModule`. In `workers.service.ts`: inject `AccountingAutomationService`. In `createMetayageSettlement()`: validate mappings exist before insert, then call `createJournalEntryFromRevenue(orgId, settlementId, 'metayage', amount, date, description, userId)`. Add 'metayage' mapping_key to account_mappings seed data for all supported countries.
- [ ] **GREEN** — Run `npx playwright test metayage-journal` → test passes.

---

## Phase 4: Journal as single source of truth for profitability

### 8. Simplify getParcelProfitability to read from journal only

- [ ] **RED** — Write `api-tests/src/tests/profitability/journal-source-of-truth.api.spec.ts`: create a parcel with costs, revenues, and operational records (all with journal entries). Call `GET /profitability/parcel/:parcelId`. Assert `totalCosts` equals sum of journal expense debits. Assert `totalRevenue` equals sum of journal revenue credits. Create an orphaned cost (no journal entry) — assert it does NOT contribute to totals. Run test → fails (current totals include operational data directly).
- [ ] **ACTION** — Rewrite `getParcelProfitability()` in `profitability.service.ts`: (1) Query journal_items with expense accounts for totalCosts. (2) Query journal_items with revenue accounts for totalRevenue. (3) Compute netProfit and profitMargin from journal totals. (4) Keep accountBreakdown, costCenterBreakdown, monthlyData queries (they already read journal). (5) Remove de-duplication logic. (6) Keep operational detail queries (work_records, product_applications, etc.) as read-only detail — they don't feed totals.
- [ ] **GREEN** — Run `npx playwright test journal-source-of-truth` → test passes.

### 9. Rewrite crop_cycles.recalculateProfitability to read from journal

- [ ] **RED** — Write `api-tests/src/tests/crop-cycles/crop-cycle-pnl-journal.api.spec.ts`: create a crop cycle, create costs and revenues with crop_cycle_id that produce journal entries. Call the recalculate endpoint (or trigger it). Assert crop_cycle.total_costs matches journal expense totals. Assert crop_cycle.total_revenue matches journal revenue totals. Run test → fails (currently reads financial_transactions).
- [ ] **ACTION** — In `crop-cycles.service.ts` `recalculateProfitability()`: replace `financial_transactions` queries with journal_items queries. Join journal_entries → costs/revenues via reference_id to find entries with matching crop_cycle_id. Sum expense debits for totalCosts, revenue credits for totalRevenue. Compute net_profit, profit_margin, cost_per_ha, revenue_per_ha. Update crop_cycles row.
- [ ] **GREEN** — Run `npx playwright test crop-cycle-pnl-journal` → test passes.

---

## Phase 5: Frontend cleanup

### 10. Remove client-side recalculation in ParcelProfitability

- [ ] **RED** — Check: `ParcelProfitability.tsx` Overview tab contains `.reduce()` calls on `profitabilityData?.costs`, `profitabilityData?.revenues`, `profitabilityData?.ledgerExpenses`, `profitabilityData?.ledgerRevenues` arrays. Assertion: these reduce calls exist → confirms redundancy.
- [ ] **ACTION** — In `ParcelProfitability.tsx`: replace the Overview tab's reduce-based calculations with `profitabilityData.totalCosts`, `profitabilityData.totalRevenue`, `profitabilityData.ledgerExpenseTotal`, `profitabilityData.ledgerRevenueTotal`. Remove the inline reduce calls.
- [ ] **GREEN** — Verify: `ParcelProfitability.tsx` Overview tab no longer contains `.reduce()` calls for totals. Summary cards display backend values. Run `tsc --noEmit` → no type errors.

### 11. Replace hardcoded French strings with i18n keys

- [ ] **RED** — Check: `ParcelProfitability.tsx` contains hardcoded strings "Main d'oeuvre", "Matieres et produits", "Recoltes", "Partage metayage". Grep confirms they exist without translation wrappers.
- [ ] **ACTION** — Add translation keys to `src/locales/{en,fr,ar}/common.json` for: `profitability.taskLabor`, `profitability.materialCosts`, `profitability.harvestRevenues`, `profitability.metayageSettlements`. Replace hardcoded strings with `t('profitability.taskLabor')` etc.
- [ ] **GREEN** — Grep for hardcoded French strings → none found. Run `tsc --noEmit` → no type errors.

### 12. Add empty state handling for operational sections

- [ ] **RED** — Check: `ParcelProfitability.tsx` Material Costs, Harvest Revenues, Metayage Settlements sections render empty cards when data is empty (no "no data" message). Confirm by reading the JSX — no empty state fallback exists.
- [ ] **ACTION** — For each operational section (materials, harvest, metayage): when the array is empty or undefined, render a consistent empty state message using the same pattern as the Journal Entries tab (border-dashed, centered text).
- [ ] **GREEN** — Verify: all 3 sections have empty state JSX. Run `tsc --noEmit` → no type errors.

---

## Phase 6: Account mapping seed data

### 13. Add metayage mapping_key to seed data for all countries

- [ ] **RED** — Check: `project/supabase/migrations/00000000000000_schema.sql` account_mappings INSERT statements do not contain mapping_key 'metayage' for any country. Grep confirms no metayage mapping exists.
- [ ] **ACTION** — Add `('metayage', 'revenue_type', ...)` INSERT rows for all supported countries (MA, TN, FR, GB, DE, US) in the schema migration, mapping to the appropriate revenue account for each country's chart of accounts.
- [ ] **GREEN** — Grep for `mapping_key.*metayage` in schema → entries exist for all 6 countries. Run `cd project && npm run db:reset` → no errors.

---

## Execution Order

```
Phase 1 [Task 1]           — Safety fix, no behavior change
Phase 2 [Tasks 2-3]        — Enforce invariant on existing endpoints  
Phase 3 [Tasks 4-7]        — Wire operational modules (parallel-safe)
Phase 4 [Tasks 8-9]        — Switch source of truth (depends on Phase 3)
Phase 5 [Tasks 10-12]      — Frontend cleanup (parallel with Phase 4)
Phase 6 [Task 13]          — Seed data (do early, needed by Phase 3 tests)
```

Recommended actual order: **13 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12**
(Seed data first so tests can use it, then safety, then build up, then consolidate, then polish.)
