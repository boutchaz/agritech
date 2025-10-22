-- Add password_set column to user_profiles table to track if invited users have set their password
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS password_set BOOLEAN DEFAULT FALSE;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_password_set ON user_profiles(password_set);

COMMENT ON COLUMN user_profiles.password_set IS 'Indicates if the user has set their own password (FALSE for invited users who haven''t set password yet)';

-- Update existing users to have password_set = TRUE (assume they already have passwords)
UPDATE user_profiles
SET password_set = TRUE
WHERE password_set IS NULL OR password_set = FALSE;
