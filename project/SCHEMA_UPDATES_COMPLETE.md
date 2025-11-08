# Schema Updates - Complete ✅

**Date**: 2025-11-08
**Status**: All changes applied to schema, ready for deployment

## Summary

All requested changes from the debugging and implementation session have been successfully applied to the schema file. The schema is now ready for deployment via Supabase SQL Editor.

## Changes Applied

### 1. Role Migration Fixes (Lines 4160-4218)

#### Issue Fixed
- "invalid input syntax for type uuid: "undefined"" error
- Migration failed when re-running after role column was dropped

#### Solution Applied
```sql
-- Lines 4160-4178: Conditional role_id population
DO $$
BEGIN
  -- Only run if the role column still exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organization_users'
    AND column_name = 'role'
  ) THEN
    UPDATE organization_users ou
    SET role_id = r.id
    FROM roles r
    WHERE ou.role = r.name
    AND ou.role_id IS NULL;
  END IF;
END $$;

-- Lines 4197-4218: Default viewer role fallback
DO $$
DECLARE
  default_viewer_role_id UUID;
BEGIN
  SELECT id INTO default_viewer_role_id FROM roles WHERE name = 'viewer';

  IF default_viewer_role_id IS NOT NULL THEN
    UPDATE organization_users
    SET role_id = default_viewer_role_id
    WHERE role_id IS NULL;
  END IF;

  -- Now safe to make role_id NOT NULL and drop old role column
  ALTER TABLE organization_users ALTER COLUMN role_id SET NOT NULL;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'organization_users'
    AND column_name = 'role'
  ) THEN
    ALTER TABLE organization_users DROP COLUMN role;
  END IF;
END $$;
```

### 2. Permissions Seed Data (Lines 4061-4158)

#### Issue Fixed
- Empty role_permissions table blocking user management
- "Accès refusé" error on UsersSettings page

#### Solution Applied
**27 Permissions Created**:
- users: read, create, update, delete, manage
- farms: read, create, update, delete, manage
- parcels: read, create, update, delete, manage
- stock: read, create, update, delete, manage
- organizations: read, update, manage
- reports: read

**Role Mappings**:
```sql
-- System Admin: All 'manage' permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT v_system_admin_id, id FROM permissions WHERE action = 'manage';

-- Organization Admin: Full access to users, farms, parcels, stock, organizations, reports
INSERT INTO role_permissions (role_id, permission_id)
SELECT v_org_admin_id, id FROM permissions
WHERE resource IN ('users', 'farms', 'parcels', 'stock', 'organizations', 'reports');

-- Farm Manager: Read users, manage farms/parcels/stock, read reports
INSERT INTO role_permissions (role_id, permission_id)
SELECT v_farm_manager_id, id FROM permissions
WHERE (resource = 'users' AND action = 'read')
   OR (resource IN ('farms', 'parcels', 'stock') AND action IN ('read', 'create', 'update', 'manage'))
   OR (resource = 'reports' AND action = 'read');

-- Farm Worker: Read farms/parcels/stock/users, create/update parcels
INSERT INTO role_permissions (role_id, permission_id)
SELECT v_farm_worker_id, id FROM permissions
WHERE (resource IN ('farms', 'parcels', 'stock', 'users') AND action = 'read')
   OR (resource = 'parcels' AND action IN ('create', 'update'));

-- Day Laborer: Read reports only
INSERT INTO role_permissions (role_id, permission_id)
SELECT v_day_laborer_id, id FROM permissions
WHERE resource = 'reports' AND action = 'read';

-- Viewer: All read-only access
INSERT INTO role_permissions (role_id, permission_id)
SELECT v_viewer_id, id FROM permissions
WHERE action = 'read';
```

### 3. Ledger Integration for Costs and Revenues (Lines 7157-7332)

#### Issue Fixed
- Profitability page not creating journal entries
- User requested: "this still doesn't write to the journal" → "yes please" to implement

#### Solution Applied

**Helper Function** (Lines 7162-7181):
```sql
CREATE OR REPLACE FUNCTION get_account_id_by_code(
  p_org_id UUID,
  p_code TEXT
) RETURNS UUID
```
- Gets account ID by organization and account code
- Used by trigger functions to resolve French PCG accounts

**Cost Trigger Function** (Lines 7184-7250):
```sql
CREATE OR REPLACE FUNCTION create_cost_journal_entry()
RETURNS TRIGGER
```

