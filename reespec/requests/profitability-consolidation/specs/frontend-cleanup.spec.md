# Spec: Frontend profitability cleanup

## Capability

ParcelProfitability component uses backend totals, proper i18n, and consistent empty states.

## Scenarios

### S1: Summary metrics use backend values directly

**GIVEN** the profitability API returns totalCosts=1500, totalRevenue=3000, netProfit=1500, profitMargin=50
**WHEN** ParcelProfitability renders
**THEN** the summary cards display these exact values without client-side recalculation

### S2: Operational section labels use i18n keys

**GIVEN** the user's language is set to English
**WHEN** ParcelProfitability renders the operational sections
**THEN** "Task Labor Costs" uses translation key (not hardcoded "Main d'oeuvre")
**AND** "Material Costs" uses translation key (not hardcoded "Matieres et produits appliques")
**AND** "Harvest Revenues" uses translation key (not hardcoded "Recoltes")
**AND** "Metayage Settlements" uses translation key (not hardcoded "Partage metayage")

### S3: Empty operational sections show message

**GIVEN** a parcel with no material costs
**WHEN** ParcelProfitability renders the materials section
**THEN** a "No data available" empty state message is shown (not an empty card)

### S4: Overview tab does not recalculate totals

**GIVEN** the profitability API returns ledgerExpenseTotal and ledgerRevenueTotal
**WHEN** the Overview tab renders
**THEN** it displays the backend-provided totals
**AND** does NOT run reduce() on ledgerExpenses/ledgerRevenues arrays
