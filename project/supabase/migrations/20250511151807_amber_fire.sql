/*
  # Add Infrastructure and Machinery Management

  1. New Tables
    - `structures`: Store farm structures like stables, technical rooms, etc.
    - `machinery`: Store farm machinery and equipment
    - `maintenance_history`: Track maintenance for both structures and machinery

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create structures table
CREATE TABLE structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES farms(id) NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  location jsonb NOT NULL,
  installation_date date NOT NULL,
  condition text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create machinery table
CREATE TABLE machinery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES farms(id) NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  purchase_date date NOT NULL,
  operating_hours numeric DEFAULT 0,
  last_maintenance date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create maintenance_history table
CREATE TABLE maintenance_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES farms(id) NOT NULL,
  resource_id uuid NOT NULL,
  resource_type text NOT NULL CHECK (resource_type IN ('structure', 'machinery')),
  maintenance_date date NOT NULL,
  maintenance_type text NOT NULL,
  description text,
  cost numeric,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE machinery ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_history ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own structures"
  ON structures
  FOR ALL
  TO authenticated
  USING (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()))
  WITH CHECK (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their own machinery"
  ON machinery
  FOR ALL
  TO authenticated
  USING (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()))
  WITH CHECK (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their own maintenance history"
  ON maintenance_history
  FOR ALL
  TO authenticated
  USING (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()))
  WITH CHECK (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()));

-- Add triggers for updating timestamps
CREATE TRIGGER update_structures_updated_at
    BEFORE UPDATE ON structures
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_machinery_updated_at
    BEFORE UPDATE ON machinery
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_maintenance_history_updated_at
    BEFORE UPDATE ON maintenance_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();