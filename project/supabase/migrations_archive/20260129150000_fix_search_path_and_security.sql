-- Fix Search Path and Security for Functions
-- Migration Date: 2026-01-29
-- Description: Adds SET search_path = public to all SECURITY DEFINER functions

-- Drop and recreate functions with proper search_path setting

-- Helper function first (used by triggers)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Account-related functions
CREATE OR REPLACE FUNCTION get_account_balance(p_account_id UUID)
RETURNS NUMERIC LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  SELECT COALESCE(SUM(debit), 0) - COALESCE(SUM(credit), 0)
  INTO v_balance
  FROM journal_items
  WHERE account_id = p_account_id;

  RETURN COALESCE(v_balance, 0);
END;
$$;

CREATE OR REPLACE FUNCTION get_trial_balance(p_organization_id UUID, p_as_of_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  account_id UUID,
  account_code VARCHAR,
  account_name VARCHAR,
  debit NUMERIC,
  credit NUMERIC
) LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.id,
    a.code,
    a.name,
    COALESCE(SUM(ji.debit), 0) AS debit,
    COALESCE(SUM(ji.credit), 0) AS credit
  FROM accounts a
  LEFT JOIN journal_items ji ON ji.account_id = a.id
  LEFT JOIN journal_entries je ON je.id = ji.journal_entry_id
  LEFT JOIN account_mappings am ON am.account_id = a.id
  WHERE a.organization_id = p_organization_id
    AND (je.date IS NULL OR je.date <= p_as_of_date)
    AND (am.effective_to IS NULL OR am.effective_to > p_as_of_date)
  GROUP BY a.id, a.code, a.name
  ORDER BY a.code;
END;
$$;

