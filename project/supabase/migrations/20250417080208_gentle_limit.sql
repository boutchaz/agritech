/*
  # Add Soil Test Types and Update Soil Analyses

  1. New Tables
    - `soil_test_types`: Types d'analyses de sol disponibles
    - Mise à jour de la table `soil_analyses` existante

  2. Security
    - Enable RLS on soil_test_types
    - Add policy for authenticated users
*/

-- Create soil_test_types table
CREATE TABLE IF NOT EXISTS soil_test_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add test_type_id to existing soil_analyses table
ALTER TABLE soil_analyses 
  ADD COLUMN IF NOT EXISTS test_type_id uuid REFERENCES soil_test_types(id),
  ADD COLUMN IF NOT EXISTS notes text;

-- Enable RLS
ALTER TABLE soil_test_types ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Allow read access for authenticated users on soil_test_types"
  ON soil_test_types FOR SELECT
  TO authenticated
  USING (true);

-- Insert default test types
INSERT INTO soil_test_types (name, code, description) VALUES
  ('Analyse de base', 'basic', 'Analyse standard incluant texture, pH, matière organique, phosphore et potassium'),
  ('Analyse complète', 'complete', 'Analyse approfondie incluant tous les paramètres de base plus azote et autres éléments'),
  ('Analyse spécialisée arboriculture', 'specialized', 'Analyse adaptée aux besoins spécifiques des cultures arboricoles');