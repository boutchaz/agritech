-- Migration to disable automatic trial subscriptions
-- and require all users to have paid subscriptions

-- ============================================================================
-- 1. DISABLE AUTO-TRIAL TRIGGER
-- ============================================================================

-- Drop the trigger that creates trials for new organizations
DROP TRIGGER IF EXISTS on_organization_created_subscription ON public.organizations;

-- Keep the function but disable automatic execution
COMMENT ON FUNCTION public.initialize_default_subscription() IS 'DISABLED - Was creating automatic trial subscriptions for new organizations. Now subscriptions must be created manually or via payment.';

-- ============================================================================
-- 2. OPTION A: DELETE ALL TRIAL SUBSCRIPTIONS (STRICT ENFORCEMENT)
-- ============================================================================

-- Uncomment this if you want to DELETE all trial subscriptions immediately
-- This will block ALL users who don't have paid subscriptions

-- DELETE FROM public.subscriptions WHERE status = 'trialing';

-- ============================================================================
-- 2. OPTION B: EXPIRE ALL TRIAL SUBSCRIPTIONS (GRADUAL)
-- ============================================================================

-- Set all trials to expired (convert to past_due)
-- This gives you a record of trials but blocks access
UPDATE public.subscriptions
SET
  status = 'past_due',
  current_period_end = NOW() - INTERVAL '1 day',
  updated_at = NOW()
WHERE status = 'trialing';

-- ============================================================================
-- 3. ENSURE NO SUBSCRIPTIONS FOR NEW ORGANIZATIONS
-- ============================================================================

-- Create a new trigger that prevents subscription creation except by service role
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_subscription_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only allow service role (backend) to create subscriptions
  -- This prevents frontend from creating subscriptions
  IF current_setting('role') != 'service_role' THEN
    RAISE EXCEPTION 'Subscriptions can only be created via payment processor or admin';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to subscriptions table
DROP TRIGGER IF EXISTS enforce_subscription_creation ON public.subscriptions;
CREATE TRIGGER enforce_subscription_creation
  BEFORE INSERT ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_unauthorized_subscription_creation();

-- ============================================================================
-- 4. UPDATE RLS POLICIES
-- ============================================================================

-- Remove ability for users to insert subscriptions
DROP POLICY IF EXISTS "Users can create subscriptions" ON public.subscriptions;

-- Only service role can insert
CREATE POLICY "Only service role can create subscriptions"
  ON public.subscriptions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================================
-- 5. VERIFICATION QUERIES
-- ============================================================================

-- Check remaining subscriptions
DO $$
DECLARE
  trial_count INTEGER;
  active_count INTEGER;
  total_orgs INTEGER;
  orgs_without_sub INTEGER;
BEGIN
  SELECT COUNT(*) INTO trial_count FROM subscriptions WHERE status = 'trialing';
  SELECT COUNT(*) INTO active_count FROM subscriptions WHERE status = 'active';
  SELECT COUNT(*) INTO total_orgs FROM organizations;
  SELECT COUNT(*) INTO orgs_without_sub
  FROM organizations o
  WHERE NOT EXISTS (SELECT 1 FROM subscriptions WHERE organization_id = o.id);

  RAISE NOTICE '📊 Subscription Status After Migration:';
  RAISE NOTICE '  - Trial subscriptions remaining: %', trial_count;
  RAISE NOTICE '  - Active paid subscriptions: %', active_count;
  RAISE NOTICE '  - Total organizations: %', total_orgs;
  RAISE NOTICE '  - Organizations without subscription: %', orgs_without_sub;
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Organizations without subscriptions will be BLOCKED';
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TRIGGER enforce_subscription_creation ON public.subscriptions IS
'Prevents frontend from creating subscriptions directly. Subscriptions must come from payment processor (Polar.sh) or be created manually by admin with service role.';
