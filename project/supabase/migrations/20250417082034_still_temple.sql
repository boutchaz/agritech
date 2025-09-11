/*
  # Fix soil analyses RLS policies

  1. Changes
    - Drop existing RLS policies for soil_analyses table
    - Create new comprehensive RLS policies that properly handle all operations
    
  2. Security
    - Enable RLS on soil_analyses table
    - Add policies for:
      - Inserting new soil analyses
      - Reading existing soil analyses
      - Updating soil analyses
      - Deleting soil analyses
    - All policies verify user ownership through farm association
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert soil analyses for their parcels" ON soil_analyses;
DROP POLICY IF EXISTS "Users can manage soil analyses for their parcels" ON soil_analyses;

-- Create new comprehensive policies
CREATE POLICY "Enable read access for users own soil analyses"
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

CREATE POLICY "Enable insert access for users own parcels"
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

CREATE POLICY "Enable update access for users own soil analyses"
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

CREATE POLICY "Enable delete access for users own soil analyses"
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