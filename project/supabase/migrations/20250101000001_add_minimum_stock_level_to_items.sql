-- Add minimum_stock_level field to items table
-- This allows tracking minimum stock thresholds per item for low stock alerts

ALTER TABLE items 
ADD COLUMN IF NOT EXISTS minimum_stock_level NUMERIC;

COMMENT ON COLUMN items.minimum_stock_level IS 'Minimum stock level threshold for low stock alerts. When stock falls below this level, alerts will be triggered.';

-- Create index for efficient low stock queries
CREATE INDEX IF NOT EXISTS idx_items_minimum_stock ON items(organization_id, minimum_stock_level) 
WHERE minimum_stock_level IS NOT NULL AND is_stock_item = true;

