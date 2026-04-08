# Design — Profitability Consolidation

## Approach

Consolidate all profitability onto `journal_entries/journal_items` as the single source of truth. Every cost and revenue event — manual, labor, material, harvest, metayage — must produce a journal entry to count toward profitability.

## Current State

```
                    TODAY (broken)
                    
Path A: crop_cycles.recalculateProfitability()
  └─ Reads: financial_transactions
     └─ Writes: crop_cycles.total_costs/total_revenue
        └─ Exposed: crop_cycle_pnl VIEW

Path B: profitability.getParcelProfitability()
  └─ Reads: costs + revenues + journal_entries +
     work_records + product_applications +
     harvest_records + metayage_settlements
  └─ De-duplicates costs/revenues vs journal entries
  └─ Sums operational data directly from source tables

Result: Path A and Path B produce DIFFERENT numbers.
```

## Target State

```
                    AFTER (unified)

ALL sources ──→ journal_entries/journal_items ──→ ALL profitability views

Manual cost     ──→ AccountingAutomation.createJournalEntryFromCost()
Manual revenue  ──→ AccountingAutomation.createJournalEntryFromRevenue()
Work record     ──→ AccountingAutomation.createJournalEntryFromCost() [type: LABOR]
Product applic. ──→ AccountingAutomation.createJournalEntryFromCost() [type: MATERIALS]
Harvest record  ──→ AccountingAutomation.createJournalEntryFromRevenue() [type: HARVEST]
Metayage settl. ──→ AccountingAutomation.createJournalEntryFromRevenue() [type: METAYAGE]

getParcelProfitability() ──→ reads ONLY journal_items
crop_cycles.recalculateProfitability() ──→ reads ONLY journal_items (via crop_cycle_id)
```

## Design Decisions

### 1. Journal entry creation is transactional with the source record

When creating a work_record, product_application, harvest_record, or metayage_settlement:
- Look up account mappings FIRST
- If mappings missing → throw BadRequestException, abort entire operation
- If mappings exist → insert source record, then create journal entry
- If journal entry creation fails → the source record was already inserted but this is a system error, not a config error

This differs from the current behavior where cost/revenue creation silently swallows journal failures.

### 2. Mapping types for operational modules

Reuse existing AccountingAutomationService methods:

| Source | Method | mapping_type | mapping_key |
|--------|--------|-------------|-------------|
| work_records | createJournalEntryFromCost | cost_type | labor |
| product_applications | createJournalEntryFromCost | cost_type | materials |
| harvest_records | createJournalEntryFromRevenue | revenue_type | harvest |
| metayage_settlements | createJournalEntryFromRevenue | revenue_type | metayage |

New mapping_key `metayage` needs to be added to seed data for supported countries.

### 3. getParcelProfitability() simplification

The method currently runs ~10 queries across 6 tables. After consolidation:

**Keep:**
- journal_items query for expenses (with org_id fix)
- journal_items query for revenues (with org_id fix)
- Account breakdown, cost center breakdown, monthly aggregation (all from journal_items)

**Remove from totals (keep as detail only):**
- Direct costs/revenues table queries (these are entry mechanisms, not truth)
- Direct work_records, product_applications, harvest_records, metayage_settlements queries
- De-duplication logic (no longer needed — journal IS the truth)

**Response shape change:**
- `totalCosts` = sum of journal expense items
- `totalRevenue` = sum of journal revenue items  
- `netProfit` = totalRevenue - totalCosts
- `profitMargin` = (netProfit / totalRevenue) * 100
- Keep `accountBreakdown`, `costCenterBreakdown`, `monthlyData` from journal
- Keep operational detail arrays for drill-down (but they don't feed totals)

### 4. crop_cycles.recalculateProfitability() rewrite

Currently reads from `financial_transactions`. Must read from `journal_items` where:
- `journal_items.crop_cycle_id = cycleId` (need to verify this column exists)
- OR join through costs/revenues that have crop_cycle_id → journal_entries via reference_id

If `journal_items` doesn't have `crop_cycle_id`, we'll need to join:
```
journal_entries (reference_type='cost', reference_id) 
  → costs (id, crop_cycle_id) 
  → filter by crop_cycle_id
```

### 5. Multi-tenancy fixes

5 queries in `getParcelProfitability()` need `organization_id` added:
1. costs query (~line 325)
2. revenues query (~line 339)
3. journal_items expense query (~line 507)
4. journal_items revenue query (~line 537)
5. work_records query (~line 645)

Note: RLS should catch these at DB level, but defense-in-depth requires app-level filtering too.

## Risks

1. **Existing data without journal entries**: Costs/revenues created before this change have no journal entries. Need a migration or reconciliation strategy.
2. **Account mappings not configured**: Organizations without account mappings will be blocked from creating any costs/revenues. Need to ensure onboarding flow configures mappings.
3. **metayage mapping_key**: Doesn't exist in seed data — needs to be added for all supported countries.
4. **Performance**: Reading all profitability from journal_items may be slower than direct table queries. Monitor query times.

## Migration Strategy for Existing Data

Out of scope for this request. Existing orphaned costs/revenues without journal entries will not appear in the new profitability view. A separate backfill task can be created later if needed.

## Module Integration Map

| Module | File | Already has AccountingAutomation? | Already imports JournalEntriesModule? |
|--------|------|----------------------------------|--------------------------------------|
| tasks (work_records) | tasks.service.ts | YES (injected) | YES |
| product-applications | product-applications.service.ts | NO | NO |
| harvests | harvests.service.ts | YES (injected) | YES |
| workers (metayage) | workers.service.ts | NO | NO |
