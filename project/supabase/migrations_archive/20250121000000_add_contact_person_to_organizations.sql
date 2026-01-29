-- Add contact_person column to organizations table
-- Migration: 2025-01-21 - Add contact person field

-- Add contact_person column if it doesn't exist
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS contact_person VARCHAR(255);

-- Add comment for documentation
COMMENT ON COLUMN organizations.contact_person IS 'Primary contact person name for the organization';
