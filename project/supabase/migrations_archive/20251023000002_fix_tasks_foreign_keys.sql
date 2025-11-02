-- Fix missing foreign key relationships in tasks table
-- This migration ensures proper relationships between tasks and related tables

-- First, let's check if farm_id column exists and add it if missing
DO $$
BEGIN
  -- Check if farm_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks'
    AND column_name = 'farm_id'
  ) THEN
    -- Add farm_id column
    ALTER TABLE tasks ADD COLUMN farm_id UUID;
  END IF;
END $$;

-- Add foreign key constraint for farm_id if it doesn't exist
DO $$
BEGIN
  -- Check if the foreign key constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'tasks'
    AND constraint_name = 'tasks_farm_id_fkey'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    -- Add the foreign key constraint
    ALTER TABLE tasks ADD CONSTRAINT tasks_farm_id_fkey
      FOREIGN KEY (farm_id) REFERENCES farms(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Check if parcel_id column exists and add it if missing
DO $$
BEGIN
  -- Check if parcel_id column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks'
    AND column_name = 'parcel_id'
  ) THEN
    -- Add parcel_id column
    ALTER TABLE tasks ADD COLUMN parcel_id UUID;
  END IF;
END $$;

-- Add foreign key constraint for parcel_id if it doesn't exist
DO $$
BEGIN
  -- Check if the foreign key constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'tasks'
    AND constraint_name = 'tasks_parcel_id_fkey'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    -- Add the foreign key constraint
    ALTER TABLE tasks ADD CONSTRAINT tasks_parcel_id_fkey
      FOREIGN KEY (parcel_id) REFERENCES parcels(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Check if assigned_to column exists and is properly configured
DO $$
BEGIN
  -- Check if assigned_to column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks'
    AND column_name = 'assigned_to'
  ) THEN
    -- Add assigned_to column
    ALTER TABLE tasks ADD COLUMN assigned_to UUID;
  END IF;
END $$;

-- Add foreign key constraint for assigned_to if it doesn't exist
DO $$
BEGIN
  -- Check if the foreign key constraint exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'tasks'
    AND constraint_name = 'tasks_assigned_to_fkey'
    AND constraint_type = 'FOREIGN KEY'
  ) THEN
    -- Add the foreign key constraint (reference to auth.users)
    ALTER TABLE tasks ADD CONSTRAINT tasks_assigned_to_fkey
      FOREIGN KEY (assigned_to) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_farm_id ON tasks(farm_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parcel_id ON tasks(parcel_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);

-- Add comments
COMMENT ON COLUMN tasks.farm_id IS 'Reference to the farm where this task is performed';
COMMENT ON COLUMN tasks.parcel_id IS 'Reference to the specific parcel within the farm';
COMMENT ON COLUMN tasks.assigned_to IS 'Reference to the user assigned to this task';
