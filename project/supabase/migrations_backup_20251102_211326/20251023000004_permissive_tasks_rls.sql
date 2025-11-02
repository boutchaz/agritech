-- Create a more permissive RLS policy for tasks to allow testing
-- This is a temporary solution to allow task creation while the system is being set up

-- Drop existing policies
DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON tasks;

-- Create a simple policy that allows authenticated users to manage tasks
-- This is more permissive and will work even without farms/organizations set up

CREATE POLICY "tasks_select_all"
  ON tasks
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "tasks_insert_all"
  ON tasks
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "tasks_update_all"
  ON tasks
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "tasks_delete_all"
  ON tasks
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Add comments
COMMENT ON POLICY "tasks_select_all" ON tasks IS 'Temporary permissive policy - allows all authenticated users to view tasks';
COMMENT ON POLICY "tasks_insert_all" ON tasks IS 'Temporary permissive policy - allows all authenticated users to create tasks';
COMMENT ON POLICY "tasks_update_all" ON tasks IS 'Temporary permissive policy - allows all authenticated users to update tasks';
COMMENT ON POLICY "tasks_delete_all" ON tasks IS 'Temporary permissive policy - allows all authenticated users to delete tasks';
