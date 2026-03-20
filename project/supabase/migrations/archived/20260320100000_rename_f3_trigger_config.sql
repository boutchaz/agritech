-- Rename f3-prefixed columns to use functional naming
-- Aligns DB column names with application code after F1/F2/F3 → full/partial/annual rename

ALTER TABLE IF EXISTS public.parcels
  RENAME COLUMN f3_trigger_config TO annual_trigger_config;

COMMENT ON COLUMN public.parcels.annual_trigger_config IS
  'Per-parcel annual recalibration trigger settings (month/day threshold, snooze settings, custom rules)';

ALTER TABLE IF EXISTS public.suivis_saison
  RENAME COLUMN recalibrage_f3_id TO recalibrage_annual_id;
