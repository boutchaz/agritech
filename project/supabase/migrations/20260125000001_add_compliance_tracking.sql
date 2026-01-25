-- ============================================================================
-- COMPLIANCE TRACKING SYSTEM: Database Migration
-- ============================================================================
-- Purpose: Create comprehensive compliance tracking system for certifications,
-- compliance checks, requirements, and supporting evidence
-- Date: 2026-01-25

-- ============================================================================
-- CERTIFICATIONS TABLE
-- ============================================================================
-- Track organization certifications (GlobalGAP, HACCP, ISO9001, etc.)

CREATE TABLE IF NOT EXISTS certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  certification_type TEXT NOT NULL CHECK (certification_type IN (
    'GlobalGAP',
    'HACCP',
    'ISO9001',
    'ISO14001',
    'Organic',
    'FairTrade',
    'Rainforest',
    'USDA_Organic'
  )),
  certification_number TEXT NOT NULL,
  issued_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
    'active',
    'expired',
    'pending_renewal',
    'suspended'
  )),
  issuing_body TEXT NOT NULL,
  scope TEXT,
  documents JSONB DEFAULT '[]'::jsonb,
  audit_schedule JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, certification_type, certification_number)
);

CREATE INDEX IF NOT EXISTS idx_certifications_org ON certifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_certifications_type ON certifications(certification_type);
CREATE INDEX IF NOT EXISTS idx_certifications_status ON certifications(status);
CREATE INDEX IF NOT EXISTS idx_certifications_expiry ON certifications(expiry_date);

COMMENT ON TABLE certifications IS 'Organization certifications and compliance credentials';
COMMENT ON COLUMN certifications.organization_id IS 'Organization that holds the certification';
COMMENT ON COLUMN certifications.certification_type IS 'Type of certification (GlobalGAP, HACCP, ISO9001, etc.)';
COMMENT ON COLUMN certifications.certification_number IS 'Unique certification number/code';
COMMENT ON COLUMN certifications.issued_date IS 'Date certification was issued';
COMMENT ON COLUMN certifications.expiry_date IS 'Date certification expires';
COMMENT ON COLUMN certifications.status IS 'Current status: active, expired, pending_renewal, suspended';
COMMENT ON COLUMN certifications.issuing_body IS 'Organization that issued the certification';
COMMENT ON COLUMN certifications.scope IS 'Scope of certification (e.g., specific farms, products, processes)';
COMMENT ON COLUMN certifications.documents IS 'JSONB array of document references {url, type, uploaded_at}';
COMMENT ON COLUMN certifications.audit_schedule IS 'JSONB object with next_audit_date, audit_frequency, auditor_name';

-- ============================================================================
-- COMPLIANCE CHECKS TABLE
-- ============================================================================
-- Audit records and compliance verification checks

