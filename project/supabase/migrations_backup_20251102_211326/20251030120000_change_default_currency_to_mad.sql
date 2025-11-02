-- ============================================================================
-- Migration: Change Default Currency from EUR to MAD
-- ============================================================================
-- Purpose: Make all currency defaults consistent with MAD for agricultural
--          platform primarily used in Morocco and surrounding regions
-- ============================================================================

-- Change default currency for organizations table
ALTER TABLE public.organizations
  ALTER COLUMN currency SET DEFAULT 'MAD',
  ALTER COLUMN currency_symbol SET DEFAULT 'د.م.';

-- Update existing organizations that have EUR to MAD (optional - be careful!)
-- Uncomment the following lines if you want to convert existing EUR organizations
-- UPDATE public.organizations
-- SET
--   currency = 'MAD',
--   currency_symbol = 'د.م.'
-- WHERE currency = 'EUR';

-- Add comment explaining the change
COMMENT ON COLUMN public.organizations.currency IS
  'Organization currency code (MAD, EUR, USD, GBP, TND, DZD, XOF, XAF). Defaults to MAD (Moroccan Dirham) for agricultural operations in Morocco and surrounding regions.';

COMMENT ON COLUMN public.organizations.currency_symbol IS
  'Currency symbol for display purposes. Defaults to MAD symbol (د.م.).';
