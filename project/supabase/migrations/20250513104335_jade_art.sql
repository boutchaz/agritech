/*
  # Fix day laborers RLS policy

  1. Changes
    - Drop existing policy if it exists
    - Create new policy for day laborers table
    
  2. Security
    - Maintain RLS enabled
    - Ensure proper user access control through farm relationship
*/

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can manage their day laborers" ON day_laborers;

-- Enable RLS (idempotent)
ALTER TABLE day_laborers ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policy
CREATE POLICY "Users can manage their day laborers"
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