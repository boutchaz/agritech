# Tasks: Advisor Subscription Model

## Phase 1: Backend Pricing Engine (foundation)

### 1. Define advisor pricing constants in subscription-domain.ts

- [ ] **RED** — Write `agritech-api/src/modules/subscriptions/subscription-pricing.service.spec.ts`: test that `ERP_MODULES` contains 11 modules (4 base, 7 upsell) with correct prices, `HA_PRICE_TIERS` has 7 entries with correct DH/ha/yr values, `SIZE_MULTIPLIER_TIERS` has 3 tiers. Test `computeHaTotalPrice(50, HA_PRICE_TIERS)` returns 17500. Run `npx jest subscription-pricing.service.spec` → fails (constants don't exist yet).
- [ ] **ACTION** — Add to `subscription-domain.ts`: `ERP_MODULES` array, `HA_PRICE_TIERS` array, `SIZE_MULTIPLIER_TIERS` array, `DEFAULT_DISCOUNT_PERCENT = 10`. Add `ErpModule`, `HaPriceTier`, `SizeMultiplierTier` interfaces. Copy pricing values exactly from `agrogina-advisor/src/store/engineStore.ts`.
- [ ] **GREEN** — Run `npx jest subscription-pricing.service.spec` → tests pass.

### 2. Implement degressive ha pricing in subscription-pricing.service.ts

- [ ] **RED** — Write test: `computeHaTotalPrice(5, HA_PRICE_TIERS)` → 2500, `computeHaTotalPrice(20, HA_PRICE_TIERS)` → 2500+6000=8500, `computeHaTotalPrice(100, HA_PRICE_TIERS)` → 2500+6000+24000=32500, `computeHaTotalPrice(500, HA_PRICE_TIERS)` → full progressive calculation. Also test `computeHaTotalPriceStatic` mode. Run tests → fails.
- [ ] **ACTION** — Add `computeHaTotalPrice(hectares, tiers)` and `computeHaTotalPriceStatic(hectares, tiers)` methods to `SubscriptionPricingService`. Port algorithm from `agrogina-advisor/src/store/engineStore.ts` lines 35–77.
- [ ] **GREEN** — Run tests → all pass.

### 3. Implement modular quote computation

- [ ] **RED** — Write test: given 6 modules (4 base + erp-rh + erp-stocks), 50ha, monthly, 10% discount → quote.erpMonthly = 420, quote.haAnnual = 17500, quote.annualHt = 20286, quote.cycleHt ≈ 1690.50. Also test with size multiplier for 300ha → quote.sizeMultiplier = 2.5. Run tests → fails.
- [ ] **ACTION** — Rewrite `SubscriptionPricingService.createQuote()` to accept `ModularQuoteInput { selectedModules, contractedHectares, billingCycle, discountPercent }` instead of formula-based input. Compute: erpMonthly = sum(modules) × sizeMultiplier(hectares), haAnnual = computeHaTotalPrice(hectares), annualHt = (erpMonthly×12 + haAnnual) × (1 - discount). Return `ModularQuoteBreakdown` with full breakdown. Keep old `QuoteInput` type as legacy alias for backward compat.
- [ ] **GREEN** — Run tests → all pass.

### 4. Add backward compatibility mapping for legacy formulas

- [ ] **RED** — Write test: given `formula: 'standard'`, `legacyFormulaToModules('standard')` returns the 8 modules that standard included (farm_management, hr, inventory, sales, procurement, dashboard, taches, recolte). Given `formula: 'starter'`, returns 4 base + 2 modules. Run tests → fails.
- [ ] **ACTION** — Add `FORMULA_MODULE_MAPPING` in `subscription-domain.ts` mapping each legacy formula to its module list. Add `legacyFormulaToModules(formula)` function. Used by `getSubscription()` when `selected_modules` is empty but `formula` is set.
- [ ] **GREEN** — Run tests → pass.

## Phase 2: DB Schema Migration

### 5. Add modular columns to subscriptions table

- [ ] **RED** — Check: `subscriptions` table does NOT have columns `selected_modules`, `ha_pricing_mode`, `discount_pct`, `size_multiplier`. Assertion fails — columns absent.
- [ ] **ACTION** — Add migration to `project/supabase/migrations/00000000000000_schema.sql`: `ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS selected_modules JSONB DEFAULT '[]';`, `ha_pricing_mode`, `discount_pct`, `size_multiplier`. Run `npm run db:reset && npm run db:generate-types`.
- [ ] **GREEN** — Verify: schema dump contains all 4 new columns with correct defaults.

## Phase 3: Backend API Updates

### 6. Update catalog endpoint to return modular pricing

- [ ] **RED** — Write test: `GET /subscriptions/catalog` returns `{ modules: [...11 items], haTiers: [...7 items], sizeMultipliers: [...3 items], defaultDiscount: 10 }`. Run test → fails (current returns formulas).
- [ ] **ACTION** — Update `SubscriptionsService.getSubscriptionCatalog()` to return `ERP_MODULES`, `HA_PRICE_TIERS`, `SIZE_MULTIPLIER_TIERS`, `DEFAULT_DISCOUNT_PERCENT` alongside existing billing cycles.
- [ ] **GREEN** — Run test → passes. Existing catalog consumers still work (additive change).

### 7. Update quote endpoint for modular pricing

- [ ] **RED** — Write test: `POST /subscriptions/quote` with `{ selectedModules: ['erp-multiferme',...], contractedHectares: 50, billingCycle: 'monthly' }` returns modular quote breakdown with erpMonthly, haAnnual, sizeMultiplier fields. Run test → fails.
- [ ] **ACTION** — Update `SubscriptionsService.createQuote()` to accept `selectedModules` array. Create `ModularQuoteDto` with class-validator. Keep old formula-based `QuoteDto` working for backward compat. Route to new pricing engine when `selectedModules` is provided, old engine when `formula` is provided.
- [ ] **GREEN** — Run tests → both old and new quote paths pass.

### 8. Update checkout endpoint for modular pricing

- [ ] **RED** — Write test: `POST /subscriptions/checkout` with `{ selectedModules: [...], contractedHectares: 50, billingCycle: 'monthly' }` creates a subscription row with `selected_modules` populated, `pending_pricing_snapshot` containing the quote, and returns a checkout URL. Run test → fails.
- [ ] **ACTION** — Update `SubscriptionsService.createCheckoutUrl()` to accept `selectedModules`. Store module selection in `selected_modules` column. Compute quote via new pricing engine. Pass computed amount to Polar metadata. Keep formula-based path for legacy.
- [ ] **GREEN** — Run tests → pass.

### 9. Update feature access check for module-based subscriptions

- [ ] **RED** — Write test: subscription with `selected_modules: [{id: 'erp-rh'}, {id: 'erp-stocks'}]`, `checkFeatureAccess(orgId, 'hr')` → true. `checkFeatureAccess(orgId, 'accounting')` → false. Legacy subscription with `formula: 'standard'` still works via backward compat. Run test → fails.
- [ ] **ACTION** — Update `checkFeatureAccess()`: if subscription has `selected_modules` populated, check if the module slug is in the array. If `selected_modules` is empty (legacy), fall back to formula-based `FORMULA_MODULE_MAPPING`.
- [ ] **GREEN** — Run tests → both paths pass.

## Phase 4: Frontend Pricing Config

### 10. Replace frontend plan definitions with modular config

- [ ] **RED** — Check: `project/src/lib/polar.ts` still exports `SUBSCRIPTION_PLANS` with 4 `PlanDetails`. `project/src/config/subscription.ts` still references formula-based config. Assertion: these don't contain `ERP_MODULES` or `HA_PRICE_TIERS`.
- [ ] **ACTION** — In `project/src/lib/polar.ts`: add `ERP_MODULES` (11 modules), `HA_PRICE_TIERS` (7 tiers), `SIZE_MULTIPLIER_TIERS` (3 tiers), `DEFAULT_DISCOUNT = 10`. Add `computeQuote()` client-side function mirroring backend logic. Add `computeHaTotalPrice()` and `computeErpMonthly()`. Keep `SUBSCRIPTION_PLANS` and related functions for backward compat but mark `@deprecated`.
- [ ] **GREEN** — Verify: `ERP_MODULES.length === 11`, `computeHaTotalPrice(50, HA_PRICE_TIERS)` returns 17500, no TypeScript errors.

### 11. Update subscription service types and API calls

- [ ] **RED** — Check: `subscriptionsService.ts` does NOT have `createModularCheckout()` or `getModularCatalog()` methods. `Subscription` interface does NOT have `selected_modules` field.
- [ ] **ACTION** — Add `selected_modules`, `ha_pricing_mode`, `discount_pct`, `size_multiplier` to `Subscription` interface. Add `ModularCatalogResponse` interface. Add `createModularCheckout(selectedModules, hectares, billingCycle, discount?)` method. Add `getModularCatalog()` method. Keep existing methods for backward compat.
- [ ] **GREEN** — TypeScript compilation passes. No type errors.

## Phase 5: Frontend Subscription Page

### 12. Build module picker component

- [ ] **RED** — Check: no `ModulePicker` component exists in `project/src/components/`. Assertion: file does not exist.
- [ ] **ACTION** — Create `SubscriptionModulePicker.tsx` component: grid of 11 modules from `ERP_MODULES`, base modules pre-selected and disabled, upsell modules as checkboxes, each showing name+description+price, live "ERP Monthly Total" footer. Uses `useForm` from react-hook-form for state. Uses shadcn Card, Checkbox components.
- [ ] **GREEN** — Component renders without errors. All 11 modules visible. Base modules are disabled and checked. ERP total updates correctly.

### 13. Build hectare pricing calculator component

- [ ] **RED** — Check: no `HectarePricingCalculator` component exists. Assertion: file does not exist.
- [ ] **ACTION** — Create `HectarePricingCalculator.tsx`: number input for hectares, shows degressive tier breakdown (each tier × price), total ha annual, average price/ha, applicable size multiplier. Live computation using `computeHaTotalPrice` from `lib/polar.ts`.
- [ ] **GREEN** — Component renders. Entering 50ha shows correct tier breakdown and total of 17,500 DH/yr.

### 14. Build subscription total summary component

- [ ] **RED** — Check: no `SubscriptionQuoteSummary` component exists. Assertion: file does not exist.
- [ ] **ACTION** — Create `SubscriptionQuoteSummary.tsx`: sticky card showing ERP monthly, ha annual, subtotal, discount, annual total HT, billing cycle selector, per-cycle amount with TVA+TTC, "Checkout" button. Reads from module picker and hectare calculator state.
- [ ] **GREEN** — Component renders with live updating totals. Checkout button fires correct API call.

### 15. Rewrite SubscriptionSettings page with modular UI

- [ ] **RED** — Check: current `SubscriptionSettings` component renders 4 plan cards (starter/standard/premium/enterprise). No module picker visible.
- [ ] **ACTION** — Rewrite `SubscriptionSettings` component: if no active subscription → show module picker + hectare calculator + quote summary. If active legacy subscription → show current details + "Switch to modular pricing" CTA. If active modular subscription → show selected modules + hectares + billing details. Preserve billing cycle selector, status display, renewal/terminate actions.
- [ ] **GREEN** — Page loads without errors. New users see module picker. Existing users see their subscription. No TypeScript errors. `tsc --noEmit` passes.

## Phase 6: i18n & Polish

### 16. Add i18n keys for new subscription UI

- [ ] **RED** — Check: `project/src/locales/en/common.json` does NOT contain keys `subscription.modules.*`, `subscription.hectarePricing.*`, `subscription.quote.*`. Assertion fails.
- [ ] **ACTION** — Add translation keys to all 3 languages (en, fr, ar) for: module names, pricing labels, quote summary labels, tier labels, discount labels, checkout CTA.
- [ ] **GREEN** — All 3 locale files contain the new keys. No missing translations.

### 17. Update onboarding trial flow

- [ ] **RED** — Check: `project/src/routes/(public)/onboarding/select-trial.tsx` still references 4-plan cards. No modular option available.
- [ ] **ACTION** — Update trial selection page: show module picker with base modules pre-selected, 50ha default, 14-day trial offer. Call `createTrialSubscription()` with selected modules.
- [ ] **GREEN** — Onboarding flow works with modular selection. Trial subscription created with `selected_modules` populated.
