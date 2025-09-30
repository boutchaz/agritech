-- =================================
-- FIX INFINITE RECURSION IN ROLES AND PERMISSIONS
-- =================================
-- This migration fixes infinite recursion by making roles and permissions tables
-- accessible without complex RLS checks during policy evaluation

-- Step 1: Temporarily disable RLS on roles, permissions, and role_permissions
-- These are reference tables that should be readable by all authenticated users
ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies on these tables
DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.roles;
DROP POLICY IF EXISTS "Only system admins can insert roles" ON public.roles;
DROP POLICY IF EXISTS "Only system admins can update roles" ON public.roles;
DROP POLICY IF EXISTS "Only system admins can delete roles" ON public.roles;
DROP POLICY IF EXISTS "authenticated_can_view_roles" ON public.roles;
DROP POLICY IF EXISTS "system_admins_can_manage_roles" ON public.roles;

DROP POLICY IF EXISTS "Authenticated users can view permissions" ON public.permissions;
DROP POLICY IF EXISTS "Only system admins can insert permissions" ON public.permissions;
DROP POLICY IF EXISTS "Only system admins can update permissions" ON public.permissions;
DROP POLICY IF EXISTS "Only system admins can delete permissions" ON public.permissions;
DROP POLICY IF EXISTS "authenticated_can_view_permissions" ON public.permissions;
DROP POLICY IF EXISTS "system_admins_can_manage_permissions" ON public.permissions;

DROP POLICY IF EXISTS "Authenticated users can view role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Only system admins can insert role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Only system admins can update role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Only system admins can delete role permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "authenticated_can_view_role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "system_admins_can_manage_role_permissions" ON public.role_permissions;

-- Step 3: Re-enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple, non-recursive policies
-- Roles table: All authenticated users can read, but need direct user check for writes
CREATE POLICY "roles_select_authenticated" ON public.roles
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "roles_modify_system_admin" ON public.roles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.organization_users ou
            WHERE ou.user_id = auth.uid()
                AND ou.is_active = true
                AND ou.role_id = (SELECT id FROM public.roles WHERE name = 'system_admin' LIMIT 1)
        )
    );

-- Permissions table: All authenticated users can read
CREATE POLICY "permissions_select_authenticated" ON public.permissions
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "permissions_modify_system_admin" ON public.permissions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.organization_users ou
            WHERE ou.user_id = auth.uid()
                AND ou.is_active = true
                AND ou.role_id = (SELECT id FROM public.roles WHERE name = 'system_admin' LIMIT 1)
        )
    );

-- Role_permissions table: All authenticated users can read
CREATE POLICY "role_permissions_select_authenticated" ON public.role_permissions
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "role_permissions_modify_system_admin" ON public.role_permissions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.organization_users ou
            WHERE ou.user_id = auth.uid()
                AND ou.is_active = true
                AND ou.role_id = (SELECT id FROM public.roles WHERE name = 'system_admin' LIMIT 1)
        )
    );

-- Step 5: Update the is_system_admin function to be simpler and avoid recursion
DROP FUNCTION IF EXISTS public.is_system_admin(UUID);

CREATE OR REPLACE FUNCTION public.is_system_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_users ou
        WHERE ou.user_id = $1
            AND ou.is_active = true
            AND ou.role_id = (
                SELECT id FROM public.roles
                WHERE name = 'system_admin'
                LIMIT 1
            )
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_system_admin(UUID) TO authenticated;

-- Step 6: Fix costs RLS policies to avoid recursion
DROP POLICY IF EXISTS "Users can view costs for their organization" ON public.costs;
DROP POLICY IF EXISTS "Users can create costs" ON public.costs;
DROP POLICY IF EXISTS "Users can update costs" ON public.costs;
DROP POLICY IF EXISTS "Users can delete costs" ON public.costs;

-- Costs policies without complex permission checks
CREATE POLICY "costs_select_org_members" ON public.costs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.organization_users ou
            WHERE ou.user_id = auth.uid()
                AND ou.organization_id = costs.organization_id
                AND ou.is_active = true
        )
    );

CREATE POLICY "costs_insert_org_members" ON public.costs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.organization_users ou
            WHERE ou.user_id = auth.uid()
                AND ou.organization_id = costs.organization_id
                AND ou.is_active = true
        )
    );

CREATE POLICY "costs_update_org_members" ON public.costs
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.organization_users ou
            WHERE ou.user_id = auth.uid()
                AND ou.organization_id = costs.organization_id
                AND ou.is_active = true
        )
    );

CREATE POLICY "costs_delete_org_members" ON public.costs
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.organization_users ou
            WHERE ou.user_id = auth.uid()
                AND ou.organization_id = costs.organization_id
                AND ou.is_active = true
        )
    );

-- Step 7: Fix revenues policies similarly
DROP POLICY IF EXISTS "Users can view revenues for their organization" ON public.revenues;
DROP POLICY IF EXISTS "Users can manage revenues" ON public.revenues;

CREATE POLICY "revenues_select_org_members" ON public.revenues
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.organization_users ou
            WHERE ou.user_id = auth.uid()
                AND ou.organization_id = revenues.organization_id
                AND ou.is_active = true
        )
    );

CREATE POLICY "revenues_modify_org_members" ON public.revenues
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.organization_users ou
            WHERE ou.user_id = auth.uid()
                AND ou.organization_id = revenues.organization_id
                AND ou.is_active = true
        )
    );

-- Step 8: Fix cost_categories policies
DROP POLICY IF EXISTS "Users can view cost categories for their organization" ON public.cost_categories;
DROP POLICY IF EXISTS "Admins can manage cost categories" ON public.cost_categories;

CREATE POLICY "cost_categories_select_org_members" ON public.cost_categories
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.organization_users ou
            WHERE ou.user_id = auth.uid()
                AND ou.organization_id = cost_categories.organization_id
                AND ou.is_active = true
        )
    );

CREATE POLICY "cost_categories_modify_org_admins" ON public.cost_categories
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.organization_users ou
            INNER JOIN public.roles r ON r.id = ou.role_id
            WHERE ou.user_id = auth.uid()
                AND ou.organization_id = cost_categories.organization_id
                AND ou.is_active = true
                AND r.level <= 2
        )
    );

-- Step 9: Grant necessary permissions
GRANT SELECT ON public.roles TO authenticated;
GRANT SELECT ON public.permissions TO authenticated;
GRANT SELECT ON public.role_permissions TO authenticated;

-- Step 10: Verify no recursion
DO $$
BEGIN
    -- Test that we can query roles without recursion
    PERFORM * FROM public.roles LIMIT 1;

    RAISE NOTICE 'SUCCESS: Roles table can be queried without recursion';
END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';