-- Add currency, timezone, and language fields to organizations table
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- Add comment to explain the fields
COMMENT ON COLUMN public.organizations.currency IS 'ISO 4217 currency code (e.g., EUR, USD, MAD, DH)';
COMMENT ON COLUMN public.organizations.timezone IS 'IANA timezone identifier (e.g., Europe/Paris, Africa/Casablanca)';
COMMENT ON COLUMN public.organizations.language IS 'ISO 639-1 language code (e.g., en, fr, ar)';

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';