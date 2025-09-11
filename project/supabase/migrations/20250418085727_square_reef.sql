/*
  # Fix soil analyses RLS policies

  1. Changes
    - Drop existing RLS policies for soil_analyses table
    - Create new policies with correct roles and conditions
    - Ensure authenticated users can:
      - Insert soil analyses for parcels they own
      - Read their own soil analyses
      - Update their own soil analyses
      - Delete their own soil analyses

  2. Security
    - Policies are scoped to authenticated users only
    - Access is restricted to soil analyses for parcels owned by the user
    - All operations verify ownership through the farm -> crop -> parcel chain
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable delete access for users own soil analyses" ON soil_analyses;
DROP POLICY IF EXISTS "Enable insert access for users own parcels" ON soil_analyses;
DROP POLICY IF EXISTS "Enable read access for users own soil analyses" ON soil_analyses;
DROP POLICY IF EXISTS "Enable update access for users own soil analyses" ON soil_analyses;

-- Create new policies with correct roles and conditions
CREATE POLICY "Enable insert for users own parcels"
ON soil_analyses
FOR INSERT
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

CREATE POLICY "Enable read for users own soil analyses"
ON soil_analyses
FOR SELECT
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

CREATE POLICY "Enable update for users own soil analyses"
ON soil_analyses
FOR UPDATE
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

CREATE POLICY "Enable delete for users own soil analyses"
ON soil_analyses
FOR DELETE
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