-- Task-related functions
CREATE OR REPLACE FUNCTION create_task_from_template(
  p_template_id UUID,
  p_farm_id UUID DEFAULT NULL,
  p_assigned_to UUID DEFAULT NULL,
  p_scheduled_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
DECLARE
  v_task_id UUID;
  v_template tasks%ROWTYPE;
  v_org_id UUID;
BEGIN
  -- Get template and organization
  SELECT * INTO v_template
  FROM tasks t
  JOIN farms f ON t.farm_id = f.id
  WHERE t.id = p_template_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task template not found';
  END IF;

  v_org_id := v_template.organization_id;

  -- Create task from template
  INSERT INTO tasks (
    title, description, task_type_id, priority,
    farm_id, parcel_id, crop_id, tree_id,
    assigned_to_id, status, scheduled_date, due_date,
    organization_id, estimated_duration, equipment_required,
    created_at, updated_at
  )
  SELECT
    t.title, t.description, t.task_type_id, t.priority,
    COALESCE(p_farm_id, t.farm_id), t.parcel_id, t.crop_id, t.tree_id,
    COALESCE(p_assigned_to, t.assigned_to_id), 'pending',
    COALESCE(p_scheduled_date, t.scheduled_date), t.due_date,
    v_org_id, t.estimated_duration, t.equipment_required,
    NOW(), NOW()
  FROM tasks t
  WHERE t.id = p_template_id
  RETURNING id INTO v_task_id;

  -- Copy task dependencies
  INSERT INTO task_dependencies (task_id, depends_on_task_id)
  SELECT v_task_id, td.depends_on_task_id
  FROM task_dependencies td
  WHERE td.task_id = p_template_id;

  -- Copy task equipment
  INSERT INTO task_equipment (task_id, equipment_id)
  SELECT v_task_id, te.equipment_id
  FROM task_equipment te
  WHERE te.task_id = p_template_id;

  RETURN v_task_id;
END;
$$;

CREATE OR REPLACE FUNCTION update_task_status(
  p_task_id UUID,
  p_status VARCHAR,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tasks
  SET status = p_status,
      updated_at = NOW()
  WHERE id = p_task_id;

  -- Add note to comments if provided
  IF p_notes IS NOT NULL THEN
    INSERT INTO task_comments (task_id, comment, created_by_id)
    VALUES (p_task_id, p_notes, auth.uid());
  END IF;

  RETURN TRUE;
END;
$$;

-- Report functions
CREATE OR REPLACE FUNCTION calculate_daily_adoption_metrics(p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
  metric_date DATE,
  new_users INTEGER,
  active_users INTEGER,
  total_users INTEGER,
  onboarding_completion_rate NUMERIC
) LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p_date AS metric_date,
    COUNT(DISTINCT CASE WHEN DATE(u.created_at) = p_date THEN u.id END) AS new_users,
    COUNT(DISTINCT CASE WHEN DATE(last_active_at) = p_date THEN u.id END) AS active_users,
    COUNT(DISTINCT u.id) AS total_users,
    CASE
      WHEN COUNT(DISTINCT u.id) > 0 THEN
        ROUND(COUNT(DISTINCT CASE WHEN up.onboarding_completed_at IS NOT NULL THEN u.id END)::NUMERIC /
              COUNT(DISTINCT u.id) * 100, 2)
      ELSE 0
    END AS onboarding_completion_rate
  FROM users u
  LEFT JOIN user_profiles up ON up.user_id = u.id
  WHERE DATE(u.created_at) <= p_date;
END;
$$;

CREATE OR REPLACE FUNCTION generate_adoption_report(
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  date DATE,
  new_users INTEGER,
  active_users INTEGER,
  cumulative_users INTEGER
) LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    generated_date AS date,
    new_users,
    active_users,
    SUM(new_users) OVER (ORDER BY generated_date) AS cumulative_users
  FROM (
    SELECT
      d.generated_date,
      COALESCE(COUNT(DISTINCT u.id) FILTER (WHERE DATE(u.created_at) = d.generated_date), 0) AS new_users,
      COALESCE(COUNT(DISTINCT u.id) FILTER (WHERE DATE(up.last_active_at) = d.generated_date), 0) AS active_users
    FROM generate_series(p_start_date, p_end_date, INTERVAL '1 day') AS generated_date
    LEFT JOIN users u ON DATE(u.created_at) = generated_date
    LEFT JOIN user_profiles up ON up.user_id = u.id AND DATE(up.last_active_at) = generated_date
    GROUP BY generated_date
  ) sub
  ORDER BY date;
END;
$$;

-- Inventory functions
CREATE OR REPLACE FUNCTION adjust_inventory(
  p_item_id UUID,
  p_warehouse_id UUID,
  p_quantity NUMERIC,
  p_reason VARCHAR,
  p_reference_id UUID DEFAULT NULL
)
RETURNS UUID LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
DECLARE
  v_movement_id UUID;
  v_item inventory%ROWTYPE;
BEGIN
  -- Get current inventory item
  SELECT * INTO v_item
  FROM inventory
  WHERE item_id = p_item_id AND warehouse_id = p_warehouse_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inventory item not found';
  END IF;

  -- Create stock movement
  INSERT INTO stock_movements (
    item_id, warehouse_id, quantity, movement_type,
    reason, reference_id, organization_id, movement_date
  )
  VALUES (
    p_item_id, p_warehouse_id, p_quantity,
    CASE WHEN p_quantity > 0 THEN 'in' ELSE 'out' END,
    p_reason, p_reference_id, v_item.organization_id, NOW()
  )
  RETURNING id INTO v_movement_id;

  -- Update inventory quantity
  UPDATE inventory
  SET quantity_on_hand = quantity_on_hand + p_quantity,
      quantity_available = quantity_available + p_quantity,
      last_stock_update = NOW()
  WHERE item_id = p_item_id AND warehouse_id = p_warehouse_id;

  -- Check for low stock
  IF v_item.quantity_on_hand + p_quantity <= v_item.reorder_level THEN
    -- Trigger reorder alert (implementation depends on alert system)
    NULL;
  END IF;

  RETURN v_movement_id;
END;
$$;

-- Analytics functions
CREATE OR REPLACE FUNCTION get_productivity_metrics(
  p_organization_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '90 days',
  p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  metric_name VARCHAR,
  metric_value NUMERIC,
  metric_unit VARCHAR
) LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    'Total Harvest'::VARCHAR AS metric_name,
    COALESCE(SUM(hr.quantity_kg), 0)::NUMERIC AS metric_value,
    'kg'::VARCHAR AS metric_unit
  FROM harvest_records hr
  JOIN crops c ON hr.crop_id = c.id
  WHERE c.organization_id = p_organization_id
    AND hr.harvest_date BETWEEN p_start_date AND p_end_date

  UNION ALL

  SELECT
    'Average Task Completion Rate'::VARCHAR,
    COALESCE(AVG(completion_rate), 0)::NUMERIC,
    '%'::VARCHAR
  FROM (
    SELECT
      ROUND(COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC /
            COUNT(*) * 100, 2) AS completion_rate
    FROM tasks
    WHERE organization_id = p_organization_id
      AND created_at BETWEEN p_start_date AND p_end_date
  ) t

  UNION ALL

  SELECT
    'Active Workers'::VARCHAR,
    COUNT(*)::NUMERIC,
    'workers'::VARCHAR
  FROM workers
  WHERE organization_id = p_organization_id
    AND is_active = true;
END;
$$;

-- Security function for checking organization access
CREATE OR REPLACE FUNCTION check_organization_access(p_organization_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM organization_users
    WHERE user_id = auth.uid()
      AND organization_id = p_organization_id
      AND is_active = true
  );
END;
$$;

-- Function to get user's organizations
CREATE OR REPLACE FUNCTION get_user_organizations()
RETURNS TABLE (
  organization_id UUID,
  organization_name VARCHAR,
  user_role VARCHAR,
  is_default BOOLEAN
) LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id AS organization_id,
    o.name AS organization_name,
    r.name AS user_role,
    ou.is_default
  FROM organization_users ou
  JOIN organizations o ON ou.organization_id = o.id
  JOIN roles r ON ou.role_id = r.id
  WHERE ou.user_id = auth.uid() AND ou.is_active = true
  ORDER BY ou.is_default DESC, o.name;
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION check_organization_access IS 'Check if current user has access to organization';
COMMENT ON FUNCTION get_user_organizations IS 'Get all organizations for current user with roles';
COMMENT ON FUNCTION adjust_inventory IS 'Adjust inventory quantity and create stock movement record';
COMMENT ON FUNCTION update_task_status IS 'Update task status and optionally add comment';
COMMENT ON FUNCTION create_task_from_template IS 'Create a new task from a template';
