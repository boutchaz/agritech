-- Add variant_id column to stock_valuation table
-- This column is needed to track which product variant was used in stock transactions

ALTER TABLE stock_valuation
ADD COLUMN variant_id UUID REFERENCES product_variants(id) ON DELETE SET NULL;

COMMENT ON COLUMN stock_valuation.variant_id IS 'Product variant ID if the transaction was for a specific variant';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_stock_valuation_variant ON stock_valuation(variant_id) WHERE variant_id IS NOT NULL;
