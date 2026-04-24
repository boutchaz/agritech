# Design — Admin Module Editor

## Architecture

```
Admin App                     Backend (NestJS)              Database
┌──────────────┐    REST     ┌──────────────────┐         ┌──────────────┐
│ /modules     │────────────▶│ AdminController   │────────▶│ modules      │
│ (new page)   │             │ GET/POST/PATCH/   │         │ module_      │
│              │             │ DELETE modules    │         │ translations │
└──────────────┘             └──────────────────┘         └──────────────┘
                                                                │
                                                                │ read by
                                                                ▼
Frontend App                                             ┌──────────────┐
┌──────────────┐    GET /module-config                   │ ModuleConfig  │
│ ModuleGate   │◀────────────────────────────────────────│ Service       │
│ Sidebar      │   (already exists, reads modules table) │ (cached 30m) │
│ Dashboard    │                                         └──────────────┘
└──────────────┘
```

## Decision: Reuse admin controller pattern

The admin app already uses `apiRequest` to call `/api/v1/admin/*` endpoints. All admin endpoints are behind `RequireRole('system_admin')`. We add module CRUD to the existing `AdminController` + `AdminService` — no new module needed.

## Decision: Remove ROUTE_MODULE_MAP, use isNavigationEnabled

`ModuleGate` currently uses a hardcoded `ROUTE_MODULE_MAP`. Replace with:
1. Get current path from router
2. Call `isNavigationEnabled(path)` from `useModuleBasedDashboard`
3. This reads `navigation_items` from the `modules` table via the config API

The `navigation_items` JSONB column stores `[{to: "/compliance", ...}]`. The `useModuleBasedDashboard` hook already builds a set of enabled paths from active modules and exposes `isNavigationEnabled(path)`.

## Decision: Module-config cache invalidation

The module-config API caches for 30 minutes. When admin saves a module change, call `POST /api/v1/module-config/clear-cache` (already exists) to bust the cache. Frontend users will get fresh config on next page load.

## Backend Endpoints (added to AdminController)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/admin/modules` | List all modules with translations |
| `GET` | `/admin/modules/:id` | Get single module with translations |
| `POST` | `/admin/modules` | Create new module |
| `PATCH` | `/admin/modules/:id` | Update module properties |
| `DELETE` | `/admin/modules/:id` | Delete module (soft: set is_available=false) |
| `PUT` | `/admin/modules/:id/translations/:locale` | Upsert translation for locale |

All endpoints require `system_admin` role.

## Admin UI Page Structure

```
/modules
├── Header: "Gestion des Modules" + "Nouveau Module" button
├── Table: all modules sorted by display_order
│   ├── Columns: Order | Slug | Name(fr) | Category | Price | Plan | Routes | Active | Actions
│   └── Row actions: Edit, Toggle availability
└── Edit Dialog (opens on click/create):
    ├── Tab: General — slug, icon, color, category, display_order, price_monthly,
    │                   is_required, is_recommended, is_addon_eligible, required_plan
    ├── Tab: Routes & Widgets — navigation_items JSONB editor, dashboard_widgets JSONB editor
    └── Tab: Translations — fr/en/ar name, description, features per locale
```

## JSONB Editors

For `navigation_items` and `dashboard_widgets`, use a simple list editor:
- Each row: text input for the value (route path or widget ID)
- Add/remove buttons
- `navigation_items` stores route path strings: `["/compliance", "/compliance/certifications"]`
- `dashboard_widgets` stores widget ID strings: `["compliance-dashboard", "compliance-alerts"]`

Note: the current schema stores `navigation_items` as objects `[{to, label, icon}]` but `useModuleBasedDashboard` only uses the `to` field from each object. Simplify to flat string array in the editor, map to objects on save.

## Sidebar integration update

Current: Sidebar checks `isModuleActive(slug)` per section with hardcoded slug assignments.
After: Sidebar uses `isNavigationEnabled(path)` for each nav item path. If the path isn't in any active module's `navigation_items`, the item is hidden.

This makes sidebar filtering fully dynamic — add a route to a module's `navigation_items` in admin, it appears in the sidebar for orgs with that module active.

## Risks

1. **Breaking existing routes** — if `navigation_items` is empty or misconfigured, `isNavigationEnabled` returns false for everything. Mitigation: when no modules have navigation items, default to showing everything (existing behavior in `isModuleActive` fallback).
2. **Cache staleness** — admin saves module, user doesn't see change for 30 min. Mitigation: bust cache on save.
3. **Deleting a module with active orgs** — soft delete only (set `is_available=false`), never hard delete.
