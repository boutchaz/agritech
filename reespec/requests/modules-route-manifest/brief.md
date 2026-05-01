# Modules Route Manifest

## What

Ship a Salesforce-App-Builder-tier route picker in the admin-app: sysadmin selects route paths from an autocomplete list derived from the real TanStack Router route tree, instead of typing them as free-text JSONB. Backend validates every saved nav_item against the same manifest. Orphan routes (in code but unclaimed by any module) surfaced as an audit endpoint.

## Why

Today the admin-app module edit dialog has a free-text input for `navigation_items`. Sysadmin typos silently break routing — ModuleGate starts blocking a legitimate route because its path doesn't match what the code emits. The `modules-catalog-alignment` request called this out as a non-goal and punted it.

## Goals

1. **Route manifest generator** — build-time script parses `project/src/routeTree.gen.ts` and emits `project/src/generated/route-manifest.json` (committed to repo). Regenerated on every frontend build. The JSON is a flat string array of runtime route paths.
2. **Backend manifest endpoint** — `GET /api/v1/admin/route-manifest` returns the array. Read from `project/src/generated/route-manifest.json` at NestJS boot (or from disk each request for simplicity).
3. **Backend validation** — `POST/PATCH /admin/modules` rejects `navigation_items` entries not in the manifest. 400 with the offending paths.
4. **Admin-app route picker** — the "Routes & Widgets" tab in `admin-app/src/routes/_authenticated/modules.tsx` replaces the free-text input with a combobox/autocomplete multi-select fed by the manifest endpoint.
5. **Orphan-routes audit** — `GET /api/v1/admin/modules/orphan-routes` returns routes in the manifest not claimed by any module's `navigation_items`. Surfaced as a warning card on the admin modules list.
6. **Parameter convention fix** — module-gating regex accepts both `:param` and `$param` prefixes (TanStack uses `$`). Migration seed updated to use `$param` so nav_items and manifest match byte-for-byte.

## Non-Goals

- CI check failing the build on orphan routes. Optional follow-up; not this request.
- Auto-assigning orphan routes to modules. Sysadmin still explicitly places each route.
- Manifest versioning / migration for renamed routes. If a route is renamed in code, sysadmin fixes the nav_items manually (orphan audit flags it).

## Impact

- Sysadmin can only pick paths that actually exist in the React app. Typos become impossible.
- When a developer ships a new route, the manifest updates on next build; admin-app immediately shows the new route in the autocomplete.
- If someone renames a route in code, the orphan-routes audit surfaces it so a sysadmin can fix the nav_items.
- Replaces today's ~60 LOC of free-text inputs with a typed combobox; also reduces the "did I type the slash correctly?" support burden.

## Depends on

- `modules-catalog-alignment` (landed 2026-04-24) — this request layers on top of the CMS it left in place.
