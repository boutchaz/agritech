/*
  # Fix inventory RLS and add farm_id

  1. Changes
    - Drop existing RLS policies for inventory table
    - Create new comprehensive RLS policy that properly handles all operations
    - Add farm_id to inventory table if not exists
    - Add foreign key constraint to farms table
*/

-- Add farm_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory' AND column_name = 'farm_id'
  ) THEN
    ALTER TABLE inventory 
    ADD COLUMN farm_id uuid REFERENCES farms(id);
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage inventory in their farms" ON inventory;

-- Create new comprehensive policy
CREATE POLICY "Users can manage inventory in their farms"
ON inventory
FOR ALL
TO authenticated
USING (
  farm_id IN (
    SELECT id
    FROM farms
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  farm_id IN (
    SELECT id
    FROM farms
    WHERE user_id = auth.uid()
  )
);