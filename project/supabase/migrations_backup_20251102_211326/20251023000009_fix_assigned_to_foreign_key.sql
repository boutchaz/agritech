-- Fix the foreign key constraint for tasks.assigned_to
-- The constraint should reference user_profiles.id instead of auth.users.id

-- Drop the existing foreign key constraint
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;

-- Add the correct foreign key constraint that references user_profiles
ALTER TABLE tasks ADD CONSTRAINT tasks_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES user_profiles(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN tasks.assigned_to IS 'Reference to the user profile of the person assigned to this task';
