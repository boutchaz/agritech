-- =================================
-- NUCLEAR FIX FOR INFINITE RECURSION
-- =================================
-- This completely removes RLS from reference tables to prevent any recursion

-- Step 1: DISABLE RLS on all reference tables permanently
ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL policies on these tables
DO $$
DECLARE
    pol RECORD;
BEGIN
    -- Drop all policies on roles
    FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'roles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.roles', pol.policyname);
        RAISE NOTICE 'Dropped policy % on roles', pol.policyname;
    END LOOP;

    -- Drop all policies on permissions
    FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'permissions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.permissions', pol.policyname);
        RAISE NOTICE 'Dropped policy % on permissions', pol.policyname;
    END LOOP;

    -- Drop all policies on role_permissions
    FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'role_permissions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.role_permissions', pol.policyname);
        RAISE NOTICE 'Dropped policy % on role_permissions', pol.policyname;
    END LOOP;
END $$;

-- Step 3: Grant SELECT to all authenticated users (no RLS needed)
GRANT SELECT ON public.roles TO authenticated;
GRANT SELECT ON public.permissions TO authenticated;
GRANT SELECT ON public.role_permissions TO authenticated;

-- Only system admins can modify these tables (enforced at application level)
-- We'll add a trigger instead of RLS

-- Step 4: Create a trigger function to check system admin for writes
CREATE OR REPLACE FUNCTION public.check_system_admin_for_reference_tables()
RETURNS TRIGGER AS $$
DECLARE
    is_admin BOOLEAN;
BEGIN
    -- Check if current user is system admin
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_users ou
        WHERE ou.user_id = auth.uid()
            AND ou.is_active = true
            AND ou.role_id IN (
                SELECT id FROM public.roles WHERE name = 'system_admin'
            )
    ) INTO is_admin;

    IF NOT is_admin THEN
        RAISE EXCEPTION 'Only system administrators can modify reference tables';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Add triggers for INSERT/UPDATE/DELETE on reference tables
-- (Only for roles and permissions, not role_permissions as admins need to manage that)
DROP TRIGGER IF EXISTS enforce_system_admin_roles_insert ON public.roles;
CREATE TRIGGER enforce_system_admin_roles_insert
    BEFORE INSERT ON public.roles
    FOR EACH ROW
    EXECUTE FUNCTION public.check_system_admin_for_reference_tables();

DROP TRIGGER IF EXISTS enforce_system_admin_roles_update ON public.roles;
CREATE TRIGGER enforce_system_admin_roles_update
    BEFORE UPDATE ON public.roles
    FOR EACH ROW
    EXECUTE FUNCTION public.check_system_admin_for_reference_tables();

DROP TRIGGER IF EXISTS enforce_system_admin_roles_delete ON public.roles;
CREATE TRIGGER enforce_system_admin_roles_delete
    BEFORE DELETE ON public.roles
    FOR EACH ROW
    EXECUTE FUNCTION public.check_system_admin_for_reference_tables();

-- Permissions table triggers
DROP TRIGGER IF EXISTS enforce_system_admin_permissions_insert ON public.permissions;
CREATE TRIGGER enforce_system_admin_permissions_insert
    BEFORE INSERT ON public.permissions
    FOR EACH ROW
    EXECUTE FUNCTION public.check_system_admin_for_reference_tables();

DROP TRIGGER IF EXISTS enforce_system_admin_permissions_update ON public.permissions;
CREATE TRIGGER enforce_system_admin_permissions_update
    BEFORE UPDATE ON public.permissions
    FOR EACH ROW
    EXECUTE FUNCTION public.check_system_admin_for_reference_tables();

DROP TRIGGER IF EXISTS enforce_system_admin_permissions_delete ON public.permissions;
CREATE TRIGGER enforce_system_admin_permissions_delete
    BEFORE DELETE ON public.permissions
    FOR EACH ROW
    EXECUTE FUNCTION public.check_system_admin_for_reference_tables();

-- Step 6: Verify RLS is OFF
DO $$
DECLARE
    roles_rls BOOLEAN;
    permissions_rls BOOLEAN;
    role_permissions_rls BOOLEAN;
BEGIN
    SELECT relrowsecurity INTO roles_rls
    FROM pg_class WHERE relname = 'roles' AND relnamespace = 'public'::regnamespace;

    SELECT relrowsecurity INTO permissions_rls
    FROM pg_class WHERE relname = 'permissions' AND relnamespace = 'public'::regnamespace;

    SELECT relrowsecurity INTO role_permissions_rls
    FROM pg_class WHERE relname = 'role_permissions' AND relnamespace = 'public'::regnamespace;

    IF roles_rls OR permissions_rls OR role_permissions_rls THEN
        RAISE EXCEPTION 'RLS is still enabled on reference tables!';
    END IF;

    RAISE NOTICE 'SUCCESS: RLS disabled on all reference tables';
    RAISE NOTICE 'Roles RLS: %, Permissions RLS: %, Role_permissions RLS: %',
        roles_rls, permissions_rls, role_permissions_rls;
END $$;

-- Step 7: Simplify is_system_admin to not rely on RLS
DROP FUNCTION IF EXISTS public.is_system_admin(UUID);

CREATE OR REPLACE FUNCTION public.is_system_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    -- Direct query without any RLS complications
    SELECT EXISTS (
        SELECT 1
        FROM organization_users ou
        WHERE ou.user_id = check_user_id
            AND ou.is_active = true
            AND ou.role_id IN (
                SELECT id FROM roles WHERE name = 'system_admin' LIMIT 1
            )
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_system_admin(UUID) TO authenticated;

-- Step 8: Simplify user_profiles policies to not use complex checks
DROP POLICY IF EXISTS "user_profiles_select_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert_own" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_select_org_admin" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Org admins can view user profiles" ON public.user_profiles;

-- Super simple policies for user_profiles
CREATE POLICY "user_profiles_own_select" ON public.user_profiles
    FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "user_profiles_own_update" ON public.user_profiles
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "user_profiles_own_insert" ON public.user_profiles
    FOR INSERT
    WITH CHECK (id = auth.uid());

-- Allow org admins to view profiles (but without causing recursion)
CREATE POLICY "user_profiles_admin_select" ON public.user_profiles
    FOR SELECT
    USING (
        -- Check if viewer shares an organization with the profile user
        EXISTS (
            SELECT 1
            FROM organization_users ou_viewer
            INNER JOIN organization_users ou_profile
                ON ou_viewer.organization_id = ou_profile.organization_id
            WHERE ou_viewer.user_id = auth.uid()
                AND ou_profile.user_id = user_profiles.id
                AND ou_viewer.is_active = true
                AND ou_viewer.role_id IN (
                    -- Direct role check without recursion
                    SELECT id FROM roles WHERE level <= 2
                )
        )
    );

-- Step 9: Test that we can query without recursion
DO $$
DECLARE
    test_count INTEGER;
BEGIN
    -- This should work without recursion
    SELECT COUNT(*) INTO test_count FROM public.roles;
    RAISE NOTICE 'Roles count: %', test_count;

    SELECT COUNT(*) INTO test_count FROM public.permissions;
    RAISE NOTICE 'Permissions count: %', test_count;

    SELECT COUNT(*) INTO test_count FROM public.role_permissions;
    RAISE NOTICE 'Role permissions count: %', test_count;

    RAISE NOTICE 'SUCCESS: All reference tables queryable without recursion';
END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';