-- Add invited_by column to organization_users table
-- This column tracks who invited/added a user to the organization

ALTER TABLE organization_users
ADD COLUMN IF NOT EXISTS invited_by uuid REFERENCES auth.users(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_organization_users_invited_by ON organization_users(invited_by);

-- Comment
COMMENT ON COLUMN organization_users.invited_by IS 'User who invited this user to the organization';
