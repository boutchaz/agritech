# Equipment & Fleet Management — Design

## Architecture Decision: Separate Module, Not Extension of Structures

The `structures` table and module are purpose-built for fixed infrastructure (buildings, basins, wells). Equipment assets have fundamentally different lifecycle fields (serial number, license plate, hour meter, purchase price, operator assignment). Extending `structures` would pollute the fixed-asset model with nullable equipment fields and make the frontend form a tangled mess.

**Decision**: New `equipment_assets` table + new `equipment` NestJS module + new frontend section.

## Data Model

### `equipment_assets`

```
┌──────────────────────┐
│   equipment_assets   │
├──────────────────────┤
│ id                   │ UUID PK
│ organization_id      │ UUID FK → organizations (RLS)
│ farm_id              │ UUID FK → farms (nullable — org-level or farm-level)
│ name                 │ text NOT NULL — "Massey Ferguson 8S.265"
│ category             │ enum NOT NULL — tractor, harvester, sprayer,
│                      │   utility_vehicle, pump, small_tool, other
│ brand                │ text — "Massey Ferguson"
│ model                │ text — "8S.265"
│ serial_number        │ text
│ license_plate        │ text (for road vehicles)
│ purchase_date        │ date
│ purchase_price       │ numeric(12,2)
│ current_value        │ numeric(12,2) (manual for v1)
│ hour_meter_reading   │ numeric (hours)
│ hour_meter_date      │ date (last reading date)
│ fuel_type            │ enum — diesel, petrol, electric, other
│ status               │ enum — available, in_use, maintenance, out_of_service
│ assigned_to          │ UUID FK → users (nullable — current operator)
│ insurance_expiry     │ date (nullable)
│ registration_expiry  │ date (nullable)
│ notes                │ text
│ is_active            │ boolean default true
│ created_at           │ timestamptz
│ updated_at           │ timestamptz
└──────────────────────┘
```

**Indexes**: `(organization_id)`, `(farm_id)`, `(category)`, `(status)`

### `equipment_maintenance`

```
┌──────────────────────────┐
│  equipment_maintenance   │
├──────────────────────────┤
│ id                       │ UUID PK
│ organization_id          │ UUID FK → organizations (RLS)
│ equipment_id             │ UUID FK → equipment_assets
│ type                     │ enum NOT NULL — oil_change, repair, inspection,
│                          │   tire_replacement, battery, filter, fuel_fill,
│                          │   registration, insurance, other
│ description              │ text
│ cost                     │ numeric(12,2)
│ maintenance_date         │ date NOT NULL
│ hour_meter_reading       │ numeric (hours at time of service)
│ next_service_date        │ date (nullable — "next oil change due by")
│ next_service_hours       │ numeric (nullable — "next service at 500h")
│ vendor                   │ text (nullable — "Garage Bennani")
│ vendor_invoice_number    │ text
│ cost_center_id           │ UUID FK → cost_centers (nullable)
│ journal_entry_id         │ UUID FK → journal_entries (nullable, set after posting)
│ performed_by_user_id     │ UUID FK → users (nullable — who logged it)
│ notes                    │ text
│ is_active                │ boolean default true
│ created_at               │ timestamptz
│ updated_at               │ timestamptz
└──────────────────────────┘
```

**Indexes**: `(organization_id)`, `(equipment_id)`, `(maintenance_date)`, `(type)`

### RLS

Both tables get standard RLS using `is_organization_member(organization_id)`, identical to `structures`.

## API Design

### NestJS Module: `equipment`

**Controller**: `EquipmentController`
- `GET    /api/v1/organizations/:orgId/equipment` — list all equipment (optional filters: farm_id, category, status)
- `POST   /api/v1/organizations/:orgId/equipment` — create equipment
- `GET    /api/v1/organizations/:orgId/equipment/:id` — get one
- `PATCH  /api/v1/organizations/:orgId/equipment/:id` — update
- `DELETE /api/v1/organizations/:orgId/equipment/:id` — soft delete (is_active=false)
- `GET    /api/v1/organizations/:orgId/equipment/:id/maintenance` — list maintenance for one equipment
- `POST   /api/v1/organizations/:orgId/equipment/:id/maintenance` — log maintenance event (triggers JE if cost > 0)
- `PATCH  /api/v1/organizations/:orgId/equipment/maintenance/:maintenanceId` — update maintenance
- `DELETE /api/v1/organizations/:orgId/equipment/maintenance/:maintenanceId` — soft delete maintenance (reverses JE if posted)

