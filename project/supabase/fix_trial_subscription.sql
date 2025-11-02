-- Manual fix to allow authenticated users to create trial subscriptions
-- This can be run directly in Supabase SQL editor

-- Update the prevent_unauthorized_subscription_creation function
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
  -- 3. Authenticated user creating a trial subscription
  IF current_setting('role', true) = 'service_role' OR
     current_setting('app.creating_org_subscription', true) = 'true' OR
     (auth.uid() IS NOT NULL AND NEW.status = 'trialing') THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Subscriptions can only be created via payment processor or admin';
END;
$$;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Only service role can create subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can create trial subscriptions for their organization" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can create any subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update their organization subscription" ON public.subscriptions;

-- Create new policies
CREATE POLICY "Users can create trial subscriptions for their organization"
ON public.subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id IN (
    SELECT organization_id
    FROM public.organization_users
    WHERE user_id = auth.uid()
    AND is_active = true
  )
  AND status = 'trialing'
  AND NOT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE public.subscriptions.organization_id = subscriptions.organization_id
  )
);

CREATE POLICY "Service role can create any subscription"
ON public.subscriptions
FOR INSERT
TO service_role
WITH CHECK (true);

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

