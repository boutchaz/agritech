/*
  # Add Product Applications Table

  1. New Tables
    - product_applications: Track product usage in fields
      - id (uuid)
      - product_id (uuid, references inventory)
      - farm_id (uuid, references farms)
      - application_date (date)
      - quantity_used (numeric)
      - area_treated (numeric)
      - notes (text)
      - created_at, updated_at (timestamps)

  2. Security
    - Enable RLS
    - Add policy for authenticated users
*/

-- Create product_applications table
CREATE TABLE IF NOT EXISTS product_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES inventory(id),
  farm_id uuid REFERENCES farms(id),
  application_date date NOT NULL,
  quantity_used numeric NOT NULL,
  area_treated numeric NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE product_applications ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage product applications for their farms"
ON product_applications
FOR ALL
TO authenticated
USING (
  farm_id IN (
    SELECT id
    FROM farms
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  farm_id IN (
    SELECT id
    FROM farms
    WHERE user_id = auth.uid()
  )
);

-- Add trigger for updating timestamps
CREATE TRIGGER update_product_applications_updated_at
    BEFORE UPDATE ON product_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to update inventory quantity after application
CREATE OR REPLACE FUNCTION update_inventory_after_application()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE inventory
  SET quantity = quantity - NEW.quantity_used
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_inventory_after_application
    AFTER INSERT ON product_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_inventory_after_application();