# Spec: Journal entries as single source of truth for profitability

## Capability

All profitability views (parcel-level, crop-cycle-level) derive totals exclusively from journal_entries/journal_items.

## Scenarios

### S1: getParcelProfitability totals come from journal only

**GIVEN** a parcel with:
  - 2 costs in the costs table (total 1000) with corresponding journal entries
  - 1 revenue in the revenues table (total 2000) with corresponding journal entry
  - 3 work_records with total_payment 500 with corresponding journal entries
  - 1 product_application with cost 200 with corresponding journal entry
**WHEN** `getParcelProfitability()` is called
**THEN** totalCosts = sum of all journal expense items (debit amounts)
**AND** totalRevenue = sum of all journal revenue items (credit amounts)
**AND** netProfit = totalRevenue - totalCosts
**AND** profitMargin = (netProfit / totalRevenue) * 100

### S2: Orphaned costs without journal entries are excluded from totals

**GIVEN** a parcel with:
  - 1 cost (amount 500) that has a journal entry
  - 1 cost (amount 300) that does NOT have a journal entry (legacy data)
**WHEN** `getParcelProfitability()` is called
**THEN** totalCosts = 500 (only the journaled cost)
**AND** the orphaned cost may appear in a legacy detail section but not in totals

### S3: crop_cycles.recalculateProfitability reads from journal

**GIVEN** a crop cycle with:
  - journal_entries linked to costs/revenues with crop_cycle_id
  - Expense journal items totaling 5000
  - Revenue journal items totaling 8000
**WHEN** `recalculateProfitability()` is called for this cycle
**THEN** crop_cycles.total_costs = 5000
**AND** crop_cycles.total_revenue = 8000
**AND** crop_cycles.net_profit = 3000
**AND** crop_cycles.profit_margin = 37.5

### S4: Account breakdown derived from journal items

**GIVEN** a parcel with journal items spread across 3 expense accounts and 2 revenue accounts
**WHEN** `getParcelProfitability()` is called
**THEN** accountBreakdown contains entries grouped by account code
**AND** each entry shows account_name, account_type, total debit, total credit, net amount

### S5: Monthly trends derived from journal items

**GIVEN** a parcel with journal items across 3 months
**WHEN** `getParcelProfitability()` is called
**THEN** monthlyData contains one entry per month
**AND** each entry shows costs (expense debits), revenue (revenue credits), and profit
