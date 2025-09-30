-- Add currency field to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR' CHECK (currency IN ('EUR', 'USD', 'GBP', 'MAD', 'TND', 'DZD', 'XOF', 'XAF'));

-- Add currency symbol for display
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS currency_symbol TEXT DEFAULT '€';

-- Create index for currency lookups
CREATE INDEX IF NOT EXISTS idx_organizations_currency ON public.organizations(currency);

-- Update existing organizations to have default currency
UPDATE public.organizations
SET currency = 'EUR', currency_symbol = '€'
WHERE currency IS NULL;

COMMENT ON COLUMN public.organizations.currency IS 'ISO 4217 currency code (e.g., EUR, USD, MAD)';
COMMENT ON COLUMN public.organizations.currency_symbol IS 'Currency symbol for display (e.g., €, $, DH)';

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';