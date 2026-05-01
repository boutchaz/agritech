# Equipment & Fleet Management

## What

Add a full equipment/fleet management capability to AgroGina, covering the entire lifecycle of mobile assets — tractors, harvesters, sprayers, utility vehicles, irrigation pumps, and small motorized tools (chainsaws, generators). This sits alongside the existing fixed-infrastructure (`structures`) feature under the `/infrastructure` page.

Three new capabilities:
1. **Equipment Asset Registry** — one `equipment_assets` table with a `category` enum for the full fleet
2. **Maintenance Tracking** — `equipment_maintenance` table for service events (oil changes, repairs, inspections, tire replacements) with cost capture
3. **Accounting Wiring** — every maintenance cost creates a journal entry via `AccountingAutomationService`. New account mapping types for `equipment_depreciation`, `maintenance_expense`, `fuel_expense`. Cost center tagging per equipment or per farm.

## Why

Karim manages 300ha with multiple tractors, a sprayer, and a pickup. Today he tracks nothing — when a tractor breaks, he scrambles. He has no idea what maintenance costs per year, no idea when the next oil change is due, and no connection between equipment spend and his accounting ledger.

Hassan needs to see which equipment is available vs. in-service before planning operations.

Fatima needs equipment costs rolled into her farm profitability reports.

## Goals

1. Karim can register every piece of equipment in one place (tractor, sprayer, pump, chainsaw)
2. Karim can log a maintenance event (oil change, repair) with a cost, and it automatically hits the GL
3. Fatima can see total equipment cost per farm per year in profitability reports
4. Hassan can see equipment availability status when planning tasks
5. Everything is multi-tenant (`organization_id`) with RLS, matching existing patterns

## Non-Goals

- GPS tracking / real-time equipment location (future, not now)
- Fuel consumption logging as a separate feature (can be a maintenance sub-type for v1)
- Depreciation scheduling engine (can log depreciation manually as a maintenance event; automatic depreciation calculation is future scope)
- Equipment rental/leasing management
- Integration with `task_equipment` (per-task usage logs) — they remain independent for v1; a loose link via equipment name/ID is acceptable

## Impact

- **New DB tables**: `equipment_assets`, `equipment_maintenance`
- **New NestJS module**: `equipment` (controller, service, DTOs)
- **New frontend**: Equipment tab/section on `/infrastructure` page, or a new `/equipment` route
- **Accounting integration**: New mapping types (`equipment_maintenance`, `equipment_depreciation`, `equipment_fuel`), new `reference_type` on journal entries
- **Module catalog**: May need a new module SKU or extend existing `stock` module's `navigation_items`