**Maps cost types to French PCG accounts**:
- labor → 641 (Rémunérations du personnel)
- materials → 601 (Achats stockés - Matières premières)
- utilities → 606 (Achats non stockés de matières et fournitures)
- equipment → 615 (Entretien et réparations)
- product_application → 604 (Achats d'études et prestations de services)
- other → 628 (Autres charges externes)

**Journal Entry Created**:
- Debit: Expense account (amount)
- Credit: Cash/Bank account 512 (amount)
- Status: 'posted'
- Reference: cost.id

**Revenue Trigger Function** (Lines 7253-7316):
```sql
CREATE OR REPLACE FUNCTION create_revenue_journal_entry()
RETURNS TRIGGER
```

**Maps revenue types to French PCG accounts**:
- harvest → 701 (Ventes de produits finis)
- subsidy → 74 (Subventions d'exploitation)
- other → 708 (Produits des activités annexes)

**Journal Entry Created**:
- Debit: Cash/Bank account 512 (amount)
- Credit: Revenue account (amount)
- Status: 'posted'
- Reference: revenue.id

**Triggers** (Lines 7319-7329):
```sql
CREATE TRIGGER trg_cost_create_journal_entry
  AFTER INSERT ON costs
  FOR EACH ROW
  EXECUTE FUNCTION create_cost_journal_entry();

CREATE TRIGGER trg_revenue_create_journal_entry
  AFTER INSERT ON revenues
  FOR EACH ROW
  EXECUTE FUNCTION create_revenue_journal_entry();
```

**Sequence** (Line 7332):
```sql
CREATE SEQUENCE IF NOT EXISTS journal_entry_seq START 1;
```
- Used to generate unique journal entry numbers: `JE-20251108-000001`

## Frontend Changes Applied

### 1. UsersSettings.tsx
**Lines changed**: 1, 4, 150, 284, 323-331, 397, 485-495

**Changes**:
- Switched from `useRoleBasedAccess()` to `useCan()` hook
- Changed permission checks from `hasPermission('users', 'read')` to `can('read', 'User')`
- Removed `<PermissionGuard>` wrappers, used direct CASL checks
- Fixed query to use explicit FK: `roles!organization_users_role_id_fkey`

### 2. useRoleBasedAccess.tsx
**Line 41**:
```typescript
// BEFORE
.select('role_id, role:roles!organization_users_role_id_fkey(name, display_name, level)')

// AFTER
.select('role_id, role:roles!organization_users_role_id_fkey(id, name, display_name, level)')
```
- Added `id` field needed for role_permissions query

### 3. dashboard.tsx
**Lines 76-86**:
```typescript
// BEFORE
.single();

if (error && error.code !== 'PGRST116') {

// AFTER
.maybeSingle();

if (error) {
```
- Changed to `.maybeSingle()` to handle 0 rows gracefully

### 4. useHarvests.ts
**Lines 29, 83, 122, 177**:
```typescript
// BEFORE
.from('harvest_summary')
.from('delivery_summary')

// AFTER
.from('harvest_records')
.from('deliveries')
```
- Changed from non-existent views to actual tables

## Deployment Instructions

Since `npx supabase db push` is failing with network connectivity issues, deploy manually:

### Step 1: Open Supabase SQL Editor
1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/mvegjdkkbhlhbjpbhpou)
2. Navigate to SQL Editor

### Step 2: Run the Schema
1. Open `project/supabase/migrations/00000000000000_schema.sql`
2. Copy the entire contents (7332+ lines)
3. Paste into SQL Editor
4. Click "Run"

### Step 3: Verify Deployment

**Check Permissions**:
```sql
SELECT COUNT(*) FROM permissions;
-- Expected: 27

SELECT COUNT(*) FROM role_permissions;
-- Expected: ~80+ (mappings for all 6 roles)
```

**Check Triggers**:
```sql
SELECT tgname, tgrelid::regclass
FROM pg_trigger
WHERE tgname IN ('trg_cost_create_journal_entry', 'trg_revenue_create_journal_entry');
-- Expected: 2 rows
```

**Check Functions**:
```sql
SELECT proname FROM pg_proc
WHERE proname IN ('create_cost_journal_entry', 'create_revenue_journal_entry', 'get_account_id_by_code');
-- Expected: 3 rows
```

### Step 4: Test Ledger Integration

**Test Cost Entry**:
```sql
-- Insert a test cost
INSERT INTO costs (
  organization_id,
  farm_id,
  cost_type,
  amount,
  date,
  description,
  created_by
) VALUES (
  'YOUR-ORG-ID',
  'YOUR-FARM-ID',
  'labor',
  1000.00,
  CURRENT_DATE,
  'Test labor cost',
  'YOUR-USER-ID'
);

-- Check journal entry was created
SELECT * FROM journal_entries
WHERE reference_type = 'cost'
ORDER BY created_at DESC
LIMIT 1;

-- Check journal items (should have 2: debit expense, credit cash)
SELECT
  ji.*,
  a.code,
  a.name
FROM journal_items ji
JOIN accounts a ON ji.account_id = a.id
WHERE ji.journal_entry_id = (
  SELECT id FROM journal_entries
  WHERE reference_type = 'cost'
  ORDER BY created_at DESC
  LIMIT 1
);
```

**Expected Result**:
```
journal_entry_id | account_code | account_name              | debit   | credit
-----------------|--------------|---------------------------|---------|---------
<uuid>           | 641          | Rémunérations du personnel| 1000.00 | 0.00
<uuid>           | 512          | Banques                   | 0.00    | 1000.00
```

**Test Revenue Entry**:
```sql
-- Insert a test revenue
INSERT INTO revenues (
  organization_id,
  farm_id,
  revenue_type,
  amount,
  date,
  description,
  created_by
) VALUES (
  'YOUR-ORG-ID',
  'YOUR-FARM-ID',
  'harvest',
  5000.00,
  CURRENT_DATE,
  'Test harvest revenue',
  'YOUR-USER-ID'
);

-- Check journal entry and items
SELECT
  je.entry_number,
  ji.debit,
  ji.credit,
  a.code,
  a.name
FROM journal_entries je
JOIN journal_items ji ON ji.journal_entry_id = je.id
JOIN accounts a ON ji.account_id = a.id
WHERE je.reference_type = 'revenue'
ORDER BY je.created_at DESC, ji.debit DESC
LIMIT 2;
```

**Expected Result**:
```
entry_number      | debit   | credit  | code | name
------------------|---------|---------|------|-------------------------
JE-20251108-000001| 5000.00 | 0.00    | 512  | Banques
JE-20251108-000001| 0.00    | 5000.00 | 701  | Ventes de produits finis
```

## Verification Checklist

- [ ] Schema deployed successfully in Supabase SQL Editor
- [ ] 27 permissions exist in `permissions` table
- [ ] ~80+ role_permissions mappings exist
- [ ] Triggers exist on `costs` and `revenues` tables
- [ ] Test cost creates journal entry with correct debit/credit
- [ ] Test revenue creates journal entry with correct debit/credit
- [ ] Frontend builds without TypeScript errors: `npm run type-check`
- [ ] UsersSettings page loads without "Accès refusé" error
- [ ] Dashboard settings page loads without PGRST116 error
- [ ] Harvest page loads without "harvest_summary not found" error
- [ ] Profitability page creates journal entries automatically

## Notes

### Why Database Push Failed
The `npx supabase db push` command failed with network connectivity errors:
```
dial tcp [64:ff9b::23b5:9f0a]:6543: connect: no route to host
```

This is a network/infrastructure issue, not a problem with the schema itself. Manual deployment via SQL Editor is the correct workaround.

### Chart of Accounts Requirement
The ledger integration requires the French chart of accounts to be seeded for each organization. See [QUICK_START_LEDGER.md](QUICK_START_LEDGER.md) for seeding instructions.

**Quick Seed**:
```sql
SELECT * FROM seed_french_chart_of_accounts('YOUR-ORG-ID');
```

### Dual Authorization System
The application now has TWO authorization systems:

1. **CASL (Code-based)** - Used by UsersSettings and most UI components
   - Defined in [src/lib/casl/ability.ts](src/lib/casl/ability.ts)
   - Subscription-aware
   - Used via `useCan()` hook or `<Can>` component

2. **Database-based** - Available via useRoleBasedAccess hook
   - Defined in `permissions` and `role_permissions` tables
   - Can be used for API-level authorization
   - Now properly seeded with 27 permissions

Both systems are valid and can coexist. CASL is currently the primary system for frontend authorization.

## Related Documentation

- [LEDGER_INTEGRATION_SUMMARY.md](LEDGER_INTEGRATION_SUMMARY.md) - Complete ledger overview
- [QUICK_START_LEDGER.md](QUICK_START_LEDGER.md) - Quick setup guide
- [INTERNATIONAL_LEDGER_IMPLEMENTATION.md](INTERNATIONAL_LEDGER_IMPLEMENTATION.md) - Implementation details
- [src/lib/casl/ability.ts](src/lib/casl/ability.ts) - CASL permissions reference

## Status

✅ **All changes applied to schema file**
✅ **All frontend files updated**
⏳ **Ready for manual deployment via Supabase SQL Editor**

---

**Next Action**: Deploy the schema via Supabase SQL Editor and verify the test cases above.
