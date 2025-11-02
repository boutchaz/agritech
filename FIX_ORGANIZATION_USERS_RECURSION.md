# Fix: Infinite Recursion in organization_users RLS Policy

## The Problem

Error: **"infinite recursion detected in policy for relation organization_users"**

This happens because RLS policies on `organization_users` were querying the same table they protect, creating an infinite loop.

## The Solution

Apply **2 migration files** in order. These use **SECURITY DEFINER functions** that bypass RLS to prevent recursion.

---

## Step-by-Step Fix

### Method 1: Supabase Dashboard (Recommended - Copy/Paste)

#### Step 1: Apply First Migration

1. Open your Supabase Dashboard: https://mvegjdkkbhlhbjpbhpou.supabase.co
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy **ALL** the SQL below and paste it:

```sql
-- Migration: Ensure organization_users table exists
-- This migration creates the organization_users table if it doesn't exist
-- and ensures all necessary indexes and constraints are in place

-- Create organization_users table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.organization_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'member', 'viewer')),
    role_id INTEGER,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    invited_by UUID REFERENCES auth.users(id),
    UNIQUE(organization_id, user_id)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_organization_users_organization_id
    ON public.organization_users(organization_id);

CREATE INDEX IF NOT EXISTS idx_organization_users_user_id
    ON public.organization_users(user_id);

CREATE INDEX IF NOT EXISTS idx_organization_users_org_user
    ON public.organization_users(organization_id, user_id);

CREATE INDEX IF NOT EXISTS idx_organization_users_role
    ON public.organization_users(role);

CREATE INDEX IF NOT EXISTS idx_organization_users_is_active
    ON public.organization_users(is_active);

-- Enable RLS
ALTER TABLE public.organization_users ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies are defined in the next migration
-- to avoid infinite recursion issues

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_organization_users_updated_at ON public.organization_users;

-- Create trigger for updated_at
CREATE TRIGGER update_organization_users_updated_at
    BEFORE UPDATE ON public.organization_users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add helpful comment
COMMENT ON TABLE public.organization_users IS 'Maps users to organizations with roles and permissions';
COMMENT ON COLUMN public.organization_users.role IS 'User role in the organization: owner, admin, manager, member, viewer';
COMMENT ON COLUMN public.organization_users.is_active IS 'Whether the user membership is currently active';
```

5. Click **RUN** (or press Cmd/Ctrl + Enter)
6. Wait for "Success. No rows returned"

---

#### Step 2: Apply Second Migration

1. Still in **SQL Editor**, click **New Query** again
2. Copy **ALL** the SQL below and paste it:

```sql
-- Migration: Fix infinite recursion in organization_users RLS policies
-- Uses SECURITY DEFINER functions to bypass RLS and prevent recursion

-- Drop all existing policies on organization_users
DROP POLICY IF EXISTS "organization_users_select_policy" ON public.organization_users;
DROP POLICY IF EXISTS "organization_users_insert_policy" ON public.organization_users;
DROP POLICY IF EXISTS "organization_users_update_policy" ON public.organization_users;
DROP POLICY IF EXISTS "organization_users_delete_policy" ON public.organization_users;

-- Function 1: Check if user can view a membership (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.user_can_view_org_membership(org_id UUID, viewing_user_id UUID, target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- User can view their own membership
    IF viewing_user_id = target_user_id THEN
        RETURN TRUE;
    END IF;

    -- User can view memberships in their own organizations
    RETURN EXISTS (
        SELECT 1
        FROM public.organization_users ou
        WHERE ou.organization_id = org_id
          AND ou.user_id = viewing_user_id
          AND ou.is_active = true
    );
END;
$$;

-- Function 2: Check if user is org admin
CREATE OR REPLACE FUNCTION public.is_organization_admin(org_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.organization_users ou
        WHERE ou.organization_id = org_id
          AND ou.user_id = user_uuid
          AND ou.role IN ('owner', 'admin')
          AND ou.is_active = true
    );
END;
$$;

-- Function 3: Check if user is org owner
CREATE OR REPLACE FUNCTION public.is_organization_owner(org_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.organization_users ou
        WHERE ou.organization_id = org_id
          AND ou.user_id = user_uuid
          AND ou.role = 'owner'
          AND ou.is_active = true
    );
END;
$$;

-- SELECT Policy: Users can view memberships using security definer function
CREATE POLICY "organization_users_select_policy" ON public.organization_users
    FOR SELECT
    TO authenticated
    USING (
        public.user_can_view_org_membership(organization_id, auth.uid(), user_id)
    );

-- INSERT Policy: Only admins can add users
CREATE POLICY "organization_users_insert_policy" ON public.organization_users
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_organization_admin(organization_id, auth.uid())
    );

-- UPDATE Policy: Only admins can update memberships
CREATE POLICY "organization_users_update_policy" ON public.organization_users
    FOR UPDATE
    TO authenticated
    USING (
        public.is_organization_admin(organization_id, auth.uid())
    );

-- DELETE Policy: Only owners can remove users
CREATE POLICY "organization_users_delete_policy" ON public.organization_users
    FOR DELETE
    TO authenticated
    USING (
        public.is_organization_owner(organization_id, auth.uid())
    );

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION public.user_can_view_org_membership(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_organization_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_organization_owner(UUID, UUID) TO authenticated;
```

