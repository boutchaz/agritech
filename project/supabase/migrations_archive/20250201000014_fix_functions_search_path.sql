-- =====================================================
-- Migration: Fix search_path for functions querying organization_users
-- Description: Updates functions to use SET search_path = '' to ensure
--              they can find the organization_users table correctly
-- =====================================================

-- =====================================================
-- 1. FIX user_has_role FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.user_has_role(p_user_id UUID, p_organization_id UUID, p_role_names TEXT[])
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Check if user has one of the specified roles
  -- First check the role TEXT column directly
  -- Then check via role_id if it exists
  RETURN EXISTS (
    SELECT 1
    FROM public.organization_users ou
    WHERE ou.user_id = p_user_id
      AND ou.organization_id = p_organization_id
      AND ou.is_active = true
      AND (
        -- Check role TEXT column directly
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
  );
END;
$$;

-- =====================================================
-- 2. FIX has_valid_subscription FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.has_valid_subscription(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.organization_id = org_id
      AND s.status IN ('active', 'trialing')
      AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
  );
END;
$$;

-- =====================================================
-- 3. FIX can_create_resource FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.can_create_resource(p_organization_id UUID, p_resource_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_subscription RECORD;
  v_resource_count INTEGER;
  v_max_allowed INTEGER;
BEGIN
  -- Get subscription
  SELECT * INTO v_subscription
  FROM public.subscriptions
  WHERE organization_id = p_organization_id
    AND status IN ('active', 'trialing')
    AND (current_period_end IS NULL OR current_period_end > NOW())
  LIMIT 1;

  IF v_subscription IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check resource limits based on type
  CASE p_resource_type
    WHEN 'farm' THEN
      SELECT COUNT(*) INTO v_resource_count
      FROM public.farms
      WHERE organization_id = p_organization_id;
      
      v_max_allowed := COALESCE(v_subscription.max_farms, 999999);
      
    WHEN 'parcel' THEN
      -- This would need farm_id parameter, simplified for now
      v_max_allowed := COALESCE(v_subscription.max_parcels, 999999);
      
    ELSE
      RETURN TRUE; -- Unknown resource type, allow
  END CASE;

  RETURN v_resource_count < v_max_allowed;
END;
$$;

-- =====================================================
-- 4. FIX user_has_permission_for_org FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.user_has_permission_for_org(user_id UUID, org_id UUID, permission_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Check if user has permission via role_id (if set)
    -- If role_id is NULL, return FALSE (no permissions without role_id)
    RETURN EXISTS (
        SELECT 1
        FROM public.organization_users ou
        JOIN public.role_permissions rp ON rp.role_id = ou.role_id
        JOIN public.permissions p ON p.id = rp.permission_id
        WHERE ou.user_id = user_has_permission_for_org.user_id 
        AND ou.organization_id = user_has_permission_for_org.org_id
        AND ou.is_active = true
        AND ou.role_id IS NOT NULL
        AND p.name = user_has_permission_for_org.permission_name
    );
END;
$$;

-- =====================================================
-- 5. UPDATE farms_select_policy TO USE HELPER FUNCTION
-- =====================================================

-- Drop the policy that directly queries organization_users
DROP POLICY IF EXISTS "farms_select_policy" ON public.farms;

-- Recreate using is_active_org_member (which is already fixed)
CREATE POLICY "farms_select_policy" ON public.farms
    FOR SELECT
    TO authenticated
    USING (
        public.is_active_org_member(auth.uid(), organization_id)
        AND public.has_valid_subscription(organization_id)
    );

-- =====================================================
-- NOTES
-- =====================================================

-- This migration ensures all functions that query organization_users:
-- 1. Use SET search_path = '' for security
-- 2. Use fully qualified table names (public.organization_users)
-- 3. Are marked as SECURITY DEFINER to bypass RLS
-- 4. Are marked as STABLE for optimization

