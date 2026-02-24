-- Add irrigation frequency and water quantity fields to parcels
ALTER TABLE IF EXISTS parcels ADD COLUMN IF NOT EXISTS irrigation_frequency TEXT;
ALTER TABLE IF EXISTS parcels ADD COLUMN IF NOT EXISTS water_quantity_per_session NUMERIC;
ALTER TABLE IF EXISTS parcels ADD COLUMN IF NOT EXISTS water_quantity_unit TEXT DEFAULT 'm3';

COMMENT ON COLUMN parcels.irrigation_frequency IS 'Irrigation frequency, e.g. 1x/week, 2x/week, 1x/month';
COMMENT ON COLUMN parcels.water_quantity_per_session IS 'Water quantity per irrigation session';
COMMENT ON COLUMN parcels.water_quantity_unit IS 'Unit for water quantity: m3, liters, etc.';
