-- =====================================================
-- Migration: Harmonize and Migrate Role Names
-- Description: Standardizes role names across the system
-- Maps legacy role names to new standardized role names
-- =====================================================

-- =====================================================
-- 1. ROLE MAPPING FUNCTION
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
-- 2. MIGRATE EXISTING ROLES
-- =====================================================

-- Update all existing roles in organization_users table
UPDATE public.organization_users
SET role = public.normalize_role_name(role)
WHERE role IN ('owner', 'admin', 'manager', 'member', 'viewer');

-- Log the migration
DO $$
DECLARE
  migration_count INTEGER;
BEGIN
  GET DIAGNOSTICS migration_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % organization_users roles to standardized names', migration_count;
END $$;

-- =====================================================
-- 3. UPDATE TABLE CONSTRAINT
-- =====================================================

-- Drop old constraint
ALTER TABLE public.organization_users 
DROP CONSTRAINT IF EXISTS organization_users_role_check;

-- Add new constraint with standardized role names
ALTER TABLE public.organization_users 
ADD CONSTRAINT organization_users_role_check 
CHECK (role IN (
  'system_admin',
  'organization_admin', 
  'farm_manager',
  'farm_worker',
  'day_laborer',
  'viewer'
));

-- =====================================================
-- 4. UPDATE user_has_role FUNCTION
-- =====================================================

-- Update user_has_role to handle both legacy and new role names
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
  -- Normalize the requested role names
  SELECT array_agg(DISTINCT public.normalize_role_name(unnest))
  INTO normalized_roles
  FROM unnest(p_role_names);
  
  -- Get user's role
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
  
  -- Normalize user's role
  normalized_user_role := public.normalize_role_name(user_role);
  
  -- Check if normalized user role matches any of the normalized requested roles
  v_result := normalized_user_role = ANY(normalized_roles);
  
  -- Also check via role_id if it exists
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
            AND public.normalize_role_name(r.name) = ANY(normalized_roles)
        )
    ) INTO v_result;
  END IF;
  
  RETURN COALESCE(v_result, FALSE);
END;
$$;

COMMENT ON FUNCTION public.user_has_role IS 
'Checks if a user has one of the specified roles in an organization. 
Handles both legacy (owner, admin, manager, member, viewer) and 
new (system_admin, organization_admin, farm_manager, farm_worker, day_laborer, viewer) role names.';

-- =====================================================
-- 5. UPDATE ORGANIZATION OWNERS
-- =====================================================

-- Ensure organization owners have system_admin role
UPDATE public.organization_users ou
SET role = 'system_admin'
FROM public.organizations o
WHERE ou.organization_id = o.id
  AND ou.user_id = o.owner_id
  AND ou.role != 'system_admin'
  AND ou.is_active = true;

-- =====================================================
-- 6. CREATE INDEX ON ROLE FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_organization_users_role_normalized 
ON public.organization_users(public.normalize_role_name(role));

-- =====================================================
-- 7. VERIFY MIGRATION
-- =====================================================

DO $$
DECLARE
  legacy_count INTEGER;
  new_count INTEGER;
BEGIN
  -- Count legacy roles
  SELECT COUNT(*) INTO legacy_count
  FROM public.organization_users
  WHERE role IN ('owner', 'admin', 'manager', 'member', 'viewer');
  
  -- Count new roles
  SELECT COUNT(*) INTO new_count
  FROM public.organization_users
  WHERE role IN ('system_admin', 'organization_admin', 'farm_manager', 'farm_worker', 'day_laborer', 'viewer');
  
  IF legacy_count > 0 THEN
    RAISE WARNING 'Found % legacy role names that were not migrated', legacy_count;
  END IF;
  
  RAISE NOTICE 'Migration complete: % users with new role names', new_count;
END $$;

-- =====================================================
-- 8. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION public.normalize_role_name(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_role_name(TEXT) TO service_role;

