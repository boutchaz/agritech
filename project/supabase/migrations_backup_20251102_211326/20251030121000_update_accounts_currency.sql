-- ============================================================================
-- Migration: Update Existing Accounts Currency to Match Organization
-- ============================================================================
-- Purpose: Update all accounts to use their organization's currency instead
--          of hardcoded EUR
-- ============================================================================

-- Update accounts to use their organization's currency
-- This ensures consistency between organization settings and account currency
UPDATE public.accounts a
SET currency_code = o.currency
FROM public.organizations o
WHERE a.organization_id = o.id
  AND a.currency_code != o.currency;

-- Add a comment explaining the currency field
COMMENT ON COLUMN public.accounts.currency_code IS
  'Currency code for this account. Should match the organization currency in most cases.';

-- Log the changes
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % accounts to match organization currency', updated_count;
END $$;
