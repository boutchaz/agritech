-- Unified Worker Management System
-- Supports: Fixed Employees, Daily Workers, and Métayage (Khammass/Rebâa)

-- Drop old tables if they exist (backup data first!)
-- Note: Comment these out if you have existing data you want to migrate
-- DROP TABLE IF EXISTS day_laborers CASCADE;
-- DROP TABLE IF EXISTS employees CASCADE;

-- Create enum for worker types
DO $$ BEGIN
  CREATE TYPE worker_type AS ENUM ('fixed_salary', 'daily_worker', 'metayage');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for payment frequency
DO $$ BEGIN
  CREATE TYPE payment_frequency AS ENUM ('monthly', 'daily', 'per_task', 'harvest_share');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for métayage types
DO $$ BEGIN
  CREATE TYPE metayage_type AS ENUM ('khammass', 'rebaa', 'tholth', 'custom');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create enum for calculation basis
DO $$ BEGIN
  CREATE TYPE calculation_basis AS ENUM ('gross_revenue', 'net_revenue');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Unified workers table
CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Organization & Farm association
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,

  -- Personal Information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  cin TEXT, -- Carte d'Identité Nationale
  phone TEXT,
  email TEXT,
  address TEXT,
  date_of_birth DATE,

  -- Worker Type & Employment Details
  worker_type worker_type NOT NULL DEFAULT 'daily_worker',
  position TEXT, -- Job title/role (e.g., "Chef d'équipe", "Tractoriste", "Ouvrier agricole")
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE, -- For contract end or termination
  is_active BOOLEAN DEFAULT true,

  -- CNSS Declaration
  is_cnss_declared BOOLEAN DEFAULT false,
  cnss_number TEXT,

  -- Fixed Salary Workers
  monthly_salary DECIMAL(10, 2), -- For fixed monthly salary

  -- Daily Workers
  daily_rate DECIMAL(10, 2), -- For daily workers

  -- Métayage (Khammass/Rebâa) Configuration
  metayage_type metayage_type,
  metayage_percentage DECIMAL(5, 2), -- e.g., 20.00 for Khammass, 25.00 for Rebâa, 33.33 for Tholth
  calculation_basis calculation_basis DEFAULT 'net_revenue',

  -- Additional Métayage Details
  metayage_contract_details JSONB, -- For storing specific contract terms
  -- Example: {
  --   "charges_shared": false,
  --   "owner_provides": ["land", "trees", "equipment", "inputs"],
  --   "worker_provides": ["labor"],
  --   "harvest_distribution_rules": "...",
  --   "notes": "..."
  -- }

  -- Skills & Specializations
  specialties TEXT[], -- e.g., ['taille', 'traitement', 'irrigation', 'récolte']
  certifications TEXT[], -- e.g., ['phytosanitaire', 'conduite tracteur']

  -- Payment Information
  payment_frequency payment_frequency,
  bank_account TEXT,
  payment_method TEXT, -- 'cash', 'bank_transfer', 'check'

  -- Work Records
  total_days_worked INTEGER DEFAULT 0,
  total_tasks_completed INTEGER DEFAULT 0,

  -- Notes & Documents
  notes TEXT,
  documents JSONB, -- URLs to stored contracts, ID copies, etc.

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT valid_worker_config CHECK (
    -- Fixed salary workers must have monthly_salary
    (worker_type = 'fixed_salary' AND monthly_salary IS NOT NULL) OR
    -- Daily workers must have daily_rate
    (worker_type = 'daily_worker' AND daily_rate IS NOT NULL) OR
    -- Métayage workers must have percentage and type
    (worker_type = 'metayage' AND metayage_percentage IS NOT NULL AND metayage_type IS NOT NULL)
  ),
  CONSTRAINT valid_metayage_percentage CHECK (
    metayage_percentage IS NULL OR (metayage_percentage > 0 AND metayage_percentage <= 50)
  )
);

