-- Add onboarding_state column to user_profiles for cross-device onboarding persistence
-- This allows users to continue onboarding on any device (phone, desktop, tablet)

-- Add JSONB column to store onboarding state
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS onboarding_state JSONB DEFAULT NULL;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_onboarding_state
ON user_profiles USING GIN (onboarding_state)
WHERE onboarding_state IS NOT NULL;

-- Add column to track onboarding completion timestamp
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ DEFAULT NULL;

-- Add column to track current onboarding step
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS onboarding_current_step INTEGER DEFAULT 1;

-- Add RLS policy to allow users to read/write their own onboarding state
DROP POLICY IF EXISTS "user_read_own_onboarding_state" ON user_profiles;
CREATE POLICY "user_read_own_onboarding_state" ON user_profiles
FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "user_write_own_onboarding_state" ON user_profiles;
CREATE POLICY "user_write_own_onboarding_state" ON user_profiles
FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "user_insert_own_onboarding_state" ON user_profiles;
CREATE POLICY "user_insert_own_onboarding_state" ON user_profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.onboarding_state IS 'Stores onboarding progress as JSONB for cross-device persistence. Includes profileData, organizationData, farmData, moduleSelection, and preferences.';
COMMENT ON COLUMN user_profiles.onboarding_completed_at IS 'Timestamp when onboarding was completed';
COMMENT ON COLUMN user_profiles.onboarding_current_step IS 'Current onboarding step (1-5) when in progress';
