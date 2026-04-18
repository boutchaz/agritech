# Spec: Frontend Subscription Page

## Scenario: Module picker displays all available modules

**GIVEN** the user navigates to `/settings/subscription` as org admin
**WHEN** the page loads
**THEN** it displays a grid of 11 ERP modules:
- 4 base modules shown as pre-selected and disabled (always included)
- 7 upsell modules shown as toggleable checkboxes
- Each module shows name, description, and DH/month price
- A live "ERP monthly" total updates as modules are toggled

## Scenario: Hectare input with live degressive price

**GIVEN** the module picker is displayed
**WHEN** the user enters contracted hectares (e.g., 50)
**THEN** the page shows:
- The degressive price breakdown per tier (e.g., "5ha × 500 + 15ha × 400 + 30ha × 300")
- The total ha annual price (e.g., "17,500 DH/yr")
- The average price per ha (e.g., "350 DH/ha/yr")
- The applicable size multiplier (e.g., "×1")

## Scenario: Live total price calculator

**GIVEN** modules are selected and hectares are entered
**WHEN** any input changes
**THEN** a sticky "Total" card shows:
- ERP monthly: X DH/mo
- Ha annual: Y DH/yr
- Subtotal annual: X×12 + Y DH
- Discount (10%): -Z DH
- Annual total HT: final DH
- Billing cycle selector updates the per-cycle amount
- "Checkout" button calls `createCheckout(selectedModules, hectares, billingCycle)`

## Scenario: Existing subscription display

**GIVEN** the organization already has an active subscription (legacy formula-based)
**WHEN** the user views the subscription page
**THEN** it shows the current subscription details (formula, hectares, billing, status)
**AND** a "Modify subscription" CTA to switch to modular pricing
**AND** the legacy subscription continues to work until the user actively switches
