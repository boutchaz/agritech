-- =====================================================
-- Migration: Complete fix for organization_users RLS recursion
-- Description: Ensures all helper functions explicitly bypass RLS
-- =====================================================

-- =====================================================
-- 1. UPDATE is_active_org_member TO EXPLICITLY BYPASS RLS
-- =====================================================

-- Update is_active_org_member to bypass RLS (SECURITY DEFINER already does this)
CREATE OR REPLACE FUNCTION public.is_active_org_member(user_id UUID, org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  result BOOLEAN;
BEGIN
    -- SECURITY DEFINER functions bypass RLS automatically
    -- No need for set_config - this prevents recursion
    SELECT EXISTS (
        SELECT 1 FROM public.organization_users ou
        WHERE ou.user_id = is_active_org_member.user_id
        AND ou.organization_id = is_active_org_member.org_id
        AND ou.is_active = true
    ) INTO result;
    
    RETURN COALESCE(result, FALSE);
END;
$$;

-- =====================================================
-- 2. UPDATE user_can_view_org_membership TO EXPLICITLY BYPASS RLS
-- =====================================================

CREATE OR REPLACE FUNCTION public.user_can_view_org_membership(org_id UUID, viewing_user_id UUID, target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  result BOOLEAN;
BEGIN
    -- User can view their own membership (no query needed)
    IF viewing_user_id = target_user_id THEN
        RETURN TRUE;
    END IF;

    -- SECURITY DEFINER functions bypass RLS automatically
    -- User can view memberships in their own organizations
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
-- 3. UPDATE is_organization_admin TO EXPLICITLY BYPASS RLS
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_organization_admin(org_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  result BOOLEAN;
BEGIN
    -- SECURITY DEFINER functions bypass RLS automatically
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

-- =====================================================
-- 4. UPDATE is_organization_owner TO EXPLICITLY BYPASS RLS
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_organization_owner(org_id UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  result BOOLEAN;
BEGIN
    -- SECURITY DEFINER functions bypass RLS automatically
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
-- NOTES
-- =====================================================

-- This migration ensures all helper functions bypass RLS by:
-- 1. Using SECURITY DEFINER which automatically bypasses RLS
-- 2. Setting search_path = '' for security (prevents search path injection)
-- 3. Making functions STABLE for better optimization
-- 4. Using explicit table references (public.organization_users) for clarity

