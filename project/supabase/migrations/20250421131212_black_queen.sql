/*
  # Update soil analyses table schema

  1. Changes
    - Drop existing soil_analyses table
    - Create new soil_analyses table with correct columns
    - Recreate RLS policy
*/

-- Drop existing table and policies
DROP TABLE IF EXISTS soil_analyses CASCADE;

-- Create new soil_analyses table with correct schema
CREATE TABLE soil_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id uuid REFERENCES parcels(id),
  analysis_date date NOT NULL DEFAULT CURRENT_DATE,
  physical jsonb NOT NULL,
  chemical jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE soil_analyses ENABLE ROW LEVEL SECURITY;

-- Create consolidated RLS policy
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

-- Add trigger for updating timestamps
CREATE TRIGGER update_soil_analyses_updated_at
    BEFORE UPDATE ON soil_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();