-- Make farm_id nullable in tasks table
-- This allows tasks to be created without requiring a farm_id

ALTER TABLE tasks ALTER COLUMN farm_id DROP NOT NULL;
ALTER TABLE tasks ALTER COLUMN parcel_id DROP NOT NULL;

-- Add comments
COMMENT ON COLUMN tasks.farm_id IS 'Reference to the farm where this task is performed (nullable)';
COMMENT ON COLUMN tasks.parcel_id IS 'Reference to the specific parcel within the farm (nullable)';
