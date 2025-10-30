-- ============================================================================
-- Quick Fix: Update Accounts Currency to Match Organization
-- ============================================================================
-- Run this SQL in Supabase Dashboard → SQL Editor
-- ============================================================================

-- Update all accounts to use their organization's currency
UPDATE public.accounts a
SET currency_code = o.currency
FROM public.organizations o
WHERE a.organization_id = o.id
  AND a.currency_code != o.currency;

-- Show the results
SELECT
  o.name as organization_name,
  o.currency as org_currency,
  COUNT(a.id) as accounts_updated
FROM public.accounts a
JOIN public.organizations o ON a.organization_id = o.id
WHERE a.currency_code = o.currency
GROUP BY o.name, o.currency;
