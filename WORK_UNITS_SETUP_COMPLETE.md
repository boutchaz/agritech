# Work Units Setup - Complete Guide

## Current Status

✅ **All code is ready!** The Work Units Management feature is fully implemented with:
- Database migration created
- TypeScript types defined
- UI components built
- Routes and navigation configured
- CASL permissions set up
- Race condition fixed

## Why the Page Appears Empty

The Work Units page is working correctly - it's showing "No work units found" because:

**The database migration hasn't been applied yet!**

The migration file exists at:
```
/Users/boutchaz/Documents/CodeLovers/agritech/supabase/migrations/20251031000001_unit_management_and_piecework.sql
```

But it needs to be pushed to your Supabase database.

## How to Apply the Migration

### Option 1: Using Supabase CLI (Recommended)

If you have a remote Supabase project linked:

```bash
npm run db:push
```

This will:
- Push all pending migrations to your remote database
- Create the `work_units` and `piece_work_records` tables
- Add the `seed_default_work_units()` function
- Enable all the necessary RLS policies

### Option 2: Manual Application

If you need to apply it manually to a specific database:

```bash
psql -h YOUR_HOST -U YOUR_USER -d YOUR_DB -f ../supabase/migrations/20251031000001_unit_management_and_piecework.sql
```

Replace:
- `YOUR_HOST` with your database host
- `YOUR_USER` with your database user
- `YOUR_DB` with your database name

### Option 3: Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of the migration file
4. Paste and execute

## After Applying the Migration

