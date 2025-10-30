-- ============================================================================
-- Complete Currency Fix: Update Everything to MAD
-- ============================================================================
-- Run this in Supabase Dashboard → SQL Editor → https://supabase.com/dashboard/project/mvegjdkkbhlhbjpbhpou/sql
-- ============================================================================

-- Step 1: Show current status
SELECT 'Current Organization Currency:' as step;
SELECT id, name, currency, currency_symbol FROM public.organizations;

SELECT 'Current Accounts Currency Distribution:' as step;
SELECT
  o.name as organization_name,
  o.currency as org_currency,
  a.currency_code as account_currency,
  COUNT(a.id) as account_count
FROM public.accounts a
JOIN public.organizations o ON a.organization_id = o.id
GROUP BY o.name, o.currency, a.currency_code;

-- Step 2: Update organization to MAD (if it's currently EUR)
UPDATE public.organizations
SET
  currency = 'MAD',
  currency_symbol = 'د.م.'
WHERE currency != 'MAD';

-- Step 3: Update all accounts to match organization currency (MAD)
UPDATE public.accounts a
SET currency_code = o.currency
FROM public.organizations o
WHERE a.organization_id = o.id
  AND a.currency_code != o.currency;

-- Step 4: Show results
SELECT 'After Update - Organization Currency:' as step;
SELECT id, name, currency, currency_symbol FROM public.organizations;

SELECT 'After Update - Accounts Currency:' as step;
SELECT
  o.name as organization_name,
  o.currency as org_currency,
  COUNT(a.id) as total_accounts,
  COUNT(CASE WHEN a.currency_code = o.currency THEN 1 END) as matching_accounts
FROM public.accounts a
JOIN public.organizations o ON a.organization_id = o.id
GROUP BY o.name, o.currency;
