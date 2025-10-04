# Declarative Database Schema

This directory contains the declarative database schema for the AgriTech project using Supabase's declarative schema management.

## Structure

- `public.sql` - Complete public schema (auto-generated from database)
- `auth.sql` - Auth schema extensions (if any)
- `storage.sql` - Storage schema configurations

## Benefits of Declarative Schema

1. **Single Source of Truth**: The schema files are the authoritative source
2. **Version Control**: Track all schema changes in Git
3. **Type Safety**: Generate TypeScript types from schema
4. **Easier Reviews**: See exact database structure in PRs
5. **Automated Migrations**: Supabase generates migrations from schema changes

## Workflow

### Making Schema Changes

1. Edit the schema files directly (or use Supabase Studio)
2. Run `supabase db diff` to generate migration
3. Test locally with `supabase db reset`
4. Push to remote with `supabase db push`

### Pulling Remote Changes

```bash
# Pull current remote schema
supabase db pull --schema public

# This updates the local schema files
```

### Generating TypeScript Types

```bash
# Generate types from schema
supabase gen types typescript --local > src/types/database.ts
```

### Comparing Schemas

```bash
# Compare local vs remote
supabase db diff --linked

# Compare two schema files
diff schema/public.sql schema/public.backup.sql
```

## Schema Organization

The `public.sql` file is organized into sections:

1. **Types/Enums** - Custom PostgreSQL types
2. **Tables** - Core data tables
3. **Functions** - Stored procedures and functions
4. **Triggers** - Database triggers
5. **RLS Policies** - Row Level Security policies
6. **Indexes** - Performance indexes
7. **Comments** - Schema documentation

## Migration Strategy

Instead of writing SQL migrations manually:

1. Modify the schema files
2. Let Supabase generate the migration
3. Review the generated migration
4. Apply to remote

This ensures consistency and reduces errors.