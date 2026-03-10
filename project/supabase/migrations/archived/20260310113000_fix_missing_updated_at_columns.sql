-- Fix trigger failures ("record NEW has no field updated_at") on tables
-- that already use update_updated_at_column() triggers.

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.journal_entries
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

ALTER TABLE public.metayage_settlements
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.metayage_settlements
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;

ALTER TABLE public.biological_asset_valuations
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.biological_asset_valuations
SET updated_at = COALESCE(updated_at, created_at, NOW())
WHERE updated_at IS NULL;
