UPDATE calibrations SET mode_calibrage = 'full' WHERE mode_calibrage = 'F1';
UPDATE calibrations SET mode_calibrage = 'partial' WHERE mode_calibrage = 'F2';
UPDATE calibrations SET mode_calibrage = 'annual' WHERE mode_calibrage = 'F3';

ALTER TABLE calibrations ALTER COLUMN mode_calibrage SET DEFAULT 'full';

COMMENT ON COLUMN calibrations.mode_calibrage IS 'Calibration mode: full (initial), partial (block-update recalibration), annual (post-campaign recalibration)';
