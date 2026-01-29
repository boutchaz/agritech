-- Add dismissed_tours field to user_profiles
-- This allows users to permanently dismiss individual tours without completing them
-- Migration Date: 2025-01-14

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS dismissed_tours text[] DEFAULT '{}';

COMMENT ON COLUMN user_profiles.dismissed_tours IS 'Array of permanently dismissed tour IDs. Tours in this array will never auto-start even if not completed.';

-- Ensure dismissed_tours is properly indexed (optional, for performance)
-- CREATE INDEX IF NOT EXISTS idx_user_profiles_dismissed_tours ON user_profiles USING GIN(dismissed_tours);
