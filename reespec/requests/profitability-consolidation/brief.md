# Profitability Consolidation

## Problem

Parcel profitability has two parallel calculation paths using different source tables, producing inconsistent numbers. Additionally, 5 queries in `getParcelProfitability()` are missing `organization_id` filters, and operational modules (labor, materials, harvest, metayage) bypass the accounting ledger entirely.

## Goal

Consolidate all profitability onto a single source of truth: `journal_entries/journal_items`. Every cost and revenue — whether manual, labor, material, harvest, or metayage — must flow through the journal to count toward profitability.

## Key Decisions

1. **Journal entries = single source of truth** for all profitability (parcel, crop-cycle, org-level)
2. **Account mappings are mandatory** — hard fail if missing, no silent fallback
3. **All operational modules** (work_records, product_applications, harvest_records, metayage_settlements) must create journal entries via AccountingAutomationService
4. **crop_cycles.recalculateProfitability()** must read from journal, not financial_transactions

## Scope

### Backend (agritech-api)
- Fix 5 missing org_id filters in `getParcelProfitability()`
- Make journal entry creation mandatory in cost/revenue creation (hard fail)
- Add journal entry creation to work_records, product_applications, harvest_records, metayage_settlements
- Rewrite `crop_cycles.recalculateProfitability()` to read from journal_entries
- Simplify `getParcelProfitability()` to read only from journal_entries/journal_items
- Ensure account_mappings cover all operational cost/revenue types

### Frontend (project)
- Remove client-side recalculation of totals (use backend values)
- Fix hardcoded French strings in operational sections (use i18n)
- Add empty state handling for Material, Harvest, Metayage sections
- Remove operational data sections that duplicate journal data (or keep as drill-down detail)

### Database
- Ensure account_mappings has entries for: LABOR, MATERIALS, HARVEST, METAYAGE cost/revenue types
- Verify RLS on all touched tables

## Out of Scope
- Changing the costs/revenues tables schema (they remain as entry mechanism)
- Reworking the financial_transactions table
- New UI features or dashboard changes
- Pagination for crop_cycle_pnl

## Timeline Constraint
SIAM starts April 20 — this must be stable by April 16 (feature freeze).
