-- Migration: Fix infinite recursion in organization_users RLS policies
-- The KEY FIX: Use SECURITY DEFINER functions with "SET LOCAL row_security = off"
-- This completely disables RLS within the functions, preventing recursion

-- Drop all existing policies on organization_users
DROP POLICY IF EXISTS "organization_users_select_policy" ON public.organization_users;
DROP POLICY IF EXISTS "organization_users_insert_policy" ON public.organization_users;
DROP POLICY IF EXISTS "organization_users_update_policy" ON public.organization_users;
DROP POLICY IF EXISTS "organization_users_delete_policy" ON public.organization_users;

-- Function 1: Check if user can view a membership
CREATE OR REPLACE FUNCTION public.user_can_view_org_membership(org_id UUID, viewing_user_id UUID, target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- CRITICAL FIX: Disable RLS within this function to prevent recursion
    SET LOCAL row_security = off;

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
    -- CRITICAL FIX: Disable RLS within this function to prevent recursion
    SET LOCAL row_security = off;

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
    -- CRITICAL FIX: Disable RLS within this function to prevent recursion
    SET LOCAL row_security = off;

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

-- Now create the RLS policies using these functions

-- SELECT: Users can view their own memberships and memberships in their orgs
CREATE POLICY "organization_users_select_policy" ON public.organization_users
    FOR SELECT
    TO authenticated
    USING (
        public.user_can_view_org_membership(organization_id, auth.uid(), user_id)
    );

-- INSERT: Only organization owners/admins can add users
CREATE POLICY "organization_users_insert_policy" ON public.organization_users
    FOR INSERT
    TO authenticated
    WITH CHECK (
        public.is_organization_admin(organization_id, auth.uid())
    );

-- UPDATE: Only organization owners/admins can update memberships
CREATE POLICY "organization_users_update_policy" ON public.organization_users
    FOR UPDATE
    TO authenticated
    USING (
        public.is_organization_admin(organization_id, auth.uid())
    );

-- DELETE: Only organization owners can remove users
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
