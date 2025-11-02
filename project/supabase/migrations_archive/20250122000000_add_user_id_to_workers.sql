-- Add user_id to workers table to link workers with platform users
-- This allows workers to have platform access with limited permissions

-- Add user_id column
ALTER TABLE workers
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_workers_user_id ON workers(user_id);

-- Add unique constraint to ensure one worker per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_workers_user_id_unique ON workers(user_id) WHERE user_id IS NOT NULL;

-- Comment
COMMENT ON COLUMN workers.user_id IS 'Links worker to a platform user account. When set, the worker can log in and access limited features based on their role (farm_worker, day_laborer)';

-- Update RLS policies to allow workers to view their own record
CREATE POLICY "Workers can view their own record"
  ON workers
  FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- Add helper function to check if a user is a worker
CREATE OR REPLACE FUNCTION is_worker(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM workers
    WHERE user_id = user_uuid
    AND is_active = true
  );
$$;
