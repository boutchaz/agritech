---
sidebar_position: 1
---

# Database Schema

This document describes the database schema used by the AgriTech Platform, including tables for multi-tenancy, module configuration, and core farming entities.

## Overview

- **Database**: PostgreSQL (hosted via Supabase)
- **Migration Tool**: Custom migration system in NestJS
- **Row-Level Security**: Enabled for multi-tenant isolation
- **Naming Convention**: snake_case for tables and columns

## Core Tables

### organizations

The top-level tenant for multi-tenancy. All data belongs to an organization.

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  subscription_tier VARCHAR(50) DEFAULT 'essential',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### users

Platform users who can belong to multiple organizations.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### organization_users

Join table for user-organization relationships with role-based access.

```sql
CREATE TABLE organization_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);
```

## Module System Tables

### modules

Defines available modules in the system. This is the single source of truth for module configuration.

```sql
CREATE TABLE modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  icon VARCHAR(100),
  category VARCHAR(50),
  price_monthly DECIMAL(10,2) DEFAULT 0,
  is_required BOOLEAN DEFAULT false,
  is_recommended BOOLEAN DEFAULT false,
  is_addon_eligible BOOLEAN DEFAULT false,
  required_plan VARCHAR(50),
  features TEXT[],
  navigation_items TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Columns**:
- `slug`: Unique identifier for the module (e.g., 'fruit-trees', 'analytics')
- `required_plan`: Minimum subscription tier (null = all tiers)
- `navigation_items`: Array of route paths for this module

### organization_modules

Tracks which modules are enabled for each organization.

```sql
CREATE TABLE organization_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, module_id)
);
```

### subscriptions

Tracks organization subscriptions (synced with Polar.sh).

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  polar_subscription_id VARCHAR(255) UNIQUE,
  status VARCHAR(50) DEFAULT 'active',
  plan_tier VARCHAR(50) NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Farm Management Tables

### farms

Top-level farm entity belonging to an organization.

```sql
CREATE TABLE farms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  area_hectares DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### parcels

Subdivisions of farms representing individual fields or plots.

```sql
CREATE TABLE parcels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  area_hectares DECIMAL(10, 2),
  soil_type VARCHAR(100),
  irrigation_type VARCHAR(50),
  coordinates JSONB,
  module_slug VARCHAR(50), -- Filter parcels by module
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**module_slug**: Associates parcel with specific module (e.g., 'fruit-trees' for orchards)

### crops

Defines crop types and varieties.

```sql
CREATE TABLE crops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  crop_category VARCHAR(50), -- 'trees', 'cereals', 'vegetables', 'mushrooms', 'general'
  variety VARCHAR(100),

  -- Tree-specific attributes
  is_tree BOOLEAN DEFAULT false,
  tree_variety VARCHAR(100),
  planting_date DATE,
  expected_yield_per_tree DECIMAL(10,2),
  spacing_between_trees DECIMAL(10,2),

  -- Cereal-specific attributes
  cereal_variety VARCHAR(100),
  seeding_rate DECIMAL(10,2),
  expected_yield_per_hectare DECIMAL(10,2),

  -- Vegetable-specific attributes
  vegetable_variety VARCHAR(100),
  planting_method VARCHAR(50),
  row_spacing DECIMAL(10,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**crop_category**: Enables generic components to show type-specific fields

### plantings

Tracks crop plantings on parcels.

```sql
CREATE TABLE plantings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  planting_date DATE NOT NULL,
  expected_harvest_date DATE,
  area_planted_hectares DECIMAL(10, 2),
  density_per_hectare INT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### harvests

Records harvest data for plantings.

```sql
CREATE TABLE harvests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  planting_id UUID REFERENCES plantings(id) ON DELETE SET NULL,
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  crop_id UUID NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  harvest_date DATE NOT NULL,
  quantity DECIMAL(10, 2),
  unit VARCHAR(50) DEFAULT 'kg',
  quality_grade VARCHAR(50),
  batch_id UUID REFERENCES mushroom_batches(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Accounting Tables

### accounts

Chart of accounts for double-entry accounting.

```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'asset', 'liability', 'equity', 'revenue', 'expense'
  parent_id UUID REFERENCES accounts(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, code)
);
```

### journal_entries

Double-entry journal entries.

```sql
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  description TEXT,
  reference_number VARCHAR(100),
  status VARCHAR(50) DEFAULT 'posted',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### journal_entry_lines

Line items for journal entries (must balance).

```sql
CREATE TABLE journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id),
  debit DECIMAL(15, 2) DEFAULT 0,
  credit DECIMAL(15, 2) DEFAULT 0,
  description TEXT
);
```

## Satellite & Analytics Tables

### satellite_indices

Stores satellite imagery analysis results.

```sql
CREATE TABLE satellite_indices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  index_type VARCHAR(50) NOT NULL, -- 'NDVI', 'EVI', 'SAVI', etc.
  value DECIMAL(10, 4),
  image_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## AI Calibration Tables

### calibrations

Stores AI calibration sessions for parcels, tracking baseline indices, health scores, and yield potential.

