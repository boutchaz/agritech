# Spec: Account Mapping Seeds

## Capability

Global account mapping templates include all mapping types needed for invoice and payment posting, for all 6 supported countries.

## Scenarios

### GIVEN a fresh database seed, WHEN checking account_mappings for Morocco (MA/PCEC), THEN mappings exist for: receivable/trade (3420), payable/trade (4410), tax/collected (4457), tax/deductible (4456), revenue/default (7111), expense/default (6111), plus existing cost_type/revenue_type/cash mappings.

### GIVEN a fresh database seed, WHEN checking account_mappings for France (FR/PCG), THEN mappings exist for: receivable/trade (411), payable/trade (401), tax/collected (44571), tax/deductible (44566), revenue/default (701), expense/default (601).

### GIVEN a fresh database seed, WHEN checking account_mappings for all 6 countries, THEN each country has at least: receivable/trade, payable/trade, tax/collected, tax/deductible, revenue/default, expense/default, cash/bank, cash/cash mapping rows.
