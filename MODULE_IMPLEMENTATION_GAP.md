# Module Implementation Gap Analysis

**Generated:** 2026-01-29
**Last Updated:** 2026-01-29

## Overview

This document tracks module implementation using an **abstract, reusable architecture**. Instead of creating module-specific routes and components, we extend existing generic infrastructure with module filters and type-specific attributes.

---

## Architecture Principle: Generic Routes + Module Filters

### ❌ Anti-Pattern (Not Scalable)
```
/trees          ← New component for fruit-trees
/cereals        ← New component for cereals
/vegetables     ← New component for vegetables
/orchards       ← New component for orchards
/gardens        ← New component for gardens
```
Every new module requires new routes and components. Duplicates logic.

### ✅ Pattern (Scalable)
```
/crops?module=fruit-trees      ← Reuses crops component
/crops?module=cereals          ← Reuses crops component
/crops?module=vegetables       ← Reuses crops component

/planting?module=fruit-trees   ← Reuses planting component
/planting?module=cereals       ← Reuses planting component

/harvests?module=fruit-trees   ← Reuses harvests component
```
One set of components, filtered by module. Type-specific attributes stored in database.

---

## Current Implementation Status

### Implemented Modules (9 total)

| Module | Slug | Generic Routes Used | Status |
|--------|------|---------------------|--------|
| Farm Management | `farm_management` | `/parcels`, `/crops`, `/tasks`, `/harvests` | ✅ Complete |
| Inventory & Stock | `inventory` | `/stock`, `/warehouses`, `/items` | ✅ Complete |
| Sales | `sales` | `/customers`, `/quotes`, `/sales-orders`, `/invoices` | ✅ Complete |
| Procurement | `procurement` | `/suppliers`, `/purchase-orders` | ✅ Complete |
| Accounting | `accounting` | `/accounts`, `/journal-entries`, `/financial-reports` | ✅ Complete |
| Human Resources | `hr` | `/workers`, `/piece-work`, `/work-units` | ✅ Complete |
| Analytics & Satellite | `analytics` | `/satellite-indices`, `/soil-analyses`, `/reports` | ✅ Complete |
| Marketplace | `marketplace` | `/marketplace` | ✅ Complete |
| Compliance | `compliance` | `/compliance`, `/certifications` | ✅ Complete |

### Missing Modules (5 total)

| Module | Slug | Priority | Generic Routes to Use | What's Needed |
|--------|------|----------|----------------------|---------------|
| **Fruit Trees** | `fruit-trees` | High (Required) | `/crops`, `/planting`, `/harvests` | Type-specific attributes |
| **Cereals** | `cereals` | High (Required) | `/crops`, `/planting`, `/harvests` | Type-specific attributes |
| **Vegetables** | `vegetables` | High (Required) | `/crops`, `/planting`, `/harvests` | Type-specific attributes |
| **Mushrooms** | `mushrooms` | Medium (Addon) | `/crops`, `/planting`, `/harvests` | New tables for indoor farming |
| **Livestock** | `livestock` | Medium (Addon) | `/animals` (new generic) | New tables for animal mgmt |

---

## Implementation Plan: Abstract & Reusable

### Phase 1: Crop-Based Modules (fruit-trees, cereals, vegetables)

These modules share 90% of functionality. We **extend** the generic crops system, not duplicate it.

#### Database: Extend Existing Tables

```sql
-- Add crop type categorization
ALTER TABLE crops ADD COLUMN IF NOT EXISTS crop_category VARCHAR(50);
-- Values: 'trees', 'cereals', 'vegetables', 'mushrooms', 'general'

-- Add tree-specific attributes (nullable, only used for trees)
ALTER TABLE crops ADD COLUMN IF NOT EXISTS is_tree BOOLEAN DEFAULT false;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS tree_variety VARCHAR(100);
ALTER TABLE crops ADD COLUMN IF NOT EXISTS planting_date DATE;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS expected_yield_per_tree DECIMAL(10,2);
ALTER TABLE crops ADD COLUMN IF NOT EXISTS spacing_between_trees DECIMAL(10,2); -- meters

-- Add cereal-specific attributes
ALTER TABLE crops ADD COLUMN IF NOT EXISTS cereal_variety VARCHAR(100);
ALTER TABLE crops ADD COLUMN IF NOT EXISTS seeding_rate DECIMAL(10,2); -- kg/ha
ALTER TABLE crops ADD COLUMN IF NOT EXISTS expected_yield_per_hectare DECIMAL(10,2); -- tons/ha

-- Add vegetable-specific attributes
ALTER TABLE crops ADD COLUMN IF NOT EXISTS vegetable_variety VARCHAR(100);
ALTER TABLE crops ADD COLUMN IF NOT EXISTS planting_method VARCHAR(50); -- 'seeds', 'seedlings', 'direct'
ALTER TABLE crops ADD COLUMN IF NOT EXISTS row_spacing DECIMAL(10,2); -- cm

-- Add module_slug filter to parcels for orchards/gardens
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS module_slug VARCHAR(50);
```

