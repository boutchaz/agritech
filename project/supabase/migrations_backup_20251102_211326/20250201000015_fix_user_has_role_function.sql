-- =====================================================
-- Migration: Fix user_has_role to handle role column directly
-- Description: Updates user_has_role to check the role TEXT column
--              directly instead of relying on role_id join
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
  -- First check the role TEXT column directly (more reliable)
  -- Then check via role_id if it exists
  RETURN EXISTS (
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
  );
END;
$$;

-- =====================================================
-- NOTES
-- =====================================================

-- This migration fixes user_has_role to:
-- 1. Check the role TEXT column directly first (more reliable)
-- 2. Fall back to checking via roles table if role_id is set
-- 3. Use SET search_path = '' for security
-- 4. Handle cases where role_id might be NULL

