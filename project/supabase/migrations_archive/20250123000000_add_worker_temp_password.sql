-- Add temp_password field to workers table for storing initial temporary passwords
-- This allows organization admins to view/reset passwords for workers
ALTER TABLE workers
ADD COLUMN IF NOT EXISTS temp_password TEXT,
ADD COLUMN IF NOT EXISTS temp_password_expires_at TIMESTAMPTZ;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_workers_user_id ON workers(user_id);

COMMENT ON COLUMN workers.temp_password IS 'Temporary password for worker platform access (cleared on first login)';
COMMENT ON COLUMN workers.temp_password_expires_at IS 'Expiration time for temporary password (7 days by default)';
