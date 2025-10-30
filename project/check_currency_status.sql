-- Check current currency status
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Check organization currency
SELECT
  id,
  name,
  currency,
  currency_symbol
FROM public.organizations;

-- 2. Check accounts currency distribution
SELECT
  o.name as organization_name,
  o.currency as org_currency,
  a.currency_code as account_currency,
  COUNT(a.id) as account_count
FROM public.accounts a
JOIN public.organizations o ON a.organization_id = o.id
GROUP BY o.name, o.currency, a.currency_code
ORDER BY o.name, a.currency_code;

-- 3. If you want to update organization to MAD:
-- UPDATE public.organizations SET currency = 'MAD', currency_symbol = 'د.م.' WHERE id = 'your-org-id';

-- 4. Then run this to update accounts:
-- UPDATE public.accounts a
-- SET currency_code = o.currency
-- FROM public.organizations o
-- WHERE a.organization_id = o.id;
