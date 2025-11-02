-- Migration: Add fruit tree fields to parcels table
-- Description: Adds tree_type, tree_count, planting_year, and rootstock columns
--              to support fruit tree-specific data in the parcels table.
-- Date: 2025-10-18

-- Add fruit tree columns to parcels table
ALTER TABLE parcels
  ADD COLUMN IF NOT EXISTS tree_type TEXT,
  ADD COLUMN IF NOT EXISTS tree_count INTEGER,
  ADD COLUMN IF NOT EXISTS planting_year INTEGER,
  ADD COLUMN IF NOT EXISTS rootstock TEXT;

-- Add check constraint for planting_year (must be reasonable year)
ALTER TABLE parcels
  DROP CONSTRAINT IF EXISTS parcels_planting_year_check;
ALTER TABLE parcels
  ADD CONSTRAINT parcels_planting_year_check 
  CHECK (
    planting_year IS NULL OR 
    (planting_year >= 1900 AND planting_year <= EXTRACT(YEAR FROM CURRENT_DATE) + 10)
  );

-- Add check constraint for tree_count (must be positive)
ALTER TABLE parcels
  DROP CONSTRAINT IF EXISTS parcels_tree_count_check;
ALTER TABLE parcels
  ADD CONSTRAINT parcels_tree_count_check 
  CHECK (tree_count IS NULL OR tree_count > 0);

-- Add comments for documentation
COMMENT ON COLUMN parcels.tree_type IS 'Type of fruit tree (e.g., Olive, Apple, Orange, Citrus) - for fruit tree parcels';
COMMENT ON COLUMN parcels.tree_count IS 'Total number of trees planted in this parcel - for fruit tree parcels';
COMMENT ON COLUMN parcels.planting_year IS 'Year the trees were planted - for fruit tree parcels';
COMMENT ON COLUMN parcels.rootstock IS 'Rootstock variety used for grafting - for fruit tree parcels';

-- Create index on tree_type for filtering fruit tree parcels
CREATE INDEX IF NOT EXISTS idx_parcels_tree_type ON parcels(tree_type) WHERE tree_type IS NOT NULL;

-- Create index on planting_year for age-based queries
CREATE INDEX IF NOT EXISTS idx_parcels_planting_year ON parcels(planting_year) WHERE planting_year IS NOT NULL;

