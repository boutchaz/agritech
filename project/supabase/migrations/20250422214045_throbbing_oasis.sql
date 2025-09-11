/*
  # Fix Product Applications RLS Policy

  1. Changes
    - Drop existing RLS policy for product_applications table
    - Create new comprehensive RLS policy that properly handles all operations
    - Ensure policy checks user ownership through the farm relationship
    - Fix issue with insert operations being blocked

  2. Security
    - Enable RLS on product_applications table
    - Add policy for all operations (SELECT, INSERT, UPDATE, DELETE)
    - Verify user ownership through farm relationship
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage product applications for their farms" ON product_applications;

-- Create new comprehensive policy
CREATE POLICY "Users can manage product applications for their farms"
ON product_applications
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