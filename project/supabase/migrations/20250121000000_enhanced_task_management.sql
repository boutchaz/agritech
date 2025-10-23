-- =====================================================
-- ENHANCED TASK MANAGEMENT SYSTEM
-- Migration: Enhanced tasks with full worker assignment,
-- time tracking, and task lifecycle management
-- =====================================================

-- First, enhance the existing tasks table
-- Drop old constraints if they exist
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;

-- Add new columns to tasks table
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS location_lng DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS required_skills TEXT[],
  ADD COLUMN IF NOT EXISTS equipment_required TEXT[],
  ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quality_rating INTEGER,
  ADD COLUMN IF NOT EXISTS cost_estimate DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS actual_cost DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS weather_dependency BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS repeat_pattern JSONB,
  ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS attachments JSONB,
  ADD COLUMN IF NOT EXISTS checklist JSONB;

-- Update assigned_to to be UUID reference to worker
ALTER TABLE tasks ALTER COLUMN assigned_to TYPE UUID USING assigned_to::UUID;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey;
ALTER TABLE tasks ADD CONSTRAINT tasks_assigned_to_fkey 
  FOREIGN KEY (assigned_to) REFERENCES workers(id) ON DELETE SET NULL;

-- Add constraints
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('pending', 'assigned', 'in_progress', 'paused', 'completed', 'cancelled', 'overdue'));

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_priority_check 
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_completion_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_completion_check 
  CHECK (completion_percentage >= 0 AND completion_percentage <= 100);

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_quality_rating_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_quality_rating_check 
  CHECK (quality_rating IS NULL OR (quality_rating >= 1 AND quality_rating <= 5));

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_task_type_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_task_type_check 
  CHECK (task_type IN ('planting', 'harvesting', 'irrigation', 'fertilization', 'maintenance', 'general', 'pest_control', 'pruning', 'soil_preparation'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_organization_id ON tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_worker_id ON tasks(worker_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduled_start ON tasks(scheduled_start);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);

-- Update existing tasks to have organization_id
UPDATE tasks t 
SET organization_id = f.organization_id 
FROM farms f 
WHERE t.farm_id = f.id AND t.organization_id IS NULL;

-- Make organization_id NOT NULL after populating
ALTER TABLE tasks ALTER COLUMN organization_id SET NOT NULL;

-- =====================================================
-- TASK COMMENTS/UPDATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  comment TEXT NOT NULL,
  type TEXT DEFAULT 'comment' CHECK (type IN ('comment', 'status_update', 'completion_note', 'issue')),
  attachments JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_task_comments_created_at ON task_comments(created_at DESC);

COMMENT ON TABLE task_comments IS 'Comments, updates, and notes on tasks';

-- =====================================================
-- TASK TIME TRACKING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS task_time_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  break_duration INTEGER DEFAULT 0, -- in minutes
  total_hours DECIMAL(4, 2) GENERATED ALWAYS AS (
    CASE 
      WHEN end_time IS NOT NULL THEN 
        GREATEST(0, EXTRACT(EPOCH FROM (end_time - start_time)) / 3600 - (break_duration / 60.0))
      ELSE 0 
    END
  ) STORED,
  notes TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_time_logs_task_id ON task_time_logs(task_id);
CREATE INDEX idx_task_time_logs_worker_id ON task_time_logs(worker_id);
CREATE INDEX idx_task_time_logs_start_time ON task_time_logs(start_time DESC);

COMMENT ON TABLE task_time_logs IS 'Time tracking for tasks - clock in/out records';

-- =====================================================
-- TASK DEPENDENCIES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type TEXT DEFAULT 'finish_to_start' 
    CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish')),
  lag_days INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_dependency CHECK (task_id != depends_on_task_id),
  CONSTRAINT unique_dependency UNIQUE (task_id, depends_on_task_id)
);

CREATE INDEX idx_task_dependencies_task_id ON task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);

COMMENT ON TABLE task_dependencies IS 'Task dependencies for scheduling and planning';

