/*
  # Add structure-specific fields

  1. Changes
    - Add structure_details JSONB column to store type-specific fields
    - Add structure_type enum with specific types
    - Add usage field for structure purpose
    
  2. Notes
    - Using JSONB for flexibility in storing different field sets per type
    - Each type will have its own schema validation
*/

-- Add structure_details column
ALTER TABLE structures
ADD COLUMN IF NOT EXISTS structure_details jsonb NOT NULL DEFAULT '{}';

-- Add usage column
ALTER TABLE structures
ADD COLUMN IF NOT EXISTS usage text;

-- Modify type column to use enum
ALTER TABLE structures
DROP CONSTRAINT IF EXISTS structures_type_check;

ALTER TABLE structures
ADD CONSTRAINT structures_type_check 
CHECK (type IN ('stable', 'technical_room', 'basin', 'well'));

-- Create function to validate structure details based on type
CREATE OR REPLACE FUNCTION validate_structure_details()
RETURNS TRIGGER AS $$
BEGIN
  CASE NEW.type
    WHEN 'stable' THEN
      IF NOT (
        NEW.structure_details ? 'width' AND
        NEW.structure_details ? 'length' AND
        NEW.structure_details ? 'height' AND
        NEW.structure_details ? 'construction_type'
      ) THEN
        RAISE EXCEPTION 'Stable must have width, length, height, and construction_type';
      END IF;
    
    WHEN 'basin' THEN
      IF NOT (
        NEW.structure_details ? 'shape' AND
        NEW.structure_details ? 'dimensions' AND
        NEW.structure_details ? 'volume'
      ) THEN
        RAISE EXCEPTION 'Basin must have shape, dimensions, and volume';
      END IF;
      
      IF NOT NEW.structure_details->>'shape' = ANY (ARRAY['trapezoidal', 'rectangular', 'cubic', 'circular']) THEN
        RAISE EXCEPTION 'Invalid basin shape';
      END IF;
    
    WHEN 'technical_room' THEN
      IF NOT (
        NEW.structure_details ? 'width' AND
        NEW.structure_details ? 'length' AND
        NEW.structure_details ? 'height' AND
        NEW.structure_details ? 'equipment'
      ) THEN
        RAISE EXCEPTION 'Technical room must have width, length, height, and equipment';
      END IF;
    
    WHEN 'well' THEN
      IF NOT (
        NEW.structure_details ? 'depth' AND
        NEW.structure_details ? 'condition' AND
        NEW.structure_details ? 'pump_type' AND
        NEW.structure_details ? 'pump_power'
      ) THEN
        RAISE EXCEPTION 'Well must have depth, condition, pump_type, and pump_power';
      END IF;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation
DROP TRIGGER IF EXISTS validate_structure_details_trigger ON structures;

CREATE TRIGGER validate_structure_details_trigger
  BEFORE INSERT OR UPDATE ON structures
  FOR EACH ROW
  EXECUTE FUNCTION validate_structure_details();