CREATE TABLE IF NOT EXISTS compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  certification_id UUID NOT NULL REFERENCES certifications(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL CHECK (check_type IN (
    'pesticide_usage',
    'traceability',
    'worker_safety',
    'record_keeping',
    'environmental',
    'quality_control'
  )),
  check_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN (
    'compliant',
    'non_compliant',
    'needs_review',
    'in_progress'
  )),
  findings JSONB DEFAULT '[]'::jsonb,
  corrective_actions JSONB DEFAULT '[]'::jsonb,
  next_check_date DATE,
  auditor_name TEXT,
  score NUMERIC(5,2) CHECK (score >= 0 AND score <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_checks_org ON compliance_checks(organization_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_cert ON compliance_checks(certification_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_type ON compliance_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_status ON compliance_checks(status);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_date ON compliance_checks(check_date);

COMMENT ON TABLE compliance_checks IS 'Audit records and compliance verification checks';
COMMENT ON COLUMN compliance_checks.organization_id IS 'Organization being audited';
COMMENT ON COLUMN compliance_checks.certification_id IS 'Certification being audited against';
COMMENT ON COLUMN compliance_checks.check_type IS 'Type of compliance check performed';
COMMENT ON COLUMN compliance_checks.check_date IS 'Date the compliance check was conducted';
COMMENT ON COLUMN compliance_checks.status IS 'Result: compliant, non_compliant, needs_review, in_progress';
COMMENT ON COLUMN compliance_checks.findings IS 'JSONB array of findings {requirement_code, finding_description, severity}';
COMMENT ON COLUMN compliance_checks.corrective_actions IS 'JSONB array of actions {action_description, due_date, responsible_person, status}';
COMMENT ON COLUMN compliance_checks.next_check_date IS 'Scheduled date for next compliance check';
COMMENT ON COLUMN compliance_checks.auditor_name IS 'Name of auditor who conducted the check';
COMMENT ON COLUMN compliance_checks.score IS 'Compliance score (0-100)';

-- ============================================================================
-- COMPLIANCE REQUIREMENTS TABLE
-- ============================================================================
-- Reference table for compliance requirements by certification type

CREATE TABLE IF NOT EXISTS compliance_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_type TEXT NOT NULL CHECK (certification_type IN (
    'GlobalGAP',
    'HACCP',
    'ISO9001',
    'ISO14001',
    'Organic',
    'FairTrade',
    'Rainforest',
    'USDA_Organic'
  )),
  requirement_code TEXT NOT NULL,
  requirement_description TEXT NOT NULL,
  category TEXT NOT NULL,
  verification_method TEXT,
  frequency TEXT,
  is_critical BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(certification_type, requirement_code)
);

CREATE INDEX IF NOT EXISTS idx_compliance_requirements_type ON compliance_requirements(certification_type);
CREATE INDEX IF NOT EXISTS idx_compliance_requirements_code ON compliance_requirements(requirement_code);
CREATE INDEX IF NOT EXISTS idx_compliance_requirements_category ON compliance_requirements(category);
CREATE INDEX IF NOT EXISTS idx_compliance_requirements_critical ON compliance_requirements(is_critical);

COMMENT ON TABLE compliance_requirements IS 'Reference library of compliance requirements by certification type';
COMMENT ON COLUMN compliance_requirements.certification_type IS 'Certification standard this requirement applies to';
COMMENT ON COLUMN compliance_requirements.requirement_code IS 'Unique code for the requirement (e.g., AF.1.1)';
COMMENT ON COLUMN compliance_requirements.requirement_description IS 'Detailed description of the requirement';
COMMENT ON COLUMN compliance_requirements.category IS 'Category of requirement (e.g., Traceability, IPM, Worker Safety)';
COMMENT ON COLUMN compliance_requirements.verification_method IS 'How to verify compliance (e.g., Document Review, Field Inspection)';
COMMENT ON COLUMN compliance_requirements.frequency IS 'How often requirement must be verified (e.g., Annual, Per Harvest)';
COMMENT ON COLUMN compliance_requirements.is_critical IS 'Whether this is a critical requirement (failure = non-compliance)';

-- ============================================================================
-- COMPLIANCE EVIDENCE TABLE
-- ============================================================================
-- Supporting documents and evidence for compliance checks

CREATE TABLE IF NOT EXISTS compliance_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compliance_check_id UUID NOT NULL REFERENCES compliance_checks(id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN (
    'document',
    'photo',
    'video',
    'inspection_report',
    'test_result',
    'record',
    'certificate',
    'other'
  )),
  file_url TEXT NOT NULL,
  description TEXT,
  uploaded_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_evidence_check ON compliance_evidence(compliance_check_id);
CREATE INDEX IF NOT EXISTS idx_compliance_evidence_type ON compliance_evidence(evidence_type);
CREATE INDEX IF NOT EXISTS idx_compliance_evidence_uploaded_by ON compliance_evidence(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_compliance_evidence_uploaded_at ON compliance_evidence(uploaded_at);

COMMENT ON TABLE compliance_evidence IS 'Supporting documents and evidence for compliance checks';
COMMENT ON COLUMN compliance_evidence.compliance_check_id IS 'Compliance check this evidence supports';
COMMENT ON COLUMN compliance_evidence.evidence_type IS 'Type of evidence (document, photo, video, etc.)';
COMMENT ON COLUMN compliance_evidence.file_url IS 'URL to the evidence file in cloud storage';
COMMENT ON COLUMN compliance_evidence.description IS 'Description of what the evidence shows';
COMMENT ON COLUMN compliance_evidence.uploaded_by IS 'User who uploaded the evidence';
COMMENT ON COLUMN compliance_evidence.uploaded_at IS 'Timestamp when evidence was uploaded';

-- ============================================================================
-- RLS POLICIES FOR CERTIFICATIONS
-- ============================================================================

ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "certifications_read_policy" ON certifications;
CREATE POLICY "certifications_read_policy" ON certifications
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "certifications_create_policy" ON certifications;
CREATE POLICY "certifications_create_policy" ON certifications
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "certifications_update_policy" ON certifications;
CREATE POLICY "certifications_update_policy" ON certifications
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "certifications_delete_policy" ON certifications;
CREATE POLICY "certifications_delete_policy" ON certifications
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

-- ============================================================================
-- RLS POLICIES FOR COMPLIANCE_CHECKS
-- ============================================================================

ALTER TABLE compliance_checks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "compliance_checks_read_policy" ON compliance_checks;
CREATE POLICY "compliance_checks_read_policy" ON compliance_checks
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "compliance_checks_create_policy" ON compliance_checks;
CREATE POLICY "compliance_checks_create_policy" ON compliance_checks
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "compliance_checks_update_policy" ON compliance_checks;
CREATE POLICY "compliance_checks_update_policy" ON compliance_checks
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "compliance_checks_delete_policy" ON compliance_checks;
CREATE POLICY "compliance_checks_delete_policy" ON compliance_checks
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

-- ============================================================================
-- RLS POLICIES FOR COMPLIANCE_REQUIREMENTS
-- ============================================================================

ALTER TABLE compliance_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "compliance_requirements_read_policy" ON compliance_requirements;
CREATE POLICY "compliance_requirements_read_policy" ON compliance_requirements
  FOR SELECT USING (
    true
  );

DROP POLICY IF EXISTS "compliance_requirements_write_policy" ON compliance_requirements;
CREATE POLICY "compliance_requirements_write_policy" ON compliance_requirements
  FOR ALL USING (
    is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

-- ============================================================================
-- RLS POLICIES FOR COMPLIANCE_EVIDENCE
-- ============================================================================

ALTER TABLE compliance_evidence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "compliance_evidence_read_policy" ON compliance_evidence;
CREATE POLICY "compliance_evidence_read_policy" ON compliance_evidence
  FOR SELECT USING (
    compliance_check_id IN (
      SELECT id FROM compliance_checks
      WHERE organization_id IN (
        SELECT organization_id FROM organization_users
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "compliance_evidence_create_policy" ON compliance_evidence;
CREATE POLICY "compliance_evidence_create_policy" ON compliance_evidence
  FOR INSERT WITH CHECK (
    compliance_check_id IN (
      SELECT id FROM compliance_checks
      WHERE organization_id IN (
        SELECT organization_id FROM organization_users
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "compliance_evidence_delete_policy" ON compliance_evidence;
CREATE POLICY "compliance_evidence_delete_policy" ON compliance_evidence
  FOR DELETE USING (
    compliance_check_id IN (
      SELECT id FROM compliance_checks
      WHERE organization_id IN (
        SELECT organization_id FROM organization_users
        WHERE user_id = auth.uid() AND is_active = true
      )
    )
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

-- ============================================================================
-- ADD TABLES TO REALTIME PUBLICATION
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE certifications;
ALTER PUBLICATION supabase_realtime ADD TABLE compliance_checks;
ALTER PUBLICATION supabase_realtime ADD TABLE compliance_evidence;

-- ============================================================================
-- SEED COMPLIANCE REQUIREMENTS DATA
-- ============================================================================

-- GlobalGAP Requirements (10 requirements)
INSERT INTO compliance_requirements (certification_type, requirement_code, requirement_description, category, verification_method, frequency, is_critical)
VALUES
  (
    'GlobalGAP',
    'AF.1.1',
    'Traceability system for all products from production to sale',
    'Traceability',
    'Document Review, System Inspection',
    'Continuous',
    true
  ),
  (
    'GlobalGAP',
    'AF.2.1',
    'Record keeping for all farm activities including inputs, outputs, and labor',
    'Record Keeping',
    'Document Review',
    'Per Activity',
    true
  ),
  (
    'GlobalGAP',
    'CB.4.1',
    'Fertilizer application records with dates, products, rates, and fields',
    'Input Management',
    'Document Review, Field Inspection',
    'Per Application',
    true
  ),
  (
    'GlobalGAP',
    'CB.5.1',
    'Irrigation water quality testing and records',
    'Water Management',
    'Test Results, Document Review',
    'Annual',
    false
  ),
  (
    'GlobalGAP',
    'CB.7.1',
    'Integrated pest management plan with pesticide records',
    'Pest Management',
    'Document Review, Field Inspection',
    'Annual',
    true
  ),
  (
    'GlobalGAP',
    'FV.5.1',
    'Harvest hygiene procedures and worker training documentation',
    'Harvest Management',
    'Document Review, Worker Interview',
    'Per Harvest',
    true
  ),
  (
    'GlobalGAP',
    'FV.6.1',
    'Post-harvest handling and storage procedures',
    'Post-Harvest',
    'Document Review, Facility Inspection',
    'Annual',
    false
  ),
  (
    'GlobalGAP',
    'SA.1.1',
    'Worker safety training and incident records',
    'Worker Safety',
    'Document Review, Worker Interview',
    'Annual',
    true
  ),
  (
    'GlobalGAP',
    'SA.2.1',
    'Personal protective equipment (PPE) provision and usage',
    'Worker Safety',
    'Facility Inspection, Worker Interview',
    'Quarterly',
    true
  ),
  (
    'GlobalGAP',
    'SA.3.1',
    'Child labor and forced labor prevention policies',
    'Labor Practices',
    'Document Review, Worker Interview',
    'Annual',
    true
  )
ON CONFLICT (certification_type, requirement_code) DO NOTHING;

-- HACCP Requirements (5 requirements)
INSERT INTO compliance_requirements (certification_type, requirement_code, requirement_description, category, verification_method, frequency, is_critical)
VALUES
  (
    'HACCP',
    'CCP1',
    'Receiving raw materials inspection and acceptance criteria',
    'Receiving',
    'Inspection Records, Supplier Verification',
    'Per Delivery',
    true
  ),
  (
    'HACCP',
    'CCP2',
    'Storage temperature monitoring and records for perishables',
    'Storage',
    'Temperature Records, Equipment Calibration',
    'Continuous',
    true
  ),
  (
    'HACCP',
    'CCP3',
    'Processing temperature control and time records',
    'Processing',
    'Temperature Records, Process Logs',
    'Per Batch',
    true
  ),
  (
    'HACCP',
    'CCP4',
    'Metal detection and foreign material prevention',
    'Quality Control',
    'Equipment Logs, Test Records',
    'Per Batch',
    true
  ),
  (
    'HACCP',
    'CCP5',
    'Final product testing and microbiological analysis',
    'Testing',
    'Lab Test Results, Certificate of Analysis',
    'Per Batch',
    true
  )
ON CONFLICT (certification_type, requirement_code) DO NOTHING;

-- ISO 9001 Requirements (5 requirements)
INSERT INTO compliance_requirements (certification_type, requirement_code, requirement_description, category, verification_method, frequency, is_critical)
VALUES
  (
    'ISO9001',
    'QMS.1',
    'Quality management system documentation and procedures',
    'Quality Management',
    'Document Review, System Audit',
    'Annual',
    true
  ),
  (
    'ISO9001',
    'QMS.2',
    'Management review and effectiveness evaluation',
    'Management Review',
    'Meeting Minutes, Performance Data',
    'Annual',
    false
  ),
  (
    'ISO9001',
    'QMS.3',
    'Customer satisfaction monitoring and feedback management',
    'Customer Focus',
    'Survey Results, Complaint Records',
    'Quarterly',
    false
  ),
  (
    'ISO9001',
    'QMS.4',
    'Internal audit program and corrective actions',
    'Internal Audit',
    'Audit Reports, Corrective Action Records',
    'Annual',
    true
  ),
  (
    'ISO9001',
    'QMS.5',
    'Competence and training of personnel',
    'Personnel',
    'Training Records, Competency Assessment',
    'Annual',
    false
  )
ON CONFLICT (certification_type, requirement_code) DO NOTHING;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
