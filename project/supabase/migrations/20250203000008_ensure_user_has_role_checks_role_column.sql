-- =====================================================
-- Migration: Ensure user_has_role Checks Role Column
-- Description: Updates user_has_role to check both 
--              role TEXT column and role_id for compatibility
-- =====================================================

-- =====================================================
-- 1. CREATE normalize_role_name IF IT DOESN'T EXIST
-- =====================================================

-- Function to normalize legacy role names to new role names
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

-- Ensure user_has_role checks role TEXT column FIRST (which is what we're using)
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
AS $$
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
  
  -- If normalization failed, use roles as-is
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
  normalized_user_role := public.normalize_role_name(user_role);
  
  -- Check if normalized user role matches any of the normalized requested roles
  -- This is the PRIMARY check - uses role TEXT column directly
  v_result := normalized_user_role = ANY(normalized_roles);
  
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
              r.name = ANY(normalized_roles)
              OR public.normalize_role_name(r.name) = ANY(normalized_roles)
            )
        )
    ) INTO v_result;
  END IF;
  
  RETURN COALESCE(v_result, FALSE);
END;
$$;

COMMENT ON FUNCTION public.user_has_role IS 
'Checks if a user has one of the specified roles in an organization. 
Checks both the role TEXT column directly and via role_id for compatibility.
Handles both legacy (owner, admin, manager, member, viewer) and 
new (system_admin, organization_admin, farm_manager, farm_worker, day_laborer, viewer) role names.';

-- =====================================================
-- 3. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.user_has_role(UUID, UUID, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_role(UUID, UUID, TEXT[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.normalize_role_name(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_role_name(TEXT) TO service_role;

-- =====================================================
-- 4. REFRESH SCHEMA CACHE
-- =====================================================

NOTIFY pgrst, 'reload schema';

