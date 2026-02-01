-- Add product variants support for multi-dimension products (same product, different sizes)
-- Migration: 20260131000001_add_product_variants.sql

-- Create product_variants table
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL, -- e.g., "1L", "5L", "10kg", "25kg"
  variant_sku TEXT, -- Unique SKU for the variant
  quantity NUMERIC DEFAULT 0, -- Current stock quantity for this variant
  unit TEXT NOT NULL, -- e.g., "L", "kg", "unit"
  min_stock_level NUMERIC DEFAULT 0,
  standard_rate NUMERIC, -- Sales price per unit
  last_purchase_rate NUMRIC,
  barcode TEXT,
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure variant_name is unique per item
  CONSTRAINT product_variants_unique_name UNIQUE (organization_id, item_id, variant_name)
);

-- Create indexes for product_variants
CREATE INDEX IF NOT EXISTS idx_product_variants_org ON product_variants(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_item ON product_variants(item_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_sku ON product_variants(variant_sku) WHERE variant_sku IS NOT NULL;

-- Add variant_id column to stock_entry_items
ALTER TABLE stock_entry_items
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;

-- Add variant_id column to stock_movements
ALTER TABLE stock_movements
ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;

-- Add comments for documentation
COMMENT ON TABLE product_variants IS 'Product variants for items with multiple sizes/dimensions (e.g., 1L bottle vs 5L bottle of same product)';
COMMENT ON COLUMN product_variants.variant_name IS 'Variant designation (e.g., "1L", "5L", "10kg", "25kg")';
COMMENT ON COLUMN product_variants.variant_sku IS 'Unique SKU code for this specific variant';
COMMENT ON COLUMN product_variants.quantity IS 'Current stock quantity for this variant';
COMMENT ON COLUMN product_variants.min_stock_level IS 'Minimum stock level before low stock alert';

-- Create function to update variant timestamp
CREATE OR REPLACE FUNCTION update_product_variants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
CREATE TRIGGER product_variants_updated_at
BEFORE UPDATE ON product_variants
FOR EACH ROW
EXECUTE FUNCTION update_product_variants_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON product_variants TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE product_variants_id_seq TO authenticated;
