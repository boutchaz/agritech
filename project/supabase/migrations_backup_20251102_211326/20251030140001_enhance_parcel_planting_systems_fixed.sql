-- Migration: Enhance parcel planting systems for trees, cereals, and vegetables (FIXED)
-- Description: Adds crop_category, variety, planting_system, spacing, and density fields
--              to support comprehensive planting data for different crop types
-- Date: 2025-10-30

-- Add crop category to distinguish between trees, cereals, and vegetables
ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS crop_category TEXT CHECK (crop_category IN ('trees', 'cereals', 'vegetables', 'other'));

-- variety and planting_date already exist in initial schema, skip if present
-- ADD COLUMN IF NOT EXISTS variety TEXT; -- Already exists
-- ADD COLUMN IF NOT EXISTS planting_date DATE; -- Already exists

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

-- Add check constraint for plant_count (must be positive)
ALTER TABLE parcels
  DROP CONSTRAINT IF EXISTS parcels_plant_count_check;
ALTER TABLE parcels
  ADD CONSTRAINT parcels_plant_count_check
  CHECK (plant_count IS NULL OR plant_count > 0);

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
COMMENT ON COLUMN parcels.variety IS 'Specific variety/cultivar (e.g., Arbequine, Menara, Durum wheat)';
COMMENT ON COLUMN parcels.planting_system IS 'Planting system type (e.g., Super intensif, Intensif, Semi-intensif, Traditionnel)';
COMMENT ON COLUMN parcels.spacing IS 'Plant spacing in format "row_spacing x plant_spacing" (e.g., "4x1.5" meters)';
COMMENT ON COLUMN parcels.density_per_hectare IS 'Number of plants/trees per hectare based on planting system';
COMMENT ON COLUMN parcels.planting_date IS 'Actual planting or transplanting date';
COMMENT ON COLUMN parcels.plant_count IS 'Total number of plants/trees in this parcel (calculated as area * density)';
COMMENT ON COLUMN parcels.planting_year IS 'Year trees/plants were planted (for age tracking)';
COMMENT ON COLUMN parcels.rootstock IS 'Rootstock variety for grafted trees (e.g., GF677 for stone fruit)';

-- Create indexes for efficient filtering
CREATE INDEX IF NOT EXISTS idx_parcels_crop_category ON parcels(crop_category) WHERE crop_category IS NOT NULL;
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate plant_count on insert/update
DROP TRIGGER IF EXISTS trigger_calculate_plant_count ON parcels;
CREATE TRIGGER trigger_calculate_plant_count
  BEFORE INSERT OR UPDATE OF area, density_per_hectare
  ON parcels
  FOR EACH ROW
  EXECUTE FUNCTION calculate_plant_count();

-- Create function to get planting system recommendations
CREATE OR REPLACE FUNCTION get_planting_system_recommendations(
  p_crop_category TEXT,
  p_crop_type TEXT DEFAULT NULL
)
RETURNS TABLE(
  system_type TEXT,
  spacing TEXT,
  density_per_hectare INTEGER,
  description TEXT
) AS $$
BEGIN
  IF p_crop_category = 'trees' THEN
    RETURN QUERY
    SELECT
      'Super intensif'::TEXT, '4x1,5'::TEXT, 1666, 'High-density modern orchard system'::TEXT
    UNION ALL
    SELECT 'Super intensif'::TEXT, '3x1,5'::TEXT, 2222, 'Ultra high-density system'::TEXT
    UNION ALL
    SELECT 'Intensif'::TEXT, '4x2'::TEXT, 1250, 'Intensive orchard system'::TEXT
    UNION ALL
    SELECT 'Intensif'::TEXT, '3x2'::TEXT, 1666, 'Intensive compact system'::TEXT
    UNION ALL
    SELECT 'Semi-intensif'::TEXT, '6x3'::TEXT, 555, 'Semi-intensive traditional-modern hybrid'::TEXT
    UNION ALL
    SELECT 'Traditionnel amélioré'::TEXT, '6x6'::TEXT, 277, 'Improved traditional spacing'::TEXT
    UNION ALL
    SELECT 'Traditionnel'::TEXT, '8x8'::TEXT, 156, 'Traditional wide spacing'::TEXT
    UNION ALL
    SELECT 'Traditionnel'::TEXT, '8x7'::TEXT, 179, 'Traditional standard spacing'::TEXT
    UNION ALL
    SELECT 'Traditionnel très espacé'::TEXT, '10x10'::TEXT, 100, 'Very wide traditional spacing'::TEXT;

  ELSIF p_crop_category = 'cereals' THEN
    RETURN QUERY
    SELECT
      'Densité standard'::TEXT, 'Semis en ligne'::TEXT, 3000000, 'Standard cereal seeding density (300-400 kg/ha)'::TEXT
    UNION ALL
    SELECT 'Densité réduite'::TEXT, 'Semis espacé'::TEXT, 2000000, 'Reduced density for organic farming'::TEXT
    UNION ALL
    SELECT 'Densité élevée'::TEXT, 'Semis dense'::TEXT, 4000000, 'High density for irrigation'::TEXT;

  ELSIF p_crop_category = 'vegetables' THEN
    RETURN QUERY
    SELECT
      'Pleine terre - rangées simples'::TEXT, '0.8x0.3'::TEXT, 41666, 'Field rows for tomatoes, peppers'::TEXT
    UNION ALL
    SELECT 'Pleine terre - rangées doubles'::TEXT, '1.5x0.4'::TEXT, 33333, 'Double row system'::TEXT
    UNION ALL
    SELECT 'Sous serre'::TEXT, '1.2x0.4'::TEXT, 41666, 'Greenhouse intensive cultivation'::TEXT
    UNION ALL
    SELECT 'Semis dense'::TEXT, 'À la volée'::TEXT, 500000, 'Dense seeding for leafy vegetables'::TEXT;

  ELSE
    RETURN QUERY
    SELECT
      'Custom'::TEXT, 'Variable'::TEXT, 0, 'Custom planting system'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add sample usage comment
COMMENT ON FUNCTION get_planting_system_recommendations IS 'Get recommended planting systems based on crop category. Usage: SELECT * FROM get_planting_system_recommendations(''trees'')';
