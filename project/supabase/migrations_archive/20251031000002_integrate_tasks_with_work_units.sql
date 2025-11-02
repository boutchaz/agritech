-- =====================================================
-- INTEGRATE TASKS WITH WORK UNITS & ACCOUNTING
-- =====================================================
-- This migration:
-- 1. Adds work unit tracking to tasks
-- 2. Links tasks to piece-work records
-- 3. Enables automatic payment calculation
-- 4. Creates automatic accounting journal entries
-- =====================================================

-- 1. ADD WORK UNIT FIELDS TO TASKS
-- =====================================================
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS work_unit_id UUID REFERENCES work_units(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS units_required DECIMAL(10, 2); -- How many units to complete
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS units_completed DECIMAL(10, 2) DEFAULT 0; -- Progress in units
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rate_per_unit DECIMAL(10, 2); -- Payment rate per unit
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS payment_type VARCHAR(20) DEFAULT 'daily' CHECK (payment_type IN ('daily', 'per_unit', 'monthly', 'metayage'));

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_tasks_work_unit ON tasks(work_unit_id);
CREATE INDEX IF NOT EXISTS idx_tasks_payment_type ON tasks(payment_type);

-- 2. LINK PIECE_WORK_RECORDS TO TASKS
-- =====================================================
ALTER TABLE piece_work_records ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_piece_work_task ON piece_work_records(task_id);

-- 3. CREATE TASK COSTS TABLE (for detailed cost tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS task_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Cost Details
  cost_type VARCHAR(50) NOT NULL CHECK (cost_type IN ('labor', 'material', 'equipment', 'utility', 'other')),
  description TEXT,
  quantity DECIMAL(10, 2),
  unit_price DECIMAL(10, 2),
  total_amount DECIMAL(12, 2) NOT NULL,

  -- Payment Status
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'paid', 'cancelled')),
  payment_date DATE,
  payment_reference VARCHAR(100),

  -- Accounting
  journal_entry_id UUID REFERENCES journal_entries(id),
  account_id UUID REFERENCES accounts(id), -- Which expense account to use

  -- Work Unit Reference (if applicable)
  work_unit_id UUID REFERENCES work_units(id),
  units_completed DECIMAL(10, 2),
  rate_per_unit DECIMAL(10, 2),

  -- Worker Reference (if labor cost)
  worker_id UUID REFERENCES workers(id),
  piece_work_record_id UUID REFERENCES piece_work_records(id),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id)
);

-- Enable RLS
ALTER TABLE task_costs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_costs
CREATE POLICY "Users can view costs in their organization"
  ON task_costs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Farm managers and above can create costs"
  ON task_costs FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou
      INNER JOIN roles r ON ou.role_id = r.id
      WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.level <= 3  -- farm_manager or higher
    )
  );

CREATE POLICY "Farm managers and above can update costs"
  ON task_costs FOR UPDATE
  USING (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou
      INNER JOIN roles r ON ou.role_id = r.id
      WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.level <= 3
    )
  );

CREATE POLICY "Admins can delete costs"
  ON task_costs FOR DELETE
  USING (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou
      INNER JOIN roles r ON ou.role_id = r.id
      WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.level <= 2  -- organization_admin or higher
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_costs_task ON task_costs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_costs_type ON task_costs(cost_type);
CREATE INDEX IF NOT EXISTS idx_task_costs_status ON task_costs(payment_status);
CREATE INDEX IF NOT EXISTS idx_task_costs_worker ON task_costs(worker_id);
CREATE INDEX IF NOT EXISTS idx_task_costs_work_unit ON task_costs(work_unit_id);

-- 4. FUNCTION: CALCULATE TASK PAYMENT
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_task_payment(p_task_id UUID)
RETURNS TABLE (
  total_cost DECIMAL,
  labor_cost DECIMAL,
  material_cost DECIMAL,
  units_completed DECIMAL,
  payment_pending DECIMAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(total_amount), 0) as total_cost,
    COALESCE(SUM(CASE WHEN cost_type = 'labor' THEN total_amount ELSE 0 END), 0) as labor_cost,
    COALESCE(SUM(CASE WHEN cost_type = 'material' THEN total_amount ELSE 0 END), 0) as material_cost,
    COALESCE(SUM(units_completed), 0) as units_completed,
    COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN total_amount ELSE 0 END), 0) as payment_pending
  FROM task_costs
  WHERE task_id = p_task_id;
END;
$$;

