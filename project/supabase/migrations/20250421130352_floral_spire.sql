/*
  # Update soil analyses RLS policies

  1. Changes
    - Drop existing RLS policies for soil_analyses table
    - Create new comprehensive RLS policies that properly handle all operations
    - Ensure proper access control based on farm ownership

  2. Security
    - Enable RLS on soil_analyses table
    - Add policies for:
      - SELECT: Users can read soil analyses for their farms' parcels
      - INSERT: Users can create soil analyses for their farms' parcels
      - UPDATE: Users can update soil analyses for their farms' parcels
      - DELETE: Users can delete soil analyses for their farms' parcels
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read for users own soil analyses" ON soil_analyses;
DROP POLICY IF EXISTS "Enable insert for users own parcels" ON soil_analyses;
DROP POLICY IF EXISTS "Enable update for users own soil analyses" ON soil_analyses;
DROP POLICY IF EXISTS "Enable delete for users own soil analyses" ON soil_analyses;

-- Create new comprehensive policies
CREATE POLICY "Enable read access for users own soil analyses"
ON soil_analyses FOR SELECT
TO authenticated
USING (
  parcel_id IN (
    SELECT p.id 
    FROM parcels p
    JOIN crops c ON p.crop_id = c.id
    JOIN farms f ON c.farm_id = f.id
    WHERE f.user_id = auth.uid()
  )
);

CREATE POLICY "Enable insert access for users own soil analyses"
ON soil_analyses FOR INSERT
TO authenticated
WITH CHECK (
  parcel_id IN (
    SELECT p.id 
    FROM parcels p
    JOIN crops c ON p.crop_id = c.id
    JOIN farms f ON c.farm_id = f.id
    WHERE f.user_id = auth.uid()
  )
);

CREATE POLICY "Enable update access for users own soil analyses"
ON soil_analyses FOR UPDATE
TO authenticated
USING (
  parcel_id IN (
    SELECT p.id 
    FROM parcels p
    JOIN crops c ON p.crop_id = c.id
    JOIN farms f ON c.farm_id = f.id
    WHERE f.user_id = auth.uid()
  )
)
WITH CHECK (
  parcel_id IN (
    SELECT p.id 
    FROM parcels p
    JOIN crops c ON p.crop_id = c.id
    JOIN farms f ON c.farm_id = f.id
    WHERE f.user_id = auth.uid()
  )
);

CREATE POLICY "Enable delete access for users own soil analyses"
ON soil_analyses FOR DELETE
TO authenticated
USING (
  parcel_id IN (
    SELECT p.id 
    FROM parcels p
    JOIN crops c ON p.crop_id = c.id
    JOIN farms f ON c.farm_id = f.id
    WHERE f.user_id = auth.uid()
  )
);