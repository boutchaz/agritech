/*
  # Add Soil Analysis Tables

  1. New Tables
    - soil_analyses: Stores detailed soil analysis data
    - soil_recommendations: Stores recommendations based on soil analysis

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create soil_analyses table
CREATE TABLE IF NOT EXISTS soil_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parcel_id uuid REFERENCES parcels(id),
  analysis_date date NOT NULL DEFAULT CURRENT_DATE,
  physical jsonb NOT NULL,
  chemical jsonb NOT NULL,
  biological jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create soil_recommendations table
CREATE TABLE IF NOT EXISTS soil_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid REFERENCES soil_analyses(id),
  recommendation text NOT NULL,
  priority text NOT NULL CHECK (priority IN ('high', 'medium', 'low')),
  category text NOT NULL CHECK (category IN ('amendment', 'fertilization', 'biological', 'management')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE soil_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE soil_recommendations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage soil analyses for their parcels"
  ON soil_analyses FOR ALL
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

CREATE POLICY "Users can manage soil recommendations for their analyses"
  ON soil_recommendations FOR ALL
  TO authenticated
  USING (
    analysis_id IN (
      SELECT sa.id 
      FROM soil_analyses sa
      JOIN parcels p ON sa.parcel_id = p.id
      JOIN crops c ON p.crop_id = c.id
      JOIN farms f ON c.farm_id = f.id
      WHERE f.user_id = auth.uid()
    )
  )
  WITH CHECK (
    analysis_id IN (
      SELECT sa.id 
      FROM soil_analyses sa
      JOIN parcels p ON sa.parcel_id = p.id
      JOIN crops c ON p.crop_id = c.id
      JOIN farms f ON c.farm_id = f.id
      WHERE f.user_id = auth.uid()
    )
  );

-- Add triggers for updating timestamps
CREATE TRIGGER update_soil_analyses_updated_at
    BEFORE UPDATE ON soil_analyses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_soil_recommendations_updated_at
    BEFORE UPDATE ON soil_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();