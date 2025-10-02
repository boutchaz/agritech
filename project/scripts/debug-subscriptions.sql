-- Debug script to understand current subscription state
-- Run this in Supabase SQL Editor

-- ============================================================================
-- CURRENT STATE
-- ============================================================================

\echo '🔍 Current Subscription State'
\echo '================================'

-- 1. Count all subscriptions by status
SELECT
  'Subscriptions by Status' as report,
  status,
  COUNT(*) as count
FROM subscriptions
GROUP BY status
ORDER BY count DESC;

-- 2. Show all organizations and their subscription status
SELECT
  'Organizations & Subscriptions' as report,
  o.id as org_id,
  o.name as org_name,
  o.created_at as org_created,
  s.plan_type,
  s.status as sub_status,
  s.current_period_end,
  CASE
    WHEN s.id IS NULL THEN '❌ NO SUBSCRIPTION'
    WHEN s.status = 'trialing' THEN '⏳ TRIAL (AUTO-CREATED)'
    WHEN s.status = 'active' THEN '✅ ACTIVE PAID'
    WHEN s.status = 'past_due' THEN '⚠️ PAST DUE'
    WHEN s.status = 'canceled' THEN '🚫 CANCELED'
    ELSE '❓ UNKNOWN'
  END as subscription_state,
  has_valid_subscription(o.id) as is_valid
FROM organizations o
LEFT JOIN subscriptions s ON o.id = s.organization_id
ORDER BY o.created_at DESC;

-- 3. Check the auto-trial trigger
SELECT
  'Auto-Trial Trigger Status' as report,
  tgname as trigger_name,
  tgenabled as is_enabled,
  CASE tgenabled
    WHEN 'O' THEN '✅ ENABLED - Creates auto-trials'
    WHEN 'D' THEN '❌ DISABLED - No auto-trials'
    ELSE '❓ UNKNOWN'
  END as status
FROM pg_trigger
WHERE tgname = 'on_organization_created_subscription';

-- 4. Organizations that can access despite no paid subscription
SELECT
  'Organizations with Free Access' as report,
  o.name,
  s.status,
  s.plan_type,
  CASE
    WHEN s.status = 'trialing' THEN 'Using free trial'
    WHEN s.status IS NULL THEN 'No subscription but not blocked (BUG?)'
    ELSE 'Unknown reason'
  END as reason
FROM organizations o
LEFT JOIN subscriptions s ON o.id = s.organization_id
WHERE has_valid_subscription(o.id) = true
  AND (s.status != 'active' OR s.status IS NULL);

-- ============================================================================
-- WHAT TO DO
-- ============================================================================

\echo ''
\echo '🎯 Action Items:'
\echo ''
\echo 'If you see many TRIAL subscriptions:'
\echo '  → Run migration 20251002210000_disable_auto_trials.sql'
\echo '  → This will expire all trials and disable auto-creation'
\echo ''
\echo 'If auto-trial trigger is ENABLED:'
\echo '  → The migration will disable it'
\echo '  → New orgs will NOT get free trials'
\echo ''
\echo 'If you want to give specific orgs paid subscriptions:'
\echo '  → Use Polar.sh to create subscriptions'
\echo '  → Or manually: INSERT INTO subscriptions (...) with status=active'
