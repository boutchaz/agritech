-- Create quality_inspections table
CREATE TABLE IF NOT EXISTS quality_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  crop_cycle_id UUID REFERENCES crop_cycles(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('pre_harvest', 'post_harvest', 'storage', 'transport', 'processing')),
  inspection_date DATE NOT NULL,
  inspector_id UUID REFERENCES users(id) ON DELETE SET NULL,
  results JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'failed', 'cancelled')),
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  notes TEXT,
  attachments TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_quality_inspections_organization_id ON quality_inspections(organization_id);
CREATE INDEX idx_quality_inspections_farm_id ON quality_inspections(farm_id);
CREATE INDEX idx_quality_inspections_parcel_id ON quality_inspections(parcel_id);
CREATE INDEX idx_quality_inspections_crop_cycle_id ON quality_inspections(crop_cycle_id);
CREATE INDEX idx_quality_inspections_type ON quality_inspections(type);
CREATE INDEX idx_quality_inspections_status ON quality_inspections(status);
CREATE INDEX idx_quality_inspections_inspection_date ON quality_inspections(inspection_date);
CREATE INDEX idx_quality_inspections_overall_score ON quality_inspections(overall_score);
CREATE INDEX idx_quality_inspections_results ON quality_inspections USING GIN(results);

-- Add RLS (Row Level Security)
ALTER TABLE quality_inspections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Organization members can view quality inspections
CREATE POLICY "Organization members can view quality inspections"
  ON quality_inspections FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- Organization admins and farm managers can insert quality inspections
CREATE POLICY "Organization admins and farm managers can insert quality inspections"
  ON quality_inspections FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() 
      AND role IN ('organization_admin', 'farm_manager', 'system_admin')
    )
  );

-- Organization admins and farm managers can update quality inspections
CREATE POLICY "Organization admins and farm managers can update quality inspections"
  ON quality_inspections FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() 
      AND role IN ('organization_admin', 'farm_manager', 'system_admin')
    )
  );

-- Organization admins and farm managers can delete quality inspections
CREATE POLICY "Organization admins and farm managers can delete quality inspections"
  ON quality_inspections FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() 
      AND role IN ('organization_admin', 'farm_manager', 'system_admin')
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quality_inspections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quality_inspections_updated_at
  BEFORE UPDATE ON quality_inspections
  FOR EACH ROW
  EXECUTE FUNCTION update_quality_inspections_updated_at();

-- Add comment
COMMENT ON TABLE quality_inspections IS 'Stores quality inspection records for crops, harvests, and products';
COMMENT ON COLUMN quality_inspections.type IS 'Type of quality inspection';
COMMENT ON COLUMN quality_inspections.results IS 'JSONB object containing inspection results and measurements';
COMMENT ON COLUMN quality_inspections.overall_score IS 'Overall quality score from 0 to 100';
COMMENT ON COLUMN quality_inspections.attachments IS 'Array of attachment URLs (photos, documents, etc.)';
