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

- Per-organization module overrides (org admins already toggle via settings)
- Subscription plan management (already exists at `/subscription-model`)
- Module marketplace / self-service addon purchase (already exists via Polar)

## Impact

- Zero-deploy module configuration changes
- New modules can be added from admin panel
- Route-to-module mappings managed dynamically
- Consistent source of truth: `modules` table + `module_translations`
