/*
  # Update soil analyses RLS policies

  1. Changes
    - Drop existing RLS policies for soil_analyses table
    - Create new comprehensive RLS policies that properly handle all operations
    - Ensure proper validation of parcel ownership through farms hierarchy

  2. Security
    - Enable RLS on soil_analyses table
    - Add policies for:
      - SELECT: Users can read soil analyses for parcels in their farms
      - INSERT: Users can create soil analyses for parcels in their farms
      - UPDATE: Users can update soil analyses for parcels in their farms
      - DELETE: Users can delete soil analyses for parcels in their farms
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable read access for users own soil analyses" ON soil_analyses;
DROP POLICY IF EXISTS "Enable insert access for users own soil analyses" ON soil_analyses;
DROP POLICY IF EXISTS "Enable update access for users own soil analyses" ON soil_analyses;
DROP POLICY IF EXISTS "Enable delete access for users own soil analyses" ON soil_analyses;

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