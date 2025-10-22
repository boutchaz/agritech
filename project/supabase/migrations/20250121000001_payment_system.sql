-- =====================================================
-- COMPREHENSIVE PAYMENT MANAGEMENT SYSTEM
-- Migration: Unified payment tracking for all worker types
-- with advances, deductions, and approval workflows
-- =====================================================

-- =====================================================
-- PAYMENT RECORDS TABLE (Main Payment Tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  
  -- Payment Details
  payment_type TEXT NOT NULL CHECK (
    payment_type IN ('daily_wage', 'monthly_salary', 'metayage_share', 'bonus', 'overtime', 'advance')
  ),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Calculation Details
  base_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  bonuses DECIMAL(12, 2) DEFAULT 0,
  deductions DECIMAL(12, 2) DEFAULT 0,
  overtime_amount DECIMAL(12, 2) DEFAULT 0,
  advance_deduction DECIMAL(12, 2) DEFAULT 0,
  net_amount DECIMAL(12, 2) GENERATED ALWAYS AS (
    base_amount + bonuses - deductions + overtime_amount - advance_deduction
  ) STORED,
  
  -- Work Summary
  days_worked INTEGER DEFAULT 0,
  hours_worked DECIMAL(6, 2) DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  tasks_completed_ids UUID[], -- array of task IDs
  
  -- Métayage specific
  harvest_amount DECIMAL(10, 2), -- kg or units
  gross_revenue DECIMAL(12, 2),
  total_charges DECIMAL(12, 2),
  metayage_percentage DECIMAL(5, 2),
  
  -- Payment Status
  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'paid', 'disputed', 'cancelled')
  ),
  payment_method TEXT CHECK (
    payment_method IN ('cash', 'bank_transfer', 'check', 'mobile_money')
  ),
  payment_date DATE,
  payment_reference TEXT,
  
  -- Approvals
  calculated_by UUID REFERENCES auth.users(id),
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  paid_by UUID REFERENCES auth.users(id),
  paid_at TIMESTAMPTZ,
  
  -- Additional Info
  notes TEXT,
  attachments JSONB, -- receipts, signed documents
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payment_records_organization_id ON payment_records(organization_id);
CREATE INDEX idx_payment_records_worker_id ON payment_records(worker_id);
CREATE INDEX idx_payment_records_status ON payment_records(status);
CREATE INDEX idx_payment_records_period ON payment_records(period_start, period_end);
CREATE INDEX idx_payment_records_payment_date ON payment_records(payment_date DESC);

COMMENT ON TABLE payment_records IS 'Unified payment tracking for all worker types with approval workflow';

-- =====================================================
-- PAYMENT ADVANCES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_advances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE CASCADE,
  
  amount DECIMAL(10, 2) NOT NULL,
  requested_date DATE NOT NULL DEFAULT CURRENT_DATE,
  approved_by UUID REFERENCES auth.users(id),
  approved_date DATE,
  reason TEXT,
  
  status TEXT DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'paid', 'rejected', 'cancelled')
  ),
  
  -- Deduction Plan
  deduction_plan JSONB, -- {installments: 3, amount_per_installment: 1000}
  remaining_balance DECIMAL(10, 2),
  
  -- Payment info
  paid_by UUID REFERENCES auth.users(id),
  paid_date DATE,
  payment_method TEXT,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_payment_advances_worker_id ON payment_advances(worker_id);
CREATE INDEX idx_payment_advances_status ON payment_advances(status);
CREATE INDEX idx_payment_advances_requested_date ON payment_advances(requested_date DESC);

COMMENT ON TABLE payment_advances IS 'Worker advance payment requests and tracking';

-- =====================================================
-- PAYMENT DEDUCTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_deductions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_record_id UUID NOT NULL REFERENCES payment_records(id) ON DELETE CASCADE,
  
  deduction_type TEXT NOT NULL CHECK (
    deduction_type IN ('cnss', 'tax', 'advance_repayment', 'equipment_damage', 'other')
  ),
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  reference TEXT, -- advance_id, invoice number, etc.
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_deductions_payment_record_id ON payment_deductions(payment_record_id);
CREATE INDEX idx_payment_deductions_type ON payment_deductions(deduction_type);

