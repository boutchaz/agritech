/*
  # Add parcels table and relations

  1. New Tables
    - `parcels`
      - `id` (uuid, primary key)
      - `name` (text)
      - `boundary` (jsonb) - Stores the parcel boundary coordinates
      - `crop_id` (uuid) - References the crops table
      - `soil_type` (text)
      - `area` (numeric) - Size in hectares
      - `planting_density` (integer) - Trees per hectare
      - `irrigation_type` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on parcels table
    - Add policy for authenticated users to manage their parcels

  3. Relations
    - Link parcels to crops table
*/

CREATE TABLE IF NOT EXISTS parcels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  boundary jsonb NOT NULL,
  crop_id uuid REFERENCES crops(id),
  soil_type text,
  area numeric,
  planting_density integer,
  irrigation_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE parcels ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage their parcels"
  ON parcels FOR ALL
  TO authenticated
  USING (
    crop_id IN (
      SELECT c.id 
      FROM crops c
      JOIN farms f ON c.farm_id = f.id
      WHERE f.user_id = auth.uid()
    )
  )
  WITH CHECK (
    crop_id IN (
      SELECT c.id 
      FROM crops c
      JOIN farms f ON c.farm_id = f.id
      WHERE f.user_id = auth.uid()
    )
  );

-- Add trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_parcels_updated_at
    BEFORE UPDATE ON parcels
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();