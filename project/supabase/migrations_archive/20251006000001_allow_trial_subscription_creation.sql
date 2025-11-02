-- Migration to allow authenticated users to create trial subscriptions for their own organization
-- This enables the self-service trial onboarding flow

-- Drop the restrictive insert policy
DROP POLICY IF EXISTS "Only service role can create subscriptions" ON subscriptions;

-- Create a new policy that allows authenticated users to create trial subscriptions
-- for organizations they belong to
CREATE POLICY "Users can create trial subscriptions for their organization"
ON subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  -- User must be part of the organization
  organization_id IN (
    SELECT organization_id
    FROM organization_users
    WHERE user_id = auth.uid()
    AND is_active = true
  )
  -- Only allow creating trial subscriptions (status must be 'trialing')
  AND status = 'trialing'
  -- Prevent creating multiple subscriptions for the same organization
  AND NOT EXISTS (
    SELECT 1
    FROM subscriptions
    WHERE subscriptions.organization_id = organization_id
  )
);

-- Keep the service role policy for full access (for webhooks and admin operations)
CREATE POLICY "Service role can create any subscription"
ON subscriptions
FOR INSERT
TO service_role
WITH CHECK (true);

-- Add a policy for authenticated users to update their own trial subscriptions
-- (e.g., when upgrading to paid)
CREATE POLICY "Users can update their organization subscription"
ON subscriptions
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_users
    WHERE user_id = auth.uid()
    AND is_active = true
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM organization_users
    WHERE user_id = auth.uid()
    AND is_active = true
  )
);

-- Comment on the policies
COMMENT ON POLICY "Users can create trial subscriptions for their organization" ON subscriptions IS
'Allows authenticated users to create trial subscriptions for organizations they belong to. Prevents duplicate subscriptions.';

COMMENT ON POLICY "Service role can create any subscription" ON subscriptions IS
'Service role can create any subscription (used by webhooks and admin operations)';

COMMENT ON POLICY "Users can update their organization subscription" ON subscriptions IS
'Allows users to update subscriptions for organizations they belong to (e.g., upgrading from trial to paid)';
