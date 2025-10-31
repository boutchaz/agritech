-- Add experience_level to user_profiles for adaptive UI
-- This enables progressive disclosure and complexity tailoring per user

-- Create enum for experience levels
CREATE TYPE experience_level AS ENUM ('basic', 'medium', 'expert');

-- Add experience_level column with default 'basic'
ALTER TABLE user_profiles
ADD COLUMN experience_level experience_level DEFAULT 'basic' NOT NULL;

-- Add column to track dismissed hints for contextual help
ALTER TABLE user_profiles
ADD COLUMN dismissed_hints jsonb DEFAULT '[]'::jsonb;

-- Add column to track feature usage for smart suggestions
ALTER TABLE user_profiles
ADD COLUMN feature_usage jsonb DEFAULT '{}'::jsonb;

-- Create index for experience level queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_experience_level
ON user_profiles(experience_level);

-- Add comment
COMMENT ON COLUMN user_profiles.experience_level IS
'User interface complexity level: basic (guided), medium (balanced), expert (full access)';

COMMENT ON COLUMN user_profiles.dismissed_hints IS
'Array of hint IDs that user has permanently dismissed';

COMMENT ON COLUMN user_profiles.feature_usage IS
'Tracks feature usage patterns for adaptive suggestions. Format: {"feature_name": usage_count}';