```sql
CREATE TABLE calibrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL REFERENCES parcels(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  status VARCHAR(50) DEFAULT 'in_progress',
  mode_calibrage VARCHAR(20),
  recalibration_motif VARCHAR(100),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  baseline_ndvi DECIMAL(10,4),
  baseline_ndre DECIMAL(10,4),
  baseline_ndmi DECIMAL(10,4),
  confidence_score DECIMAL(5,4),
  health_score DECIMAL(5,2),
  zone_classification VARCHAR(20),
  phenology_stage VARCHAR(50),
  maturity_phase VARCHAR(50),
  yield_potential_min DECIMAL(10,2),
  yield_potential_max DECIMAL(10,2),
  calibration_version VARCHAR(10) DEFAULT 'v2',
  calibration_data JSONB,
  error_message TEXT,
  previous_baseline JSONB,
  rapport_fr TEXT,
  rapport_ar TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### weather_daily_data

Daily weather observations used for GDD (Growing Degree Days) calculations and evapotranspiration modeling.

```sql
CREATE TABLE weather_daily_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  latitude DECIMAL(6,2) NOT NULL,
  longitude DECIMAL(6,2) NOT NULL,
  date DATE NOT NULL,
  temperature_min DECIMAL(5,2),
  temperature_max DECIMAL(5,2),
  temperature_mean DECIMAL(5,2),
  relative_humidity_mean DECIMAL(5,2),
  precipitation_sum DECIMAL(8,2),
  wind_speed_max DECIMAL(6,2),
  et0_fao_evapotranspiration DECIMAL(6,2),
  gdd_olivier DECIMAL(8,2),
  gdd_agrumes DECIMAL(8,2),
  gdd_avocatier DECIMAL(8,2),
  gdd_palmier_dattier DECIMAL(8,2),
  chill_hours DECIMAL(8,2),
  source VARCHAR(50) DEFAULT 'open-meteo-archive',
  UNIQUE(latitude, longitude, date)
);
```

### satellite_indices_data

Time-series satellite index values per parcel, used for trend analysis and AI calibration.

```sql
CREATE TABLE satellite_indices_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  parcel_id UUID NOT NULL REFERENCES parcels(id),
  date DATE NOT NULL,
  index_name VARCHAR(20) NOT NULL,
  mean_value DECIMAL(10,6),
  cloud_coverage_percentage DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### ai_reports

Generated AI analysis reports associated with parcels.

```sql
CREATE TABLE ai_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id UUID NOT NULL REFERENCES parcels(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  report_type VARCHAR(50) NOT NULL,
  report_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### AI columns on parcels

The `parcels` table has additional columns to track AI enablement and calibration state:

```sql
-- AI columns on parcels table
ALTER TABLE parcels ADD COLUMN ai_phase VARCHAR(50) DEFAULT 'disabled';
ALTER TABLE parcels ADD COLUMN ai_enabled BOOLEAN DEFAULT false;
ALTER TABLE parcels ADD COLUMN ai_calibration_id UUID REFERENCES calibrations(id);
ALTER TABLE parcels ADD COLUMN ai_nutrition_option VARCHAR(5);
```

**ai_phase values**: `'disabled'`, `'calibrating'`, `'active'`, `'error'`

## Inventory Tables

### warehouses

Storage locations for inventory.

```sql
CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255),
  capacity DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### stock_items

Inventory items with quantities.

```sql
CREATE TABLE stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  quantity DECIMAL(10, 2) DEFAULT 0,
  unit VARCHAR(50) DEFAULT 'kg',
  min_stock_level DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## Row-Level Security

All tenant-specific tables have RLS enabled:

```sql
-- Enable RLS
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;

-- Policy: Organizations can only see their own data
CREATE POLICY "Organization isolation" ON farms
  FOR ALL
  USING (organization_id = current_setting('app.current_org_id')::uuid);
```

The current organization ID is set via:
- Backend: RLS middleware sets `app.current_org_id`
- Supabase: Auth context sets `auth.uid()` which maps to organization

## Indexes

Key indexes for performance:

```sql
-- Organization lookups
CREATE INDEX idx_farms_organization_id ON farms(organization_id);
CREATE INDEX idx_parcels_organization_id ON parcels(organization_id);

-- Module filtering
CREATE INDEX idx_parcels_module_slug ON parcels(module_slug);
CREATE INDEX idx_crops_category ON crops(crop_category);

-- Date-based queries
CREATE INDEX idx_plantings_date ON plantings(planting_date);
CREATE INDEX idx_harvests_date ON harvests(harvest_date);
CREATE INDEX idx_satellite_indices_date ON satellite_indices(date);
```

## Constraints

```sql
-- Debits must equal credits
ALTER TABLE journal_entry_lines
  ADD CONSTRAINT check_debit_credit_balance
  CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0));

-- Harvest quantity must be positive
ALTER TABLE harvests
  ADD CONSTRAINT check_positive_quantity
  CHECK (quantity > 0);
```

## Migrations

Run migrations via:

```bash
# In agritech-api/
pnpm migration:run

# Generate new migration
pnpm migration:generate MigrationName
```

See [Database Migrations Guide](/guides/database-migration) for details.

## References

- [Migrations](/database/migrations)
- [RLS Policies](/database/rls-policies)
- [Type Generation](/database/type-generation)
