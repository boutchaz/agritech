-- =====================================================
-- UNIT MANAGEMENT & PIECE-WORK PAYMENT SYSTEM
-- =====================================================
-- This migration adds:
-- 1. Work units table (Arbre, Caisse, Kg, Litre, etc.)
-- 2. Piece-work tracking
-- 3. Enhanced payment calculation
-- 4. Automatic accounting integration
-- =====================================================

-- 1. WORK UNITS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS work_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Unit Definition
  code VARCHAR(20) NOT NULL, -- e.g., 'TREE', 'BOX', 'KG', 'L'
  name VARCHAR(100) NOT NULL, -- e.g., 'Arbre', 'Caisse', 'Kilogramme', 'Litre'
  name_ar VARCHAR(100), -- Arabic name
  name_fr VARCHAR(100), -- French name

  -- Unit Type
  unit_category VARCHAR(50) CHECK (unit_category IN ('count', 'weight', 'volume', 'area', 'length')),

  -- Conversion (for standardization)
  base_unit VARCHAR(20), -- e.g., 'kg' for weight, 'liter' for volume
  conversion_factor DECIMAL(10, 4), -- How many base units = 1 of this unit

  -- Configuration
  is_active BOOLEAN DEFAULT TRUE,
  allow_decimal BOOLEAN DEFAULT FALSE, -- Can fractional units be entered?

  -- Usage tracking
  usage_count INTEGER DEFAULT 0, -- How many times this unit has been used

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),

  UNIQUE(organization_id, code),
  UNIQUE(organization_id, name)
);

-- Enable RLS
ALTER TABLE work_units ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view units in their organization"
  ON work_units FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage units in their organization"
  ON work_units FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND role IN ('organization_admin', 'system_admin')
    )
  );

-- Indexes
CREATE INDEX idx_work_units_org ON work_units(organization_id);
CREATE INDEX idx_work_units_category ON work_units(unit_category);
CREATE INDEX idx_work_units_active ON work_units(is_active) WHERE is_active = TRUE;

-- =====================================================
-- 2. PIECE-WORK RECORDS (Work done by unit)
-- =====================================================
CREATE TABLE IF NOT EXISTS piece_work_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,

  -- Worker
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,

  -- Work Details
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL, -- Link to task if applicable
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,

  -- Unit-based tracking
  work_unit_id UUID NOT NULL REFERENCES work_units(id),
  units_completed DECIMAL(10, 2) NOT NULL CHECK (units_completed > 0),
  rate_per_unit DECIMAL(10, 2) NOT NULL CHECK (rate_per_unit >= 0),

  -- Calculated
  total_amount DECIMAL(12, 2) GENERATED ALWAYS AS (units_completed * rate_per_unit) STORED,

  -- Quality & Verification
  quality_rating INTEGER CHECK (quality_rating BETWEEN 1 AND 5),
  verified_by UUID REFERENCES user_profiles(id),
  verified_at TIMESTAMPTZ,

  -- Payment linkage
  payment_record_id UUID REFERENCES payment_records(id) ON DELETE SET NULL,
  payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'paid', 'disputed', 'cancelled')),

  -- Time tracking (optional - for productivity analysis)
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  break_duration INTEGER DEFAULT 0, -- in minutes

  -- Notes & Attachments
  notes TEXT,
  attachments JSONB, -- Array of file URLs

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id)
);

-- Enable RLS
ALTER TABLE piece_work_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view piece work in their organization"
  ON piece_work_records FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Farm managers and admins can manage piece work"
  ON piece_work_records FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND role IN ('organization_admin', 'farm_manager', 'system_admin')
    )
  );

