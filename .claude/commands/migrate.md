---
description: Guided workflow for safe database schema changes with RLS, types, and verification
---

# Database Migration Workflow

You are guiding the user through a safe database schema change for the AgriTech platform.

## Input: $ARGUMENTS

## Steps

### 1. Plan the change
Based on the user's requirements, determine:
- **Tables** to create or modify
- **Columns** with types (uuid, text, numeric, boolean, timestamptz, jsonb, etc.)
- **Foreign keys** and relationships
- **Indexes** needed for query performance
- **RLS policies** required
- **Triggers** (e.g., `update_updated_at_column()`)

### 2. Read the current schema
Read the declarative schema file to understand existing structure:
```
project/supabase/migrations/00000000000000_schema.sql
```

### 3. Edit the schema (declarative approach)
This project uses a **single declarative schema file** — NOT incremental migrations.

Add changes to `project/supabase/migrations/00000000000000_schema.sql` using idempotent SQL:

#### New table template:
```sql
-- ============================================================
-- {TABLE_NAME}
-- ============================================================
CREATE TABLE IF NOT EXISTS {table_name} (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    -- entity-specific columns here
    name TEXT NOT NULL,
    description TEXT,
    -- audit columns (always include these)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_{table_name}_organization_id ON {table_name}(organization_id);
-- Add more indexes for commonly queried columns

-- Updated_at trigger
DROP TRIGGER IF EXISTS update_{table_name}_updated_at ON {table_name};
CREATE TRIGGER update_{table_name}_updated_at
    BEFORE UPDATE ON {table_name}
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "{table_name}_select_policy" ON {table_name}
    FOR SELECT USING (is_organization_member(organization_id));

CREATE POLICY "{table_name}_insert_policy" ON {table_name}
    FOR INSERT WITH CHECK (is_organization_member(organization_id));

CREATE POLICY "{table_name}_update_policy" ON {table_name}
    FOR UPDATE USING (is_organization_member(organization_id));

CREATE POLICY "{table_name}_delete_policy" ON {table_name}
    FOR DELETE USING (is_organization_member(organization_id));

-- Service role full access
CREATE POLICY "{table_name}_service_role" ON {table_name}
    FOR ALL USING (auth.role() = 'service_role');
```

#### Alter table template:
```sql
-- Add column (idempotent)
DO $$ BEGIN
    ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {column_name} {TYPE} {constraints};
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;
```

#### Enum template:
```sql
DO $$ BEGIN
    CREATE TYPE {enum_name} AS ENUM ('value1', 'value2', 'value3');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
```

### 4. Verify the schema locally

Run these commands to test:
```bash
cd project
npm run db:reset       # Reset local DB with new schema
npm run db:seed        # Re-seed test data
```

If there are errors, fix them in the schema file and retry.

### 5. Generate TypeScript types

```bash
cd project && npm run db:generate-types
```

This updates `project/src/types/database.types.ts`. Verify the new types look correct.

### 6. Verify in the frontend

After generating types, check that:
- The new table/columns appear in `Database['public']['Tables']`
- Existing types haven't broken
- Run `cd project && npx tsc --noEmit` to check for type errors

### 7. Checklist before pushing to remote

- [ ] Schema uses idempotent SQL (IF NOT EXISTS, OR REPLACE)
- [ ] Table has `organization_id` column (if tenant-scoped)
- [ ] RLS is enabled with `is_organization_member()` policies
- [ ] Service role policy exists for backend access
- [ ] `updated_at` trigger is set
- [ ] Indexes exist for `organization_id` and other filter columns
- [ ] Foreign keys have appropriate ON DELETE behavior
- [ ] TypeScript types regenerated
- [ ] Local DB reset works cleanly
- [ ] No type errors in frontend

### 8. Push to remote (only when user confirms)

```bash
cd project
npm run db:push  # Push to linked remote database
npm run db:generate-types-remote  # Regenerate types from remote
```

## Common Patterns

### Junction table (many-to-many):
```sql
CREATE TABLE IF NOT EXISTS {table_a}_{table_b} (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    {table_a}_id UUID NOT NULL REFERENCES {table_a}(id) ON DELETE CASCADE,
    {table_b}_id UUID NOT NULL REFERENCES {table_b}(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE({table_a}_id, {table_b}_id)
);
```

### Soft delete:
```sql
deleted_at TIMESTAMPTZ DEFAULT NULL
-- Add to RLS: AND deleted_at IS NULL
```

### GIS/spatial column:
```sql
location GEOGRAPHY(POINT, 4326),
boundary GEOGRAPHY(POLYGON, 4326)
-- Index: CREATE INDEX idx_{table}_location ON {table} USING GIST(location);
```
