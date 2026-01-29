-- ============================================================================
-- PEST & DISEASE ALERT SYSTEM: Database Migration
-- ============================================================================
-- Purpose: Extend performance_alerts table with pest/disease specific columns
-- and create reference tables for pest/disease library and worker reports
-- Date: 2026-01-25

-- ============================================================================
-- EXTEND PERFORMANCE_ALERTS TABLE
-- ============================================================================
-- Add pest/disease specific columns to existing performance_alerts table

ALTER TABLE performance_alerts
ADD COLUMN IF NOT EXISTS pest_type TEXT,
ADD COLUMN IF NOT EXISTS disease_type TEXT,
ADD COLUMN IF NOT EXISTS affected_area_percentage NUMERIC(5,2) CHECK (affected_area_percentage >= 0 AND affected_area_percentage <= 100),
ADD COLUMN IF NOT EXISTS detection_method TEXT CHECK (detection_method IN ('visual_inspection', 'trap_monitoring', 'lab_test', 'field_scout', 'automated_sensor', 'worker_report')),
ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1);

COMMENT ON COLUMN performance_alerts.pest_type IS 'Type of pest detected (e.g., aphids, spider_mites, whiteflies)';
COMMENT ON COLUMN performance_alerts.disease_type IS 'Type of disease detected (e.g., powdery_mildew, blight, root_rot)';
COMMENT ON COLUMN performance_alerts.affected_area_percentage IS 'Percentage of parcel/farm affected by pest/disease (0-100)';
COMMENT ON COLUMN performance_alerts.detection_method IS 'Method used to detect the pest/disease';
COMMENT ON COLUMN performance_alerts.confidence_score IS 'Confidence level of detection (0-1 scale)';

-- ============================================================================
-- PEST/DISEASE LIBRARY TABLE
-- ============================================================================
-- Reference table for common pests and diseases with treatment information

CREATE TABLE IF NOT EXISTS pest_disease_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pest', 'disease')),
  crop_types TEXT[] DEFAULT '{}',
  symptoms TEXT,
  treatment TEXT,
  prevention TEXT,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, type)
);

CREATE INDEX IF NOT EXISTS idx_pest_disease_library_type ON pest_disease_library(type);
CREATE INDEX IF NOT EXISTS idx_pest_disease_library_severity ON pest_disease_library(severity);
CREATE INDEX IF NOT EXISTS idx_pest_disease_library_active ON pest_disease_library(is_active);
CREATE INDEX IF NOT EXISTS idx_pest_disease_library_crop_types ON pest_disease_library USING GIN(crop_types);

COMMENT ON TABLE pest_disease_library IS 'Reference library of common pests and diseases with treatment and prevention information';
COMMENT ON COLUMN pest_disease_library.name IS 'Common name of the pest or disease';
COMMENT ON COLUMN pest_disease_library.type IS 'Classification: pest or disease';
COMMENT ON COLUMN pest_disease_library.crop_types IS 'Array of crop types affected by this pest/disease';
COMMENT ON COLUMN pest_disease_library.symptoms IS 'Description of visible symptoms';
COMMENT ON COLUMN pest_disease_library.treatment IS 'Recommended treatment methods';
COMMENT ON COLUMN pest_disease_library.prevention IS 'Prevention strategies';
COMMENT ON COLUMN pest_disease_library.severity IS 'Typical severity level if untreated';
COMMENT ON COLUMN pest_disease_library.image_url IS 'URL to reference image of pest/disease';

-- ============================================================================
-- PEST/DISEASE REPORTS TABLE
-- ============================================================================
-- Worker-submitted reports of pest/disease observations with photos