**Guards**: `JwtAuthGuard` → `OrganizationGuard` → `PoliciesGuard` (same as structures)

**Service Pattern**: Same as `structures.service.ts` — inject `DatabaseService`, use admin client, enforce org membership.

### Accounting Integration

New method on `AccountingAutomationService`:

```
createJournalEntryFromMaintenance(
  organizationId, maintenanceId, amount, date, 
  description, createdBy, equipmentName, 
  costCenterId?, farmId?
)
```

Mapping types for resolution:
- `cost_type` → `equipment_maintenance` (expense account)
- `cost_type` → `equipment_fuel` (if type = fuel_fill)
- `cash` → `bank` (credit side)

Journal entry pattern:
```
Dr. Equipment Maintenance Expense    XXX.XX
   Cr. Cash / Bank                         XXX.XX
```

With `cost_center_id` and `farm_id` on journal items for profitability rollup.

`reference_type` on journal_entries: `'equipment_maintenance'`
`reference_id`: the maintenance record ID

## Frontend Design

### Route Decision: New `/equipment` Route

The `/infrastructure` page is already heavy (org/farm tabs, 4 structure types with specialized forms). Adding equipment management as another tab would make the page unwieldy. A separate `/equipment` route keeps things clean and matches how Karim thinks: "buildings" vs "machines."

**Route**: `/_authenticated/(misc)/equipment.tsx`

### UI Structure

```
/equipment page
├── Page header with breadcrumbs
├── Filter bar (search, category filter, status filter, farm filter)
├── Tab: All Equipment | By Farm
├── Equipment cards/table (responsive)
│   ├── Name, category icon, brand/model
│   ├── Status badge (available/in_use/maintenance/out_of_service)
│   ├── Farm assignment
│   ├── Hour meter reading
│   └── Actions: Edit, Delete, View Maintenance
└── Add Equipment dialog (form)
    ├── Name, Category, Brand, Model
    ├── Serial number, License plate
    ├── Purchase date, Purchase price, Current value
    ├── Fuel type, Hour meter reading
    ├── Status, Assigned to (user select)
    ├── Farm assignment
    └── Notes

/equipment/:id maintenance (slide-over or dialog)
├── Equipment summary header
├── Maintenance history list (chronological)
│   ├── Type badge, Date, Description
│   ├── Cost, Vendor
│   ├── Hour meter at service
│   └── Next service date/hours
├── Log Maintenance form
│   ├── Type, Date, Description
│   ├── Cost, Vendor, Invoice #
│   ├── Hour meter reading
│   ├── Next service date/hours
│   └── Cost center (optional)
└── Total maintenance cost YTD
```

### Frontend Files

- `project/src/routes/_authenticated/(misc)/equipment.tsx` — route
- `project/src/components/EquipmentManagement.tsx` — main component
- `project/src/components/EquipmentMaintenance.tsx` — maintenance history + form
- `project/src/lib/api/equipment.ts` — API client + types
- `project/src/hooks/useEquipment.ts` — React Query hooks

### Sidebar Navigation

Add "Equipment" to sidebar under the `stock` module group (or a new `fleet` group). Update module `navigation_items` in the seed data if needed.

## Risks

1. **Module gating**: Equipment might need its own module SKU in `organization_modules`. If not, it falls under `stock` or `production`. Decision: start under `stock` module's navigation_items, can be split later.
2. **Account mapping gaps**: If the org hasn't configured `equipment_maintenance` account mapping, the maintenance creation must either fail (strict) or create the record without a JE (lenient). **Decision**: follow the established pattern — fail hard if mapping missing (per decisions.md: "Account mappings are mandatory — hard fail on missing mappings").
3. **Hour meter tracking**: v1 is manual entry. No automatic alerts for "next service due." Karim can see the next_service_date/next_service_hours fields but gets no notification. This is acceptable for v1.
4. **Translation load**: New feature = many new i18n keys across 3 languages (en, fr, ar). Plan translation work as a dedicated task.

## What We're Not Building (Explicitly)

- Real-time GPS tracking
- Automatic depreciation calculation
- Fuel tank level monitoring
- Parts inventory management
- Work order scheduling
- Integration with `task_equipment` table (loose link only)
- Mobile-specific UI (responsive web is fine)
