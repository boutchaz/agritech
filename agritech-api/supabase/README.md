# Supabase Migrations Location

Canonical migrations live in:

- `project/supabase/migrations`

This folder is legacy and should not receive new migration files.

To apply migrations on self-hosted Supabase (private DB network), run from `agritech-api/`:

- `npm run db:migrate:dry-run`
- `npm run db:migrate`
