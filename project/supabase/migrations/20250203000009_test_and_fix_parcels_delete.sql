-- =====================================================
-- Migration: Test and Fix Parcels Delete
-- Description: Verifies user_has_role works correctly
--              and fixes any remaining RLS issues
-- =====================================================

-- =====================================================
-- 1. ENSURE normalize_role_name EXISTS FIRST
-- =====================================================

CREATE OR REPLACE FUNCTION public.normalize_role_name(legacy_role TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE legacy_role
    WHEN 'owner' THEN 'system_admin'
    WHEN 'admin' THEN 'organization_admin'
    WHEN 'manager' THEN 'farm_manager'
    WHEN 'member' THEN 'farm_worker'
    WHEN 'viewer' THEN 'viewer'
    -- Already normalized roles pass through
    WHEN 'system_admin' THEN 'system_admin'
    WHEN 'organization_admin' THEN 'organization_admin'
    WHEN 'farm_manager' THEN 'farm_manager'
    WHEN 'farm_worker' THEN 'farm_worker'
    WHEN 'day_laborer' THEN 'day_laborer'
    ELSE legacy_role -- Fallback for unknown roles
  END;
END;
$$;

COMMENT ON FUNCTION public.normalize_role_name IS 'Maps legacy role names to standardized role names';

-- =====================================================
-- 2. UPDATE user_has_role FUNCTION
-- =====================================================

-- Always update to ensure it checks role TEXT column FIRST
CREATE OR REPLACE FUNCTION public.user_has_role(
  p_user_id UUID, 
  p_organization_id UUID, 
  p_role_names TEXT[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_result BOOLEAN;
  normalized_roles TEXT[];
  user_role TEXT;
  normalized_user_role TEXT;
BEGIN
  -- Normalize the requested role names (maps legacy to new)
  SELECT array_agg(DISTINCT public.normalize_role_name(unnest))
  INTO normalized_roles
  FROM unnest(p_role_names);
  
  -- If normalization failed or function doesn't exist, use roles as-is
  IF normalized_roles IS NULL OR array_length(normalized_roles, 1) IS NULL THEN
    normalized_roles := p_role_names;
  END IF;
  
  -- Get user's role from TEXT column (PRIMARY CHECK - this is what we use)
  SELECT ou.role
  INTO user_role
  FROM public.organization_users ou
  WHERE ou.user_id = p_user_id
    AND ou.organization_id = p_organization_id
    AND ou.is_active = true
  LIMIT 1;
  
  -- If user has no role, return false
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Normalize user's role (maps legacy to new)
  -- If normalize_role_name doesn't exist, use role as-is
  BEGIN
    normalized_user_role := public.normalize_role_name(user_role);
  EXCEPTION
    WHEN OTHERS THEN
      normalized_user_role := user_role;
  END;
  
  -- Check if normalized user role matches any of the normalized requested roles
  -- This is the PRIMARY check - uses role TEXT column directly
  v_result := normalized_user_role = ANY(normalized_roles);
  
  -- Also check direct match without normalization (fallback)
  -- This handles cases where normalization function doesn't exist or fails
  IF NOT v_result THEN
    v_result := (
      user_role = ANY(p_role_names) 
      OR normalized_user_role = ANY(p_role_names)
      OR user_role = ANY(normalized_roles)
      OR normalized_user_role = ANY(normalized_roles)
    );
  END IF;
  
  -- Fallback: Also check via role_id if it exists (for backward compatibility)
  -- Only check this if the primary check failed
  IF NOT v_result THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.organization_users ou
      WHERE ou.user_id = p_user_id
        AND ou.organization_id = p_organization_id
        AND ou.is_active = true
        AND ou.role_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.roles r
          WHERE r.id = ou.role_id
            AND (
              r.name = ANY(p_role_names)
              OR r.name = ANY(normalized_roles)
            )
        )
    ) INTO v_result;
  END IF;
  
  RETURN COALESCE(v_result, FALSE);
END;
$function$;

COMMENT ON FUNCTION public.user_has_role IS 
'Checks if a user has one of the specified roles in an organization. 
Checks both the role TEXT column directly and via role_id for compatibility.
Handles both legacy (owner, admin, manager, member, viewer) and 
new (system_admin, organization_admin, farm_manager, farm_worker, day_laborer, viewer) role names.';

-- =====================================================
-- 3. DROP AND RECREATE DELETE POLICY
-- =====================================================

-- Drop all existing delete policies
DROP POLICY IF EXISTS "parcels_delete_policy" ON public.parcels;
DROP POLICY IF EXISTS "org_members_can_delete_parcels" ON public.parcels;
DROP POLICY IF EXISTS "parcels_delete_with_permission" ON public.parcels;

-- Create a single, correct delete policy
CREATE POLICY "parcels_delete_policy" 
ON public.parcels 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1
    FROM public.farms f
    WHERE f.id = parcels.farm_id
      AND public.user_has_role(
        auth.uid(), 
        f.organization_id, 
        ARRAY['system_admin', 'organization_admin', 'farm_manager']::TEXT[]
      )
      AND public.has_valid_subscription(f.organization_id) = true
  )
);

-- =====================================================
-- 4. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.user_has_role(UUID, UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_role(UUID, UUID, TEXT[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.normalize_role_name(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_role_name(TEXT) TO service_role;

-- =====================================================
-- 5. REFRESH SCHEMA CACHE
-- =====================================================

NOTIFY pgrst, 'reload schema';

-- =====================================================
-- 6. VERIFICATION QUERIES (for debugging)
-- =====================================================

-- This query can be run manually to test the function:
-- SELECT public.user_has_role(
--   auth.uid(),
--   'your-org-id'::UUID,
--   ARRAY['system_admin', 'organization_admin', 'farm_manager']::TEXT[]
-- );