#### Frontend: Use Existing Routes with Module Filter

**No new routes needed.** Update existing routes to support module filtering:

```typescript
// project/src/routes/_authenticated/(production)/crops.tsx (already exists)
// Add module filter support

function Crops() {
  const { module } = useParams(); // Get module from URL: /crops?module=fruit-trees

  const { data: crops } = useQuery({
    queryKey: ['crops', organizationId, module],
    queryFn: () => cropsApi.list(organizationId!, { module }),
  });

  // Show/hide fields based on crop_category
  const renderCropFields = (crop: Crop) => {
    return (
      <>
        <CommonFields crop={crop} />
        {crop.crop_category === 'trees' && <TreeFields crop={crop} />}
        {crop.crop_category === 'cereals' && <CerealFields crop={crop} />}
        {crop.crop_category === 'vegetables' && <VegetableFields crop={crop} />}
      </>
    );
  };
}
```

#### Navigation: Module-Specific Links to Generic Routes

```typescript
// project/src/config/sidebar-nav.ts
{
  id: 'fruit-trees',
  label: 'nav.fruitTrees',
  icon: TreeDeciduous,
  paths: ['/crops?module=fruit-trees', '/planting?module=fruit-trees', '/harvests?module=fruit-trees'],
  items: [
    { id: 'fruit-crops', path: '/crops?module=fruit-trees', label: 'nav.crops', ... },
    { id: 'fruit-planting', path: '/planting?module=fruit-trees', label: 'nav.planting', ... },
    { id: 'fruit-harvests', path: '/harvests?module=fruit-trees', label: 'nav.harvests', ... },
  ],
}
```

#### Specialized Views (Optional)

If a module needs a specialized overview page, it can be a simple filter wrapper:

```typescript
// project/src/routes/_authenticated/(production)/trees.tsx (already exists)
// Just redirects to crops with filter

function Trees() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate({ to: '/crops', search: { module: 'fruit-trees' } });
  }, [navigate]);
}
```

### Phase 2: Mushrooms (Indoor Farming)

Mushrooms require different infrastructure (growing rooms, climate control).

#### Database: Add Mushroom-Specific Tables

```sql
-- Growing rooms for climate-controlled environments
CREATE TABLE mushroom_growing_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  parcel_id UUID REFERENCES parcels(id), -- Optional location
  name VARCHAR(255) NOT NULL,
  room_type VARCHAR(50), -- 'growing', 'incubation', 'fructification'
  temperature_target DECIMAL(5,2), -- Celsius
  humidity_target DECIMAL(5,2), -- Percentage
  co2_target DECIMAL(8,2), -- ppm
  light_hours INT, -- Daily light duration
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Mushroom batches (extends crops concept)
CREATE TABLE mushroom_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  room_id UUID REFERENCES mushroom_growing_rooms(id),
  crop_id UUID REFERENCES crops(id), -- Link to generic crops
  spawn_type VARCHAR(100),
  substrate_type VARCHAR(100),
  inoculation_date DATE,
  colonized_date DATE,
  expected_harvest_date DATE,
  status VARCHAR(50), -- 'inoculating', 'colonizing', 'fruiting', 'harvested'
  notes TEXT
);

-- Link mushroom batches to harvests
ALTER TABLE harvests ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES mushroom_batches(id);
```

#### Frontend: Reuse Generic Patterns

```
/crops?module=mushrooms      ← Shows mushroom_batches filtered view
/planting?module=mushrooms   ← Shows inoculation/planting
/harvests?module=mushrooms   ← Shows harvests filtered by batch_id
/growing-rooms               ← New page for room management (module-specific)
```

Only `/growing-rooms` is new. Everything else reuses existing patterns.

### Phase 3: Livestock (Animal Management)

Livestock is fundamentally different from crops, requiring a new generic system.

#### Database: Create Animal Management System

