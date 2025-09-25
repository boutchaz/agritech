-- Create satellite_files table for storing file metadata
CREATE TABLE IF NOT EXISTS satellite_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL,
    parcel_id UUID,
    index VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_satellite_files_organization_id ON satellite_files(organization_id);
CREATE INDEX IF NOT EXISTS idx_satellite_files_parcel_id ON satellite_files(parcel_id);
CREATE INDEX IF NOT EXISTS idx_satellite_files_index ON satellite_files(index);
CREATE INDEX IF NOT EXISTS idx_satellite_files_date ON satellite_files(date);
CREATE INDEX IF NOT EXISTS idx_satellite_files_created_at ON satellite_files(created_at);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_satellite_files_org_index_date ON satellite_files(organization_id, index, date);

-- Add foreign key constraints if the tables exist
DO $$
BEGIN
    -- Check if organizations table exists and add foreign key
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
        ALTER TABLE satellite_files 
        ADD CONSTRAINT fk_satellite_files_organization_id 
        FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;
    
    -- Check if parcels table exists and add foreign key
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parcels') THEN
        ALTER TABLE satellite_files 
        ADD CONSTRAINT fk_satellite_files_parcel_id 
        FOREIGN KEY (parcel_id) REFERENCES parcels(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create RLS policies
ALTER TABLE satellite_files ENABLE ROW LEVEL SECURITY;

-- Policy for organization members to access their files
CREATE POLICY "Users can access satellite files for their organizations" ON satellite_files
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM user_organizations 
            WHERE user_id = auth.uid()
        )
    );

-- Policy for service role to manage all files
CREATE POLICY "Service role can manage all satellite files" ON satellite_files
    FOR ALL USING (auth.role() = 'service_role');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_satellite_files_updated_at 
    BEFORE UPDATE ON satellite_files 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
