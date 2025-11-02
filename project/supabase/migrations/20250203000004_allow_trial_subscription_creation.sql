-- Migration to allow authenticated users to create trial subscriptions for their own organization
-- This enables the self-service trial onboarding flow

-- ============================================================================
-- 1. UPDATE THE TRIGGER FUNCTION
-- ============================================================================

-- Update the prevent_unauthorized_subscription_creation function to allow
-- authenticated users creating trial subscriptions
CREATE OR REPLACE FUNCTION public.prevent_unauthorized_subscription_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow if:
  -- 1. Called by service_role
  -- 2. Called from our org creation trigger (flag is set)
  -- 3. Authenticated user creating a trial subscription AND belongs to the organization
  IF current_setting('role', true) = 'service_role' OR
     current_setting('app.creating_org_subscription', true) = 'true' OR
     (auth.uid() IS NOT NULL 
      AND NEW.status = 'trialing' 
      AND public.user_belongs_to_organization(auth.uid(), NEW.organization_id)) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Subscriptions can only be created via payment processor or admin';
END;
$$;

-- Comment on the functions
COMMENT ON FUNCTION public.prevent_unauthorized_subscription_creation() IS 
'Prevents unauthorized subscription creation. Allows service_role, trusted triggers, and authenticated users creating trial subscriptions for their own organization.';

COMMENT ON FUNCTION public.user_belongs_to_organization(UUID, UUID) IS 
'Checks if a user belongs to an organization. Uses SECURITY DEFINER to avoid RLS recursion.';

-- ============================================================================
-- 2. CREATE HELPER FUNCTION (to avoid RLS recursion)
-- ============================================================================

-- Create a helper function to check organization membership without RLS recursion
CREATE OR REPLACE FUNCTION public.user_belongs_to_organization(p_user_id UUID, p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_users
    WHERE user_id = p_user_id
      AND organization_id = p_org_id
      AND is_active = true
  );
$$;

-- Grant execute permission on the helper function
GRANT EXECUTE ON FUNCTION public.user_belongs_to_organization(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_organization(UUID, UUID) TO service_role;

-- ============================================================================
-- 3. UPDATE RLS POLICIES
-- ============================================================================

-- Drop the restrictive insert policy if it exists
DROP POLICY IF EXISTS "Only service role can create subscriptions" ON public.subscriptions;

-- Create a simplified policy that avoids recursion
-- Note: Organization membership is checked in the trigger function, not here
CREATE POLICY "Users can create trial subscriptions for their organization"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  -- Only allow creating trial subscriptions (status must be 'trialing')
  status = 'trialing'
  -- Prevent creating multiple subscriptions for the same organization
  AND NOT EXISTS (
    SELECT 1
    FROM public.subscriptions existing
    WHERE existing.organization_id = subscriptions.organization_id
  )
);

-- Keep the service role policy for full access (for webhooks and admin operations)
DROP POLICY IF EXISTS "Service role can create any subscription" ON public.subscriptions;
CREATE POLICY "Service role can create any subscription"
ON public.subscriptions
FOR INSERT
TO service_role
WITH CHECK (true);

-- Add a policy for authenticated users to update their own trial subscriptions
-- (e.g., when upgrading to paid)
DROP POLICY IF EXISTS "Users can update their organization subscription" ON public.subscriptions;
CREATE POLICY "Users can update their organization subscription"
ON public.subscriptions
FOR UPDATE
TO authenticated
USING (
  organization_id IN (
    SELECT organization_id
    FROM public.organization_users
    WHERE user_id = auth.uid()
    AND is_active = true
  )
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM public.organization_users
    WHERE user_id = auth.uid()
    AND is_active = true
  )
);

-- Comment on the policies
COMMENT ON POLICY "Users can create trial subscriptions for their organization" ON public.subscriptions IS
'Allows authenticated users to create trial subscriptions for organizations they belong to. Prevents duplicate subscriptions.';

COMMENT ON POLICY "Service role can create any subscription" ON public.subscriptions IS
'Service role can create any subscription (used by webhooks and admin operations)';

COMMENT ON POLICY "Users can update their organization subscription" ON public.subscriptions IS
'Allows users to update subscriptions for organizations they belong to (e.g., upgrading from trial to paid)';