-- =====================================================
-- TASK EQUIPMENT USAGE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS task_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  equipment_name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  condition_before TEXT CHECK (condition_before IN ('excellent', 'good', 'fair', 'poor')),
  condition_after TEXT CHECK (condition_after IN ('excellent', 'good', 'fair', 'poor')),
  fuel_used DECIMAL(8, 2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_task_equipment_task_id ON task_equipment(task_id);

COMMENT ON TABLE task_equipment IS 'Equipment usage tracking for tasks';

-- =====================================================
-- ENHANCED TASK CATEGORIES TABLE
-- =====================================================
-- Drop existing task_categories table if it exists with wrong schema
DROP TABLE IF EXISTS task_categories CASCADE;

CREATE TABLE IF NOT EXISTS task_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  color TEXT,
  default_duration INTEGER, -- in hours
  default_skills TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_category_name_per_org UNIQUE (organization_id, name)
);

CREATE INDEX idx_task_categories_organization_id ON task_categories(organization_id);

COMMENT ON TABLE task_categories IS 'Task categories/templates for standardization';

-- =====================================================
-- UPDATE TRIGGERS
-- =====================================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at 
  BEFORE UPDATE ON tasks 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_task_comments_updated_at ON task_comments;
CREATE TRIGGER update_task_comments_updated_at 
  BEFORE UPDATE ON task_comments 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_task_time_logs_updated_at ON task_time_logs;
CREATE TRIGGER update_task_time_logs_updated_at 
  BEFORE UPDATE ON task_time_logs 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_task_equipment_updated_at ON task_equipment;
CREATE TRIGGER update_task_equipment_updated_at 
  BEFORE UPDATE ON task_equipment 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_task_categories_updated_at ON task_categories;
CREATE TRIGGER update_task_categories_updated_at 
  BEFORE UPDATE ON task_categories 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- AUTO-UPDATE TASK STATUS TO OVERDUE
-- =====================================================
CREATE OR REPLACE FUNCTION check_overdue_tasks()
RETURNS void AS $$
BEGIN
  UPDATE tasks
  SET status = 'overdue'
  WHERE status IN ('pending', 'assigned')
    AND due_date < CURRENT_DATE
    AND status != 'overdue';
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- AUTO-UPDATE WORKER STATS FROM TASKS
-- =====================================================
CREATE OR REPLACE FUNCTION update_worker_stats_from_task()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    UPDATE workers
    SET 
      total_tasks_completed = total_tasks_completed + 1,
      updated_at = NOW()
    WHERE id = NEW.assigned_to;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_worker_stats_on_task_complete ON tasks;
CREATE TRIGGER update_worker_stats_on_task_complete
  AFTER UPDATE ON tasks
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed'))
  EXECUTE FUNCTION update_worker_stats_from_task();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;

