-- Create biological_assets table
CREATE TABLE IF NOT EXISTS biological_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,
  asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN ('tree', 'vine', 'crop', 'livestock', 'other')),
  name VARCHAR(255) NOT NULL,
  variety VARCHAR(255),
  rootstock VARCHAR(255),
  planting_date DATE,
  expected_harvest_date DATE,
  quantity DECIMAL(10, 2) CHECK (quantity >= 0),
  unit VARCHAR(50) DEFAULT 'units',
  age_years INTEGER CHECK (age_years >= 0),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'dormant', 'harvested', 'removed', 'diseased')),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  notes TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_biological_assets_organization_id ON biological_assets(organization_id);
CREATE INDEX idx_biological_assets_farm_id ON biological_assets(farm_id);
CREATE INDEX idx_biological_assets_parcel_id ON biological_assets(parcel_id);
CREATE INDEX idx_biological_assets_asset_type ON biological_assets(asset_type);
CREATE INDEX idx_biological_assets_status ON biological_assets(status);
CREATE INDEX idx_biological_assets_planting_date ON biological_assets(planting_date);
CREATE INDEX idx_biological_assets_variety ON biological_assets(variety);
CREATE INDEX idx_biological_assets_rootstock ON biological_assets(rootstock);

-- Add RLS (Row Level Security)
ALTER TABLE biological_assets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Organization members can view biological assets
CREATE POLICY "Organization members can view biological assets"
  ON biological_assets FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- Organization admins and farm managers can insert biological assets
CREATE POLICY "Organization admins and farm managers can insert biological assets"
  ON biological_assets FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() 
      AND role IN ('organization_admin', 'farm_manager', 'system_admin')
    )
  );

-- Organization admins and farm managers can update biological assets
CREATE POLICY "Organization admins and farm managers can update biological assets"
  ON biological_assets FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() 
      AND role IN ('organization_admin', 'farm_manager', 'system_admin')
    )
  );

-- Organization admins and farm managers can delete biological assets
CREATE POLICY "Organization admins and farm managers can delete biological assets"
  ON biological_assets FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() 
      AND role IN ('organization_admin', 'farm_manager', 'system_admin')
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_biological_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_biological_assets_updated_at
  BEFORE UPDATE ON biological_assets
  FOR EACH ROW
  EXECUTE FUNCTION update_biological_assets_updated_at();

-- Add comment
COMMENT ON TABLE biological_assets IS 'Stores biological assets like trees, vines, crops, and livestock';
COMMENT ON COLUMN biological_assets.asset_type IS 'Type of biological asset';
COMMENT ON COLUMN biological_assets.status IS 'Current status of the biological asset';
COMMENT ON COLUMN biological_assets.age_years IS 'Age of the asset in years';
