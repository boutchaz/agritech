-- Check all subscriptions in the system
-- Run this in Supabase SQL Editor

-- 1. Show all subscriptions with details
SELECT
  s.id,
  o.name as organization_name,
  s.plan_type,
  s.status,
  s.current_period_start,
  s.current_period_end,
  CASE
    WHEN s.current_period_end IS NULL THEN 'No expiration'
    WHEN s.current_period_end < NOW() THEN 'EXPIRED'
    WHEN s.current_period_end > NOW() THEN 'Active until ' || s.current_period_end::date
  END as expiration_status,
  has_valid_subscription(o.id) as is_valid
FROM subscriptions s
JOIN organizations o ON s.organization_id = o.id
ORDER BY o.name;

-- 2. Count subscriptions by status
SELECT
  status,
  COUNT(*) as count
FROM subscriptions
GROUP BY status;

-- 3. Show organizations WITHOUT subscriptions
SELECT
  o.id,
  o.name,
  o.created_at,
  has_valid_subscription(o.id) as has_valid_sub
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions WHERE organization_id = o.id
)
ORDER BY o.created_at DESC;
