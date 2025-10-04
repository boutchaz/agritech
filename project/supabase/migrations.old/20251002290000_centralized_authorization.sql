-- Centralized Authorization System
-- Combines role-based access control with subscription limits

-- ============================================
-- Helper Functions
-- ============================================

-- Check if user has a specific role in organization
CREATE OR REPLACE FUNCTION public.user_has_role(
  p_user_id UUID,
  p_organization_id UUID,
  p_role_names TEXT[]
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.organization_users ou
    JOIN public.roles r ON r.id = ou.role_id
    WHERE ou.user_id = p_user_id
      AND ou.organization_id = p_organization_id
      AND ou.is_active = true
      AND r.name = ANY(p_role_names)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get user's role level in organization
DROP FUNCTION IF EXISTS public.get_user_role_level(UUID, UUID);
CREATE FUNCTION public.get_user_role_level(
  p_user_id UUID,
  p_organization_id UUID
)
RETURNS INTEGER AS $$
DECLARE
  v_level INTEGER;
BEGIN
  SELECT r.level INTO v_level
  FROM public.organization_users ou
  JOIN public.roles r ON r.id = ou.role_id
  WHERE ou.user_id = p_user_id
    AND ou.organization_id = p_organization_id
    AND ou.is_active = true;

  RETURN COALESCE(v_level, 999); -- Return high number if no role found
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user can create resource based on subscription limits
CREATE OR REPLACE FUNCTION public.can_create_resource(
  p_organization_id UUID,
  p_resource_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_subscription RECORD;
  v_current_count INTEGER;
  v_limit INTEGER;
BEGIN
  -- Get subscription
  SELECT * INTO v_subscription
  FROM public.subscriptions
  WHERE organization_id = p_organization_id;

  -- No subscription = cannot create
  IF v_subscription IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check if subscription is active
  IF v_subscription.status NOT IN ('active', 'trialing') THEN
    RETURN FALSE;
  END IF;

  -- Check specific resource limits
  CASE p_resource_type
    WHEN 'farm' THEN
      SELECT COUNT(*) INTO v_current_count
      FROM public.farms
      WHERE organization_id = p_organization_id;

      v_limit := v_subscription.max_farms;

    WHEN 'parcel' THEN
      SELECT COUNT(*) INTO v_current_count
      FROM public.parcels p
      JOIN public.farms f ON f.id = p.farm_id
      WHERE f.organization_id = p_organization_id;

      v_limit := v_subscription.max_parcels;

    WHEN 'user' THEN
      SELECT COUNT(*) INTO v_current_count
      FROM public.organization_users
      WHERE organization_id = p_organization_id
        AND is_active = true;

      v_limit := v_subscription.max_users;

    WHEN 'satellite_report' THEN
      SELECT COUNT(*) INTO v_current_count
      FROM public.satellite_reports
      WHERE organization_id = p_organization_id
        AND created_at >= v_subscription.current_period_start;

      v_limit := v_subscription.max_satellite_reports;

    ELSE
      RETURN TRUE; -- Unknown resource type, allow
  END CASE;

  -- Check limit
  RETURN v_current_count < v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- RLS Policies for Farms
-- ============================================

-- Enable RLS
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "farms_select_policy" ON public.farms;
DROP POLICY IF EXISTS "farms_insert_policy" ON public.farms;
DROP POLICY IF EXISTS "farms_update_policy" ON public.farms;
DROP POLICY IF EXISTS "farms_delete_policy" ON public.farms;

-- SELECT: All active org members with valid subscription can view
CREATE POLICY "farms_select_policy"
  ON public.farms
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_users ou
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = farms.organization_id
        AND ou.is_active = true
        AND public.has_valid_subscription(farms.organization_id) = true
    )
  );

-- INSERT: Admin roles + subscription limit check
CREATE POLICY "farms_insert_policy"
  ON public.farms
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_has_role(
      auth.uid(),
      organization_id,
      ARRAY['system_admin', 'organization_admin']
    )
    AND public.can_create_resource(organization_id, 'farm') = true
  );

-- UPDATE: Admin and manager roles
CREATE POLICY "farms_update_policy"
  ON public.farms
  FOR UPDATE
  TO authenticated
  USING (
    public.user_has_role(
      auth.uid(),
      organization_id,
      ARRAY['system_admin', 'organization_admin', 'farm_manager']
    )
    AND public.has_valid_subscription(organization_id) = true
  );

-- DELETE: Admin roles only
CREATE POLICY "farms_delete_policy"
  ON public.farms
  FOR DELETE
  TO authenticated
  USING (
    public.user_has_role(
      auth.uid(),
      organization_id,
      ARRAY['system_admin', 'organization_admin']
    )
    AND public.has_valid_subscription(organization_id) = true
  );

-- ============================================
-- RLS Policies for Parcels
-- ============================================

ALTER TABLE public.parcels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parcels_select_policy" ON public.parcels;
DROP POLICY IF EXISTS "parcels_insert_policy" ON public.parcels;
DROP POLICY IF EXISTS "parcels_update_policy" ON public.parcels;
DROP POLICY IF EXISTS "parcels_delete_policy" ON public.parcels;

CREATE POLICY "parcels_select_policy"
  ON public.parcels
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.farms f
      JOIN public.organization_users ou ON ou.organization_id = f.organization_id
      WHERE f.id = parcels.farm_id
        AND ou.user_id = auth.uid()
        AND ou.is_active = true
        AND public.has_valid_subscription(f.organization_id) = true
    )
  );

CREATE POLICY "parcels_insert_policy"
  ON public.parcels
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.farms f
      WHERE f.id = farm_id
        AND public.user_has_role(
          auth.uid(),
          f.organization_id,
          ARRAY['system_admin', 'organization_admin', 'farm_manager']
        )
        AND public.can_create_resource(f.organization_id, 'parcel') = true
    )
  );

CREATE POLICY "parcels_update_policy"
  ON public.parcels
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.farms f
      WHERE f.id = parcels.farm_id
        AND public.user_has_role(
          auth.uid(),
          f.organization_id,
          ARRAY['system_admin', 'organization_admin', 'farm_manager']
        )
        AND public.has_valid_subscription(f.organization_id) = true
    )
  );

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
          ARRAY['system_admin', 'organization_admin', 'farm_manager']
        )
        AND public.has_valid_subscription(f.organization_id) = true
    )
  );

-- ============================================
-- RLS Policies for Organization Users
-- ============================================

-- SELECT: Already has policy
-- INSERT: Handled by invite-user edge function
-- UPDATE: Admin roles can update users in their org

DROP POLICY IF EXISTS "organization_users_update_policy" ON public.organization_users;

CREATE POLICY "organization_users_update_policy"
  ON public.organization_users
  FOR UPDATE
  TO authenticated
  USING (
    public.user_has_role(
      auth.uid(),
      organization_id,
      ARRAY['system_admin', 'organization_admin']
    )
  );

-- ============================================
-- Verification
-- ============================================

DO $$
BEGIN
  RAISE NOTICE 'Centralized authorization system deployed successfully';
  RAISE NOTICE 'Functions created: user_has_role, get_user_role_level, can_create_resource';
  RAISE NOTICE 'RLS policies updated for: farms, parcels, organization_users';
END $$;
