-- =====================================================
-- Migration: Debug and fix organization_users reference issue
-- Description: Ensures all references use public. prefix explicitly
-- =====================================================

-- =====================================================
-- 1. VERIFY AND RECREATE user_has_role WITH EXPLICIT SCHEMA
-- =====================================================

CREATE OR REPLACE FUNCTION public.user_has_role(p_user_id UUID, p_organization_id UUID, p_role_names TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
  -- Check if user has one of the specified roles
  -- Use fully qualified table names
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_users ou
    WHERE ou.user_id = p_user_id
      AND ou.organization_id = p_organization_id
      AND ou.is_active = true
      AND (
        -- Check role TEXT column directly (e.g., 'owner', 'admin', etc.)
        ou.role = ANY(p_role_names)
        OR
        -- Check via roles table if role_id is set
        (ou.role_id IS NOT NULL AND EXISTS (
          SELECT 1
          FROM public.roles r
          WHERE r.id = ou.role_id
          AND r.name = ANY(p_role_names)
        ))
      )
  ) INTO v_result;
  
  RETURN COALESCE(v_result, FALSE);
END;
$$;

-- =====================================================
-- 2. VERIFY AND RECREATE has_valid_subscription
-- =====================================================

CREATE OR REPLACE FUNCTION public.has_valid_subscription(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.organization_id = org_id
      AND s.status IN ('active', 'trialing')
      AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
  ) INTO v_result;
  
  RETURN COALESCE(v_result, FALSE);
END;
$$;

-- =====================================================
-- 3. VERIFY is_active_org_member
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_active_org_member(user_id UUID, org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
DECLARE
  v_result BOOLEAN;
BEGIN
    -- Use fully qualified table name
    SELECT EXISTS (
        SELECT 1 
        FROM public.organization_users ou
        WHERE ou.user_id = is_active_org_member.user_id
        AND ou.organization_id = is_active_org_member.org_id
        AND ou.is_active = true
    ) INTO v_result;
    
    RETURN COALESCE(v_result, FALSE);
END;
$$;

-- =====================================================
-- 4. RECREATE farms_delete_policy TO ENSURE IT'S CORRECT
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "farms_delete_policy" ON public.farms;
DROP POLICY IF EXISTS "org_admins_can_delete_farms" ON public.farms;

-- Recreate farms_delete_policy
CREATE POLICY "farms_delete_policy" ON public.farms
    FOR DELETE
    TO authenticated
    USING (
        public.user_has_role(auth.uid(), organization_id, ARRAY['system_admin', 'organization_admin'])
        AND public.has_valid_subscription(organization_id)
    );

-- Recreate org_admins_can_delete_farms
CREATE POLICY "org_admins_can_delete_farms" ON public.farms
    FOR DELETE
    USING (
        public.user_has_permission_for_org(auth.uid(), organization_id, 'farms.delete')
    );

-- =====================================================
-- NOTES
-- =====================================================

-- This migration:
-- 1. Recreates all helper functions with explicit public. schema prefixes
-- 2. Uses DECLARE and SELECT INTO for better error handling
-- 3. Recreates DELETE policies to ensure they're using the correct functions
-- 4. Ensures search_path = '' for all functions

