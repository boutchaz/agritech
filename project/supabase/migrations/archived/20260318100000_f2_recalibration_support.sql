ALTER TABLE IF EXISTS calibrations
  ADD COLUMN IF NOT EXISTS mode_calibrage TEXT DEFAULT 'F1';

ALTER TABLE IF EXISTS calibrations
  ADD COLUMN IF NOT EXISTS recalibration_motif TEXT;

ALTER TABLE IF EXISTS calibrations
  ADD COLUMN IF NOT EXISTS previous_baseline JSONB;

COMMENT ON COLUMN calibrations.mode_calibrage IS 'Calibration mode: F1 (initial), F2 (partial recalibration), F3 (annual recalibration)';
COMMENT ON COLUMN calibrations.recalibration_motif IS 'F2 recalibration motif';
COMMENT ON COLUMN calibrations.previous_baseline IS 'Previous calibration baseline snapshot used for F2 comparison';
