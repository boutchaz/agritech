-- Migration: Add enhanced parcel planting system fields
-- Description: Adds crop_category, crop_type, planting_system, spacing, and density fields
--              to support comprehensive planting data for different crop types
-- Date: 2025-02-03

-- Add crop category to distinguish between trees, cereals, vegetables, and other
ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS crop_category TEXT CHECK (crop_category IN ('trees', 'cereals', 'vegetables', 'other'));

-- Add crop type (e.g., Olivier, Blé dur, Tomate)
ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS crop_type TEXT;

-- Add planting system type (e.g., Super intensif, Intensif, Traditionnel)
ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS planting_system TEXT;

-- Add spacing information (e.g., "4x1.5" for row x tree spacing)
ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS spacing TEXT;

-- Add planting density (plants/trees per hectare)
ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS density_per_hectare NUMERIC(10,2);

-- Add planting year
ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS planting_year INTEGER;

-- Add plant_count (general term for tree_count, plant_count, etc.)
ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS plant_count INTEGER;

-- Add rootstock for grafted trees
ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS rootstock TEXT;

-- Add tree_type and tree_count for backward compatibility
ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS tree_type TEXT;

ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS tree_count INTEGER;

-- Add check constraint for plant_count (must be positive)
ALTER TABLE parcels
  DROP CONSTRAINT IF EXISTS parcels_plant_count_check;
ALTER TABLE parcels
  ADD CONSTRAINT parcels_plant_count_check
  CHECK (plant_count IS NULL OR plant_count > 0);

-- Add check constraint for tree_count (must be positive)
ALTER TABLE parcels
  DROP CONSTRAINT IF EXISTS parcels_tree_count_check;
ALTER TABLE parcels
  ADD CONSTRAINT parcels_tree_count_check
  CHECK (tree_count IS NULL OR tree_count > 0);

-- Add check constraint for density_per_hectare (must be positive)
ALTER TABLE parcels
  DROP CONSTRAINT IF EXISTS parcels_density_per_hectare_check;
ALTER TABLE parcels
  ADD CONSTRAINT parcels_density_per_hectare_check
  CHECK (density_per_hectare IS NULL OR density_per_hectare > 0);

-- Add/Update planting_year check constraint
ALTER TABLE parcels
  DROP CONSTRAINT IF EXISTS parcels_planting_year_check;
ALTER TABLE parcels
  ADD CONSTRAINT parcels_planting_year_check
  CHECK (
    planting_year IS NULL OR
    (planting_year >= 1900 AND planting_year <= EXTRACT(YEAR FROM CURRENT_DATE) + 10)
  );

-- Add comments for documentation
COMMENT ON COLUMN parcels.crop_category IS 'Main category: trees, cereals, vegetables, or other';
COMMENT ON COLUMN parcels.crop_type IS 'Specific crop type (e.g., Olivier, Blé dur, Tomate, etc.)';
COMMENT ON COLUMN parcels.variety IS 'Specific variety/cultivar (e.g., Arbequine, Menara, Durum wheat)';
COMMENT ON COLUMN parcels.planting_system IS 'Planting system type (e.g., Super intensif, Intensif, Semi-intensif, Traditionnel)';
COMMENT ON COLUMN parcels.spacing IS 'Plant spacing in format "row_spacing x plant_spacing" (e.g., "4x1.5" meters)';
COMMENT ON COLUMN parcels.density_per_hectare IS 'Number of plants/trees per hectare based on planting system';
COMMENT ON COLUMN parcels.planting_date IS 'Actual planting or transplanting date';
COMMENT ON COLUMN parcels.plant_count IS 'Total number of plants/trees in this parcel (calculated as area * density)';
COMMENT ON COLUMN parcels.planting_year IS 'Year trees/plants were planted (for age tracking)';
COMMENT ON COLUMN parcels.rootstock IS 'Rootstock variety for grafted trees (e.g., GF677 for stone fruit)';
COMMENT ON COLUMN parcels.tree_type IS 'Type of tree (for backward compatibility with tree_type field)';
COMMENT ON COLUMN parcels.tree_count IS 'Number of trees (for backward compatibility)';

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_parcels_crop_category ON parcels(crop_category) WHERE crop_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parcels_crop_type ON parcels(crop_type) WHERE crop_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parcels_variety ON parcels(variety) WHERE variety IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parcels_planting_system ON parcels(planting_system) WHERE planting_system IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_parcels_planting_date ON parcels(planting_date) WHERE planting_date IS NOT NULL;

-- Create function to auto-calculate plant_count from area and density
CREATE OR REPLACE FUNCTION calculate_plant_count()
RETURNS TRIGGER AS $$
BEGIN
  -- If area and density are both set, auto-calculate plant_count
  IF NEW.area IS NOT NULL AND NEW.density_per_hectare IS NOT NULL THEN
    NEW.plant_count := ROUND(NEW.area * NEW.density_per_hectare);
  END IF;

  -- Sync tree_count with plant_count if crop_category is trees
  IF NEW.crop_category = 'trees' AND NEW.plant_count IS NOT NULL THEN
    NEW.tree_count := NEW.plant_count;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate plant_count on insert/update
DROP TRIGGER IF EXISTS trigger_calculate_plant_count ON parcels;
CREATE TRIGGER trigger_calculate_plant_count
  BEFORE INSERT OR UPDATE OF area, density_per_hectare, crop_category
  ON parcels
  FOR EACH ROW
  EXECUTE FUNCTION calculate_plant_count();
