-- Check what's blocking subscription access

-- 1. Check if subscriptions exist
SELECT
  'Subscriptions in DB' as check_name,
  COUNT(*) as count,
  STRING_AGG(DISTINCT status, ', ') as statuses
FROM public.subscriptions;

-- 2. Check RLS policies on subscriptions table
SELECT
  'RLS Policies' as check_name,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'subscriptions';

-- 3. Check if RLS is enabled
SELECT
  'RLS Status' as check_name,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'subscriptions';

-- 4. Test if a specific user can see subscriptions
-- Replace with actual user email
DO $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_sub_count INTEGER;
BEGIN
  -- Get user by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'zakaria.boutchamir@gmail.com';

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User not found';
    RETURN;
  END IF;

  -- Get user's org
  SELECT organization_id INTO v_org_id
  FROM public.organization_users
  WHERE user_id = v_user_id AND is_active = true
  LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE NOTICE 'Organization not found for user';
    RETURN;
  END IF;

  -- Check subscription visibility
  SELECT COUNT(*) INTO v_sub_count
  FROM public.subscriptions
  WHERE organization_id = v_org_id;

  RAISE NOTICE 'User: %, Org: %, Can see % subscriptions', v_user_id, v_org_id, v_sub_count;
END $$;
