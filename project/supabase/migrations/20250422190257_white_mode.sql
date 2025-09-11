/*
  # Add supplier column to inventory table

  1. Changes
    - Add 'supplier' column to inventory table
      - Type: text
      - Nullable: true (to maintain compatibility with existing records)

  2. Notes
    - Uses IF NOT EXISTS to prevent errors if column already exists
    - Safe migration that won't affect existing data
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'inventory' 
    AND column_name = 'supplier'
  ) THEN
    ALTER TABLE inventory 
    ADD COLUMN supplier text;
  END IF;
END $$;