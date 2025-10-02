-- Create subscription from your Polar webhook data
-- Customer email: testr@gmail.com
-- Product: Professional Plan (db925c1e-d64d-4d95-9907-dc90da5bcbe6)
-- Customer ID: aaea9b35-c46a-4ee5-8aff-f2fbd2df0a6e

-- ============================================================================
-- STEP 1: Find the user by email
-- ============================================================================

-- Find user ID from auth.users (run in Supabase dashboard under Authentication)
-- Email: testr@gmail.com

-- ============================================================================
-- STEP 2: Find organization for that user
-- ============================================================================

-- Replace 'USER_ID_HERE' with the ID from auth.users
SELECT
  ou.organization_id,
  o.name as organization_name,
  ou.user_id
FROM organization_users ou
JOIN organizations o ON ou.organization_id = o.id
WHERE ou.user_id = 'USER_ID_HERE'
  AND ou.is_active = true;

-- Copy the organization_id from the result

-- ============================================================================
-- STEP 3: Create the subscription
-- ============================================================================

-- Replace 'ORG_ID_HERE' with the organization_id from Step 2

INSERT INTO subscriptions (
  organization_id,
  polar_subscription_id,
  polar_customer_id,
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
  metadata
) VALUES (
  'ORG_ID_HERE',                           -- Your organization ID
  '37110390-3bfb-490a-bb37-7c297fe27958',  -- Checkout ID from webhook
  'aaea9b35-c46a-4ee5-8aff-f2fbd2df0a6e',  -- Customer ID from webhook
  'db925c1e-d64d-4d95-9907-dc90da5bcbe6',  -- Professional Plan product ID
  'professional',                           -- Plan type
  'active',                                 -- Status
  NOW(),                                    -- Period start
  NOW() + INTERVAL '30 days',               -- Period end
  50,                                       -- Professional: 50 farms
  500,                                      -- Professional: 500 parcels
  20,                                       -- Professional: 20 users
  100,                                      -- Professional: 100 satellite reports
  true,                                     -- Analytics enabled
  true,                                     -- Sensor integration
  true,                                     -- AI recommendations
  true,                                     -- Advanced reporting
  true,                                     -- API access
  true,                                     -- Priority support
  '{}'::jsonb                               -- Empty metadata
)
ON CONFLICT (organization_id)
DO UPDATE SET
  polar_subscription_id = EXCLUDED.polar_subscription_id,
  polar_customer_id = EXCLUDED.polar_customer_id,
  polar_product_id = EXCLUDED.polar_product_id,
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
-- STEP 4: Verify subscription created
-- ============================================================================

SELECT
  o.name as organization,
  s.plan_type,
  s.status,
  s.current_period_end,
  has_valid_subscription(o.id) as is_valid,
  CASE
    WHEN has_valid_subscription(o.id) THEN '✅ ACTIVE - You can now use the app!'
    ELSE '❌ NOT VALID - Check subscription details'
  END as result
FROM organizations o
JOIN subscriptions s ON o.id = s.organization_id
WHERE s.polar_customer_id = 'aaea9b35-c46a-4ee5-8aff-f2fbd2df0a6e';

-- Expected: is_valid = true
