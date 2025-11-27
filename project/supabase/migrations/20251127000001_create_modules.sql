-- Create modules table to store available modules
CREATE TABLE IF NOT EXISTS modules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('agriculture', 'elevage', 'general')),
    description TEXT,
    is_available BOOLEAN NOT NULL DEFAULT true,
    required_plan TEXT, -- 'essential', 'professional', 'enterprise', or NULL for all plans
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create organization_modules junction table
CREATE TABLE IF NOT EXISTS organization_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, module_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organization_modules_org_id ON organization_modules(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_modules_module_id ON organization_modules(module_id);
CREATE INDEX IF NOT EXISTS idx_organization_modules_active ON organization_modules(is_active);

-- Enable RLS
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_modules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for modules (read-only for all authenticated users)
CREATE POLICY "Allow authenticated users to view modules"
    ON modules FOR SELECT
    TO authenticated
    USING (true);

-- RLS Policies for organization_modules
CREATE POLICY "Users can view their organization's modules"
    ON organization_modules FOR SELECT
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Organization admins can update modules"
    ON organization_modules FOR UPDATE
    TO authenticated
    USING (
        organization_id IN (
            SELECT ou.organization_id
            FROM organization_users ou
            JOIN roles r ON ou.role_id = r.id
            WHERE ou.user_id = auth.uid()
            AND ou.is_active = true
            AND r.name IN ('system_admin', 'organization_admin')
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT ou.organization_id
            FROM organization_users ou
            JOIN roles r ON ou.role_id = r.id
            WHERE ou.user_id = auth.uid()
            AND ou.is_active = true
            AND r.name IN ('system_admin', 'organization_admin')
        )
    );

CREATE POLICY "Organization admins can insert modules"
    ON organization_modules FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id IN (
            SELECT ou.organization_id
            FROM organization_users ou
            JOIN roles r ON ou.role_id = r.id
            WHERE ou.user_id = auth.uid()
            AND ou.is_active = true
            AND r.name IN ('system_admin', 'organization_admin')
        )
    );

-- Insert default modules
INSERT INTO modules (id, name, icon, category, description, required_plan) VALUES
    ('fruit-trees', 'Arbres Fruitiers', 'Tree', 'agriculture', 'Gérez vos vergers et optimisez votre production fruitière', NULL),
    ('cereals', 'Céréales', 'Wheat', 'agriculture', 'Gestion des cultures céréalières', NULL),
    ('vegetables', 'Légumes', 'Carrot', 'agriculture', 'Production de légumes de saison', NULL),
    ('mushrooms', 'Myciculture', 'Sprout', 'agriculture', 'Gérez votre production de champignons', 'professional'),
    ('livestock', 'Élevage', 'Cow', 'elevage', 'Gestion du cheptel et alimentation', 'professional')
ON CONFLICT (id) DO NOTHING;

-- Function to automatically create default modules for new organizations
CREATE OR REPLACE FUNCTION create_default_organization_modules()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert all available modules for the new organization
    INSERT INTO organization_modules (organization_id, module_id, is_active)
    SELECT
        NEW.id,
        m.id,
        CASE
            WHEN m.required_plan IS NULL THEN true  -- Free modules active by default
            ELSE false  -- Premium modules inactive by default
        END
    FROM modules m
    WHERE m.is_available = true
    ON CONFLICT (organization_id, module_id) DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create default modules when organization is created
DROP TRIGGER IF EXISTS trigger_create_default_modules ON organizations;
CREATE TRIGGER trigger_create_default_modules
    AFTER INSERT ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION create_default_organization_modules();

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_modules_updated_at
    BEFORE UPDATE ON modules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_modules_updated_at
    BEFORE UPDATE ON organization_modules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Backfill existing organizations with default modules
INSERT INTO organization_modules (organization_id, module_id, is_active)
SELECT
    o.id,
    m.id,
    CASE
        WHEN m.required_plan IS NULL THEN true
        ELSE false
    END
FROM organizations o
CROSS JOIN modules m
WHERE m.is_available = true
ON CONFLICT (organization_id, module_id) DO NOTHING;
