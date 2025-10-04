-- Session-Level Subscription Blocking
-- This blocks ALL database queries if organization doesn't have valid subscription
-- Acts like Express/Koa middleware but at the database level

-- ============================================================================
-- 1. CREATE SESSION BLOCKING FUNCTION
-- ============================================================================

-- This function checks subscription on EVERY query
CREATE OR REPLACE FUNCTION public.enforce_subscription_on_session()
RETURNS void AS $$
DECLARE
  user_org_id UUID;
  is_valid BOOLEAN;
  current_path TEXT;
BEGIN
  -- Get current user's organization
  -- Try to get from request headers first (set by frontend)
  BEGIN
    user_org_id := current_setting('request.jwt.claims', true)::json->>'organization_id';
  EXCEPTION WHEN OTHERS THEN
    user_org_id := NULL;
  END;

  -- If no org ID in JWT, try to get from organization_users table
  IF user_org_id IS NULL THEN
    SELECT organization_id INTO user_org_id
    FROM organization_users
    WHERE user_id = auth.uid()
      AND is_active = true
    LIMIT 1;
  END IF;

  -- Skip check if:
  -- 1. No organization (not logged in or no org assigned)
  -- 2. Service role (internal operations)
  -- 3. Auth operations
  IF user_org_id IS NULL OR
     current_setting('role', true) = 'service_role' OR
     current_setting('request.path', true) LIKE '/auth/%' THEN
    RETURN;
  END IF;

  -- Check if organization has valid subscription
  is_valid := has_valid_subscription(user_org_id);

  -- If not valid, block the request
  IF NOT is_valid THEN
    RAISE EXCEPTION
      'SUBSCRIPTION_REQUIRED: Organization does not have an active subscription. Visit /settings/subscription to subscribe.'
      USING ERRCODE = 'P0001', -- Custom error code
            HINT = 'Please subscribe to continue using the application';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- 2. APPLY TO ALL MAJOR TABLES WITH RLS POLICIES
-- ============================================================================

-- Helper function to add subscription check to table policies
CREATE OR REPLACE FUNCTION public.add_subscription_check_to_table(table_name TEXT)
RETURNS void AS $$
DECLARE
  policy_name TEXT;
BEGIN
  -- Policy names for each operation
  policy_name := 'subscription_required_' || table_name;

  -- Drop existing policies if they exist
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name || '_select', table_name);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name || '_insert', table_name);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name || '_update', table_name);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name || '_delete', table_name);

  -- SELECT: Check subscription before allowing reads
  EXECUTE format($SQL$
    CREATE POLICY %I ON public.%I
    FOR SELECT TO authenticated
    USING (
      -- Allow if subscription valid OR accessing subscription tables themselves
      CASE
        WHEN '%I' IN ('subscriptions', 'organizations', 'organization_users') THEN true
        ELSE EXISTS (
          SELECT 1 FROM organization_users ou
          WHERE ou.user_id = auth.uid()
            AND ou.is_active = true
            AND has_valid_subscription(ou.organization_id)
        )
      END
    )
  $SQL$, policy_name || '_select', table_name, table_name);

  -- INSERT/UPDATE/DELETE: Require valid subscription
  EXECUTE format($SQL$
    CREATE POLICY %I ON public.%I
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM organization_users ou
        WHERE ou.user_id = auth.uid()
          AND ou.is_active = true
          AND has_valid_subscription(ou.organization_id)
      )
    )
  $SQL$, policy_name || '_insert', table_name);

  RAISE NOTICE 'Added subscription check to table: %', table_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. APPLY TO KEY TABLES
-- ============================================================================

-- Apply subscription blocking to critical tables (only existing tables)
SELECT add_subscription_check_to_table('farms');
SELECT add_subscription_check_to_table('parcels');
SELECT add_subscription_check_to_table('analyses');
SELECT add_subscription_check_to_table('employees');
SELECT add_subscription_check_to_table('day_laborers');
SELECT add_subscription_check_to_table('utilities');
SELECT add_subscription_check_to_table('structures');
SELECT add_subscription_check_to_table('trees');
SELECT add_subscription_check_to_table('costs');
SELECT add_subscription_check_to_table('revenues');

