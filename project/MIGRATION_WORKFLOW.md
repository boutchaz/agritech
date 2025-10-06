# Migration Workflow

This document explains the recommended workflow for managing database migrations and schema.

## Overview

We use a **schema-first approach** where:
1. Migrations are created and applied to the remote database
2. The schema is dumped to `supabase/schema/public.sql`
3. Database resets use the schema file, not migrations
4. Migrations are kept for version history

## Workflow Steps

### 1. Create a New Migration

```bash
# Option A: Create migration from schema diff
npm run db:sync  # Choose option 3

# Option B: Create migration manually
supabase migration new my_migration_name
```

### 2. Apply Migration to Remote

```bash
# Apply pending migrations
npm run db:push
```

### 3. Update Schema File (Important!)

After applying migrations, **always** dump the schema:

```bash
# Dump remote schema to file
npm run db:dump
```

This updates `supabase/schema/public.sql` with the latest schema including all migrations.

### 4. Commit Everything

```bash
git add supabase/migrations/*.sql
git add supabase/schema/public.sql
git commit -m "feat: add new migration"
```

## Database Reset Workflows

### Reset Remote Database

When you run `npm run db:clean-remote`, it will:
1. Drop all tables, functions, types
2. Clear all auth users
3. Apply the schema from `supabase/schema/public.sql`

**This is why dumping the schema after migrations is crucial!**

### Reset Local Database

```bash
# Local reset applies all migrations from scratch
npm run db:reset
```

## Quick Reference

| Command | Description |
|---------|-------------|
| `npm run db:push` | Apply pending migrations to remote |
| `npm run db:dump` | Dump remote schema to file |
| `npm run db:sync` | Interactive sync tool (6 options) |
| `npm run db:clean-remote` | Clean remote DB and apply schema |
| `npm run db:reset` | Reset local DB with migrations |

## Best Practices

1. **After every migration push**: Run `npm run db:dump`
2. **Before database reset**: Ensure schema file is up to date
3. **Keep migrations**: Don't delete migration files, they're your history
4. **Version control**: Always commit both migrations and schema file

## Sync Tool Options

Run `npm run db:sync` for interactive menu:

1. **Pull remote schema to local** - Get remote changes
2. **Push local migrations to remote** - Apply migrations
3. **Generate new migration from schema diff** - Create migration
4. **Dump remote schema to file** - Update schema file ⭐
5. **Reset local database** - Fresh local start
6. **Reset remote database** - Fresh remote start (DANGEROUS!)

## Example Workflow

```bash
# 1. Create migration
supabase migration new add_user_preferences

# 2. Edit the migration file
# Edit supabase/migrations/20251006XXXXXX_add_user_preferences.sql

# 3. Apply to remote
npm run db:push

# 4. Dump schema (IMPORTANT!)
npm run db:dump

# 5. Commit changes
git add supabase/migrations/*.sql supabase/schema/public.sql
git commit -m "feat: add user preferences table"
```

## Why This Workflow?

- **Fast resets**: Schema file applies instantly vs replaying all migrations
- **Clean state**: Reset gives you exact current schema, not migration history
- **Version history**: Migration files preserved for tracking changes
- **Team sync**: Team members get latest schema in one file
- **Debugging**: Easy to see exact current state in schema file
