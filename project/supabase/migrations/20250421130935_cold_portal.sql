/*
  # Fix RLS policies for soil analyses table

  1. Changes
    - Drop existing RLS policies for soil_analyses table
    - Create new consolidated RLS policy that properly handles all operations
    - Ensure policy checks user ownership through the parcel -> crop -> farm chain
  
  2. Security
    - Maintains RLS enabled on soil_analyses table
    - Creates single policy that handles all operations (SELECT, INSERT, UPDATE, DELETE)
    - Verifies user ownership through proper table relationships
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Enable delete access for users own soil analyses" ON soil_analyses;
DROP POLICY IF EXISTS "Enable insert access for users own soil analyses" ON soil_analyses;
DROP POLICY IF EXISTS "Enable read access for users own soil analyses" ON soil_analyses;
DROP POLICY IF EXISTS "Enable update access for users own soil analyses" ON soil_analyses;

-- Create new consolidated policy
CREATE POLICY "Users can manage their own soil analyses" ON soil_analyses
  FOR ALL
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