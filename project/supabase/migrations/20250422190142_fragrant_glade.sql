/*
  # Add product purchases tracking

  1. New Tables
    - `purchases`: Track product purchases and stock updates
      - `id` (uuid, primary key)
      - `product_id` (uuid) - References inventory table
      - `quantity` (numeric)
      - `price_per_unit` (numeric)
      - `total_price` (numeric)
      - `purchase_date` (date)
      - `supplier` (text)
      - `notes` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Changes to existing tables
    - Add `price_per_unit` to inventory table
    - Add `last_purchase_date` to inventory table

  3. Security
    - Enable RLS on purchases table
    - Add policies for authenticated users
*/

-- Add new columns to inventory table
ALTER TABLE inventory
ADD COLUMN IF NOT EXISTS price_per_unit numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_purchase_date date;

-- Create purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES inventory(id),
  quantity numeric NOT NULL,
  price_per_unit numeric NOT NULL,
  total_price numeric NOT NULL,
  purchase_date date NOT NULL,
  supplier text NOT NULL,
  notes text,
  farm_id uuid NOT NULL REFERENCES farms(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage purchases for their farms"
  ON purchases FOR ALL
  TO authenticated
  USING (
    farm_id IN (
      SELECT id FROM farms
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    farm_id IN (
      SELECT id FROM farms
      WHERE user_id = auth.uid()
    )
  );

-- Add trigger for updating timestamps
CREATE TRIGGER update_purchases_updated_at
    BEFORE UPDATE ON purchases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();