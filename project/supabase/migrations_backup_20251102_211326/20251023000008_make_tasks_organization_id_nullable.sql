-- Make organization_id nullable in tasks table
-- This allows tasks to be created without requiring an organization_id

ALTER TABLE tasks ALTER COLUMN organization_id DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN tasks.organization_id IS 'Reference to the organization that owns this task (nullable)';
