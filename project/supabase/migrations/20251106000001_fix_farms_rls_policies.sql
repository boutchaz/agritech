-- =====================================================
-- FIX FARMS, FARM_MANAGEMENT_ROLES, AND PARCELS RLS POLICIES
-- =====================================================
-- This migration fixes the "new row violates row-level security policy" errors for:
-- - farms table
-- - farm_management_roles table
-- - parcels table
-- Also fixes the get_farm_hierarchy_tree function to handle NULL org_uuid and ensure proper schema access
-- by updating the is_organization_member function and RLS policies to handle NULL organization_id
-- =====================================================

-- Update is_organization_member function to handle NULL organization_id
CREATE OR REPLACE FUNCTION is_organization_member(p_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  -- Return false if organization_id is NULL
  -- Direct query without RLS check (SECURITY DEFINER bypasses RLS)
  SELECT CASE 
    WHEN p_organization_id IS NULL THEN false
    ELSE EXISTS (
      SELECT 1 
      FROM public.organization_users 
      WHERE user_id = auth.uid() 
        AND organization_id = p_organization_id
        AND is_active = true
    )
  END;
$$;

-- =====================================================
-- FARMS RLS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "org_read_farms" ON farms;
DROP POLICY IF EXISTS "org_write_farms" ON farms;
DROP POLICY IF EXISTS "org_update_farms" ON farms;
DROP POLICY IF EXISTS "org_delete_farms" ON farms;

-- Read: Users can see farms from organizations they're members of, or farms with NULL organization_id
CREATE POLICY "org_read_farms" ON farms
  FOR SELECT USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

-- Insert: Authenticated users can create farms for organizations they're members of, or farms with NULL organization_id
CREATE POLICY "org_write_farms" ON farms
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (organization_id IS NULL OR is_organization_member(organization_id))
  );

-- Update: Users can update farms from organizations they're members of, or farms with NULL organization_id
CREATE POLICY "org_update_farms" ON farms
  FOR UPDATE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

-- Delete: Users can delete farms from organizations they're members of, or farms with NULL organization_id
CREATE POLICY "org_delete_farms" ON farms
  FOR DELETE USING (
    organization_id IS NULL OR is_organization_member(organization_id)
  );

-- =====================================================
-- FARM_MANAGEMENT_ROLES RLS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "org_read_farm_roles" ON farm_management_roles;
DROP POLICY IF EXISTS "org_write_farm_roles" ON farm_management_roles;
DROP POLICY IF EXISTS "org_update_farm_roles" ON farm_management_roles;
DROP POLICY IF EXISTS "org_delete_farm_roles" ON farm_management_roles;

-- Read: Users can see farm roles for farms they have access to
CREATE POLICY "org_read_farm_roles" ON farm_management_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = farm_management_roles.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

-- Insert: Authenticated users can create farm roles for farms they have access to, or for themselves
CREATE POLICY "org_write_farm_roles" ON farm_management_roles
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (
      user_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM farms
        WHERE farms.id = farm_management_roles.farm_id
          AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
      )
    )
  );

-- =====================================================
-- FIX get_farm_hierarchy_tree FUNCTION
-- =====================================================
-- Fix the function to handle NULL org_uuid and ensure proper schema access
-- SECURITY DEFINER bypasses RLS, so the function can access all farms/parcels
CREATE OR REPLACE FUNCTION get_farm_hierarchy_tree(
  org_uuid UUID,
  root_farm_id UUID DEFAULT NULL
)
RETURNS TABLE (
  farm_id UUID,
  farm_name TEXT,
  parent_farm_id UUID,
  farm_type TEXT,
  farm_size NUMERIC,
  manager_name TEXT,
  is_active BOOLEAN,
  hierarchy_level INTEGER,
  parcel_count BIGINT,
  subparcel_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return empty result if org_uuid is NULL
  IF org_uuid IS NULL THEN
    RETURN;
  END IF;

  -- SECURITY DEFINER bypasses RLS, so we can directly query farms and parcels
  RETURN QUERY
  WITH RECURSIVE farm_tree AS (
    -- Base case: root farms or specific farm
    SELECT
      f.id,
      f.name,
      NULL::UUID as parent_farm_id,
      'main'::TEXT as farm_type,
      f.size,
      COALESCE(f.manager_name, 'N/A') as manager,
      f.is_active,
      1 as level
    FROM public.farms f
    WHERE f.organization_id = org_uuid
      AND (root_farm_id IS NULL OR f.id = root_farm_id)
  )
  SELECT
    ft.id::UUID as farm_id,
    ft.name::TEXT as farm_name,
    ft.parent_farm_id::UUID,
    ft.farm_type::TEXT,
    ft.size::NUMERIC as farm_size,
    ft.manager::TEXT as manager_name,
    ft.is_active::BOOLEAN,
    ft.level::INTEGER as hierarchy_level,
    COUNT(DISTINCT p.id)::BIGINT as parcel_count,
    0::BIGINT as subparcel_count
  FROM farm_tree ft
  LEFT JOIN public.parcels p ON p.farm_id = ft.id
  GROUP BY ft.id, ft.name, ft.parent_farm_id, ft.farm_type, ft.size, ft.manager, ft.is_active, ft.level
  ORDER BY ft.level, ft.name;
END;
$$;

-- =====================================================
-- CREATE has_valid_subscription FUNCTION
-- =====================================================
-- This function checks if an organization has a valid subscription
-- Required by delete-farm and delete-parcel edge functions
CREATE OR REPLACE FUNCTION has_valid_subscription(org_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub_record RECORD;
BEGIN
  -- Check if subscription exists
  SELECT * INTO sub_record
  FROM public.subscriptions
  WHERE organization_id = org_id
  LIMIT 1;

  -- If no subscription found, return false
  IF sub_record IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if subscription is active or trialing and not expired
  RETURN sub_record.status IN ('active', 'trialing')
    AND (
      sub_record.current_period_end IS NULL
      OR sub_record.current_period_end >= CURRENT_DATE
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION has_valid_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION has_valid_subscription(UUID) TO service_role;

-- Update: Users can update farm roles for farms they have access to, or their own roles
CREATE POLICY "org_update_farm_roles" ON farm_management_roles
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = farm_management_roles.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

-- Delete: Users can delete farm roles for farms they have access to, or their own roles
CREATE POLICY "org_delete_farm_roles" ON farm_management_roles
  FOR DELETE USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = farm_management_roles.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

-- =====================================================
-- PARCELS RLS POLICIES
-- =====================================================
DROP POLICY IF EXISTS "org_read_parcels" ON parcels;
DROP POLICY IF EXISTS "org_write_parcels" ON parcels;
DROP POLICY IF EXISTS "org_update_parcels" ON parcels;
DROP POLICY IF EXISTS "org_delete_parcels" ON parcels;

-- Read: Users can see parcels from farms they have access to
CREATE POLICY "org_read_parcels" ON parcels
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = parcels.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

-- Insert: Authenticated users can create parcels for farms they have access to
CREATE POLICY "org_write_parcels" ON parcels
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = parcels.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

-- Update: Users can update parcels from farms they have access to
CREATE POLICY "org_update_parcels" ON parcels
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = parcels.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

-- Delete: Users can delete parcels from farms they have access to
CREATE POLICY "org_delete_parcels" ON parcels
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM farms
      WHERE farms.id = parcels.farm_id
        AND (farms.organization_id IS NULL OR is_organization_member(farms.organization_id))
    )
  );

