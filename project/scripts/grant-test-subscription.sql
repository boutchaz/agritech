-- Grant a test subscription to your organization
-- Replace 'YOUR_ORG_ID' with your actual organization ID

-- 1. First, find your organization ID
SELECT id, name, created_at FROM organizations ORDER BY created_at;

-- 2. Copy the ID and replace in the INSERT below

-- 3. Grant Professional plan subscription (30 days)
INSERT INTO subscriptions (
  organization_id,
  plan_type,
  status,
  current_period_start,
  current_period_end
)
VALUES (
  'YOUR_ORG_ID_HERE',  -- ⚠️ REPLACE THIS
  'professional',
  'active',
  NOW(),
  NOW() + INTERVAL '30 days'
)
ON CONFLICT (organization_id) DO UPDATE SET
  status = 'active',
  plan_type = 'professional',
  current_period_start = NOW(),
  current_period_end = NOW() + INTERVAL '30 days',
  updated_at = NOW();

-- 4. Verify it worked
SELECT
  o.name,
  s.plan_type,
  s.status,
  s.current_period_end,
  has_valid_subscription(o.id) as is_valid
FROM organizations o
JOIN subscriptions s ON o.id = s.organization_id;

-- Expected: You should see your org with status='active' and is_valid=true
