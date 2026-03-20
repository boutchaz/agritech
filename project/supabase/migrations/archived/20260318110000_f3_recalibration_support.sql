ALTER TABLE IF EXISTS public.calibrations
  ADD COLUMN IF NOT EXISTS previous_baseline JSONB,
  ADD COLUMN IF NOT EXISTS campaign_bilan JSONB;

COMMENT ON COLUMN public.calibrations.previous_baseline IS
  'Snapshot of validated baseline prior to F3 recalibration';
COMMENT ON COLUMN public.calibrations.campaign_bilan IS
  'Computed post-campaign comparison payload used by F3 flow';

ALTER TABLE IF EXISTS public.parcels
  ADD COLUMN IF NOT EXISTS f3_trigger_config JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.parcels.f3_trigger_config IS
  'Per-parcel F3 trigger settings (month/day threshold, snooze settings, custom rules)';
