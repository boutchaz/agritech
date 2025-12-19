-- =====================================================
-- DOCUMENT TEMPLATES TABLE
-- Stores customizable PDF document templates per organization
-- Comprehensive customization for headers, footers, styling, and layout
-- =====================================================

-- Drop existing table if it exists (for clean migration)
DROP TABLE IF EXISTS document_templates CASCADE;

-- Create document_templates table with all customization options
CREATE TABLE document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Template identification
    name VARCHAR(255) NOT NULL,
    description TEXT,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('invoice', 'quote', 'sales_order', 'purchase_order', 'report', 'general')),

    -- Template settings
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    -- =====================================================
    -- HEADER CONFIGURATION
    -- =====================================================
    header_enabled BOOLEAN DEFAULT true,
    header_height NUMERIC(10,2) DEFAULT 80,

    -- Logo settings
    header_logo_url TEXT,
    header_logo_position VARCHAR(20) DEFAULT 'left' CHECK (header_logo_position IN ('left', 'center', 'right')),
    header_logo_width NUMERIC(10,2) DEFAULT 50,
    header_logo_height NUMERIC(10,2) DEFAULT 30,

    -- Company info display
    header_company_name BOOLEAN DEFAULT true,
    header_company_info BOOLEAN DEFAULT true,
    header_custom_text TEXT,

    -- Header styling
    header_background_color VARCHAR(20) DEFAULT '#ffffff',
    header_text_color VARCHAR(20) DEFAULT '#000000',
    header_border_bottom BOOLEAN DEFAULT true,
    header_border_color VARCHAR(20) DEFAULT '#e5e7eb',

    -- =====================================================
    -- FOOTER CONFIGURATION
    -- =====================================================
    footer_enabled BOOLEAN DEFAULT true,
    footer_height NUMERIC(10,2) DEFAULT 60,
    footer_text TEXT DEFAULT 'Thank you for your business!',
    footer_position VARCHAR(20) DEFAULT 'center' CHECK (footer_position IN ('left', 'center', 'right')),
    footer_include_company_info BOOLEAN DEFAULT true,
    footer_custom_text TEXT,

    -- Footer styling
    footer_background_color VARCHAR(20) DEFAULT '#f9fafb',
    footer_text_color VARCHAR(20) DEFAULT '#6b7280',
    footer_border_top BOOLEAN DEFAULT true,
    footer_border_color VARCHAR(20) DEFAULT '#e5e7eb',
    footer_font_size NUMERIC(10,2) DEFAULT 9,

    -- =====================================================
    -- PAGE MARGINS (in mm)
    -- =====================================================
    page_margin_top NUMERIC(10,2) DEFAULT 20,
    page_margin_bottom NUMERIC(10,2) DEFAULT 20,
    page_margin_left NUMERIC(10,2) DEFAULT 15,
    page_margin_right NUMERIC(10,2) DEFAULT 15,

    -- =====================================================
    -- DOCUMENT STYLING (used by PDF generator)
    -- =====================================================
    accent_color VARCHAR(20) DEFAULT '#10B981',
    secondary_color VARCHAR(20) DEFAULT '#6B7280',

    -- Typography
    font_family VARCHAR(100) DEFAULT 'Helvetica',
    title_font_size NUMERIC(10,2) DEFAULT 24,
    heading_font_size NUMERIC(10,2) DEFAULT 14,
    body_font_size NUMERIC(10,2) DEFAULT 10,

    -- Table styling
    table_header_bg_color VARCHAR(20) DEFAULT '#10B981',
    table_header_text_color VARCHAR(20) DEFAULT '#ffffff',
    table_row_alt_color VARCHAR(20) DEFAULT '#f9fafb',
    table_border_color VARCHAR(20) DEFAULT '#e5e7eb',

    -- Content display options
    show_tax_id BOOLEAN DEFAULT true,
    show_terms BOOLEAN DEFAULT true,
    show_notes BOOLEAN DEFAULT true,
    show_payment_info BOOLEAN DEFAULT true,
    show_bank_details BOOLEAN DEFAULT false,
    show_qr_code BOOLEAN DEFAULT false,

    -- Custom sections
    terms_content TEXT,
    payment_terms_content TEXT,
    bank_details_content TEXT,

    -- Watermark
    watermark_enabled BOOLEAN DEFAULT false,
    watermark_text VARCHAR(100),
    watermark_opacity NUMERIC(3,2) DEFAULT 0.1,

    -- =====================================================
    -- METADATA
    -- =====================================================
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX idx_document_templates_organization ON document_templates(organization_id);
CREATE INDEX idx_document_templates_type ON document_templates(document_type);
CREATE INDEX idx_document_templates_default ON document_templates(organization_id, document_type, is_default) WHERE is_default = true;

-- Enable RLS
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view templates in their organization"
    ON document_templates FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create templates in their organization"
    ON document_templates FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update templates in their organization"
    ON document_templates FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete templates in their organization"
    ON document_templates FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid()
        )
    );

-- Function to ensure only one default template per type per organization
CREATE OR REPLACE FUNCTION ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_default = true THEN
        -- Unset other defaults for same organization and document type
        UPDATE document_templates
        SET is_default = false, updated_at = NOW()
        WHERE organization_id = NEW.organization_id
          AND document_type = NEW.document_type
          AND id != NEW.id
          AND is_default = true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to enforce single default
DROP TRIGGER IF EXISTS trg_ensure_single_default_template ON document_templates;
CREATE TRIGGER trg_ensure_single_default_template
    BEFORE INSERT OR UPDATE ON document_templates
    FOR EACH ROW
    EXECUTE FUNCTION ensure_single_default_template();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_document_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_document_templates_updated_at ON document_templates;
CREATE TRIGGER trg_document_templates_updated_at
    BEFORE UPDATE ON document_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_document_templates_timestamp();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON document_templates TO authenticated;
GRANT SELECT ON document_templates TO anon;

-- =====================================================
-- COMMENT ON COLUMNS (documentation)
-- =====================================================
COMMENT ON TABLE document_templates IS 'Customizable document templates for PDF generation (invoices, quotes, etc.)';
COMMENT ON COLUMN document_templates.accent_color IS 'Primary accent color used in PDF (header bar, table headers)';
COMMENT ON COLUMN document_templates.header_enabled IS 'Whether to show the header section in PDFs';
COMMENT ON COLUMN document_templates.footer_text IS 'Default footer text, supports {page} and {totalPages} placeholders';
COMMENT ON COLUMN document_templates.watermark_enabled IS 'Show a diagonal watermark text across the document';
