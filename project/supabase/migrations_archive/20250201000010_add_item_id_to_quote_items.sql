-- =====================================================
-- Migration: Add item_id to quote_items table
-- Description: Adds foreign key to items table for better integration with stock module
-- =====================================================

-- Add item_id column to quote_items (nullable for backward compatibility)
ALTER TABLE quote_items
ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES items(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_quote_items_item_id ON quote_items(item_id);

-- Add comment
COMMENT ON COLUMN quote_items.item_id IS 'Reference to items table. Links quote items to stock items for better integration.';

-- =====================================================
-- NOTES
-- =====================================================

-- This migration adds item_id to quote_items table to:
-- 1. Link quotes to items from the stock module
-- 2. Enable better integration between billing and stock
-- 3. Allow automatic item name/unit/pricing from items table
-- The column is nullable to allow backward compatibility with existing quotes