CREATE TABLE IF NOT EXISTS pest_disease_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
  pest_disease_id UUID REFERENCES pest_disease_library(id) ON DELETE SET NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  affected_area_percentage NUMERIC(5,2) CHECK (affected_area_percentage >= 0 AND affected_area_percentage <= 100),
  photo_urls TEXT[] DEFAULT '{}',
  location GEOGRAPHY(POINT, 4326),
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'treated', 'resolved', 'dismissed')),
  verified_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  treatment_applied TEXT,
  treatment_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pest_disease_reports_org ON pest_disease_reports(organization_id);
CREATE INDEX IF NOT EXISTS idx_pest_disease_reports_farm ON pest_disease_reports(farm_id);
CREATE INDEX IF NOT EXISTS idx_pest_disease_reports_parcel ON pest_disease_reports(parcel_id);
CREATE INDEX IF NOT EXISTS idx_pest_disease_reports_reporter ON pest_disease_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_pest_disease_reports_pest_disease ON pest_disease_reports(pest_disease_id);
CREATE INDEX IF NOT EXISTS idx_pest_disease_reports_severity ON pest_disease_reports(severity);
CREATE INDEX IF NOT EXISTS idx_pest_disease_reports_status ON pest_disease_reports(status);
CREATE INDEX IF NOT EXISTS idx_pest_disease_reports_created ON pest_disease_reports(created_at);
CREATE INDEX IF NOT EXISTS idx_pest_disease_reports_location ON pest_disease_reports USING GIST(location);

COMMENT ON TABLE pest_disease_reports IS 'Worker-submitted reports of pest and disease observations in fields';
COMMENT ON COLUMN pest_disease_reports.organization_id IS 'Organization that owns this report';
COMMENT ON COLUMN pest_disease_reports.farm_id IS 'Farm where pest/disease was observed';
COMMENT ON COLUMN pest_disease_reports.parcel_id IS 'Specific parcel/plot where pest/disease was observed';
COMMENT ON COLUMN pest_disease_reports.reporter_id IS 'Worker who submitted the report';
COMMENT ON COLUMN pest_disease_reports.pest_disease_id IS 'Reference to pest_disease_library entry';
COMMENT ON COLUMN pest_disease_reports.severity IS 'Severity level of the infestation/infection';
COMMENT ON COLUMN pest_disease_reports.affected_area_percentage IS 'Percentage of parcel affected (0-100)';
COMMENT ON COLUMN pest_disease_reports.photo_urls IS 'Array of URLs to photos documenting the pest/disease';
COMMENT ON COLUMN pest_disease_reports.location IS 'GPS location where pest/disease was observed';
COMMENT ON COLUMN pest_disease_reports.notes IS 'Additional notes from the reporter';
COMMENT ON COLUMN pest_disease_reports.status IS 'Current status of the report (pending verification, treated, etc.)';
COMMENT ON COLUMN pest_disease_reports.verified_by IS 'Farm manager or admin who verified the report';
COMMENT ON COLUMN pest_disease_reports.verified_at IS 'Timestamp when report was verified';
COMMENT ON COLUMN pest_disease_reports.treatment_applied IS 'Description of treatment applied';
COMMENT ON COLUMN pest_disease_reports.treatment_date IS 'Date when treatment was applied';

-- ============================================================================
-- SEED PEST/DISEASE LIBRARY DATA
-- ============================================================================

