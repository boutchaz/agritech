-- Drop the strict status check constraint on calibrations
-- Status validation is enforced in application code instead
ALTER TABLE public.calibrations DROP CONSTRAINT IF EXISTS calibrations_status_check;

-- Drop the strict zone_classification check constraint
-- The column now stores free-form text set by the calibration service
ALTER TABLE public.calibrations DROP CONSTRAINT IF EXISTS calibrations_zone_classification_check;

-- Change zone_classification to JSONB to match application usage
ALTER TABLE public.calibrations
  ALTER COLUMN zone_classification TYPE JSONB USING
    CASE
      WHEN zone_classification IS NULL THEN NULL
      ELSE to_jsonb(zone_classification)
    END;
