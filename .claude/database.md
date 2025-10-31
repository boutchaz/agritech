# Database Guide

## Schema Overview

### Operations Tables
- `user_profiles` - User information (language, timezone, preferences)
- `organizations` - Multi-tenant orgs (currency, timezone, settings)
- `organization_users` - User-org relationships with roles
- `farms` - Farm management
- `parcels` - Crop parcels with GeoJSON boundaries
- `divergent_subparcels` - Sub-parcels within parcels (for varied crop areas)
- `workers` - Permanent workers (contracts, salaries)
- `day_laborers` - Temporary workers (daily rates)
- `tasks` - Task management with costs
- `harvests` - Harvest tracking
- `satellite_data` - Vegetation index statistics and GeoTIFF URLs
- `inventory` - Stock management with packaging info
- `purchases` - Purchase entries with invoice uploads
- `suppliers`, `warehouses` - Supply chain management
- `subscriptions` - Polar.sh subscription data

### Accounting Tables (Phase 1)
- `accounts` - Chart of Accounts hierarchy
- `journal_entries` - Ledger transactions (header)
- `journal_items` - Ledger transaction lines (debit/credit)
- `invoices` - Sales and purchase invoices
- `invoice_items` - Invoice line items
- `payments` - Payment records
- `payment_allocations` - Payment-to-invoice matching
- `cost_centers` - Cost tracking dimensions (farms/parcels)
- `taxes` - Tax definitions and rates
- `bank_accounts` - Bank account management
- `currencies` - Currency definitions

## Key Database Functions

### Operations RPCs
- `get_user_organizations()` - User's org list with roles
- `create_organization_with_owner()` - Org creation with owner role
- `check_feature_access(feature_name)` - Feature availability check
- `get_current_user_profile()` - Current user profile

### Accounting Functions (Triggers)
- `validate_journal_balance()` - Auto-update journal entry totals
- `update_invoice_totals()` - Recalculate invoice amounts from line items
- `update_invoice_outstanding()` - Update outstanding balance when payments allocated
- `generate_invoice_number()` - Generate sequential invoice numbers
- `generate_payment_number()` - Generate sequential payment numbers

## Row Level Security (RLS)

**Enforced at database level for all tables**

Users can only access data from their organizations.

Common RLS pattern:
```sql
CREATE POLICY "Users can view own org data" ON table_name
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
  )
);
```

## Migration Management

### Local Development
```bash
npm run db:start         # Start local Supabase
npm run db:stop          # Stop local Supabase
npm run db:reset         # Reset local database
```

### Remote Operations (requires linked project)
```bash
npm run db:push          # Push local migrations to remote
npm run db:pull          # Pull remote schema changes
npm run db:diff          # Show schema differences
npm run db:dump          # Dump schema to supabase/schema/public.sql
```

### Type Generation
```bash
npm run db:generate-types        # Generate from local
npm run db:generate-types-remote # Generate from remote
# Output: src/types/database.types.ts
```

### Custom Schema Scripts
```bash
npm run schema:pull      # Pull schema with backup
npm run schema:push      # Push schema changes
npm run schema:diff      # Compare schemas
npm run schema:types     # Generate types with validation
npm run schema:backup    # Backup current schema
```

## Supabase Integration

### Two Clients
- `src/lib/supabase.ts` - Main data client (RLS-protected queries)
- `src/lib/auth-supabase.ts` - Auth-only client (prevents circular dependencies)

### Edge Functions
Location: `supabase/functions/`

- `generate-index-image` - Proxies satellite service with user JWT authentication
- Additional functions for secure server-side operations

### Storage Buckets
- `invoices` - Purchase receipts and invoices
- `documents` - General document storage
- `satellite-exports` - GeoTIFF exports (time-limited signed URLs)

## Common Workflows

### Adding a New Table
1. Create migration SQL in `project/supabase/migrations/`
2. Test locally: `npm run db:reset`
3. Generate types: `npm run db:generate-types`
4. Push to remote: `npm run db:push`
5. Create custom hooks in `src/hooks/` for querying the table

### Deploying Schema Changes
1. Review changes: `npm run schema:diff`
2. Backup current: `npm run schema:backup`
3. Push changes: `npm run schema:push`
4. Verify types: `npm run schema:types`
5. Test in staging environment before production

### Type Safety
- Always generate types after schema changes: `npm run db:generate-types-remote`
- Use `Database` types from `src/types/database.types.ts`
- Helper types: `Tables<'table_name'>`, `InsertDto<'table_name'>`, `UpdateDto<'table_name'>`

## Environment Variables

### Frontend (.env in /project)
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SATELLITE_SERVICE_URL=http://localhost:8001
VITE_POLAR_ACCESS_TOKEN=your_polar_token
```

## Troubleshooting

**Supabase CLI errors**: Ensure project is linked: `npx supabase link --project-ref your_ref`

**RLS policy blocks queries**: Verify user is in correct organization and has required role

**Type errors after schema changes**: Run `npm run db:generate-types-remote` and restart TypeScript server
