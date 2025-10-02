-- EMERGENCY: Grant active subscription to all organizations
-- This will allow you to use the app immediately while we fix the frontend

-- ============================================================================
-- 1. FIND YOUR ORGANIZATIONS
-- ============================================================================

SELECT
  '📋 Your Organizations:' as info,
  id,
  name,
  created_at
FROM organizations
ORDER BY created_at DESC;

-- ============================================================================
-- 2. GRANT 30-DAY PROFESSIONAL SUBSCRIPTION TO ALL ORGS
-- ============================================================================

-- This will create or update subscriptions for all organizations
INSERT INTO subscriptions (
  organization_id,
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
  has_priority_support
)
SELECT
  id as organization_id,
  'professional' as plan_type,
  'active' as status,
  NOW() as current_period_start,
  NOW() + INTERVAL '30 days' as current_period_end,
  50 as max_farms,
  500 as max_parcels,
  20 as max_users,
  100 as max_satellite_reports,
  true as has_analytics,
  true as has_sensor_integration,
  true as has_ai_recommendations,
  true as has_advanced_reporting,
  true as has_api_access,
  true as has_priority_support
FROM organizations
ON CONFLICT (organization_id)
DO UPDATE SET
  status = 'active',
  plan_type = 'professional',
  current_period_start = NOW(),
  current_period_end = NOW() + INTERVAL '30 days',
  updated_at = NOW();

-- ============================================================================
-- 3. VERIFY SUBSCRIPTIONS CREATED
-- ============================================================================

SELECT
  '✅ Active Subscriptions:' as info,
  o.name as organization_name,
  s.plan_type,
  s.status,
  s.current_period_end,
  has_valid_subscription(o.id) as is_valid
FROM organizations o
JOIN subscriptions s ON o.id = s.organization_id
WHERE s.status = 'active';

-- ============================================================================
-- 4. TEST ACCESS
-- ============================================================================

SELECT
  '🔓 Access Test:' as info,
  o.name as organization,
  has_valid_subscription(o.id) as has_access,
  CASE
    WHEN has_valid_subscription(o.id) THEN '✅ CAN ACCESS APP'
    ELSE '❌ STILL BLOCKED'
  END as access_status
FROM organizations o;

-- ============================================================================
-- RESULT
-- ============================================================================

SELECT
  '🎉 DONE!' as result,
  COUNT(*) as total_active_subscriptions
FROM subscriptions
WHERE status = 'active';

-- You can now reload your app and it should work!
