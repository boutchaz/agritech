-- Add boundary column to parcels table for storing polygon data
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS boundary jsonb;

-- Add calculated_area column for storing auto-calculated area
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS calculated_area numeric(10,2);

-- Add perimeter column for storing auto-calculated perimeter
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS perimeter numeric(10,2);

-- Add crop_id column for associating parcels with crops
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS crop_id uuid;

-- Add foreign key constraint for crop_id
ALTER TABLE parcels
  ADD CONSTRAINT fk_parcels_crop
  FOREIGN KEY (crop_id)
  REFERENCES crops(id)
  ON DELETE SET NULL;

-- Create index on crop_id for better query performance
CREATE INDEX IF NOT EXISTS idx_parcels_crop_id ON parcels(crop_id);

-- Add columns for agricultural details
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS soil_type text;
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS planting_density numeric(10,2);
ALTER TABLE parcels ADD COLUMN IF NOT EXISTS irrigation_type text;

-- Add check constraint for area
ALTER TABLE parcels ADD CONSTRAINT check_area_positive CHECK (area >= 0);
ALTER TABLE parcels ADD CONSTRAINT check_calculated_area_positive CHECK (calculated_area >= 0);
ALTER TABLE parcels ADD CONSTRAINT check_perimeter_positive CHECK (perimeter >= 0);

-- Create a function to validate polygon boundary
CREATE OR REPLACE FUNCTION validate_parcel_boundary()
RETURNS trigger AS $$
BEGIN
  -- Check if boundary is not null and is an array
  IF NEW.boundary IS NOT NULL THEN
    -- Ensure boundary is an array with at least 3 points
    IF jsonb_array_length(NEW.boundary) < 3 THEN
      RAISE EXCEPTION 'Parcel boundary must have at least 3 points';
    END IF;

    -- Check if first and last points are the same (closed polygon)
    IF NEW.boundary->0 != NEW.boundary->(jsonb_array_length(NEW.boundary)-1) THEN
      -- Auto-close the polygon by adding the first point at the end
      NEW.boundary = NEW.boundary || jsonb_build_array(NEW.boundary->0);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to validate boundary on insert or update
DROP TRIGGER IF EXISTS validate_parcel_boundary_trigger ON parcels;
CREATE TRIGGER validate_parcel_boundary_trigger
  BEFORE INSERT OR UPDATE OF boundary
  ON parcels
  FOR EACH ROW
  EXECUTE FUNCTION validate_parcel_boundary();

-- Create a function to calculate area from boundary
CREATE OR REPLACE FUNCTION calculate_parcel_area_from_boundary()
RETURNS trigger AS $$
DECLARE
  i integer;
  area_sum numeric := 0;
  x1 numeric;
  y1 numeric;
  x2 numeric;
  y2 numeric;
  points_count integer;
BEGIN
  -- Only calculate if boundary exists
  IF NEW.boundary IS NOT NULL THEN
    points_count := jsonb_array_length(NEW.boundary);

    -- Use Shoelace formula to calculate area
    FOR i IN 0..(points_count - 2) LOOP
      x1 := (NEW.boundary->i->0)::numeric;
      y1 := (NEW.boundary->i->1)::numeric;
      x2 := (NEW.boundary->(i+1)->0)::numeric;
      y2 := (NEW.boundary->(i+1)->1)::numeric;

      area_sum := area_sum + (x1 * y2 - x2 * y1);
    END LOOP;

    -- Convert to hectares (assuming coordinates are in degrees)
    -- This is a simplified calculation - in production, use PostGIS for accurate area calculation
    NEW.calculated_area := ABS(area_sum / 2) * 111.32 * 111.32 / 10000;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-calculate area
DROP TRIGGER IF EXISTS calculate_parcel_area_trigger ON parcels;
CREATE TRIGGER calculate_parcel_area_trigger
  BEFORE INSERT OR UPDATE OF boundary
  ON parcels
  FOR EACH ROW
  EXECUTE FUNCTION calculate_parcel_area_from_boundary();

-- Add comment to table
COMMENT ON COLUMN parcels.boundary IS 'GeoJSON-like array of coordinates defining the parcel boundary polygon';
COMMENT ON COLUMN parcels.calculated_area IS 'Auto-calculated area in hectares from boundary polygon';
COMMENT ON COLUMN parcels.perimeter IS 'Auto-calculated perimeter in meters from boundary polygon';
COMMENT ON COLUMN parcels.soil_type IS 'Type of soil in the parcel';
COMMENT ON COLUMN parcels.planting_density IS 'Number of plants/trees per hectare';
COMMENT ON COLUMN parcels.irrigation_type IS 'Type of irrigation system used';