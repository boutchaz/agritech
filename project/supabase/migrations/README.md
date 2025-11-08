# Database Migrations

## Overview

This directory contains the database schema for the AgriTech platform. All schema definitions are consolidated into a single source-of-truth file.

## Current Schema

**File**: `00000000000000_schema.sql`  
**Size**: ~150 KB  
**Last Updated**: 2025-11-06

### What's Included

This comprehensive schema file contains:
- ✅ All table definitions (organizations, farms, parcels, tasks, etc.)
- ✅ All ENUM types
- ✅ All indexes
- ✅ All functions and stored procedures
- ✅ All triggers
- ✅ All RLS (Row Level Security) policies
- ✅ All views
- ✅ Seed data for default values

### Key Features

1. **Idempotent**: Uses `IF NOT EXISTS`, `OR REPLACE`, etc.
2. **Well-documented**: Inline comments explain complex logic
3. **RLS-enabled**: All tables have proper Row Level Security policies
4. **Multi-tenant**: Organization-based data isolation
5. **Production-ready**: Tested and running in production

## RLS Policies (Lines 4112-4197)

The schema includes comprehensive RLS policies for core tables:

### user_profiles
- **Policy**: `user_all_own_profile` (FOR ALL)
- **Allows**: Users to manage their own profile
- **Supports**: `.upsert()` operations for onboarding

### organizations
- **Policies**: 4 (SELECT, INSERT, UPDATE, DELETE)
- **Read**: Users see organizations they're members of
- **Create**: Any authenticated user can create
- **Update/Delete**: Organization members only

### dashboard_settings
- **Policies**: 4 (SELECT, INSERT, UPDATE, DELETE)
- **Scope**: User's own settings for their organizations

## Making Changes

### To Add or Modify Schema

1. Edit `00000000000000_schema.sql` directly
2. Keep changes idempotent (use `IF NOT EXISTS`, `OR REPLACE`)
3. Add comments explaining complex changes
4. Test locally before deploying

### To Deploy

```bash
# Option 1: Via Supabase CLI (if configured)
npx supabase db push

# Option 2: Via Supabase Dashboard
# Copy contents of schema file and paste into SQL Editor
# https://supabase.com/dashboard/project/YOUR_PROJECT/sql
```

## Historical Notes

### 2025-11-06: Migration Consolidation
- Consolidated all separate migration files into single schema
- Fixed onboarding RLS policy issues
- Archived historical documentation in `/.archive/rls-fix-2025-11-06/`

## Database Structure

### Core Tables
- `organizations` - Multi-tenant organizations
- `organization_users` - User-organization memberships
- `user_profiles` - User profile data
- `subscriptions` - Subscription management (Polar.sh)

### Farm Management
- `farms` - Farm entities
- `parcels` - Land parcels within farms
- `workers` - Farm workers and contractors
- `tasks` - Task management

### Operations
- `harvest_records` - Harvest tracking
- `satellite_data` - GEE analysis results
- `work_records` - Worker time tracking

### Accounting
- `accounts` - Chart of accounts
- `journal_entries` / `journal_items` - Double-entry bookkeeping
- `invoices` / `invoice_items` - Billing
- `accounting_payments` - Payment tracking

### Billing Cycle
- `quotes` / `quote_items` - Sales quotes
- `sales_orders` / `sales_order_items` - Sales orders
- `purchase_orders` / `purchase_order_items` - Purchase orders

### Inventory
- `items` - Product catalog
- `stock_entries` / `stock_entry_items` - Stock transactions
- `warehouses` - Storage locations

## Helper Functions

Key helper functions defined in schema:

- `is_organization_member(UUID)` - Check org membership (bypasses RLS)
- `generate_quote_number(UUID)` - Auto-generate quote numbers
- `generate_sales_order_number(UUID)` - Auto-generate SO numbers
- `generate_invoice_number(UUID, invoice_type)` - Auto-generate invoice numbers
- `get_farm_hierarchy_tree(UUID, UUID)` - Fetch hierarchical farm data
- `get_parcel_performance_summary(...)` - Analytics for parcel performance

## Important Notes

⚠️ **DO NOT**:
- Manually edit generated files (like `routeTree.gen.ts`)
- Remove RLS policies without understanding security implications
- Make breaking changes without migration strategy

✅ **DO**:
- Keep schema idempotent
- Document complex changes
- Test RLS policies thoroughly
- Use transactions for multi-step changes

## Support

For questions or issues:
1. Check `/.archive/` for historical context
2. Review inline comments in schema file
3. See `/CLAUDE.md` for project guidelines

---

**Last Updated**: November 6, 2025  
**Schema Version**: Consolidated  
**Status**: Production-ready ✅
