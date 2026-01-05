-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('planting', 'harvest', 'maintenance', 'fertilization', 'irrigation', 'pest_control', 'marketing', 'other')),
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  budget DECIMAL(12, 2) CHECK (budget >= 0),
  currency VARCHAR(3) DEFAULT 'USD',
  farm_ids UUID[] DEFAULT '{}',
  parcel_ids UUID[] DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'planned' CHECK (status IN ('planned', 'active', 'paused', 'completed', 'cancelled')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_campaigns_organization_id ON campaigns(organization_id);
CREATE INDEX idx_campaigns_type ON campaigns(type);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_start_date ON campaigns(start_date);
CREATE INDEX idx_campaigns_end_date ON campaigns(end_date);
CREATE INDEX idx_campaigns_priority ON campaigns(priority);
CREATE INDEX idx_campaigns_farm_ids ON campaigns USING GIN(farm_ids);
CREATE INDEX idx_campaigns_parcel_ids ON campaigns USING GIN(parcel_ids);

-- Add RLS (Row Level Security)
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Organization members can view campaigns
CREATE POLICY "Organization members can view campaigns"
  ON campaigns FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- Organization admins and farm managers can insert campaigns
CREATE POLICY "Organization admins and farm managers can insert campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() 
      AND role IN ('organization_admin', 'farm_manager', 'system_admin')
    )
  );

-- Organization admins and farm managers can update campaigns
CREATE POLICY "Organization admins and farm managers can update campaigns"
  ON campaigns FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() 
      AND role IN ('organization_admin', 'farm_manager', 'system_admin')
    )
  );

-- Organization admins and farm managers can delete campaigns
CREATE POLICY "Organization admins and farm managers can delete campaigns"
  ON campaigns FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users 
      WHERE user_id = auth.uid() 
      AND role IN ('organization_admin', 'farm_manager', 'system_admin')
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_campaigns_updated_at();

-- Add comment
COMMENT ON TABLE campaigns IS 'Stores agricultural campaigns and projects';
COMMENT ON COLUMN campaigns.type IS 'Type of campaign';
COMMENT ON COLUMN campaigns.status IS 'Current status of campaign';
COMMENT ON COLUMN campaigns.priority IS 'Priority level of campaign';
COMMENT ON COLUMN campaigns.farm_ids IS 'Array of farm IDs associated with campaign';
COMMENT ON COLUMN campaigns.parcel_ids IS 'Array of parcel IDs associated with campaign';