INSERT INTO pest_disease_library (name, type, crop_types, symptoms, treatment, prevention, severity, image_url)
VALUES
  (
    'Aphids',
    'pest',
    ARRAY['wheat', 'barley', 'corn', 'vegetables', 'fruits', 'legumes'],
    'Small soft-bodied insects, sticky honeydew residue, yellowing leaves, stunted growth',
    'Spray with insecticidal soap, neem oil, or pyrethrin; introduce natural predators (ladybugs, lacewings)',
    'Monitor regularly, maintain plant vigor, avoid excessive nitrogen fertilizer, remove infested plant material',
    'high',
    'https://agritech-assets.example.com/pests/aphids.jpg'
  ),
  (
    'Powdery Mildew',
    'disease',
    ARRAY['fruits', 'vegetables', 'grapes', 'berries'],
    'White powdery coating on leaves and stems, leaf curling, reduced photosynthesis',
    'Apply sulfur dust or fungicide spray, remove infected leaves, improve air circulation',
    'Ensure proper spacing, avoid overhead watering, maintain moderate humidity, resistant varieties',
    'medium',
    'https://agritech-assets.example.com/diseases/powdery_mildew.jpg'
  ),
  (
    'Spider Mites',
    'pest',
    ARRAY['vegetables', 'fruits', 'greenhouse_crops', 'ornamentals'],
    'Fine webbing on leaves, yellow stippling, leaf drop, tiny moving dots on leaf undersides',
    'Spray with water to dislodge, use miticide, introduce predatory mites, neem oil application',
    'Maintain adequate humidity, avoid excessive heat, regular monitoring, remove heavily infested leaves',
    'high',
    'https://agritech-assets.example.com/pests/spider_mites.jpg'
  ),
  (
    'Blight',
    'disease',
    ARRAY['tomatoes', 'potatoes', 'peppers', 'eggplant'],
    'Brown lesions on leaves and stems, rapid leaf yellowing and drop, fruit rot',
    'Remove infected plant parts, apply copper fungicide, improve air circulation, reduce leaf wetness',
    'Use resistant varieties, crop rotation, avoid overhead irrigation, proper spacing, remove debris',
    'critical',
    'https://agritech-assets.example.com/diseases/blight.jpg'
  ),
  (
    'Whiteflies',
    'pest',
    ARRAY['vegetables', 'greenhouse_crops', 'ornamentals', 'fruits'],
    'Tiny white insects on leaf undersides, yellowing leaves, sticky honeydew, sooty mold',
    'Yellow sticky traps, insecticidal soap, neem oil, reflective mulches, vacuum collection',
    'Monitor regularly, use row covers, maintain plant health, remove weeds, introduce parasitic wasps',
    'medium',
    'https://agritech-assets.example.com/pests/whiteflies.jpg'
  ),
  (
    'Root Rot',
    'disease',
    ARRAY['wheat', 'barley', 'corn', 'vegetables', 'fruits', 'legumes'],
    'Wilting despite adequate moisture, yellowing leaves, stunted growth, dark discolored roots',
    'Improve drainage, reduce watering frequency, apply fungicide to soil, remove severely affected plants',
    'Ensure proper drainage, avoid waterlogging, crop rotation, use resistant varieties, sanitize tools',
    'critical',
    'https://agritech-assets.example.com/diseases/root_rot.jpg'
  )
ON CONFLICT (name, type) DO NOTHING;

-- ============================================================================
-- RLS POLICIES FOR PEST_DISEASE_LIBRARY
-- ============================================================================