CREATE POLICY "Workers can view their own piece work"
  ON piece_work_records FOR SELECT
  USING (
    worker_id IN (
      SELECT id FROM workers WHERE user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_piece_work_org ON piece_work_records(organization_id);
CREATE INDEX idx_piece_work_farm ON piece_work_records(farm_id);
CREATE INDEX idx_piece_work_worker ON piece_work_records(worker_id);
CREATE INDEX idx_piece_work_date ON piece_work_records(work_date);
CREATE INDEX idx_piece_work_task ON piece_work_records(task_id);
CREATE INDEX idx_piece_work_payment ON piece_work_records(payment_record_id);
CREATE INDEX idx_piece_work_status ON piece_work_records(payment_status);

-- =====================================================
-- 3. EXTEND WORKERS TABLE FOR UNIT-BASED PAYMENT
-- =====================================================
-- Add columns to workers table if they don't exist
DO $$
BEGIN
  -- Default work unit for this worker
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='workers' AND column_name='default_work_unit_id') THEN
    ALTER TABLE workers ADD COLUMN default_work_unit_id UUID REFERENCES work_units(id);
  END IF;

  -- Rate per unit (for piece-work)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='workers' AND column_name='rate_per_unit') THEN
    ALTER TABLE workers ADD COLUMN rate_per_unit DECIMAL(10, 2);
  END IF;

  -- Update payment_frequency enum to include 'per_unit'
  -- Note: Cannot directly alter enum, need to use ALTER TYPE
END $$;

-- Safely add 'per_unit' to payment_frequency enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'per_unit'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'payment_frequency_enum')
  ) THEN
    -- Create new enum with per_unit
    ALTER TYPE payment_frequency_enum ADD VALUE 'per_unit';
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    -- If enum doesn't exist, it might be using TEXT CHECK constraint
    -- Check if we need to update constraint
    NULL;
END $$;

-- =====================================================
-- 4. EXTEND PAYMENT_RECORDS TABLE
-- =====================================================
DO $$
BEGIN
  -- Add piece-work columns to payment_records
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='payment_records' AND column_name='units_completed') THEN
    ALTER TABLE payment_records ADD COLUMN units_completed DECIMAL(10, 2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='payment_records' AND column_name='unit_rate') THEN
    ALTER TABLE payment_records ADD COLUMN unit_rate DECIMAL(10, 2);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='payment_records' AND column_name='piece_work_ids') THEN
    ALTER TABLE payment_records ADD COLUMN piece_work_ids UUID[];
  END IF;
END $$;

-- Update net_amount calculation to include piece-work
-- Note: This requires recreating the generated column
-- Only do this if the column exists and needs updating
DO $$
BEGIN
  -- Drop existing generated column
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='payment_records' AND column_name='net_amount'
             AND is_generated = 'ALWAYS') THEN
    ALTER TABLE payment_records DROP COLUMN net_amount;
  END IF;

  -- Recreate with updated formula
  -- net_amount = base_amount + bonuses - deductions + overtime_amount - advance_deduction
  -- Note: piece-work amount is already in base_amount when calculated
  ALTER TABLE payment_records ADD COLUMN net_amount DECIMAL(12, 2)
    GENERATED ALWAYS AS (
      COALESCE(base_amount, 0) +
      COALESCE(bonuses, 0) -
      COALESCE(deductions, 0) +
      COALESCE(overtime_amount, 0) -
      COALESCE(advance_deduction, 0)
    ) STORED;
END $$;

