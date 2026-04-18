# Spec: Backend Pricing Engine

## Scenario: Modular quote computation

**GIVEN** the advisor pricing constants are defined in `subscription-domain.ts`
- 11 ERP modules (4 base at 100/50/80/50 DH/mo, 7 upsell at 80/60/250/40/60/50/60 DH/mo)
- 7 degressive ha tiers (500→150 DH/ha/yr)
- Size multiplier tiers (1x/<100ha, 2.5x/100-500ha, 5x/500+ha)
- Default discount 10%

**WHEN** `SubscriptionPricingService.createQuote()` is called with:
- `selectedModules: ['erp-multiferme', 'erp-dashboard', 'erp-taches', 'erp-recolte', 'erp-rh', 'erp-stocks']` (4 base + 2 upsell)
- `contractedHectares: 50`
- `billingCycle: 'monthly'`
- `discountPercent: 10`

**THEN** the quote breakdown is:
- erpMonthly = (100+50+80+50+80+60) × 1 = 420 DH/mo
- haAnnual = 5×500 + 15×400 + 30×300 = 2500+6000+9000 = 17,500 DH/yr
- annualHt = (420×12 + 17500) × (1 - 0.10) = (5040+17500) × 0.90 = 20,286 DH
- cycleHt = 20,286 / 12 = 1,690.50 DH
- cycleTva = 1,690.50 × 0.20 = 338.10 DH
- cycleTtc = 1,690.50 + 338.10 = 2,028.60 DH

## Scenario: Size multiplier applies for large farms

**GIVEN** the same modules selected
**WHEN** `contractedHectares: 300` (falls in 200-400 tier)
**THEN**:
- sizeMultiplier = 2.5
- erpMonthly = 420 × 2.5 = 1,050 DH/mo
- haAnnual = 5×500 + 15×400 + 80×300 + 100×250 + 100×200 = 2,500+6,000+24,000+25,000+20,000 = 77,500 DH/yr
- annualHt = (1,050×12 + 77,500) × 0.90 = (12,600+77,500) × 0.90 = 81,090 DH

## Scenario: Base modules are always included

**GIVEN** 4 base modules have `isBase: true`
**WHEN** any quote is computed
**THEN** base modules are included in `selectedModules` automatically, cannot be deselected, and their price is always in the total

## Scenario: Backward compatibility for formula-based subscriptions

**GIVEN** an existing subscription has `formula: 'standard'` and no `selected_modules`
**WHEN** `getSubscription()` is called
**THEN** the response includes a computed `selected_modules` derived from the legacy formula's module list (backward compat mapping)

## Scenario: Catalog endpoint returns modular pricing structure

**GIVEN** the new pricing model is active
**WHEN** `GET /api/v1/subscriptions/catalog` is called
**THEN** the response includes:
- `modules`: array of `{id, name, desc, isBase, pricePerMonth}`
- `haTiers`: array of `{maxHa, label, pricePerHaYear}`
- `sizeMultipliers`: array of `{minHa, maxHa, multiplier}`
- `defaultDiscount`: 10
- `billingCycles`: ['monthly', 'semiannual', 'annual']
- `currency`: 'MAD'
- `vatRate`: 0.20
