-- =====================================================
-- CORRECTIVE ACTIONS TABLE
-- =====================================================
-- Tracks corrective action plans for compliance findings
-- =====================================================

CREATE TABLE IF NOT EXISTS corrective_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  compliance_check_id UUID REFERENCES compliance_checks(id) ON DELETE SET NULL,
  certification_id UUID REFERENCES certifications(id) ON DELETE SET NULL,

  -- Finding details
  finding_description TEXT NOT NULL,
  requirement_code VARCHAR(50),

  -- Action details
  priority VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  action_description TEXT NOT NULL,
  responsible_person VARCHAR(255) NOT NULL,
  due_date DATE NOT NULL,

  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'verified', 'overdue')),

  -- Resolution details
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),

  -- Verification details
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,

  -- Additional notes
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_corrective_actions_org ON corrective_actions(organization_id);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_status ON corrective_actions(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_priority ON corrective_actions(organization_id, priority);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_due_date ON corrective_actions(due_date);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_certification ON corrective_actions(certification_id);
CREATE INDEX IF NOT EXISTS idx_corrective_actions_compliance_check ON corrective_actions(compliance_check_id);

-- Enable RLS
ALTER TABLE corrective_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "org_read_corrective_actions" ON corrective_actions;
CREATE POLICY "org_read_corrective_actions" ON corrective_actions
  FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
  ));

DROP POLICY IF EXISTS "org_write_corrective_actions" ON corrective_actions;
CREATE POLICY "org_write_corrective_actions" ON corrective_actions
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON r.id = ou.role_id
    WHERE ou.user_id = auth.uid()
    AND ou.organization_id = corrective_actions.organization_id
    AND r.name IN ('organization_admin', 'farm_manager', 'system_admin')
    AND ou.is_active = true
  ));

DROP POLICY IF EXISTS "org_update_corrective_actions" ON corrective_actions;
CREATE POLICY "org_update_corrective_actions" ON corrective_actions
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON r.id = ou.role_id
    WHERE ou.user_id = auth.uid()
    AND ou.organization_id = corrective_actions.organization_id
    AND r.name IN ('organization_admin', 'farm_manager', 'farm_worker', 'system_admin')
    AND ou.is_active = true
  ));

DROP POLICY IF EXISTS "org_delete_corrective_actions" ON corrective_actions;
CREATE POLICY "org_delete_corrective_actions" ON corrective_actions
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON r.id = ou.role_id
    WHERE ou.user_id = auth.uid()
    AND ou.organization_id = corrective_actions.organization_id
    AND r.name IN ('organization_admin', 'system_admin')
    AND ou.is_active = true
  ));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_corrective_actions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_corrective_actions_updated_at ON corrective_actions;
CREATE TRIGGER trg_corrective_actions_updated_at
  BEFORE UPDATE ON corrective_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_corrective_actions_updated_at();

-- =====================================================
-- CORRECTIVE ACTION EVIDENCE TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS corrective_action_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corrective_action_id UUID NOT NULL REFERENCES corrective_actions(id) ON DELETE CASCADE,

  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  description TEXT,

  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_corrective_action_evidence_action ON corrective_action_evidence(corrective_action_id);

-- Enable RLS
ALTER TABLE corrective_action_evidence ENABLE ROW LEVEL SECURITY;

-- RLS Policies (inherit from corrective_actions)
DROP POLICY IF EXISTS "org_read_corrective_action_evidence" ON corrective_action_evidence;
CREATE POLICY "org_read_corrective_action_evidence" ON corrective_action_evidence
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM corrective_actions ca
    JOIN organization_users ou ON ou.organization_id = ca.organization_id
    WHERE ca.id = corrective_action_evidence.corrective_action_id
    AND ou.user_id = auth.uid() AND ou.is_active = true
  ));

DROP POLICY IF EXISTS "org_write_corrective_action_evidence" ON corrective_action_evidence;
CREATE POLICY "org_write_corrective_action_evidence" ON corrective_action_evidence
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM corrective_actions ca
    JOIN organization_users ou ON ou.organization_id = ca.organization_id
    JOIN roles r ON r.id = ou.role_id
    WHERE ca.id = corrective_action_evidence.corrective_action_id
    AND ou.user_id = auth.uid()
    AND r.name IN ('organization_admin', 'farm_manager', 'farm_worker', 'system_admin')
    AND ou.is_active = true
  ));

DROP POLICY IF EXISTS "org_delete_corrective_action_evidence" ON corrective_action_evidence;
CREATE POLICY "org_delete_corrective_action_evidence" ON corrective_action_evidence
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM corrective_actions ca
    JOIN organization_users ou ON ou.organization_id = ca.organization_id
    JOIN roles r ON r.id = ou.role_id
    WHERE ca.id = corrective_action_evidence.corrective_action_id
    AND ou.user_id = auth.uid()
    AND r.name IN ('organization_admin', 'system_admin')
    AND ou.is_active = true
  ));

-- Comments
COMMENT ON TABLE corrective_actions IS 'Corrective action plans for compliance findings';
COMMENT ON COLUMN corrective_actions.finding_description IS 'Description of the non-compliance finding';
COMMENT ON COLUMN corrective_actions.action_description IS 'Description of the corrective action to be taken';
COMMENT ON COLUMN corrective_actions.priority IS 'Priority level: critical, high, medium, low';
COMMENT ON COLUMN corrective_actions.status IS 'Current status: open, in_progress, resolved, verified, overdue';