-- Work records table (for tracking daily work, tasks, and harvest shares)
CREATE TABLE IF NOT EXISTS work_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,

  -- Work Details
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  task_category TEXT, -- 'pruning', 'harvest', 'treatment', 'irrigation', etc.
  task_description TEXT,

  -- Time Tracking
  hours_worked DECIMAL(5, 2),
  start_time TIME,
  end_time TIME,

  -- Payment for this work
  amount_paid DECIMAL(10, 2),
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'cancelled'
  payment_date DATE,

  -- For piece work
  units_completed DECIMAL(10, 2), -- e.g., kg harvested, trees pruned
  unit_type TEXT, -- 'kg', 'trees', 'rows', etc.
  rate_per_unit DECIMAL(10, 2),

  -- Notes
  notes TEXT,
  supervisor_id UUID REFERENCES workers(id), -- Who supervised this work

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Métayage harvest shares table
CREATE TABLE IF NOT EXISTS metayage_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- References
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,

  -- Settlement Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  harvest_date DATE,

  -- Revenue Calculation
  gross_revenue DECIMAL(12, 2) NOT NULL,
  total_charges DECIMAL(12, 2) DEFAULT 0,
  net_revenue DECIMAL(12, 2) GENERATED ALWAYS AS (gross_revenue - total_charges) STORED,

  -- Worker Share
  worker_percentage DECIMAL(5, 2) NOT NULL,
  worker_share_amount DECIMAL(12, 2) NOT NULL,

  -- Calculation Details
  calculation_basis calculation_basis NOT NULL,
  charges_breakdown JSONB, -- Detailed list of charges deducted

  -- Payment
  payment_status TEXT DEFAULT 'pending',
  payment_date DATE,
  payment_method TEXT,

  -- Notes & Documentation
  notes TEXT,
  documents JSONB, -- Receipts, signed agreements, etc.

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workers_organization ON workers(organization_id);
CREATE INDEX IF NOT EXISTS idx_workers_farm ON workers(farm_id);
CREATE INDEX IF NOT EXISTS idx_workers_type ON workers(worker_type);
CREATE INDEX IF NOT EXISTS idx_workers_active ON workers(is_active);
CREATE INDEX IF NOT EXISTS idx_work_records_worker ON work_records(worker_id);
CREATE INDEX IF NOT EXISTS idx_work_records_date ON work_records(work_date);
CREATE INDEX IF NOT EXISTS idx_metayage_settlements_worker ON metayage_settlements(worker_id);
CREATE INDEX IF NOT EXISTS idx_metayage_settlements_period ON metayage_settlements(period_start, period_end);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_workers_updated_at ON workers;
CREATE TRIGGER update_workers_updated_at
  BEFORE UPDATE ON workers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE metayage_settlements ENABLE ROW LEVEL SECURITY;

-- Workers policies
CREATE POLICY "Users can view workers in their organization"
  ON workers FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Admins and managers can manage workers"
  ON workers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = workers.organization_id
        AND ou.is_active = true
        AND r.name IN ('system_admin', 'organization_admin', 'farm_manager')
    )
  );

-- Work records policies (similar pattern)
CREATE POLICY "Users can view work records in their organization"
  ON work_records FOR SELECT
  USING (
    worker_id IN (
      SELECT id FROM workers WHERE organization_id IN (
        SELECT organization_id FROM organization_users
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Admins and managers can manage work records"
  ON work_records FOR ALL
  USING (
    worker_id IN (
      SELECT w.id FROM workers w
      JOIN organization_users ou ON ou.organization_id = w.organization_id
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('system_admin', 'organization_admin', 'farm_manager')
    )
  );

-- Métayage settlements policies
CREATE POLICY "Users can view settlements in their organization"
  ON metayage_settlements FOR SELECT
  USING (
    worker_id IN (
      SELECT id FROM workers WHERE organization_id IN (
        SELECT organization_id FROM organization_users
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

CREATE POLICY "Admins can manage settlements"
  ON metayage_settlements FOR ALL
  USING (
    worker_id IN (
      SELECT w.id FROM workers w
      JOIN organization_users ou ON ou.organization_id = w.organization_id
      JOIN roles r ON r.id = ou.role_id
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('system_admin', 'organization_admin')
    )
  );

-- Helper function to calculate métayage share
CREATE OR REPLACE FUNCTION calculate_metayage_share(
  p_worker_id UUID,
  p_gross_revenue DECIMAL,
  p_total_charges DECIMAL DEFAULT 0
)
RETURNS DECIMAL AS $$
DECLARE
  v_worker RECORD;
  v_base_amount DECIMAL;
  v_share DECIMAL;
BEGIN
  -- Get worker details
  SELECT * INTO v_worker FROM workers WHERE id = p_worker_id;

  IF v_worker.worker_type != 'metayage' THEN
    RAISE EXCEPTION 'Worker is not a métayage worker';
  END IF;

  -- Calculate base amount based on calculation basis
  IF v_worker.calculation_basis = 'gross_revenue' THEN
    v_base_amount := p_gross_revenue;
  ELSE
    v_base_amount := p_gross_revenue - p_total_charges;
  END IF;

  -- Calculate worker's share
  v_share := v_base_amount * (v_worker.metayage_percentage / 100.0);

  RETURN v_share;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View for easy querying of active workers by type
CREATE OR REPLACE VIEW active_workers_summary AS
SELECT
  w.*,
  o.name as organization_name,
  f.name as farm_name,
  CASE
    WHEN w.worker_type = 'fixed_salary' THEN
      COALESCE(w.monthly_salary::TEXT, 'N/A')
    WHEN w.worker_type = 'daily_worker' THEN
      COALESCE(w.daily_rate::TEXT || ' DH/jour', 'N/A')
    WHEN w.worker_type = 'metayage' THEN
      COALESCE(w.metayage_percentage::TEXT || '% (' ||
        CASE w.metayage_type
          WHEN 'khammass' THEN 'Khammass'
          WHEN 'rebaa' THEN 'Rebâa'
          WHEN 'tholth' THEN 'Tholth'
          ELSE 'Custom'
        END || ')', 'N/A')
  END as compensation_display
FROM workers w
LEFT JOIN organizations o ON o.id = w.organization_id
LEFT JOIN farms f ON f.id = w.farm_id
WHERE w.is_active = true;

COMMENT ON TABLE workers IS 'Unified worker management supporting fixed employees, daily workers, and métayage (Khammass/Rebâa)';
COMMENT ON TABLE work_records IS 'Daily work tracking for all worker types';
COMMENT ON TABLE metayage_settlements IS 'Harvest revenue sharing settlements for métayage workers';