-- =====================================================
-- 5. PAYMENT CALCULATION FUNCTION (UNIT-BASED)
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_piece_work_payment(
  p_worker_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS TABLE (
  base_amount DECIMAL,
  units_completed DECIMAL,
  piece_work_count INTEGER,
  piece_work_ids UUID[]
) AS $$
DECLARE
  v_base_amount DECIMAL := 0;
  v_units_completed DECIMAL := 0;
  v_piece_work_count INTEGER := 0;
  v_piece_work_ids UUID[];
BEGIN
  -- Calculate total from piece_work_records
  SELECT
    COALESCE(SUM(pwr.total_amount), 0),
    COALESCE(SUM(pwr.units_completed), 0),
    COUNT(*),
    ARRAY_AGG(pwr.id)
  INTO
    v_base_amount,
    v_units_completed,
    v_piece_work_count,
    v_piece_work_ids
  FROM piece_work_records pwr
  WHERE pwr.worker_id = p_worker_id
    AND pwr.work_date BETWEEN p_period_start AND p_period_end
    AND pwr.payment_status = 'pending';

  RETURN QUERY SELECT v_base_amount, v_units_completed, v_piece_work_count, v_piece_work_ids;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. UNIFIED PAYMENT CALCULATION (ALL TYPES)
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_worker_payment(
  p_worker_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS TABLE (
  payment_type TEXT,
  base_amount DECIMAL,
  days_worked INTEGER,
  hours_worked DECIMAL,
  units_completed DECIMAL,
  tasks_completed INTEGER,
  overtime_amount DECIMAL,
  piece_work_ids UUID[],
  tasks_completed_ids UUID[]
) AS $$
DECLARE
  v_worker_type TEXT;
  v_payment_frequency TEXT;
  v_daily_rate DECIMAL;
  v_monthly_salary DECIMAL;
  v_rate_per_unit DECIMAL;

  v_payment_type TEXT;
  v_base_amount DECIMAL := 0;
  v_days_worked INTEGER := 0;
  v_hours_worked DECIMAL := 0;
  v_units_completed DECIMAL := 0;
  v_tasks_completed INTEGER := 0;
  v_overtime_amount DECIMAL := 0;
  v_piece_work_ids UUID[];
  v_tasks_completed_ids UUID[];
BEGIN
  -- Get worker configuration
  SELECT
    w.worker_type,
    w.payment_frequency,
    w.daily_rate,
    w.monthly_salary,
    w.rate_per_unit
  INTO
    v_worker_type,
    v_payment_frequency,
    v_daily_rate,
    v_monthly_salary,
    v_rate_per_unit
  FROM workers w
  WHERE w.id = p_worker_id;

  -- Determine payment type
  IF v_payment_frequency = 'per_unit' THEN
    v_payment_type := 'piece_work';

    -- Calculate piece-work payment
    SELECT * INTO v_base_amount, v_units_completed, v_tasks_completed, v_piece_work_ids
    FROM calculate_piece_work_payment(p_worker_id, p_period_start, p_period_end);

  ELSIF v_worker_type = 'daily_worker' THEN
    v_payment_type := 'daily_wage';

    -- Count days worked from work_records
    SELECT
      COUNT(DISTINCT wr.work_date),
      COALESCE(SUM(wr.hours_worked), 0)
    INTO v_days_worked, v_hours_worked
    FROM work_records wr
    WHERE wr.worker_id = p_worker_id
      AND wr.work_date BETWEEN p_period_start AND p_period_end;

    -- Calculate base amount
    v_base_amount := v_days_worked * COALESCE(v_daily_rate, 0);

    -- Calculate overtime (hours > 8 per day at 1.5x rate)
    IF v_hours_worked > (v_days_worked * 8) THEN
      v_overtime_amount := (v_hours_worked - (v_days_worked * 8)) * (COALESCE(v_daily_rate, 0) / 8) * 1.5;
    END IF;

  ELSIF v_worker_type = 'fixed_salary' THEN
    v_payment_type := 'monthly_salary';
    v_base_amount := COALESCE(v_monthly_salary, 0);

  ELSE
    v_payment_type := 'other';
  END IF;

  -- Count completed tasks (for all types)
  SELECT
    COUNT(*),
    ARRAY_AGG(t.id)
  INTO v_tasks_completed, v_tasks_completed_ids
  FROM tasks t
  WHERE t.assigned_to = p_worker_id
    AND t.status = 'completed'
    AND t.completed_date BETWEEN p_period_start AND p_period_end;

  RETURN QUERY SELECT
    v_payment_type,
    v_base_amount,
    v_days_worked,
    v_hours_worked,
    v_units_completed,
    v_tasks_completed,
    v_overtime_amount,
    v_piece_work_ids,
    v_tasks_completed_ids;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. AUTOMATIC ACCOUNTING INTEGRATION
-- =====================================================
-- Function to create journal entry from payment record
CREATE OR REPLACE FUNCTION create_payment_journal_entry(
  p_payment_record_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_journal_entry_id UUID;
  v_organization_id UUID;
  v_farm_id UUID;
  v_worker_id UUID;
  v_net_amount DECIMAL;
  v_payment_date DATE;
  v_payment_method TEXT;
  v_payment_type TEXT;
  v_reference TEXT;

  -- Account IDs (need to be looked up)
  v_labor_expense_account_id UUID;
  v_cash_account_id UUID;
  v_bank_account_id UUID;
  v_payable_account_id UUID;
  v_target_account_id UUID;

  -- Cost center
  v_cost_center_id UUID;
BEGIN
  -- Get payment record details
  SELECT
    pr.organization_id,
    pr.farm_id,
    pr.worker_id,
    pr.net_amount,
    pr.payment_date,
    pr.payment_method,
    pr.payment_type,
    pr.payment_reference
  INTO
    v_organization_id,
    v_farm_id,
    v_worker_id,
    v_net_amount,
    v_payment_date,
    v_payment_method,
    v_payment_type,
    v_reference
  FROM payment_records pr
  WHERE pr.id = p_payment_record_id;

  -- Look up labor expense account (e.g., code 6200)
  SELECT id INTO v_labor_expense_account_id
  FROM accounts
  WHERE organization_id = v_organization_id
    AND account_type = 'Expense'
    AND account_subtype ILIKE '%labor%'
  LIMIT 1;

  -- Look up payment account based on payment method
  IF v_payment_method = 'cash' THEN
    SELECT id INTO v_cash_account_id
    FROM accounts
    WHERE organization_id = v_organization_id
      AND account_type = 'Asset'
      AND account_subtype ILIKE '%cash%'
    LIMIT 1;
    v_target_account_id := v_cash_account_id;

  ELSIF v_payment_method IN ('bank_transfer', 'check') THEN
    SELECT id INTO v_bank_account_id
    FROM accounts
    WHERE organization_id = v_organization_id
      AND account_type = 'Asset'
      AND account_subtype ILIKE '%bank%'
    LIMIT 1;
    v_target_account_id := v_bank_account_id;

  ELSE
    -- For other methods or pending payments, use accounts payable
    SELECT id INTO v_payable_account_id
    FROM accounts
    WHERE organization_id = v_organization_id
      AND account_type = 'Liability'
      AND account_subtype ILIKE '%payable%'
    LIMIT 1;
    v_target_account_id := v_payable_account_id;
  END IF;

  -- Get cost center for farm
  SELECT id INTO v_cost_center_id
  FROM cost_centers
  WHERE organization_id = v_organization_id
    AND farm_id = v_farm_id
  LIMIT 1;

  -- Skip if accounts not found
  IF v_labor_expense_account_id IS NULL OR v_target_account_id IS NULL THEN
    RAISE NOTICE 'Required accounts not found for organization %. Skipping journal entry.', v_organization_id;
    RETURN NULL;
  END IF;

  -- Create journal entry
  INSERT INTO journal_entries (
    organization_id,
    entry_date,
    entry_type,
    reference,
    description,
    source_document_type,
    source_document_id,
    status,
    created_by
  ) VALUES (
    v_organization_id,
    COALESCE(v_payment_date, CURRENT_DATE),
    'payment',
    COALESCE(v_reference, 'PAY-' || p_payment_record_id::TEXT),
    'Labor payment - ' || v_payment_type,
    'payment_record',
    p_payment_record_id,
    'posted',
    auth.uid()
  )
  RETURNING id INTO v_journal_entry_id;

  -- Create debit line (Labor Expense)
  INSERT INTO journal_items (
    journal_entry_id,
    account_id,
    cost_center_id,
    debit,
    credit,
    description
  ) VALUES (
    v_journal_entry_id,
    v_labor_expense_account_id,
    v_cost_center_id,
    v_net_amount,
    0,
    'Labor expense'
  );

  -- Create credit line (Cash/Bank/Payable)
  INSERT INTO journal_items (
    journal_entry_id,
    account_id,
    debit,
    credit,
    description
  ) VALUES (
    v_journal_entry_id,
    v_target_account_id,
    0,
    v_net_amount,
    'Payment to worker - ' || v_payment_method
  );

  RETURN v_journal_entry_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. TRIGGER: Auto-create journal entry on payment
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_create_payment_journal()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create journal entry when payment is marked as 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
    PERFORM create_payment_journal_entry(NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS payment_record_journal_trigger ON payment_records;
CREATE TRIGGER payment_record_journal_trigger
  AFTER INSERT OR UPDATE OF status ON payment_records
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_payment_journal();

-- =====================================================
-- 9. UPDATE TRIGGER: Link piece work to payment
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_link_piece_work_to_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- When payment_record_id is set, update payment_status
  IF NEW.payment_record_id IS NOT NULL AND (OLD.payment_record_id IS NULL OR OLD.payment_record_id != NEW.payment_record_id) THEN
    NEW.payment_status := 'approved';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS piece_work_payment_link_trigger ON piece_work_records;
CREATE TRIGGER piece_work_payment_link_trigger
  BEFORE UPDATE OF payment_record_id ON piece_work_records
  FOR EACH ROW
  EXECUTE FUNCTION trigger_link_piece_work_to_payment();

-- =====================================================
-- 10. SEED DEFAULT WORK UNITS
-- =====================================================
-- Insert common work units for each organization
-- (This should be run per organization, or via application logic)
CREATE OR REPLACE FUNCTION seed_default_work_units(p_organization_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Count-based units
  INSERT INTO work_units (organization_id, code, name, name_fr, name_ar, unit_category, allow_decimal, created_by)
  VALUES
    (p_organization_id, 'TREE', 'Tree', 'Arbre', 'شجرة', 'count', false, auth.uid()),
    (p_organization_id, 'PLANT', 'Plant', 'Plante', 'نبتة', 'count', false, auth.uid()),
    (p_organization_id, 'UNIT', 'Unit', 'Unité', 'وحدة', 'count', false, auth.uid()),
    (p_organization_id, 'BOX', 'Box', 'Caisse', 'صندوق', 'count', false, auth.uid()),
    (p_organization_id, 'CRATE', 'Crate', 'Caisse', 'قفص', 'count', false, auth.uid()),
    (p_organization_id, 'BAG', 'Bag', 'Sac', 'كيس', 'count', false, auth.uid()),

    -- Weight units
    (p_organization_id, 'KG', 'Kilogram', 'Kilogramme', 'كيلوغرام', 'weight', true, auth.uid()),
    (p_organization_id, 'TON', 'Ton', 'Tonne', 'طن', 'weight', true, auth.uid()),
    (p_organization_id, 'QUINTAL', 'Quintal', 'Quintal', 'قنطار', 'weight', true, auth.uid()),

    -- Volume units
    (p_organization_id, 'LITER', 'Liter', 'Litre', 'لتر', 'volume', true, auth.uid()),
    (p_organization_id, 'M3', 'Cubic meter', 'Mètre cube', 'متر مكعب', 'volume', true, auth.uid()),

    -- Area units
    (p_organization_id, 'HA', 'Hectare', 'Hectare', 'هكتار', 'area', true, auth.uid()),
    (p_organization_id, 'M2', 'Square meter', 'Mètre carré', 'متر مربع', 'area', true, auth.uid()),

    -- Length units
    (p_organization_id, 'M', 'Meter', 'Mètre', 'متر', 'length', true, auth.uid()),
    (p_organization_id, 'KM', 'Kilometer', 'Kilomètre', 'كيلومتر', 'length', true, auth.uid())
  ON CONFLICT (organization_id, code) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11. HELPER VIEWS
-- =====================================================
-- View: Worker payment summary
CREATE OR REPLACE VIEW worker_payment_summary AS
SELECT
  w.id AS worker_id,
  w.first_name,
  w.last_name,
  w.organization_id,
  w.worker_type,
  w.payment_frequency,
  w.daily_rate,
  w.rate_per_unit,
  wu.name AS default_unit_name,

  -- Piece-work stats
  COUNT(DISTINCT pwr.id) AS total_piece_work_entries,
  SUM(pwr.units_completed) AS total_units_completed,
  SUM(pwr.total_amount) AS total_piece_work_earnings,

  -- Payment stats
  COUNT(DISTINCT pr.id) AS total_payments,
  SUM(pr.net_amount) AS total_paid_amount,
  SUM(CASE WHEN pr.status = 'pending' THEN pr.net_amount ELSE 0 END) AS pending_amount
FROM workers w
LEFT JOIN work_units wu ON wu.id = w.default_work_unit_id
LEFT JOIN piece_work_records pwr ON pwr.worker_id = w.id
LEFT JOIN payment_records pr ON pr.worker_id = w.id
GROUP BY w.id, w.first_name, w.last_name, w.organization_id, w.worker_type, w.payment_frequency, w.daily_rate, w.rate_per_unit, wu.name;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Summary:
-- ✓ work_units table for managing work units (Arbre, Caisse, Kg, Litre, etc.)
-- ✓ piece_work_records for tracking unit-based work
-- ✓ Extended workers and payment_records tables
-- ✓ Payment calculation functions for all payment types
-- ✓ Automatic journal entry creation on payment
-- ✓ Triggers for automatic accounting integration
-- ✓ Default units seeding function
-- ✓ Helper views for reporting
-- =====================================================
