-- Fix infinite recursion in subscription RLS policies
-- The issue: checking subscriptions table within subscriptions policy causes recursion

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can create trial subscriptions for their organization" ON subscriptions;
DROP POLICY IF EXISTS "Users can update their organization subscription" ON subscriptions;

-- Create a simpler policy that doesn't query subscriptions table
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
  -- Only allow creating trial subscriptions
  AND status = 'trialing'
);

-- Add a policy for reading subscriptions
CREATE POLICY "Users can view their organization subscriptions"
ON subscriptions
FOR SELECT
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM organization_users
    WHERE user_id = auth.uid()
    AND is_active = true
  )
);

-- Add a policy for updating subscriptions
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

-- Use a unique constraint to prevent duplicate subscriptions instead of policy check
-- This is enforced at the database level, not policy level
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_organization_id_unique'
  ) THEN
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_organization_id_unique UNIQUE (organization_id);
  END IF;
END $$;
