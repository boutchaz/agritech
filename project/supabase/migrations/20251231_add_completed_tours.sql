-- Migration: Add completed_tours column to user_profiles
-- Purpose: Store the list of completed tour IDs for each user to persist tour completion state

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS completed_tours text[] DEFAULT '{}';

COMMENT ON COLUMN user_profiles.completed_tours IS 'Array of completed tour IDs (welcome, dashboard, farm-management, parcels, tasks, workers, inventory, accounting, satellite, reports)';