Once the migration is applied, refresh the page at [http://localhost:5173/settings/work-units](http://localhost:5173/settings/work-units) and you'll see:

### 1. Load Default Units Button

Click **"Load Default Units"** to populate the table with common work units:

**Count-based units:**
- TREE (Arbre) - For counting trees
- BOX (Caisse) - For counting boxes/crates
- UNIT (Unité) - Generic counting unit

**Weight-based units:**
- KG (Kilogramme)
- TON (Tonne)

**Volume-based units:**
- LITER (Litre)
- M3 (Mètre cube)

**Area-based units:**
- M2 (Mètre carré)
- HECTARE (Hectare)

### 2. Create Custom Units

Click **"Add Unit"** to create your own work units with:
- Code (e.g., "SACK")
- Name in English, French, and Arabic
- Category (count, weight, volume, area, length)
- Decimal support (yes/no)
- Active status

### 3. Configure Workers

Navigate to **Workers** section to:
- Set default work unit for each worker
- Configure payment type:
  - Per day (daily wage)
  - Per unit (piece-work)
  - Monthly salary
  - Metayage (revenue share)

### 4. Record Piece-Work

Use the **Piece-Work Entry** feature to:
- Record units completed by workers
- Automatically calculate payment based on rate per unit
- Track quality ratings
- Link to accounting system

## Features Included

### Database Schema

**New Tables:**
- `work_units` - Store work unit definitions
- `piece_work_records` - Track work completed by units

**Extended Tables:**
- `workers` - Added `default_work_unit_id`, `rate_per_unit`
- `payment_records` - Added `units_completed`, `unit_rate`, `piece_work_ids`

**Functions:**
- `seed_default_work_units()` - Populate default units
- `calculate_piece_work_payment()` - Calculate payment for period
- `create_payment_journal_entry()` - Auto-create accounting entries

### UI Components

1. **[WorkUnitManagement.tsx](src/components/settings/WorkUnitManagement.tsx)**
   - Admin interface for managing work units
   - CRUD operations with validation
   - Search and filtering by category
   - Stats display (total, active, categories)

2. **[PieceWorkEntry.tsx](src/components/Workers/PieceWorkEntry.tsx)**
   - Dialog for recording piece-work
   - List view with filtering
   - Payment status tracking
   - Quality rating system

3. **[WorkerConfiguration.tsx](src/components/Workers/WorkerConfiguration.tsx)**
   - Configure worker payment methods
   - Set default work units
   - Configure rates per unit

### Routes

- **`/settings/work-units`** - Work Units Management (Admin only)
- **`/workers/piece-work`** - Piece-Work Records

### Permissions (CASL)

| Role | Work Units | Piece Work |
|------|-----------|-----------|
| System Admin | Manage | Manage |
| Organization Admin | Manage | Manage |
| Farm Manager | Read | Manage |
| Farm Worker | Read | Read |
| Day Laborer | - | Read (own records) |

## What Was Fixed

### 1. Race Condition Issue ✅

**Problem:** Users were redirected to `/tasks` when accessing Work Units page.

**Root Cause:** `ProtectedRoute` checked permissions before auth context fully loaded, evaluating with guest ability that denied all access.

**Solution:** Modified `ProtectedRoute.tsx` to wait for **both**:
- Auth loading to complete (`user`, `currentOrganization`, `userRole` all loaded)
- CASL ability rules to be computed

Now shows "Loading authentication..." → "Loading permissions..." → Work Units page

### 2. Syntax Error Fixed ✅

Fixed missing parenthesis in `WorkUnitManagement.tsx` line 138:
```typescript
// Before: if error) throw error;
// After:  if (error) throw error;
```

## Testing the Feature

### 1. Access the Page

Navigate to: **Settings → Unités de travail**

You should see:
- ✅ Brief loading spinner
- ✅ Work Units Management page loads
- ✅ No redirect to `/tasks`

### 2. Load Default Units

Click **"Load Default Units"** button:
- ✅ Success notification appears
- ✅ 9 default units are created
- ✅ Stats update: Total Units = 9, Active = 9, Categories = 4

### 3. Create a Custom Unit

Click **"Add Unit"** and create:
```
Code: SACK
Name: Sack
Name (FR): Sac
Name (AR): كيس
Category: Weight
Allow Decimal: No
```

### 4. Configure a Worker

Go to **Workers** page:
- Edit a worker
- Set payment type to "Per unit"
- Select a work unit (e.g., TREE)
- Set rate per unit (e.g., 5 MAD per tree)

### 5. Record Piece-Work

Click **"Record Piece-Work"**:
- Select worker
- Select work unit
- Enter units completed (e.g., 100 trees)
- Rate shows automatically (5 MAD)
- Total calculated: 500 MAD

### 6. Verify Accounting Integration

Check that payment records automatically create journal entries in the accounting module linking labor expenses to the appropriate accounts.

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  Settings → Work Units Management                    │
│  (Organization Admin only)                           │
└──────────────┬──────────────────────────────────────┘
               │
               ├─► Load Default Units
               │   (Calls seed_default_work_units RPC)
               │
               ├─► Create/Edit Custom Units
               │   (Insert/Update work_units table)
               │
               └─► Delete Unused Units
                   (Soft delete if usage_count = 0)

┌─────────────────────────────────────────────────────┐
│  Workers → Configure Payment                         │
│  (Farm Manager & above)                              │
└──────────────┬──────────────────────────────────────┘
               │
               └─► Set default_work_unit_id + rate_per_unit
                   (Update workers table)

┌─────────────────────────────────────────────────────┐
│  Workers → Record Piece-Work                         │
│  (Farm Manager & above)                              │
└──────────────┬──────────────────────────────────────┘
               │
               ├─► Create piece_work_records
               │   (Auto-calculate total_amount)
               │
               └─► Generate payment_records
                   ├─► Call calculate_piece_work_payment()
                   └─► Trigger create_payment_journal_entry()
                       (Automatic accounting integration)
```

## Multi-Language Support

All work units support three languages:
- **English** - Primary name
- **French** - `name_fr` field
- **Arabic** - `name_ar` field

The UI will display the appropriate name based on user's language preference from their profile settings.

## Database Details

### Work Units Table Schema

```sql
CREATE TABLE work_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  name_ar VARCHAR(100),
  name_fr VARCHAR(100),
  unit_category VARCHAR(20) NOT NULL CHECK (unit_category IN ('count', 'weight', 'volume', 'area', 'length')),
  base_unit VARCHAR(20),
  conversion_factor DECIMAL(10, 4),
  allow_decimal BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Piece-Work Records Schema

```sql
CREATE TABLE piece_work_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL,
  worker_id UUID NOT NULL REFERENCES workers(id),
  work_unit_id UUID NOT NULL REFERENCES work_units(id),
  work_date DATE NOT NULL,
  units_completed DECIMAL(10, 2) NOT NULL,
  rate_per_unit DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(12, 2) GENERATED ALWAYS AS (units_completed * rate_per_unit) STORED,
  payment_status VARCHAR(20) DEFAULT 'pending',
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
  notes TEXT,
  payment_record_id UUID REFERENCES payment_records(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Next Steps

1. **Apply the migration** using one of the methods above
2. **Refresh the Work Units page** to verify it loads
3. **Load default units** by clicking the button
4. **Test creating a custom unit**
5. **Configure at least one worker** with piece-work payment
6. **Record some piece-work** to test the full flow
7. **Verify accounting integration** by checking journal entries

## Support

If you encounter any issues:

1. **Check browser console** for errors (F12 → Console tab)
2. **Verify migration was applied**: Check if `work_units` table exists in your database
3. **Check permissions**: Ensure your user has `organization_admin` role
4. **Verify auth is loaded**: Email and User ID should be visible (not "Not loaded")

## Files Modified/Created

### Database
- `supabase/migrations/20251031000001_unit_management_and_piecework.sql` (22KB)

### Types
- `src/types/work-units.ts`

### Components
- `src/components/settings/WorkUnitManagement.tsx`
- `src/components/Workers/PieceWorkEntry.tsx`
- `src/components/Workers/WorkerConfiguration.tsx`

### Routes
- `src/routes/settings.work-units.tsx`
- `src/routes/workers.piece-work.tsx`

### Authorization
- `src/lib/casl/ability.ts` (Added WorkUnit & PieceWork subjects)
- `src/components/authorization/ProtectedRoute.tsx` (Fixed race condition)

### Navigation
- `src/components/SettingsLayout.tsx` (Added Work Units menu item)

---

**Status**: ✅ Ready for use after migration is applied!