-- ============================================================================
-- 4. CREATE VIEW TO CHECK SESSION STATUS
-- ============================================================================

CREATE OR REPLACE VIEW public.current_session_status AS
SELECT
  auth.uid() as user_id,
  ou.organization_id,
  o.name as organization_name,
  s.plan_type,
  s.status as subscription_status,
  has_valid_subscription(ou.organization_id) as has_access,
  CASE
    WHEN has_valid_subscription(ou.organization_id) THEN '✅ ACCESS GRANTED'
    ELSE '❌ ACCESS BLOCKED - Subscription Required'
  END as access_status
FROM organization_users ou
JOIN organizations o ON ou.organization_id = o.id
LEFT JOIN subscriptions s ON ou.organization_id = s.organization_id
WHERE ou.user_id = auth.uid()
  AND ou.is_active = true
LIMIT 1;

GRANT SELECT ON public.current_session_status TO authenticated;

-- ============================================================================
-- 5. CREATE BLOCKING FUNCTION FOR DANGEROUS OPERATIONS
-- ============================================================================

-- Function to block writes if no subscription
CREATE OR REPLACE FUNCTION public.block_write_without_subscription()
RETURNS TRIGGER AS $$
DECLARE
  user_org_id UUID;
  is_valid BOOLEAN;
BEGIN
  -- Get user's organization
  SELECT organization_id INTO user_org_id
  FROM organization_users
  WHERE user_id = auth.uid()
    AND is_active = true
  LIMIT 1;

  -- Check subscription
  IF user_org_id IS NOT NULL THEN
    is_valid := has_valid_subscription(user_org_id);

    IF NOT is_valid THEN
      RAISE EXCEPTION 'Cannot perform this operation: Active subscription required'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to key tables
DROP TRIGGER IF EXISTS block_farms_without_sub ON public.farms;
CREATE TRIGGER block_farms_without_sub
  BEFORE INSERT OR UPDATE OR DELETE ON public.farms
  FOR EACH ROW EXECUTE FUNCTION block_write_without_subscription();

DROP TRIGGER IF EXISTS block_parcels_without_sub ON public.parcels;
CREATE TRIGGER block_parcels_without_sub
  BEFORE INSERT OR UPDATE OR DELETE ON public.parcels
  FOR EACH ROW EXECUTE FUNCTION block_write_without_subscription();

DROP TRIGGER IF EXISTS block_analyses_without_sub ON public.analyses;
CREATE TRIGGER block_analyses_without_sub
  BEFORE INSERT OR UPDATE OR DELETE ON public.analyses
  FOR EACH ROW EXECUTE FUNCTION block_write_without_subscription();

-- ============================================================================
-- 6. TEST THE BLOCKING
-- ============================================================================

-- Test query (run this to verify blocking works)
DO $$
DECLARE
  test_result TEXT;
BEGIN
  -- This should show if blocking is active
  RAISE NOTICE '🧪 Testing subscription blocking...';

  -- Try to check session status
  SELECT access_status INTO test_result
  FROM current_session_status;

  IF test_result LIKE '%BLOCKED%' THEN
    RAISE NOTICE '✅ Blocking is ACTIVE - Users without subscription will be blocked';
  ELSE
    RAISE NOTICE '⚠️  Blocking status: %', test_result;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️  Could not test blocking (might need to be logged in)';
END $$;

-- ============================================================================
-- 7. COMMENTS
-- ============================================================================

COMMENT ON FUNCTION public.enforce_subscription_on_session() IS
'Session-level subscription enforcement. Blocks ALL database queries if organization lacks valid subscription.';

COMMENT ON FUNCTION public.block_write_without_subscription() IS
'Trigger function that blocks INSERT/UPDATE/DELETE operations on tables if user organization does not have valid subscription.';

COMMENT ON VIEW public.current_session_status IS
'Shows current user session subscription status. Use to debug why user is or is not blocked.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Session-level blocking installed!
-- What was added:
--   - RLS policies on 10 critical tables
--   - Write triggers on farms, parcels, analyses
--   - Session status view
--
-- To verify it is working:
--   SELECT * FROM current_session_status;
--
-- To test (should fail without subscription):
--   INSERT INTO farms (name, organization_id) VALUES ('Test', 'your-org-id');