```sql
-- Generic animals table (supports all livestock types)
CREATE TABLE animals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  parcel_id UUID REFERENCES parcels(id), -- Location
  module_slug VARCHAR(50), -- 'livestock' or specific type
  tag_number VARCHAR(100) UNIQUE,
  species VARCHAR(100), -- 'cattle', 'sheep', 'goat', 'poultry', etc.
  breed VARCHAR(100),
  gender VARCHAR(20), -- 'male', 'female', 'castrated'
  birth_date DATE,
  weight DECIMAL(10,2), -- kg
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'sold', 'deceased'
  acquisition_date DATE,
  acquisition_cost DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generic animal events (covers health, feeding, breeding)
CREATE TABLE animal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  animal_id UUID REFERENCES animals(id),
  event_type VARCHAR(50), -- 'feeding', 'health', 'breeding', 'weight', 'treatment'
  event_date TIMESTAMPTZ DEFAULT NOW(),
  recorded_by UUID REFERENCES users(id),
  data JSONB, -- Flexible schema for different event types
  notes TEXT
);

-- Example animal_events.data:
-- Feeding: {"feed_type": "hay", "quantity": 5, "unit": "kg"}
-- Health: {"vet_name": "Dr. Smith", "diagnosis": "...", "treatment": "..."}
-- Breeding: {"partner_id": "xxx", "breeding_method": "natural", "expected_birth": "2024-06-01"}
```

#### Frontend: New Generic Animal Routes

```
/animals                    ← Generic animal list (filter by species, status)
/animals/$animalId          ← Animal detail with events timeline
/animals/events             ← Event log (filter by type: feeding, health, breeding)
```

These routes work for **all livestock types**. No new routes needed for different animals.

---

## Component Reuse Strategy

### Shared Components (Used Across All Modules)

```typescript
// project/src/components/crops/CropList.tsx
// Used for: fruit-trees, cereals, vegetables, mushrooms
// Filtered by: module_slug or crop_category

interface CropListProps {
  module?: string; // 'fruit-trees', 'cereals', 'vegetables', 'mushrooms'
  category?: string; // 'trees', 'cereals', 'vegetables'
}

export function CropList({ module, category }: CropListProps) {
  // Fetches crops with filter, renders appropriate fields based on type
}
```

```typescript
// project/src/components/crops/PlantingCalendar.tsx
// Used for: ALL crop modules
// Shows planting/harvest schedules filtered by module

export function PlantingCalendar({ module }: { module?: string }) {
  // Reuses calendar component, filters by module
}
```

```typescript
// project/src/components/harvests/HarvestList.tsx
// Used for: ALL modules with harvests
// Filtered by module or batch_id (for mushrooms)

export function HarvestList({ module, batchId }: { module?: string; batchId?: string }) {
  // Reuses harvest list, applies appropriate filter
}
```

### Type-Specific Field Components

```typescript
// project/src/components/crops/fields/TreeFields.tsx
// Only shown when crop_category === 'trees'

export function TreeFields({ crop }: { crop: Crop }) {
  return (
    <FormField name="tree_variety" label="Variety" />
    <FormField name="planting_date" label="Planting Date" type="date" />
    <FormField name="expected_yield_per_tree" label="Yield per Tree (kg)" type="number" />
    <FormField name="spacing_between_trees" label="Spacing (m)" type="number" />
  );
}

// project/src/components/crops/fields/CerealFields.tsx
// project/src/components/crops/fields/VegetableFields.tsx
// project/src/components/crops/fields/MushroomFields.tsx
```

---

## API Updates: Support Module Filtering

### Update Existing Endpoints

```typescript
// agritech-api/src/modules/crops/crops.controller.ts

@Get()
async findAll(
  @Query('module') module?: string, // Filter by module_slug
  @Query('category') category?: string, // Filter by crop_category
  @Query('parcelId') parcelId?: string,
) {
  // Adds WHERE clauses for module and category filters
}

// Example requests:
// GET /crops?module=fruit-trees
// GET /crops?category=trees
// GET /crops?module=cereals&parcelId=xxx
```

```typescript
// agritech-api/src/modules/harvests/harvests.controller.ts

@Get()
async findAll(
  @Query('module') module?: string,
  @Query('batchId') batchId?: string, // For mushrooms
) {
  // Filter by module or batch_id
}
```

### New Endpoints (Only for genuinely new functionality)

