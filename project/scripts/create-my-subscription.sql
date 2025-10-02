-- Quick script to manually create your subscription after payment
-- Run this in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Find your organization ID
-- ============================================================================

SELECT
  id,
  name,
  created_at
FROM organizations
ORDER BY created_at DESC;

-- Copy the ID of your organization from the results above

-- ============================================================================
-- STEP 2: Create your subscription
-- ============================================================================

-- Replace 'YOUR_ORG_ID_HERE' with the actual ID from Step 1
-- Replace 'sub_xxx', 'cus_xxx', 'prod_xxx' with values from Polar dashboard (optional)

INSERT INTO subscriptions (
  organization_id,
  polar_subscription_id,    -- Get from Polar dashboard (optional)
  polar_customer_id,         -- Get from Polar dashboard (optional)
  polar_product_id,          -- Get from Polar dashboard (optional)
  plan_type,                 -- Change to: 'essential', 'professional', or 'enterprise'
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
) VALUES (
  'YOUR_ORG_ID_HERE',        -- ⚠️ REPLACE THIS
  null,                       -- Can be null if you don't have Polar IDs yet
  null,
  null,
  'professional',             -- ⚠️ CHANGE THIS if you bought different plan
  'active',
  NOW(),
  NOW() + INTERVAL '30 days', -- ⚠️ CHANGE THIS to your actual billing period end
  50,                         -- Professional plan: 50 farms
  500,                        -- Professional plan: 500 parcels
  20,                         -- Professional plan: 20 users
  100,                        -- Professional plan: 100 satellite reports
  true,                       -- Analytics enabled
  true,                       -- Sensor integration enabled
  true,                       -- AI recommendations enabled
  true,                       -- Advanced reporting enabled
  true,                       -- API access enabled
  true                        -- Priority support enabled
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
  updated_at = NOW();

-- ============================================================================
-- STEP 3: Verify subscription was created
-- ============================================================================

SELECT
  o.name as organization_name,
  s.plan_type,
  s.status,
  s.current_period_start,
  s.current_period_end,
  has_valid_subscription(o.id) as is_valid,
  CASE
    WHEN has_valid_subscription(o.id) THEN '✅ SUBSCRIPTION ACTIVE - You can now use the app!'
    ELSE '❌ Something is wrong - Check the subscription details'
  END as result
FROM organizations o
JOIN subscriptions s ON o.id = s.organization_id
ORDER BY s.created_at DESC;

-- Expected: is_valid = true and result = '✅ SUBSCRIPTION ACTIVE'

-- ============================================================================
-- PLAN LIMITS REFERENCE
-- ============================================================================

-- Essential Plan ($25/mo):
--   max_farms: 5
--   max_parcels: 50
--   max_users: 3
--   max_satellite_reports: 10
--   All features: false

-- Professional Plan ($75/mo):
--   max_farms: 50
--   max_parcels: 500
--   max_users: 20
--   max_satellite_reports: 100
--   All features: true

-- Enterprise Plan (custom):
--   max_farms: 999999 (unlimited)
--   max_parcels: 999999 (unlimited)
--   max_users: 999999 (unlimited)
--   max_satellite_reports: 999999 (unlimited)
--   All features: true
