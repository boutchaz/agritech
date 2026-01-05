-- Create crop_cycles table
CREATE TABLE IF NOT EXISTS crop_cycles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  variety VARCHAR(255) NOT NULL,
  crop_type VARCHAR(255) NOT NULL,
  planting_date DATE NOT NULL,
  expected_harvest_date DATE NOT NULL,
  actual_harvest_date DATE,
  expected_yield_kg_per_hectare DECIMAL(10, 2) CHECK (expected_yield_kg_per_hectare >= 0),
  actual_yield_kg_per_hectare DECIMAL(10, 2) CHECK (actual_yield_kg_per_hectare >= 0),
  area_hectares DECIMAL(10, 2) NOT NULL CHECK (area_hectares > 0),
  status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'paused', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_crop_cycles_organization_id ON crop_cycles(organization_id);
CREATE INDEX idx_crop_cycles_campaign_id ON crop_cycles(campaign_id);
CREATE INDEX idx_crop_cycles_farm_id ON crop_cycles(farm_id);
CREATE INDEX idx_crop_cycles_parcel_id ON crop_cycles(parcel_id);
CREATE INDEX idx_crop_cycles_status ON crop_cycles(status);
CREATE INDEX idx_crop_cycles_planting_date ON crop_cycles(planting_date);
CREATE INDEX idx_crop_cycles_expected_harvest_date ON crop_cycles(expected_harvest_date);
CREATE INDEX idx_crop_cycles_variety ON crop_cycles(variety);
CREATE INDEX idx_crop_cycles_crop_type ON crop_cycles(crop_type);

-- Add RLS (Row Level Security)
ALTER TABLE crop_cycles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Organization members can view crop cycles
CREATE POLICY "Organization members can view crop cycles"
  ON crop_cycles FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- Organization admins and farm managers can insert crop cycles
CREATE POLICY "Organization admins and farm managers can insert crop cycles"
  ON crop_cycles FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() 
      AND role IN ('organization_admin', 'farm_manager', 'system_admin')
    )
  );

-- Organization admins and farm managers can update crop cycles
CREATE POLICY "Organization admins and farm managers can update crop cycles"
  ON crop_cycles FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() 
      AND role IN ('organization_admin', 'farm_manager', 'system_admin')
    )
  );

-- Organization admins and farm managers can delete crop cycles
CREATE POLICY "Organization admins and farm managers can delete crop cycles"
  ON crop_cycles FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() 
      AND role IN ('organization_admin', 'farm_manager', 'system_admin')
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_crop_cycles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_crop_cycles_updated_at
  BEFORE UPDATE ON crop_cycles
  FOR EACH ROW
  EXECUTE FUNCTION update_crop_cycles_updated_at();

-- Add comment
COMMENT ON TABLE crop_cycles IS 'Stores individual crop cycles for tracking planting, growth, and harvest activities';
COMMENT ON COLUMN crop_cycles.status IS 'Current status of crop cycle';
COMMENT ON COLUMN crop_cycles.expected_yield_kg_per_hectare IS 'Expected yield in kg per hectare';
COMMENT ON COLUMN crop_cycles.actual_yield_kg_per_hectare IS 'Actual yield in kg per hectare';
