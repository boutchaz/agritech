-- Fix subscription auto-creation for new organizations
-- The issue: prevent_unauthorized_subscription_creation blocks even SECURITY DEFINER functions

-- Solution: Use a session variable flag that our trigger sets
CREATE OR REPLACE FUNCTION create_default_subscription_for_org()
RETURNS TRIGGER AS $$
BEGIN
  -- Set a flag to indicate this is our trusted trigger
  PERFORM set_config('app.creating_org_subscription', 'true', true);

  INSERT INTO subscriptions (
    organization_id, plan_type, status,
    max_farms, max_parcels, max_users, max_satellite_reports,
    has_analytics, has_sensor_integration, has_ai_recommendations,
    has_advanced_reporting, has_api_access, has_priority_support
  ) VALUES (
    NEW.id, 'essential', 'active',
    1, 10, 1, 0,
    false, false, false,
    false, false, false
  );

  -- Clear the flag
  PERFORM set_config('app.creating_org_subscription', NULL, true);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Clear flag even on error
    PERFORM set_config('app.creating_org_subscription', NULL, true);
    RAISE WARNING 'Failed to create subscription for org %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update enforcement function to check our flag
CREATE OR REPLACE FUNCTION prevent_unauthorized_subscription_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow if:
  -- 1. Called by service_role
  -- 2. Called from our org creation trigger (flag is set)
  IF current_setting('role', true) = 'service_role' OR
     current_setting('app.creating_org_subscription', true) = 'true' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Subscriptions can only be created via payment processor or admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_default_subscription_for_org() IS
'Auto-creates essential subscription when a new organization is created. Uses session flag to bypass enforcement.';

COMMENT ON FUNCTION prevent_unauthorized_subscription_creation() IS
'Prevents unauthorized subscription creation. Allows service_role and trusted triggers only.';
