-- Manually create subscription for zakaria.boutchamir@gmail.com
-- Professional Plan (product_id: db925c1e-d64d-4d95-9907-dc90da5bcbe6)

DO $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'zakaria.boutchamir@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: zakaria.boutchamir@gmail.com';
  END IF;

  -- Get organization ID
  SELECT organization_id INTO v_org_id
  FROM public.organization_users
  WHERE user_id = v_user_id AND is_active = true
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Organization not found for user';
  END IF;

  -- Create/update subscription
  INSERT INTO public.subscriptions (
    organization_id,
    polar_subscription_id,
    polar_product_id,
    plan_type,
    status,
    current_period_start,
    current_period_end,
    max_farms,
    max_parcels,
    max_users,
    max_satellite_reports,
    has_analytics,
    has_sensor_integration,
    has_ai_recommendations,
    has_advanced_reporting,
    has_api_access,
    has_priority_support,
    created_at,
    updated_at
  ) VALUES (
    v_org_id,
    'manual_' || gen_random_uuid()::text,  -- Temporary ID until webhook runs
    'db925c1e-d64d-4d95-9907-dc90da5bcbe6',  -- Professional Plan product ID
    'professional',
    'active',
    NOW(),
    NOW() + INTERVAL '30 days',
    50,      -- max_farms
    500,     -- max_parcels
    20,      -- max_users
    100,     -- max_satellite_reports
    true,    -- has_analytics
    true,    -- has_sensor_integration
    true,    -- has_ai_recommendations
    true,    -- has_advanced_reporting
    true,    -- has_api_access
    true,    -- has_priority_support
    NOW(),
    NOW()
  )
  ON CONFLICT (organization_id)
  DO UPDATE SET
    plan_type = EXCLUDED.plan_type,
    status = EXCLUDED.status,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    max_farms = EXCLUDED.max_farms,
    max_parcels = EXCLUDED.max_parcels,
    max_users = EXCLUDED.max_users,
    max_satellite_reports = EXCLUDED.max_satellite_reports,
    has_analytics = EXCLUDED.has_analytics,
    has_sensor_integration = EXCLUDED.has_sensor_integration,
    has_ai_recommendations = EXCLUDED.has_ai_recommendations,
    has_advanced_reporting = EXCLUDED.has_advanced_reporting,
    has_api_access = EXCLUDED.has_api_access,
    has_priority_support = EXCLUDED.has_priority_support,
    updated_at = EXCLUDED.updated_at;

  RAISE NOTICE 'Subscription created successfully for organization: %', v_org_id;
END $$;

-- Verify the subscription was created
SELECT
  s.id,
  s.organization_id,
  o.name as organization_name,
  s.plan_type,
  s.status,
  s.current_period_end,
  s.max_farms,
  s.max_parcels,
  s.max_users
FROM public.subscriptions s
JOIN public.organizations o ON o.id = s.organization_id
WHERE s.organization_id IN (
  SELECT organization_id
  FROM public.organization_users ou
  JOIN auth.users u ON u.id = ou.user_id
  WHERE u.email = 'zakaria.boutchamir@gmail.com'
);
