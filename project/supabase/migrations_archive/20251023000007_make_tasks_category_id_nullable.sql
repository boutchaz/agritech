-- Make category_id nullable in tasks table
-- This allows tasks to be created without requiring a category_id

ALTER TABLE tasks ALTER COLUMN category_id DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN tasks.category_id IS 'Reference to the task category (nullable)';
