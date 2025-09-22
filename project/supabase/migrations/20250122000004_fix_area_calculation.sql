-- Fix area calculation for EPSG:3857 coordinates
-- Replace the existing area calculation function to handle Web Mercator coordinates

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
  first_coord_x numeric;
  first_coord_y numeric;
BEGIN
  -- Only calculate if boundary exists
  IF NEW.boundary IS NOT NULL THEN
    points_count := jsonb_array_length(NEW.boundary);

    -- Get first coordinate to detect coordinate system
    first_coord_x := (NEW.boundary->0->0)::numeric;
    first_coord_y := (NEW.boundary->0->1)::numeric;

    -- Use Shoelace formula to calculate area
    FOR i IN 0..(points_count - 2) LOOP
      x1 := (NEW.boundary->i->0)::numeric;
      y1 := (NEW.boundary->i->1)::numeric;
      x2 := (NEW.boundary->(i+1)->0)::numeric;
      y2 := (NEW.boundary->(i+1)->1)::numeric;

      area_sum := area_sum + (x1 * y2 - x2 * y1);
    END LOOP;

    -- Check if coordinates are in EPSG:3857 (Web Mercator) or geographic
    IF ABS(first_coord_x) > 20000 OR ABS(first_coord_y) > 20000 THEN
      -- Coordinates are in EPSG:3857 (meters), convert directly to hectares
      NEW.calculated_area := ABS(area_sum / 2) / 10000;
    ELSE
      -- Coordinates are geographic (degrees), use the old conversion
      NEW.calculated_area := ABS(area_sum / 2) * 111.32 * 111.32 / 10000;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update any existing parcels with boundaries to recalculate their areas
UPDATE parcels
SET calculated_area = NULL
WHERE boundary IS NOT NULL;

-- Trigger an update to recalculate all areas
UPDATE parcels
SET boundary = boundary
WHERE boundary IS NOT NULL;