COMMENT ON TABLE payment_deductions IS 'Detailed breakdown of payment deductions';

-- =====================================================
-- PAYMENT BONUSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_record_id UUID NOT NULL REFERENCES payment_records(id) ON DELETE CASCADE,
  
  bonus_type TEXT NOT NULL CHECK (
    bonus_type IN ('performance', 'attendance', 'quality', 'productivity', 'other')
  ),
  amount DECIMAL(10, 2) NOT NULL,
  description TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_bonuses_payment_record_id ON payment_bonuses(payment_record_id);

COMMENT ON TABLE payment_bonuses IS 'Detailed breakdown of payment bonuses';

-- =====================================================
-- UPDATE TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS update_payment_records_updated_at ON payment_records;
CREATE TRIGGER update_payment_records_updated_at 
  BEFORE UPDATE ON payment_records 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_advances_updated_at ON payment_advances;
CREATE TRIGGER update_payment_advances_updated_at 
  BEFORE UPDATE ON payment_advances 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PAYMENT CALCULATION FUNCTIONS
-- =====================================================

-- Function to calculate daily worker payment
CREATE OR REPLACE FUNCTION calculate_daily_worker_payment(
  p_worker_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS TABLE (
  base_amount DECIMAL,
  days_worked INTEGER,
  hours_worked DECIMAL,
  tasks_completed INTEGER,
  overtime_amount DECIMAL
) AS $$
DECLARE
  v_daily_rate DECIMAL;
  v_base_amount DECIMAL := 0;
  v_days_worked INTEGER := 0;
  v_hours_worked DECIMAL := 0;
  v_tasks_completed INTEGER := 0;
  v_overtime_amount DECIMAL := 0;
BEGIN
  -- Get worker's daily rate
  SELECT w.daily_rate INTO v_daily_rate
  FROM workers w
  WHERE w.id = p_worker_id;
  
  IF v_daily_rate IS NULL THEN
    RAISE EXCEPTION 'Worker does not have a daily rate configured';
  END IF;
  
  -- Count days worked from work_records
  SELECT 
    COUNT(DISTINCT wr.work_date),
    COALESCE(SUM(wr.hours_worked), 0)
  INTO v_days_worked, v_hours_worked
  FROM work_records wr
  WHERE wr.worker_id = p_worker_id
    AND wr.work_date BETWEEN p_period_start AND p_period_end;
  
  -- Count completed tasks
  SELECT COUNT(*)
  INTO v_tasks_completed
  FROM tasks t
  WHERE t.assigned_to = p_worker_id
    AND t.status = 'completed'
    AND t.completed_date BETWEEN p_period_start AND p_period_end;
  
  -- Calculate base amount
  v_base_amount := v_days_worked * v_daily_rate;
  
  -- Calculate overtime (hours > 8 per day at 1.5x rate)
  IF v_hours_worked > (v_days_worked * 8) THEN
    v_overtime_amount := (v_hours_worked - (v_days_worked * 8)) * (v_daily_rate / 8) * 1.5;
  END IF;
  
  RETURN QUERY SELECT 
    v_base_amount,
    v_days_worked,
    v_hours_worked,
    v_tasks_completed,
    v_overtime_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate fixed salary worker payment
CREATE OR REPLACE FUNCTION calculate_fixed_salary_payment(
  p_worker_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS TABLE (
  base_amount DECIMAL,
  days_worked INTEGER,
  hours_worked DECIMAL,
  tasks_completed INTEGER,
  overtime_amount DECIMAL
) AS $$
DECLARE
  v_monthly_salary DECIMAL;
  v_base_amount DECIMAL := 0;
  v_days_worked INTEGER := 0;
  v_hours_worked DECIMAL := 0;
  v_tasks_completed INTEGER := 0;
  v_overtime_amount DECIMAL := 0;
  v_hourly_rate DECIMAL;
BEGIN
  -- Get worker's monthly salary
  SELECT w.monthly_salary INTO v_monthly_salary
  FROM workers w
  WHERE w.id = p_worker_id;
  
  IF v_monthly_salary IS NULL THEN
    RAISE EXCEPTION 'Worker does not have a monthly salary configured';
  END IF;
  
  -- Base amount is monthly salary
  v_base_amount := v_monthly_salary;
  
  -- Calculate hourly rate (based on 176 hours/month)
  v_hourly_rate := v_monthly_salary / 176;
  
  -- Get work hours from time logs
  SELECT 
    COUNT(DISTINCT DATE(ttl.start_time)),
    COALESCE(SUM(ttl.total_hours), 0)
  INTO v_days_worked, v_hours_worked
  FROM task_time_logs ttl
  WHERE ttl.worker_id = p_worker_id
    AND DATE(ttl.start_time) BETWEEN p_period_start AND p_period_end;
  
  -- Count completed tasks
  SELECT COUNT(*)
  INTO v_tasks_completed
  FROM tasks t
  WHERE t.assigned_to = p_worker_id
    AND t.status = 'completed'
    AND t.completed_date BETWEEN p_period_start AND p_period_end;
  
  -- Calculate overtime (hours > 176 per month at 1.5x rate)
  IF v_hours_worked > 176 THEN
    v_overtime_amount := (v_hours_worked - 176) * v_hourly_rate * 1.5;
  END IF;
  
  RETURN QUERY SELECT 
    v_base_amount,
    v_days_worked,
    v_hours_worked,
    v_tasks_completed,
    v_overtime_amount;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending advances for worker
CREATE OR REPLACE FUNCTION get_worker_advance_deductions(
  p_worker_id UUID,
  p_payment_date DATE
)
RETURNS DECIMAL AS $$
DECLARE
  v_total_deductions DECIMAL := 0;
BEGIN
  SELECT COALESCE(SUM(
    CASE 
      WHEN (deduction_plan->>'installments')::INTEGER > 0 THEN
        (deduction_plan->>'amount_per_installment')::DECIMAL
      ELSE remaining_balance
    END
  ), 0)
  INTO v_total_deductions
  FROM payment_advances
  WHERE worker_id = p_worker_id
    AND status = 'paid'
    AND remaining_balance > 0
    AND approved_date <= p_payment_date;
  
  RETURN v_total_deductions;
END;
$$ LANGUAGE plpgsql;

-- Function to update advance balance after payment
CREATE OR REPLACE FUNCTION update_advance_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    -- Update remaining balances of advances being deducted
    UPDATE payment_advances
    SET 
      remaining_balance = GREATEST(0, remaining_balance - 
        CASE 
          WHEN (deduction_plan->>'installments')::INTEGER > 0 THEN
            (deduction_plan->>'amount_per_installment')::DECIMAL
          ELSE remaining_balance
        END
      ),
      updated_at = NOW()
    WHERE worker_id = NEW.worker_id
      AND status = 'paid'
      AND remaining_balance > 0;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_advance_balance_on_payment ON payment_records;
CREATE TRIGGER update_advance_balance_on_payment
  AFTER UPDATE ON payment_records
  FOR EACH ROW
  WHEN (NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid'))
  EXECUTE FUNCTION update_advance_balance();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_bonuses ENABLE ROW LEVEL SECURITY;

-- Payment Records Policies
CREATE POLICY "Users can view payments in their organization" 
  ON payment_records FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins and managers can create payments" 
  ON payment_records FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid() 
        AND ou.is_active = true
        AND r.name IN ('system_admin', 'organization_admin', 'farm_manager')
    )
  );

CREATE POLICY "Admins and managers can update payments" 
  ON payment_records FOR UPDATE
  USING (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid() 
        AND ou.is_active = true
        AND r.name IN ('system_admin', 'organization_admin', 'farm_manager')
    )
  );

