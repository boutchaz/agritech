-- Fix broken regex constraint on organizations.phone
-- The old pattern had unbalanced brackets: [0-9\(\)\s\-\.\]
-- The \] at the end escaped the closing bracket, causing "brackets [] not balanced" error

-- Drop the broken constraint
ALTER TABLE organizations DROP CONSTRAINT IF EXISTS chk_organizations_phone_format;

-- Add the fixed constraint (removed unnecessary escapes)
-- Inside character classes, only ] ^ \ and - need special handling
ALTER TABLE organizations ADD CONSTRAINT chk_organizations_phone_format
  CHECK (phone IS NULL OR phone ~* '^[\+]?[0-9()\s\-.]{8,20}$');
