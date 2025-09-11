/*
  # Fix inventory table RLS policies

  1. Changes
    - Drop existing RLS policies for inventory table
    - Create new comprehensive RLS policy that properly handles all operations
    - Ensure policy checks user ownership through the farm relationship

  2. Security
    - Enable RLS on inventory table
    - Add policy for all operations (SELECT, INSERT, UPDATE, DELETE)
    - Verify user ownership through farm relationship
*/

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