3. Click **RUN** (or press Cmd/Ctrl + Enter)
4. Wait for "Success. No rows returned"

---

### Method 2: Using Supabase CLI

If you have Supabase CLI linked:

```bash
cd /Users/boutchaz/Documents/CodeLovers/agritech/project

# Push both migrations
npx supabase db push
```

---

## Verify the Fix

After applying both migrations, test in SQL Editor:

```sql
-- Test 1: Check table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'organization_users'
);
-- Should return: true

-- Test 2: Check policies exist
SELECT policyname FROM pg_policies
WHERE tablename = 'organization_users';
-- Should return 4 rows:
-- organization_users_select_policy
-- organization_users_insert_policy
-- organization_users_update_policy
-- organization_users_delete_policy

-- Test 3: Check functions exist
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%organization%';
-- Should include:
-- user_can_view_org_membership
-- is_organization_admin
-- is_organization_owner

-- Test 4: Try a simple SELECT (should NOT give recursion error)
SELECT COUNT(*) FROM organization_users;
-- Should return a number (might be 0 if no data yet)
```

---

## What Happens Next

After applying these migrations:

1. ✅ **organization_users table** will exist with proper structure
2. ✅ **No more recursion errors** - SECURITY DEFINER functions bypass RLS
3. ✅ **All your farms, structures, and other data** will be accessible again
4. ✅ **RLS still enforced** - Security is maintained, just without recursion

---

## If You Still Get Errors

If you still see recursion errors after applying both migrations:

1. **Check if policies were created:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'organization_users';
   ```

2. **Manually drop ALL policies and rerun migration 2:**
   ```sql
   DROP POLICY IF EXISTS "organization_users_select_policy" ON public.organization_users;
   DROP POLICY IF EXISTS "organization_users_insert_policy" ON public.organization_users;
   DROP POLICY IF EXISTS "organization_users_update_policy" ON public.organization_users;
   DROP POLICY IF EXISTS "organization_users_delete_policy" ON public.organization_users;
   ```
   Then rerun Step 2 above.

3. **Check for duplicate policies:**
   ```sql
   SELECT schemaname, tablename, policyname
   FROM pg_policies
   WHERE tablename = 'organization_users';
   ```

---

## After Fix: Add Yourself to organization_users

If you have no data in `organization_users`, you'll need to add yourself:

```sql
-- Find your user ID
SELECT id, email FROM auth.users;

-- Find your organization ID
SELECT id, name FROM organizations;

-- Add yourself as owner
INSERT INTO public.organization_users (organization_id, user_id, role, is_active)
VALUES (
  'YOUR-ORG-ID-HERE',
  'YOUR-USER-ID-HERE',
  'owner',
  true
);
```

---

## Summary

The fix uses **SECURITY DEFINER** functions which:
- Run with elevated privileges
- Bypass RLS when checking permissions
- Prevent infinite recursion
- Maintain security through controlled function logic

**This is the standard PostgreSQL pattern for avoiding RLS recursion.**
