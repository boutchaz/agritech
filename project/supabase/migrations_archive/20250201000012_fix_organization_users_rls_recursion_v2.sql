-- =====================================================
-- Migration: Fix infinite recursion in organization_users RLS policies (v2)
-- Description: Fixes remaining recursion issues by dropping all old policies
--              and ensuring SECURITY DEFINER functions bypass RLS properly
-- =====================================================

-- =====================================================
-- 1. DROP ALL EXISTING POLICIES (including from initial schema)
-- =====================================================

DROP POLICY IF EXISTS "organization_users_select_policy" ON public.organization_users;
DROP POLICY IF EXISTS "organization_users_insert_policy" ON public.organization_users;
DROP POLICY IF EXISTS "organization_users_update_policy" ON public.organization_users;
DROP POLICY IF EXISTS "organization_users_delete_policy" ON public.organization_users;
DROP POLICY IF EXISTS "users_can_view_org_memberships" ON public.organization_users;
DROP POLICY IF EXISTS "users_can_view_own_memberships" ON public.organization_users;
DROP POLICY IF EXISTS "users_can_view_own_org_membership" ON public.organization_users;
DROP POLICY IF EXISTS "org_admins_can_manage_memberships" ON public.organization_users;
DROP POLICY IF EXISTS "subscription_check_users_insert" ON public.organization_users;

-- =====================================================
-- 2. UPDATE user_can_view_org_membership FUNCTION
-- =====================================================

-- The function needs to explicitly bypass RLS by using SECURITY DEFINER
-- and ensuring it doesn't trigger policy checks
CREATE OR REPLACE FUNCTION public.user_can_view_org_membership(org_id UUID, viewing_user_id UUID, target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result BOOLEAN;
BEGIN
    -- User can view their own membership (no query needed)
    IF viewing_user_id = target_user_id THEN
        RETURN TRUE;
    END IF;

    -- User can view memberships in their own organizations
    -- Use SELECT with explicit RLS bypass by checking directly
    -- Since this is SECURITY DEFINER, RLS is bypassed, but we still need to be careful
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_users ou
        WHERE ou.organization_id = org_id
          AND ou.user_id = viewing_user_id
          AND ou.is_active = true
    ) INTO result;
    
    RETURN COALESCE(result, FALSE);
END;
$$;

-- =====================================================
-- 3. RECREATE POLICIES (using security definer functions)
-- =====================================================

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
    )
    WITH CHECK (
        public.is_organization_admin(organization_id, auth.uid())
    );

-- DELETE: Only organization owners can remove users
CREATE POLICY "organization_users_delete_policy" ON public.organization_users
    FOR DELETE
    TO authenticated
    USING (
        public.is_organization_owner(organization_id, auth.uid())
    );

-- =====================================================
-- 4. ENSURE HELPER FUNCTIONS EXIST AND ARE CORRECT
-- =====================================================

-- Ensure is_organization_admin exists and bypasses RLS
CREATE OR REPLACE FUNCTION public.is_organization_admin(org_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_users ou
        WHERE ou.organization_id = org_id
          AND ou.user_id = user_uuid
          AND ou.role IN ('owner', 'admin')
          AND ou.is_active = true
    ) INTO result;
    
    RETURN COALESCE(result, FALSE);
END;
$$;

-- Ensure is_organization_owner exists and bypasses RLS
CREATE OR REPLACE FUNCTION public.is_organization_owner(org_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  result BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM public.organization_users ou
        WHERE ou.organization_id = org_id
          AND ou.user_id = user_uuid
          AND ou.role = 'owner'
          AND ou.is_active = true
    ) INTO result;
    
    RETURN COALESCE(result, FALSE);
END;
$$;

-- =====================================================
-- 5. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.user_can_view_org_membership(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_organization_admin(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_organization_owner(UUID, UUID) TO authenticated;

-- =====================================================
-- NOTES
-- =====================================================

-- This migration fixes infinite recursion by:
-- 1. Dropping ALL old policies (including ones from initial schema)
-- 2. Using SECURITY DEFINER functions that bypass RLS when querying organization_users
-- 3. Making functions STABLE for better query optimization
-- 4. Using explicit SELECT ... INTO to ensure proper execution

