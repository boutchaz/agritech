/*
  # Add Utilities Management

  1. New Tables
    - `utilities`: Store utility charges like electricity, water, diesel, etc.
      - id (uuid)
      - farm_id (uuid)
      - type (text) - electricity, water, diesel, etc.
      - amount (numeric)
      - date (date)
      - notes (text)
      - created_at, updated_at (timestamps)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create utilities table
CREATE TABLE IF NOT EXISTS utilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid REFERENCES farms(id) NOT NULL,
  type text NOT NULL CHECK (type IN ('electricity', 'water', 'diesel', 'gas', 'internet', 'phone', 'other')),
  amount numeric NOT NULL,
  date date NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE utilities ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage their utilities"
  ON utilities
  FOR ALL
  TO authenticated
  USING (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()))
  WITH CHECK (farm_id IN (SELECT id FROM farms WHERE user_id = auth.uid()));

-- Add trigger for updating timestamps
CREATE TRIGGER update_utilities_updated_at
    BEFORE UPDATE ON utilities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();