-- 5. FUNCTION: CREATE TASK COST JOURNAL ENTRY
-- =====================================================
CREATE OR REPLACE FUNCTION create_task_cost_journal_entry(p_task_cost_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_cost RECORD;
  v_journal_id UUID;
  v_expense_account UUID;
  v_accounts_payable UUID;
  v_cash_account UUID;
  v_cost_center_id UUID;
BEGIN
  -- Get task cost details
  SELECT tc.*, t.farm_id, t.parcel_id
  INTO v_task_cost
  FROM task_costs tc
  JOIN tasks t ON tc.task_id = t.id
  WHERE tc.id = p_task_cost_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task cost not found: %', p_task_cost_id;
  END IF;

  -- Skip if journal already created
  IF v_task_cost.journal_entry_id IS NOT NULL THEN
    RETURN v_task_cost.journal_entry_id;
  END IF;

  -- Skip if not paid
  IF v_task_cost.payment_status != 'paid' THEN
    RETURN NULL;
  END IF;

  -- Get or create cost center for the parcel/farm
  IF v_task_cost.parcel_id IS NOT NULL THEN
    SELECT id INTO v_cost_center_id
    FROM cost_centers
    WHERE entity_type = 'parcel'
    AND entity_id = v_task_cost.parcel_id
    AND organization_id = v_task_cost.organization_id;
  ELSIF v_task_cost.farm_id IS NOT NULL THEN
    SELECT id INTO v_cost_center_id
    FROM cost_centers
    WHERE entity_type = 'farm'
    AND entity_id = v_task_cost.farm_id
    AND organization_id = v_task_cost.organization_id;
  END IF;

  -- Get account IDs based on cost type
  SELECT id INTO v_expense_account
  FROM accounts
  WHERE organization_id = v_task_cost.organization_id
  AND account_type = 'expense'
  AND code = CASE v_task_cost.cost_type
    WHEN 'labor' THEN '6211'      -- Labor Expense
    WHEN 'material' THEN '6213'   -- Materials Expense
    WHEN 'equipment' THEN '6214'  -- Equipment Rental
    WHEN 'utility' THEN '6215'    -- Utilities
    ELSE '6290'                    -- Other Operating Expenses
  END
  LIMIT 1;

  -- Get Accounts Payable or Cash account
  IF v_task_cost.payment_date IS NULL THEN
    -- Not yet paid - use Accounts Payable
    SELECT id INTO v_accounts_payable
    FROM accounts
    WHERE organization_id = v_task_cost.organization_id
    AND account_type = 'liability'
    AND code = '2100'  -- Accounts Payable
    LIMIT 1;
  ELSE
    -- Paid - use Cash account
    SELECT id INTO v_cash_account
    FROM accounts
    WHERE organization_id = v_task_cost.organization_id
    AND account_type = 'asset'
    AND code = '1010'  -- Cash
    LIMIT 1;
  END IF;

  -- Create journal entry
  INSERT INTO journal_entries (
    organization_id,
    entry_date,
    entry_type,
    reference,
    description,
    status
  ) VALUES (
    v_task_cost.organization_id,
    COALESCE(v_task_cost.payment_date, v_task_cost.created_at::DATE),
    'expense',
    'TASK-' || LEFT(v_task_cost.task_id::TEXT, 8),
    v_task_cost.description || ' (Task Cost)',
    'posted'
  )
  RETURNING id INTO v_journal_id;

  -- Debit: Expense Account
  IF v_expense_account IS NOT NULL THEN
    INSERT INTO journal_items (
      journal_entry_id,
      account_id,
      debit_amount,
      credit_amount,
      description,
      cost_center_id
    ) VALUES (
      v_journal_id,
      v_expense_account,
      v_task_cost.total_amount,
      0,
      v_task_cost.description,
      v_cost_center_id
    );
  END IF;

  -- Credit: Accounts Payable or Cash
  IF v_cash_account IS NOT NULL THEN
    INSERT INTO journal_items (
      journal_entry_id,
      account_id,
      debit_amount,
      credit_amount,
      description
    ) VALUES (
      v_journal_id,
      v_cash_account,
      0,
      v_task_cost.total_amount,
      'Payment for ' || v_task_cost.description
    );
  ELSIF v_accounts_payable IS NOT NULL THEN
    INSERT INTO journal_items (
      journal_entry_id,
      account_id,
      debit_amount,
      credit_amount,
      description
    ) VALUES (
      v_journal_id,
      v_accounts_payable,
      0,
      v_task_cost.total_amount,
      'Accrued expense for ' || v_task_cost.description
    );
  END IF;

  -- Link journal entry to task cost
  UPDATE task_costs
  SET journal_entry_id = v_journal_id,
      updated_at = NOW()
  WHERE id = p_task_cost_id;

  RETURN v_journal_id;
END;
$$;

-- 6. TRIGGER: AUTO-CREATE JOURNAL WHEN TASK COST IS PAID
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_create_task_cost_journal()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only create journal entry when status changes to 'paid'
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    PERFORM create_task_cost_journal_entry(NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER task_cost_journal_trigger
  AFTER INSERT OR UPDATE OF payment_status ON task_costs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_task_cost_journal();

-- 7. UPDATE TIMESTAMP TRIGGER
-- =====================================================
CREATE TRIGGER update_task_costs_timestamp
  BEFORE UPDATE ON task_costs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. FUNCTION: COMPLETE TASK WITH PAYMENT
-- =====================================================
CREATE OR REPLACE FUNCTION complete_task_with_payment(
  p_task_id UUID,
  p_units_completed DECIMAL DEFAULT NULL,
  p_quality_rating INTEGER DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_task RECORD;
  v_worker RECORD;
  v_piece_work_id UUID;
  v_task_cost_id UUID;
  v_payment_amount DECIMAL;
BEGIN
  -- Get task details
  SELECT * INTO v_task
  FROM tasks
  WHERE id = p_task_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found: %', p_task_id;
  END IF;

  -- Update task completion
  UPDATE tasks
  SET
    status = 'completed',
    completed_date = NOW(),
    actual_end = NOW(),
    units_completed = COALESCE(p_units_completed, units_required, units_completed),
    completion_percentage = 100,
    updated_at = NOW()
  WHERE id = p_task_id;

  -- If payment is per_unit and worker is assigned, create piece-work record
  IF v_task.payment_type = 'per_unit' AND v_task.assigned_to IS NOT NULL AND v_task.work_unit_id IS NOT NULL THEN

    -- Get worker details
    SELECT * INTO v_worker
    FROM workers
    WHERE id = v_task.assigned_to;

    IF FOUND THEN
      -- Calculate payment amount
      v_payment_amount := COALESCE(p_units_completed, v_task.units_required, v_task.units_completed, 0)
                         * COALESCE(v_task.rate_per_unit, v_worker.rate_per_unit, 0);

      -- Create piece-work record
      INSERT INTO piece_work_records (
        organization_id,
        worker_id,
        work_unit_id,
        task_id,
        work_date,
        units_completed,
        rate_per_unit,
        quality_rating,
        notes,
        payment_status
      ) VALUES (
        v_task.organization_id,
        v_task.assigned_to,
        v_task.work_unit_id,
        p_task_id,
        v_task.completed_date::DATE,
        COALESCE(p_units_completed, v_task.units_required, v_task.units_completed),
        COALESCE(v_task.rate_per_unit, v_worker.rate_per_unit),
        p_quality_rating,
        p_notes,
        'pending'
      )
      RETURNING id INTO v_piece_work_id;

      -- Create task cost entry for labor
      INSERT INTO task_costs (
        task_id,
        organization_id,
        cost_type,
        description,
        quantity,
        unit_price,
        total_amount,
        payment_status,
        work_unit_id,
        units_completed,
        rate_per_unit,
        worker_id,
        piece_work_record_id
      ) VALUES (
        p_task_id,
        v_task.organization_id,
        'labor',
        'Piece-work payment: ' || v_task.title,
        COALESCE(p_units_completed, v_task.units_required, v_task.units_completed),
        COALESCE(v_task.rate_per_unit, v_worker.rate_per_unit),
        v_payment_amount,
        'pending',
        v_task.work_unit_id,
        COALESCE(p_units_completed, v_task.units_required, v_task.units_completed),
        COALESCE(v_task.rate_per_unit, v_worker.rate_per_unit),
        v_task.assigned_to,
        v_piece_work_id
      )
      RETURNING id INTO v_task_cost_id;

      RETURN v_task_cost_id;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

-- 9. COMMENTS
-- =====================================================
COMMENT ON TABLE task_costs IS 'Detailed cost tracking for tasks (labor, materials, equipment, utilities)';
COMMENT ON COLUMN tasks.work_unit_id IS 'Work unit for piece-work payment (e.g., per tree, per box, per kg)';
COMMENT ON COLUMN tasks.payment_type IS 'How workers are paid for this task: daily wage, per unit, monthly salary, or metayage';
COMMENT ON COLUMN tasks.units_required IS 'How many units must be completed (e.g., 100 trees to prune)';
COMMENT ON COLUMN tasks.units_completed IS 'Progress tracking in units';
COMMENT ON COLUMN tasks.rate_per_unit IS 'Payment rate per unit for piece-work';
COMMENT ON FUNCTION complete_task_with_payment IS 'Complete a task and automatically create piece-work records and payment entries';
COMMENT ON FUNCTION create_task_cost_journal_entry IS 'Create accounting journal entry when a task cost is paid';
