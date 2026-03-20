ALTER TABLE IF EXISTS parcels ADD COLUMN IF NOT EXISTS water_source TEXT;

COMMENT ON COLUMN parcels.water_source IS 'Water source key: well, dam, canal, municipal, mixed, other';
