-- Subscription Enforcement Migration
-- This migration adds backend validation and policies to enforce subscription requirements

-- ============================================================================
-- 1. SUBSCRIPTION VALIDATION FUNCTION
-- ============================================================================

-- Function to check if organization has valid subscription
CREATE OR REPLACE FUNCTION public.has_valid_subscription(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  sub_record RECORD;
  is_valid BOOLEAN;
BEGIN
  -- Get subscription for organization
  SELECT * INTO sub_record
  FROM public.subscriptions
  WHERE organization_id = org_id
  LIMIT 1;

  -- No subscription = invalid
  IF sub_record IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check status
  IF sub_record.status NOT IN ('active', 'trialing') THEN
    RETURN FALSE;
  END IF;

  -- Check expiration (with grace period of 0 days)
  IF sub_record.current_period_end IS NOT NULL THEN
    IF sub_record.current_period_end < NOW() THEN
      RETURN FALSE;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- 2. USAGE LIMIT VALIDATION FUNCTIONS
-- ============================================================================

-- Check if organization can create more farms
CREATE OR REPLACE FUNCTION public.can_create_farm(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  sub_record RECORD;
  current_count INTEGER;
BEGIN
  -- Check subscription validity
  IF NOT public.has_valid_subscription(org_id) THEN
    RETURN FALSE;
  END IF;

  -- Get subscription limits
  SELECT * INTO sub_record
  FROM public.subscriptions
  WHERE organization_id = org_id
  LIMIT 1;

  -- Count current farms
  SELECT COUNT(*) INTO current_count
  FROM public.farms
  WHERE organization_id = org_id;

  -- Check limit
  RETURN current_count < sub_record.max_farms;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if organization can create more parcels
CREATE OR REPLACE FUNCTION public.can_create_parcel(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  sub_record RECORD;
  current_count INTEGER;
BEGIN
  -- Check subscription validity
  IF NOT public.has_valid_subscription(org_id) THEN
    RETURN FALSE;
  END IF;

  -- Get subscription limits
  SELECT * INTO sub_record
  FROM public.subscriptions
  WHERE organization_id = org_id
  LIMIT 1;

  -- Count current parcels
  SELECT COUNT(*) INTO current_count
  FROM public.parcels p
  JOIN public.farms f ON p.farm_id = f.id
  WHERE f.organization_id = org_id;

  -- Check limit
  RETURN current_count < sub_record.max_parcels;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if organization can add more users
CREATE OR REPLACE FUNCTION public.can_add_user(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  sub_record RECORD;
  current_count INTEGER;
BEGIN
  -- Check subscription validity
  IF NOT public.has_valid_subscription(org_id) THEN
    RETURN FALSE;
  END IF;

  -- Get subscription limits
  SELECT * INTO sub_record
  FROM public.subscriptions
  WHERE organization_id = org_id
  LIMIT 1;

  -- Count current active users
  SELECT COUNT(*) INTO current_count
  FROM public.organization_users
  WHERE organization_id = org_id AND is_active = true;

  -- Check limit
  RETURN current_count < sub_record.max_users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if organization has access to a feature
CREATE OR REPLACE FUNCTION public.has_feature_access(org_id UUID, feature_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  sub_record RECORD;
BEGIN
  -- Check subscription validity first
  IF NOT public.has_valid_subscription(org_id) THEN
    RETURN FALSE;
  END IF;

  -- Get subscription
  SELECT * INTO sub_record
  FROM public.subscriptions
  WHERE organization_id = org_id
  LIMIT 1;

  -- Check feature flag
  RETURN CASE feature_name
    WHEN 'analytics' THEN sub_record.has_analytics
    WHEN 'sensor_integration' THEN sub_record.has_sensor_integration
    WHEN 'ai_recommendations' THEN sub_record.has_ai_recommendations
    WHEN 'advanced_reporting' THEN sub_record.has_advanced_reporting
    WHEN 'api_access' THEN sub_record.has_api_access
    WHEN 'priority_support' THEN sub_record.has_priority_support
    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- 3. ROW LEVEL SECURITY POLICIES WITH SUBSCRIPTION ENFORCEMENT
-- ============================================================================

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "subscription_check_farms_insert" ON public.farms;
DROP POLICY IF EXISTS "subscription_check_parcels_insert" ON public.parcels;
DROP POLICY IF EXISTS "subscription_check_users_insert" ON public.organization_users;

-- Farms: Check subscription on INSERT
CREATE POLICY "subscription_check_farms_insert"
  ON public.farms
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_valid_subscription(organization_id) AND
    public.can_create_farm(organization_id)
  );

-- Parcels: Check subscription on INSERT
CREATE POLICY "subscription_check_parcels_insert"
  ON public.parcels
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.farms
      WHERE farms.id = parcels.farm_id
      AND public.has_valid_subscription(farms.organization_id)
      AND public.can_create_parcel(farms.organization_id)
    )
  );

-- Organization Users: Check subscription on INSERT
CREATE POLICY "subscription_check_users_insert"
  ON public.organization_users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_valid_subscription(organization_id) AND
    public.can_add_user(organization_id)
  );

-- ============================================================================
-- 4. TRIGGER TO UPDATE SUBSCRIPTION STATUS
-- ============================================================================

-- Function to automatically update expired subscriptions
CREATE OR REPLACE FUNCTION public.update_expired_subscriptions()
RETURNS void AS $$
BEGIN
  UPDATE public.subscriptions
  SET
    status = 'past_due',
    updated_at = NOW()
  WHERE
    status IN ('active', 'trialing')
    AND current_period_end < NOW()
    AND NOT cancel_at_period_end;

  -- Cancel subscriptions that were set to cancel at period end
  UPDATE public.subscriptions
  SET
    status = 'canceled',
    canceled_at = NOW(),
    updated_at = NOW()
  WHERE
    status IN ('active', 'trialing')
    AND current_period_end < NOW()
    AND cancel_at_period_end;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 5. HELPFUL VIEWS
-- ============================================================================

-- View to see subscription status with organization details
CREATE OR REPLACE VIEW public.subscription_status AS
SELECT
  s.id as subscription_id,
  o.id as organization_id,
  o.name as organization_name,
  s.plan_type,
  s.status,
  s.current_period_end,
  s.cancel_at_period_end,
  public.has_valid_subscription(o.id) as is_valid,
  CASE
    WHEN s.current_period_end IS NULL THEN NULL
    WHEN s.current_period_end < NOW() THEN 'expired'
    WHEN s.current_period_end < NOW() + INTERVAL '7 days' THEN 'expiring_soon'
    ELSE 'active'
  END as expiration_status,
  -- Usage counts
  (SELECT COUNT(*) FROM public.farms WHERE organization_id = o.id) as farms_count,
  s.max_farms,
  (SELECT COUNT(*) FROM public.parcels p JOIN public.farms f ON p.farm_id = f.id WHERE f.organization_id = o.id) as parcels_count,
  s.max_parcels,
  (SELECT COUNT(*) FROM public.organization_users WHERE organization_id = o.id AND is_active = true) as users_count,
  s.max_users
FROM public.subscriptions s
JOIN public.organizations o ON s.organization_id = o.id;

-- Grant access to the view
GRANT SELECT ON public.subscription_status TO authenticated;

-- ============================================================================
-- 6. COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON FUNCTION public.has_valid_subscription IS 'Checks if an organization has a valid active subscription';
COMMENT ON FUNCTION public.can_create_farm IS 'Checks if organization can create more farms based on subscription limits';
COMMENT ON FUNCTION public.can_create_parcel IS 'Checks if organization can create more parcels based on subscription limits';
COMMENT ON FUNCTION public.can_add_user IS 'Checks if organization can add more users based on subscription limits';
COMMENT ON FUNCTION public.has_feature_access IS 'Checks if organization has access to a specific premium feature';
COMMENT ON VIEW public.subscription_status IS 'Comprehensive view of subscription status with usage metrics';
