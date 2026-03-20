-- Add ai_observation_only flag to parcels table
-- When true, the operational engine generates diagnostics (as hypotheses)
-- but does NOT create alerts or recommendations.
-- Set when confidence < 25% during calibration validation.

ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS ai_observation_only BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN parcels.ai_observation_only IS
  'When true, parcel is in observation-only mode (confidence < 25%). '
  'Diagnostics are computed as hypotheses but no alerts or recommendations are generated.';