```typescript
// agritech-api/src/modules/mushrooms/mushrooms.controller.ts (new)

@Controller('mushrooms')
export class MushroomsController {
  @Get('growing-rooms')
  async getGrowingRooms(@Param('organizationId') organizationId: string) {
    // Only for mushroom-specific room management
  }
}

// agritech-api/src/modules/livestock/animals.controller.ts (new)

@Controller('animals')
export class AnimalsController {
  @Get()
  async getAnimals(@Param('organizationId') organizationId: string) {
    // Generic animal listing
  }

  @Get(':id/events')
  async getAnimalEvents(@Param('id') animalId: string) {
    // Generic event timeline
  }
}
```

---

## Module Configuration: Dynamic Navigation

Update the `modules` table to store navigation templates:

```sql
-- navigation_items already exists, update for new modules
UPDATE modules SET navigation_items = ARRAY[
  '/crops?module=fruit-trees',
  '/planting?module=fruit-trees',
  '/harvests?module=fruit-trees'
] WHERE slug = 'fruit-trees';

UPDATE modules SET navigation_items = ARRAY[
  '/crops?module=cereals',
  '/planting?module=cereals',
  '/harvests?module=cereals'
] WHERE slug = 'cereals';

UPDATE modules SET navigation_items = ARRAY[
  '/crops?module=mushrooms',
  '/growing-rooms',
  '/harvests?module=mushrooms'
] WHERE slug = 'mushrooms';

UPDATE modules SET navigation_items = ARRAY[
  '/animals?species=cattle',
  '/animals?species=sheep',
  '/animals/events'
] WHERE slug = 'livestock';
```

The frontend `useModuleConfig()` hook already fetches this. No changes needed.

---

## Migration Path: Existing Specialized Routes

For routes that already exist (like `/trees`, `/orchards`, `/pruning`):

**Option A: Keep as Redirects**
```typescript
// project/src/routes/_authenticated/(production)/trees.tsx
// Redirects to /crops?module=fruit-trees
```

**Option B: Keep as Specialized Views**
If they provide unique value, keep them but ensure they use the same underlying components:

```typescript
// project/src/routes/_authenticated/(production)/trees.tsx
function Trees() {
  // Uses CropList component with module='fruit-trees'
  // Adds tree-specific dashboard widgets
  return <CropList module="fruit-trees" showTreeStats />;
}
```

---

## Summary: Scalability Through Abstraction

| Aspect | ❌ Module-Specific Approach | ✅ Abstract Approach |
|--------|---------------------------|---------------------|
| **Routes** | New route per module | Generic routes + filters |
| **Components** | Duplicate per module | Reusable with type props |
| **Database** | New tables per module | Extend existing tables |
| **API** | New endpoints per module | Filter existing endpoints |
| **Adding Module** | Create routes, components, tables | Add config + type attributes |

### Adding a New Module (e.g., "Greenhouses")

**Module-Specific Approach:**
1. Create `/greenhouses` route
2. Create `Greenhouses.tsx` component
3. Create `greenhouses` table
4. Create `/greenhouses` API endpoint

**Abstract Approach:**
1. Add row to `modules` table
2. Add `crop_category = 'greenhouse'` support to `CropsList` component
3. Maybe add greenhouse-specific fields to `crops` table
4. That's it

---

## Implementation Checklist

### Week 1: Database Schema
- [ ] Add `crop_category` and type-specific columns to `crops` table
- [ ] Add `module_slug` to `parcels` table
- [ ] Update `modules` navigation_items for new modules
- [ ] Create `mushroom_growing_rooms` and `mushroom_batches` tables
- [ ] Create `animals` and `animal_events` tables

### Week 2: Backend API
- [ ] Update `crops` endpoint to support `module` and `category` filters
- [ ] Update `harvests` endpoint to support `module` and `batchId` filters
- [ ] Create mushrooms controller (growing rooms only)
- [ ] Create animals controller (generic)

### Week 3: Frontend Components
- [ ] Update `CropsList` to show/hide fields based on `crop_category`
- [ ] Create `TreeFields`, `CerealFields`, `VegetableFields` components
- [ ] Update planting calendar to support module filter
- [ ] Create `GrowingRooms` component (mushroom-specific)
- [ ] Create `AnimalList` and `AnimalEvents` components (generic)

### Week 4: Navigation & Integration
- [ ] Update `sidebar-nav.ts` with new module links
- [ ] Update `useModuleBasedDashboard` hook
- [ ] Test module switching and filters
- [ ] Update onboarding to reflect new modules

---

## Key Principle

> **"Modules are configuration, not code."**

Modules should be defined by data (database rows + config), not by separate route files and components. The code should be generic and adaptable, driven by module configuration.
