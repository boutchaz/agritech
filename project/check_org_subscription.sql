-- Check if subscription exists for organization: 912c30a6-00a0-43c8-88c9-30e377734c4b

SELECT
  'Direct Query' as check_type,
  s.*
FROM public.subscriptions s
WHERE s.organization_id = '912c30a6-00a0-43c8-88c9-30e377734c4b';

-- Check if user has access to this org
SELECT
  'User Org Access' as check_type,
  ou.*
FROM public.organization_users ou
WHERE ou.organization_id = '912c30a6-00a0-43c8-88c9-30e377734c4b'
  AND ou.user_id = '0a69cff0-9f53-4c0e-aacb-35c56e2e5bd5';

-- Check all subscriptions
SELECT
  'All Subscriptions' as check_type,
  s.id,
  s.organization_id,
  o.name as org_name,
  s.plan_type,
  s.status,
  s.current_period_end
FROM public.subscriptions s
LEFT JOIN public.organizations o ON o.id = s.organization_id
ORDER BY s.created_at DESC;

-- Check if webhook created subscription for different org
SELECT
  'User Organizations' as check_type,
  o.id,
  o.name,
  ou.user_id
FROM public.organizations o
JOIN public.organization_users ou ON ou.organization_id = o.id
WHERE ou.user_id = '0a69cff0-9f53-4c0e-aacb-35c56e2e5bd5'
  AND ou.is_active = true;