-- Task Comments Policies
CREATE POLICY "Users can view comments on tasks they have access to" 
  ON task_comments FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM tasks t
      WHERE t.organization_id IN (
        SELECT organization_id FROM organization_users 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Users can create comments on accessible tasks" 
  ON task_comments FOR INSERT
  WITH CHECK (
    task_id IN (
      SELECT id FROM tasks t
      WHERE t.organization_id IN (
        SELECT organization_id FROM organization_users 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- Task Time Logs Policies
CREATE POLICY "Users can view time logs for their organization" 
  ON task_time_logs FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM tasks t
      WHERE t.organization_id IN (
        SELECT organization_id FROM organization_users 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Workers can create time logs for their tasks" 
  ON task_time_logs FOR INSERT
  WITH CHECK (
    worker_id IN (
      SELECT id FROM workers w
      WHERE w.organization_id IN (
        SELECT organization_id FROM organization_users 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Users can update their own time logs" 
  ON task_time_logs FOR UPDATE
  USING (
    worker_id IN (
      SELECT id FROM workers w
      WHERE w.organization_id IN (
        SELECT organization_id FROM organization_users 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- Task Dependencies Policies
CREATE POLICY "Users can view task dependencies in their organization" 
  ON task_dependencies FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM tasks t
      WHERE t.organization_id IN (
        SELECT organization_id FROM organization_users 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Managers can manage task dependencies" 
  ON task_dependencies FOR ALL
  USING (
    task_id IN (
      SELECT id FROM tasks t
      WHERE t.organization_id IN (
        SELECT ou.organization_id FROM organization_users ou
        JOIN roles r ON r.id = ou.role_id
        WHERE ou.user_id = auth.uid() 
          AND ou.is_active = true
          AND r.name IN ('system_admin', 'organization_admin', 'farm_manager')
      )
    )
  );

-- Task Equipment Policies
CREATE POLICY "Users can view equipment usage in their organization" 
  ON task_equipment FOR SELECT
  USING (
    task_id IN (
      SELECT id FROM tasks t
      WHERE t.organization_id IN (
        SELECT organization_id FROM organization_users 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Users can manage equipment for accessible tasks" 
  ON task_equipment FOR ALL
  USING (
    task_id IN (
      SELECT id FROM tasks t
      WHERE t.organization_id IN (
        SELECT organization_id FROM organization_users 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- Task Categories Policies
CREATE POLICY "Users can view categories in their organization" 
  ON task_categories FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins can manage task categories" 
  ON task_categories FOR ALL
  USING (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid() 
        AND ou.is_active = true
        AND r.name IN ('system_admin', 'organization_admin')
    )
  );

-- =====================================================
-- SEED DEFAULT TASK CATEGORIES
-- =====================================================
DO $$
DECLARE
  org_record RECORD;
BEGIN
  FOR org_record IN SELECT id FROM organizations LOOP
    INSERT INTO task_categories (organization_id, name, description, icon, color, default_duration, default_skills)
    VALUES 
      (org_record.id, 'Plantation', 'Tâches de plantation et semis', 'Sprout', '#22c55e', 8, ARRAY['planting']),
      (org_record.id, 'Récolte', 'Tâches de récolte et cueillette', 'Apple', '#f59e0b', 8, ARRAY['harvesting']),
      (org_record.id, 'Irrigation', 'Tâches d''irrigation et arrosage', 'Droplet', '#3b82f6', 4, ARRAY['irrigation']),
      (org_record.id, 'Fertilisation', 'Application d''engrais et amendements', 'Leaf', '#84cc16', 4, ARRAY['fertilization']),
      (org_record.id, 'Entretien', 'Entretien général et maintenance', 'Wrench', '#6366f1', 4, ARRAY['maintenance']),
      (org_record.id, 'Traitement', 'Traitement phytosanitaire', 'Bug', '#ef4444', 6, ARRAY['pest_control', 'phytosanitaire']),
      (org_record.id, 'Taille', 'Tâches de taille et élagage', 'Scissors', '#8b5cf6', 6, ARRAY['pruning'])
    ON CONFLICT (organization_id, name) DO NOTHING;
  END LOOP;
END $$;

-- =====================================================
-- HELPFUL VIEWS
-- =====================================================

-- View for task summary with worker info
CREATE OR REPLACE VIEW task_summary AS
SELECT 
  t.*,
  w.first_name || ' ' || w.last_name AS worker_name,
  w.worker_type,
  f.name AS farm_name,
  p.name AS parcel_name,
  tc.name AS category_name,
  (SELECT COUNT(*) FROM task_comments WHERE task_id = t.id) AS comment_count,
  (SELECT COUNT(*) FROM task_time_logs WHERE task_id = t.id) AS time_log_count,
  (SELECT SUM(total_hours) FROM task_time_logs WHERE task_id = t.id) AS total_hours_logged
FROM tasks t
LEFT JOIN workers w ON w.id = t.assigned_to
LEFT JOIN farms f ON f.id = t.farm_id
LEFT JOIN parcels p ON p.id = t.parcel_id
LEFT JOIN task_categories tc ON tc.id = t.category_id;

COMMENT ON VIEW task_summary IS 'Comprehensive task view with related information';

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to get worker availability for a date
CREATE OR REPLACE FUNCTION get_worker_availability(
  p_worker_id UUID,
  p_date DATE
)
RETURNS TABLE (
  is_available BOOLEAN,
  tasks_count INTEGER,
  total_hours DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN COUNT(t.id) = 0 THEN TRUE
      WHEN SUM(COALESCE(t.estimated_duration, 8)) < 8 THEN TRUE
      ELSE FALSE
    END AS is_available,
    COUNT(t.id)::INTEGER AS tasks_count,
    SUM(COALESCE(t.estimated_duration, 8))::DECIMAL AS total_hours
  FROM tasks t
  WHERE t.assigned_to = p_worker_id
    AND t.status IN ('pending', 'assigned', 'in_progress')
    AND (
      (t.scheduled_start IS NOT NULL AND DATE(t.scheduled_start) = p_date)
      OR (t.scheduled_start IS NULL AND t.due_date = p_date)
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_worker_availability IS 'Check if a worker is available on a specific date';