ALTER TABLE pest_disease_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pest_disease_library_read_policy" ON pest_disease_library;
CREATE POLICY "pest_disease_library_read_policy" ON pest_disease_library
  FOR SELECT USING (
    is_active = true
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

DROP POLICY IF EXISTS "pest_disease_library_write_policy" ON pest_disease_library;
CREATE POLICY "pest_disease_library_write_policy" ON pest_disease_library
  FOR ALL USING (
    is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

-- ============================================================================
-- RLS POLICIES FOR PEST_DISEASE_REPORTS
-- ============================================================================

ALTER TABLE pest_disease_reports ENABLE ROW LEVEL SECURITY;

-- Organization members can read reports from their organization
DROP POLICY IF EXISTS "pest_disease_reports_read_policy" ON pest_disease_reports;
CREATE POLICY "pest_disease_reports_read_policy" ON pest_disease_reports
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

-- Organization members can create reports for their organization
DROP POLICY IF EXISTS "pest_disease_reports_create_policy" ON pest_disease_reports;
CREATE POLICY "pest_disease_reports_create_policy" ON pest_disease_reports
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

-- Organization members can update reports from their organization
DROP POLICY IF EXISTS "pest_disease_reports_update_policy" ON pest_disease_reports;
CREATE POLICY "pest_disease_reports_update_policy" ON pest_disease_reports
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

-- Organization members can delete reports from their organization
DROP POLICY IF EXISTS "pest_disease_reports_delete_policy" ON pest_disease_reports;
CREATE POLICY "pest_disease_reports_delete_policy" ON pest_disease_reports
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR is_internal_admin()
    OR current_setting('role', true) = 'service_role'
  );

-- ============================================================================
-- ADD PEST_DISEASE_REPORTS TO REALTIME PUBLICATION
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE pest_disease_reports;

-- ============================================================================
-- FUNCTION: Create performance alert from pest disease report
-- ============================================================================

CREATE OR REPLACE FUNCTION create_alert_from_pest_report(
  p_report_id UUID
) RETURNS UUID AS $$
DECLARE
  v_report pest_disease_reports%ROWTYPE;
  v_alert_id UUID;
  v_pest_name TEXT;
  v_alert_type TEXT;
BEGIN
  -- Get the report details
  SELECT * INTO v_report FROM pest_disease_reports WHERE id = p_report_id;
  
  IF v_report.id IS NULL THEN
    RAISE EXCEPTION 'Pest disease report not found: %', p_report_id;
  END IF;

  -- Get pest/disease name
  SELECT name INTO v_pest_name FROM pest_disease_library WHERE id = v_report.pest_disease_id;
  v_pest_name := COALESCE(v_pest_name, 'Unknown Pest/Disease');

  -- Determine alert type based on severity
  v_alert_type := CASE
    WHEN v_report.severity IN ('high', 'critical') THEN 'quality_issue'
    ELSE 'quality_issue'
  END;

  -- Create performance alert
  INSERT INTO performance_alerts (
    organization_id,
    farm_id,
    parcel_id,
    alert_type,
    severity,
    title,
    message,
    pest_type,
    disease_type,
    affected_area_percentage,
    detection_method,
    confidence_score,
    status
  ) VALUES (
    v_report.organization_id,
    v_report.farm_id,
    v_report.parcel_id,
    v_alert_type,
    v_report.severity,
    'Pest/Disease Alert: ' || v_pest_name,
    'Worker ' || (SELECT full_name FROM user_profiles WHERE id = v_report.reporter_id) || 
    ' reported ' || v_pest_name || ' affecting ' || COALESCE(v_report.affected_area_percentage::TEXT, '?') || '% of the parcel. ' ||
    COALESCE(v_report.notes, ''),
    v_pest_name,
    v_pest_name,
    v_report.affected_area_percentage,
    'worker_report',
    0.8,
    'active'
  ) RETURNING id INTO v_alert_id;

  RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_alert_from_pest_report IS 'Creates a performance alert from a pest/disease report for visibility in the alert system';

GRANT EXECUTE ON FUNCTION create_alert_from_pest_report TO authenticated;

-- ============================================================================
-- FUNCTION: Update pest disease report status
-- ============================================================================

CREATE OR REPLACE FUNCTION update_pest_report_status(
  p_report_id UUID,
  p_status TEXT,
  p_verified_by UUID DEFAULT NULL,
  p_treatment_applied TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
  UPDATE pest_disease_reports
  SET
    status = p_status,
    verified_by = COALESCE(p_verified_by, verified_by),
    verified_at = CASE WHEN p_status = 'verified' THEN NOW() ELSE verified_at END,
    treatment_applied = COALESCE(p_treatment_applied, treatment_applied),
    treatment_date = CASE WHEN p_treatment_applied IS NOT NULL THEN NOW() ELSE treatment_date END,
    updated_at = NOW()
  WHERE id = p_report_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_pest_report_status IS 'Updates the status of a pest/disease report and optionally records verification and treatment information';

GRANT EXECUTE ON FUNCTION update_pest_report_status TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
