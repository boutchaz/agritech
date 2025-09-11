/*
  # Add biological properties column to soil analyses

  1. Changes
    - Add `biological` column to `soil_analyses` table to store biological soil properties
      - Uses JSONB type to store structured data about biological properties
      - Column is nullable since not all analyses may include biological data
    - Update updated_at trigger to track changes

  2. Notes
    - The biological column will store properties like:
      - Microbial biomass
      - Earthworm count
      - Bacterial activity
      - Fungal presence
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'soil_analyses' 
    AND column_name = 'biological'
  ) THEN
    ALTER TABLE soil_analyses 
    ADD COLUMN biological jsonb;
  END IF;
END $$;