# Supabase Database Schema

This directory contains the database schema and migrations for the agricultural management system.

## Structure

```
supabase/
├── config.toml              # Supabase CLI configuration
├── migrations/              # Database migrations (versioned)
│   ├── 20250121000001_create_soil_analysis_tables.sql
│   └── 20250121000002_create_structures_table.sql
├── schemas/                 # Schema files (organized by purpose)
│   ├── 01_tables.sql       # Table definitions
│   ├── 02_foreign_keys.sql # Foreign key constraints
│   ├── 03_indexes.sql      # Database indexes
│   ├── 04_triggers.sql     # Triggers and functions
│   └── 05_permissions.sql  # RLS policies and permissions
├── seed.sql                # Seed data for development
└── functions/              # Edge functions
    ├── recommendations/
    └── sensor-data/
```

## Usage

### Local Development

1. **Start local Supabase**:
   ```bash
   supabase start
   ```

2. **Apply migrations**:
   ```bash
   supabase db reset
   ```

3. **Generate types**:
   ```bash
   supabase gen types typescript --local > src/types/database.ts
   ```

### Production Deployment

1. **Link to remote project**:
   ```bash
   supabase link --project-ref your-project-ref
   ```

2. **Apply migrations to production**:
   ```bash
   supabase db push
   ```

3. **Generate types from production**:
   ```bash
   supabase gen types typescript --linked > src/types/database.ts
   ```

### Schema Management

- **Add new tables**: Create a new migration file in `migrations/`
- **Modify existing tables**: Create a new migration file with ALTER statements
- **Add indexes**: Add to `schemas/03_indexes.sql`
- **Add RLS policies**: Add to `schemas/05_permissions.sql`

### Migration Naming Convention

Use timestamp format: `YYYYMMDDHHMMSS_description.sql`

Example: `20250121000001_create_soil_analysis_tables.sql`

## Database Schema

### Core Tables

- **organizations**: Farm organizations/companies
- **farms**: Individual farms belonging to organizations
- **parcels**: Land parcels within farms
- **test_types**: Types of soil tests available
- **soil_analyses**: Soil analysis results
- **structures**: Farm infrastructure (stables, wells, etc.)

### Key Features

- **JSONB fields** for flexible data storage (location, structure_details, etc.)
- **Automatic timestamps** with triggers
- **Row Level Security** for data protection
- **Foreign key constraints** for data integrity
- **Indexes** for query performance

## Environment Variables

Make sure to set these in your `.env` file:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

For local development, these will be automatically set by `supabase start`.
