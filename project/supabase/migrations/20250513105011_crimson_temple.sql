/*
  # Fix Day Laborers RLS Policy

  1. Changes
    - Drop existing RLS policy for day_laborers table
    - Create new comprehensive RLS policy that properly handles all operations
    - Ensure policy checks user ownership through the farm relationship
    - Fix issue with insert operations being blocked

  2. Security
    - Enable RLS on day_laborers table
    - Add policy for all operations (SELECT, INSERT, UPDATE, DELETE)
    - Verify user ownership through farm relationship
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can manage their day laborers" ON day_laborers;

-- Temporarily disable RLS to allow policy changes
ALTER TABLE day_laborers DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE day_laborers ENABLE ROW LEVEL SECURITY;

-- Create new comprehensive policy
CREATE POLICY "Users can manage their own day laborers"
ON day_laborers
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