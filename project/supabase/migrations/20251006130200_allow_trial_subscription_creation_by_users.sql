-- Allow authenticated users to create trial subscriptions
-- Update the prevent_unauthorized_subscription_creation function

CREATE OR REPLACE FUNCTION public.prevent_unauthorized_subscription_creation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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