-- Payment Advances Policies
CREATE POLICY "Users can view advances in their organization" 
  ON payment_advances FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Workers can request advances" 
  ON payment_advances FOR INSERT
  WITH CHECK (
    worker_id IN (
      SELECT id FROM workers w
      WHERE w.organization_id IN (
        SELECT organization_id FROM organization_users 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Managers can approve advances" 
  ON payment_advances FOR UPDATE
  USING (
    organization_id IN (
      SELECT ou.organization_id FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid() 
        AND ou.is_active = true
        AND r.name IN ('system_admin', 'organization_admin', 'farm_manager')
    )
  );

-- Payment Deductions Policies
CREATE POLICY "Users can view deductions for accessible payments" 
  ON payment_deductions FOR SELECT
  USING (
    payment_record_id IN (
      SELECT id FROM payment_records pr
      WHERE pr.organization_id IN (
        SELECT organization_id FROM organization_users 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Managers can manage deductions" 
  ON payment_deductions FOR ALL
  USING (
    payment_record_id IN (
      SELECT pr.id FROM payment_records pr
      WHERE pr.organization_id IN (
        SELECT ou.organization_id FROM organization_users ou
        JOIN roles r ON r.id = ou.role_id
        WHERE ou.user_id = auth.uid() 
          AND ou.is_active = true
          AND r.name IN ('system_admin', 'organization_admin', 'farm_manager')
      )
    )
  );

-- Payment Bonuses Policies (same as deductions)
CREATE POLICY "Users can view bonuses for accessible payments" 
  ON payment_bonuses FOR SELECT
  USING (
    payment_record_id IN (
      SELECT id FROM payment_records pr
      WHERE pr.organization_id IN (
        SELECT organization_id FROM organization_users 
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Managers can manage bonuses" 
  ON payment_bonuses FOR ALL
  USING (
    payment_record_id IN (
      SELECT pr.id FROM payment_records pr
      WHERE pr.organization_id IN (
        SELECT ou.organization_id FROM organization_users ou
        JOIN roles r ON r.id = ou.role_id
        WHERE ou.user_id = auth.uid() 
          AND ou.is_active = true
          AND r.name IN ('system_admin', 'organization_admin', 'farm_manager')
      )
    )
  );

-- =====================================================
-- HELPFUL VIEWS
-- =====================================================

CREATE OR REPLACE VIEW payment_summary AS
SELECT 
  pr.*,
  w.first_name || ' ' || w.last_name AS worker_name,
  w.worker_type,
  w.position,
  f.name AS farm_name,
  o.name AS organization_name,
  calc_user.email AS calculated_by_email,
  appr_user.email AS approved_by_email,
  paid_user.email AS paid_by_email,
  (SELECT COUNT(*) FROM payment_deductions WHERE payment_record_id = pr.id) AS deduction_count,
  (SELECT COUNT(*) FROM payment_bonuses WHERE payment_record_id = pr.id) AS bonus_count
FROM payment_records pr
LEFT JOIN workers w ON w.id = pr.worker_id
LEFT JOIN farms f ON f.id = pr.farm_id
LEFT JOIN organizations o ON o.id = pr.organization_id
LEFT JOIN auth.users calc_user ON calc_user.id = pr.calculated_by
LEFT JOIN auth.users appr_user ON appr_user.id = pr.approved_by
LEFT JOIN auth.users paid_user ON paid_user.id = pr.paid_by;

COMMENT ON VIEW payment_summary IS 'Comprehensive payment view with worker and approval information';

-- View for worker payment history
CREATE OR REPLACE VIEW worker_payment_history AS
SELECT 
  w.id AS worker_id,
  w.first_name || ' ' || w.last_name AS worker_name,
  w.worker_type,
  COUNT(pr.id) AS total_payments,
  SUM(CASE WHEN pr.status = 'paid' THEN pr.net_amount ELSE 0 END) AS total_paid,
  SUM(CASE WHEN pr.status = 'pending' THEN pr.net_amount ELSE 0 END) AS pending_amount,
  SUM(CASE WHEN pr.status = 'approved' THEN pr.net_amount ELSE 0 END) AS approved_amount,
  MAX(pr.payment_date) AS last_payment_date,
  AVG(CASE WHEN pr.status = 'paid' THEN pr.net_amount ELSE NULL END) AS average_payment
FROM workers w
LEFT JOIN payment_records pr ON pr.worker_id = w.id
GROUP BY w.id, w.first_name, w.last_name, w.worker_type;

COMMENT ON VIEW worker_payment_history IS 'Worker payment statistics and history';

