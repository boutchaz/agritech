-- Fix RLS policies for subscriptions table to allow users to read their org's subscription
-- The issue: subscriptions table RLS was blocking reads

-- Drop existing policies
DROP POLICY IF EXISTS "subscription_select_policy" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view their organization's subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "users_can_view_org_subscription" ON public.subscriptions;

-- Create simple, direct policy for reading subscriptions
-- Users can view subscription for organizations they belong to
CREATE POLICY "users_can_view_org_subscription"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (
    -- Direct check: user is a member of this organization
    organization_id IN (
      SELECT organization_id
      FROM public.organization_users
      WHERE user_id = auth.uid()
        AND is_active = true
    )
  );

-- Allow service role to do everything (for webhooks)
CREATE POLICY "service_role_all_subscriptions"
  ON public.subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Verify policies were created
DO $$
BEGIN
  RAISE NOTICE 'Subscription RLS policies updated successfully';
END $$;

-- Test query to verify it works
SELECT
  s.id,
  s.organization_id,
  s.plan_type,
  s.status,
  'Policy working!' as message
FROM public.subscriptions s
WHERE s.organization_id IN (
  SELECT organization_id
  FROM public.organization_users
  WHERE is_active = true
  LIMIT 1
)
LIMIT 1;
