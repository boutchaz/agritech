/*
  # Add notes column to soil_analyses table

  1. Changes
    - Add 'notes' column to soil_analyses table
      - Type: text
      - Nullable: true (optional field)
      - No default value

  2. Security
    - No changes to RLS policies needed as the existing policies will cover the new column
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'soil_analyses' AND column_name = 'notes'
  ) THEN
    ALTER TABLE soil_analyses ADD COLUMN notes text;
  END IF;
END $$;