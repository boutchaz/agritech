# Admin Module Editor

## What

A full module management page in the admin-app that lets system admins create, edit, and configure modules — including route mappings, widget assignments, pricing, translations, and availability. Replace the hardcoded `ROUTE_MODULE_MAP` in `ModuleGate.tsx` with the dynamic `navigation_items` already stored in the `modules` table.

## Why

Module configuration is currently scattered across SQL migrations. Changing a module's routes, price, plan requirement, translations, or widget config requires a code deploy. The `modules` table already has all the right columns (`navigation_items`, `dashboard_widgets`, `price_monthly`, `is_required`, etc.) and `module_translations` supports i18n — but no admin UI exists to edit them.

Additionally, the `ROUTE_MODULE_MAP` hardcoded in `ModuleGate.tsx` duplicates what `navigation_items` already stores in the DB. The frontend `useModuleBasedDashboard` hook already reads this data and exposes `isNavigationEnabled(path)`.

## Goals

1. Admin page at `/modules` to CRUD modules with all properties
2. Inline translation editor (fr, en, ar) per module
3. Route/widget config via JSONB editors (add/remove route paths, widget IDs)
4. Remove hardcoded `ROUTE_MODULE_MAP` — use DB-driven mapping via existing hooks
5. Backend admin endpoints for module CRUD

## Non-Goals

- Subscription plan management (already exists at `/subscription-model`)
- Module marketplace / self-service addon purchase (already exists via Polar)

## Licensing model (updated 2026-04-24)

Custom-invoice sales model: a sales call determines which modules each client buys, then a **system admin** activates them per organization from the admin-app. No org-admin self-toggle. No plan-based auto-unlock.

- `organization_modules.is_active` is the single licensing flag, written only by `system_admin` from admin-app.
- project/ reads `organization_modules` and renders only active modules in `/modules` hub, Sidebar, and route guards (ModuleGate).
- `/settings/modules` in project/ becomes read-only: lists active modules + "contact sales to add more" CTA. No toggle UI for org_admin.
- The `modules` catalog is coarse (~11 SKUs), not per-route. Each SKU's `navigation_items` lists the routes it unlocks.
- `/modules` hub page in project/ is kept as a DB-driven launcher (current hardcoded `MODULE_SECTIONS` removed).

## Coarse module catalog (~11 SKUs)

| slug | routes | bundled |
|---|---|---|
| `core` | dashboard, farm-hierarchy, parcels, settings, notifications | free (`is_required = true`) |
| `chat_advisor` | /chat (AgromindIA conversational) | free |
| `agromind_advisor` | /parcels/:id/ai/* (calibration, diagnostics, recommendations, annual plan, references) | sellable |
| `satellite` | satellite imagery, vegetation indices, weather | sellable |
| `personnel` | workers, tasks | sellable |
| `stock` | stock, infrastructure | sellable |
| `production` | campaigns, crop-cycles, harvests, reception-batches, quality-control | sellable |
| `fruit_trees` | trees, orchards, pruning | sellable |
| `compliance` | compliance overview, certifications | sellable |
| `sales_purchasing` | quotes, sales-orders, purchase-orders | sellable |
| `accounting` | invoices, payments, journal, reports | sellable |
| `marketplace` | marketplace received/sent | sellable |

Seed must be reconciled from current 15-name snake_case (`farms`, `sales_orders`, etc.) to this 11-SKU catalog. Existing `organization_modules` rows keyed on old module ids need migration.

## Impact

- Zero-deploy module configuration changes
- New modules can be added from admin panel
- Route-to-module mappings managed dynamically
- Consistent source of truth: `modules` table + `module_translations`
- project/ has a single source of truth for gating: `organization_modules` × module `navigation_items`. Four competing paths (hardcoded `MODULE_SECTIONS`, `ROUTE_MODULE_MAP`, `alwaysAllowed`, `organization_modules`) collapse into one.
