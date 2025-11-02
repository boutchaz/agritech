-- Fix RLS policies for tasks table
-- This migration ensures that users can properly insert, update, and view tasks

-- Drop all existing policies on tasks table
DROP POLICY IF EXISTS "org_members_can_view_tasks" ON tasks;
DROP POLICY IF EXISTS "org_members_can_insert_tasks" ON tasks;
DROP POLICY IF EXISTS "org_members_can_update_tasks" ON tasks;
DROP POLICY IF EXISTS "org_members_can_delete_tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view tasks assigned to them" ON tasks;
DROP POLICY IF EXISTS "org_members_can_manage_tasks" ON tasks;
DROP POLICY IF EXISTS "tasks_select_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON tasks;

-- Create comprehensive RLS policies for tasks

-- Policy 1: Users can view tasks in their organization or tasks assigned to them
CREATE POLICY "tasks_select_policy"
  ON tasks
  FOR SELECT
  USING (
    -- User is an active member of the organization that owns the farm
    EXISTS (
      SELECT 1
      FROM organization_users ou
      INNER JOIN farms f ON f.organization_id = ou.organization_id
      WHERE ou.user_id = auth.uid()
        AND f.id = tasks.farm_id
        AND ou.is_active = true
        AND ou.role IN ('owner', 'admin', 'manager', 'member')
    )
    OR
    -- User is assigned to this task
    assigned_to = auth.uid()
  );

-- Policy 2: Users can insert tasks in their organization
CREATE POLICY "tasks_insert_policy"
  ON tasks
  FOR INSERT
  WITH CHECK (
    -- User must be an active member of the organization
    EXISTS (
      SELECT 1
      FROM organization_users ou
      INNER JOIN farms f ON f.organization_id = ou.organization_id
      WHERE ou.user_id = auth.uid()
        AND f.id = tasks.farm_id
        AND ou.is_active = true
        AND ou.role IN ('owner', 'admin', 'manager', 'member')
    )
    AND
    -- Farm must belong to the organization
    EXISTS (
      SELECT 1
      FROM farms f
      WHERE f.id = tasks.farm_id
        AND f.organization_id = (
          SELECT ou.organization_id
          FROM organization_users ou
          WHERE ou.user_id = auth.uid()
            AND ou.is_active = true
        )
    )
  );

-- Policy 3: Users can update tasks in their organization
CREATE POLICY "tasks_update_policy"
  ON tasks
  FOR UPDATE
  USING (
    -- User is an active member of the organization that owns the farm
    EXISTS (
      SELECT 1
      FROM organization_users ou
      INNER JOIN farms f ON f.organization_id = ou.organization_id
      WHERE ou.user_id = auth.uid()
        AND f.id = tasks.farm_id
        AND ou.is_active = true
        AND ou.role IN ('owner', 'admin', 'manager', 'member')
    )
  )
  WITH CHECK (
    -- Same check for the new values
    EXISTS (
      SELECT 1
      FROM organization_users ou
      INNER JOIN farms f ON f.organization_id = ou.organization_id
      WHERE ou.user_id = auth.uid()
        AND f.id = tasks.farm_id
        AND ou.is_active = true
        AND ou.role IN ('owner', 'admin', 'manager', 'member')
    )
  );

-- Policy 4: Only admins and managers can delete tasks
CREATE POLICY "tasks_delete_policy"
  ON tasks
  FOR DELETE
  USING (
    -- User is an active admin/manager of the organization that owns the farm
    EXISTS (
      SELECT 1
      FROM organization_users ou
      INNER JOIN farms f ON f.organization_id = ou.organization_id
      WHERE ou.user_id = auth.uid()
        AND f.id = tasks.farm_id
        AND ou.is_active = true
        AND ou.role IN ('owner', 'admin', 'manager')
    )
  );

-- Add comments
COMMENT ON POLICY "tasks_select_policy" ON tasks IS 'Allows users to view tasks in their organization or tasks assigned to them';
COMMENT ON POLICY "tasks_insert_policy" ON tasks IS 'Allows organization members to create tasks within their organization';
COMMENT ON POLICY "tasks_update_policy" ON tasks IS 'Allows organization members to update tasks in their organization';
COMMENT ON POLICY "tasks_delete_policy" ON tasks IS 'Allows only admins and managers to delete tasks';
