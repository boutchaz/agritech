# Schema Mismatch Report - Parcels Table

## Issue

The TypeScript `Parcel` interface defines fields that **don't exist** in the Supabase `parcels` table, causing potential runtime errors.

## Missing Columns in Database

The following fields are in the TypeScript model but **NOT** in the database:

```typescript
// From useParcelsQuery.ts - These fields DON'T EXIST in DB! ❌
tree_type?: string | null;
tree_count?: number | null;
planting_year?: number | null;
rootstock?: string | null;
```

## Database Schema (Current)

```sql
-- parcels table columns
id                  uuid
farm_id             uuid
name                text
description         text
area                numeric
area_unit           text (default: 'hectares')
boundary            jsonb
calculated_area     numeric
created_at          timestamptz
updated_at          timestamptz
irrigation_type     text
planting_density    numeric
perimeter           numeric
soil_type           text
variety             text
planting_date       date
planting_type       text
```

## TypeScript Model (Current)

```typescript
export interface Parcel {
  id: string;
  farm_id: string | null;
  name: string;
  description: string | null;
  area: number | null;
  area_unit: string | null;
  boundary?: number[][];
  calculated_area?: number | null;
  perimeter?: number | null;
  soil_type?: string | null;
  planting_density?: number | null;
  irrigation_type?: string | null;
  
  // ❌ THESE DON'T EXIST IN DATABASE:
  tree_type?: string | null;
  tree_count?: number | null;
  planting_year?: number | null;
  rootstock?: string | null;
  
  planting_date?: string | null;
  planting_type?: string | null;
  created_at: string | null;
  updated_at: string | null;
}
```

## Impact

### Components Using These Fields

**ParcelCard.tsx** uses these missing fields:
```typescript
{parcel.tree_type && (
  <div>Type: {parcel.tree_type}</div>
)}
{parcel.tree_count && (
  <div>Nombre d'arbres: {parcel.tree_count}</div>
)}
{parcel.planting_year && (
  <div>Année de plantation: {parcel.planting_year}</div>
)}
{parcel.rootstock && (
  <div>Porte-greffe: {parcel.rootstock}</div>
)}
```

**Result:** These will **always be undefined** since the database doesn't return them!

## Solution Options

### Option 1: Add Missing Columns to Database (Recommended)

Add the missing columns to `parcels` table:

```sql
-- Migration: Add fruit tree fields to parcels
ALTER TABLE parcels
  ADD COLUMN tree_type TEXT,
  ADD COLUMN tree_count INTEGER,
  ADD COLUMN planting_year INTEGER,
  ADD COLUMN rootstock TEXT;

-- Add check constraint for planting_year
ALTER TABLE parcels
  ADD CONSTRAINT parcels_planting_year_check 
  CHECK (planting_year IS NULL OR 
         (planting_year >= 1900 AND planting_year <= EXTRACT(YEAR FROM CURRENT_DATE) + 10));

-- Add comment
COMMENT ON COLUMN parcels.tree_type IS 'Type of fruit tree (for fruit tree parcels)';
COMMENT ON COLUMN parcels.tree_count IS 'Number of trees planted (for fruit tree parcels)';
COMMENT ON COLUMN parcels.planting_year IS 'Year trees were planted (for fruit tree parcels)';
COMMENT ON COLUMN parcels.rootstock IS 'Rootstock variety used (for fruit tree parcels)';
```

### Option 2: Remove from TypeScript Model

Remove the fields from the TypeScript interface and update components to not use them:

```typescript
export interface Parcel {
  id: string;
  farm_id: string | null;
  name: string;
  description: string | null;
  area: number | null;
  area_unit: string | null;
  boundary?: number[][];
  calculated_area?: number | null;
  perimeter?: number | null;
  soil_type?: string | null;
  planting_density?: number | null;
  irrigation_type?: string | null;
  planting_date?: string | null;
  planting_type?: string | null;
  created_at: string | null;
  updated_at: string | null;
}
```

**Downside:** Lose fruit tree functionality that's already built in the UI.

### Option 3: Create Separate `fruit_trees` Table

Create a separate table for fruit tree-specific data with 1:1 relationship:

```sql
CREATE TABLE fruit_trees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID UNIQUE NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  tree_type TEXT NOT NULL,
  tree_count INTEGER,
  planting_year INTEGER,
  variety TEXT,
  rootstock TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Downside:** More complex queries, need to JOIN tables.

## Recommendation

**✅ Option 1** - Add the missing columns to the `parcels` table.

**Reasons:**
1. Simplest solution - no frontend code changes needed
2. UI already built to display this data
3. Common to have optional fields for different parcel types
4. NULL values for non-fruit-tree parcels are fine
5. Better than breaking existing functionality

## Migration Script

```sql
-- File: project/supabase/migrations/YYYYMMDDHHMMSS_add_fruit_tree_fields_to_parcels.sql

-- Add fruit tree fields to parcels table
ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS tree_type TEXT,
  ADD COLUMN IF NOT EXISTS tree_count INTEGER,
  ADD COLUMN IF NOT EXISTS planting_year INTEGER CHECK (
    planting_year IS NULL OR 
    (planting_year >= 1900 AND planting_year <= EXTRACT(YEAR FROM CURRENT_DATE) + 10)
  ),
  ADD COLUMN IF NOT EXISTS rootstock TEXT;

-- Add comments for documentation
COMMENT ON COLUMN parcels.tree_type IS 'Type of fruit tree (e.g., Olive, Apple, Orange) - for fruit tree parcels';
COMMENT ON COLUMN parcels.tree_count IS 'Total number of trees planted in this parcel - for fruit tree parcels';
COMMENT ON COLUMN parcels.planting_year IS 'Year the trees were planted - for fruit tree parcels';
COMMENT ON COLUMN parcels.rootstock IS 'Rootstock variety used for grafting - for fruit tree parcels';

-- Update RLS policies if needed (should inherit from table's existing policies)
-- No additional RLS changes needed as new columns follow same rules
```

## Verification

After applying migration:

```sql
-- Verify columns exist
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'parcels'
  AND column_name IN ('tree_type', 'tree_count', 'planting_year', 'rootstock');

-- Should return 4 rows
```

## Next Steps

1. ✅ Create migration file
2. ✅ Apply to local Supabase
3. ✅ Test frontend still works
4. ✅ Apply to production Supabase
5. ✅ Generate TypeScript types: `npm run db:generate-types`

---

**Status:** 🔴 **Schema mismatch detected - requires migration**  
**Priority:** Medium (UI functionality affected)  
**Impact:** Fruit tree data fields always undefined  
**Fix:** Add 4 columns to `parcels` table

