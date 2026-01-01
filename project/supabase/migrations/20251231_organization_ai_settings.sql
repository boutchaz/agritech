-- Organization AI Settings table
-- Stores encrypted API keys for AI providers per organization

CREATE TABLE IF NOT EXISTS organization_ai_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'openai' or 'gemini'
    encrypted_api_key TEXT NOT NULL, -- AES-256-GCM encrypted API key
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Each organization can only have one config per provider
    UNIQUE(organization_id, provider)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_ai_settings_org_id ON organization_ai_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_ai_settings_provider ON organization_ai_settings(provider);

-- Enable RLS
ALTER TABLE organization_ai_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Only organization members can view their organization's AI settings
CREATE POLICY "org_ai_settings_select" ON organization_ai_settings
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
        )
    );

-- Only organization admins/owners can insert/update/delete AI settings
CREATE POLICY "org_ai_settings_insert" ON organization_ai_settings
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "org_ai_settings_update" ON organization_ai_settings
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "org_ai_settings_delete" ON organization_ai_settings
    FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON organization_ai_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON organization_ai_settings TO service_role;

-- Comment on table
COMMENT ON TABLE organization_ai_settings IS 'Stores encrypted API keys for AI providers (OpenAI, Gemini) per organization';
COMMENT ON COLUMN organization_ai_settings.encrypted_api_key IS 'API key encrypted with AES-256-GCM. Never expose this directly to clients.';
