-- Create document templates table for customizable headers and footers
CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Template identification
  name TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('invoice', 'quote', 'sales_order', 'purchase_order', 'report', 'general')),
  is_default BOOLEAN DEFAULT false,

  -- Header configuration
  header_enabled BOOLEAN DEFAULT true,
  header_height NUMERIC(5,2) DEFAULT 80, -- in mm
  header_logo_url TEXT,
  header_logo_position TEXT DEFAULT 'left' CHECK (header_logo_position IN ('left', 'center', 'right')),
  header_logo_width NUMERIC(5,2) DEFAULT 50, -- in mm
  header_logo_height NUMERIC(5,2) DEFAULT 30, -- in mm
  header_company_name BOOLEAN DEFAULT true,
  header_company_info BOOLEAN DEFAULT true,
  header_custom_text TEXT,
  header_background_color TEXT DEFAULT '#ffffff',
  header_text_color TEXT DEFAULT '#000000',
  header_border_bottom BOOLEAN DEFAULT true,
  header_border_color TEXT DEFAULT '#e5e7eb',

  -- Footer configuration
  footer_enabled BOOLEAN DEFAULT true,
  footer_height NUMERIC(5,2) DEFAULT 60, -- in mm
  footer_text TEXT DEFAULT 'Page {page} of {totalPages}',
  footer_position TEXT DEFAULT 'center' CHECK (footer_position IN ('left', 'center', 'right')),
  footer_include_company_info BOOLEAN DEFAULT true,
  footer_custom_text TEXT,
  footer_background_color TEXT DEFAULT '#f9fafb',
  footer_text_color TEXT DEFAULT '#6b7280',
  footer_border_top BOOLEAN DEFAULT true,
  footer_border_color TEXT DEFAULT '#e5e7eb',
  footer_font_size NUMERIC(3,1) DEFAULT 9, -- in pt

  -- Page configuration
  page_margin_top NUMERIC(5,2) DEFAULT 20, -- in mm
  page_margin_bottom NUMERIC(5,2) DEFAULT 20, -- in mm
  page_margin_left NUMERIC(5,2) DEFAULT 15, -- in mm
  page_margin_right NUMERIC(5,2) DEFAULT 15, -- in mm

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),

  -- Constraints
  UNIQUE(organization_id, name),
  CONSTRAINT valid_header_height CHECK (header_height >= 0 AND header_height <= 200),
  CONSTRAINT valid_footer_height CHECK (footer_height >= 0 AND header_height <= 200),
  CONSTRAINT valid_margins CHECK (
    page_margin_top >= 0 AND page_margin_top <= 100 AND
    page_margin_bottom >= 0 AND page_margin_bottom <= 100 AND
    page_margin_left >= 0 AND page_margin_left <= 100 AND
    page_margin_right >= 0 AND page_margin_right <= 100
  )
);

-- Create index for faster lookups
CREATE INDEX idx_document_templates_org_id ON document_templates(organization_id);
CREATE INDEX idx_document_templates_type ON document_templates(organization_id, document_type);
CREATE INDEX idx_document_templates_default ON document_templates(organization_id, document_type, is_default) WHERE is_default = true;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_document_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_document_template_updated_at
  BEFORE UPDATE ON document_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_document_template_updated_at();

-- Enable RLS
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view templates from their organization
CREATE POLICY "Users can view their organization's document templates"
  ON document_templates
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
    )
  );

-- Organization admins and farm managers can create templates
CREATE POLICY "Admins and managers can create document templates"
  ON document_templates
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
        AND role IN ('organization_admin', 'farm_manager')
    )
  );

-- Organization admins and farm managers can update templates
CREATE POLICY "Admins and managers can update document templates"
  ON document_templates
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
        AND role IN ('organization_admin', 'farm_manager')
    )
  );

-- Organization admins can delete templates
CREATE POLICY "Admins can delete document templates"
  ON document_templates
  FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id
      FROM organization_users
      WHERE user_id = auth.uid()
        AND role = 'organization_admin'
    )
  );

-- Create function to ensure only one default template per type
CREATE OR REPLACE FUNCTION ensure_single_default_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    -- Unset other default templates of the same type
    UPDATE document_templates
    SET is_default = false
    WHERE organization_id = NEW.organization_id
      AND document_type = NEW.document_type
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ensure_single_default_template
  BEFORE INSERT OR UPDATE OF is_default ON document_templates
  FOR EACH ROW
  WHEN (NEW.is_default = true)
  EXECUTE FUNCTION ensure_single_default_template();

-- Insert default templates for each organization
DO $$
DECLARE
  org RECORD;
BEGIN
  FOR org IN SELECT id FROM organizations LOOP
    -- Default invoice template
    INSERT INTO document_templates (
      organization_id,
      name,
      document_type,
      is_default,
      header_custom_text,
      footer_custom_text
    ) VALUES (
      org.id,
      'Default Invoice Template',
      'invoice',
      true,
      'INVOICE',
      'Thank you for your business!'
    ) ON CONFLICT (organization_id, name) DO NOTHING;

    -- Default report template
    INSERT INTO document_templates (
      organization_id,
      name,
      document_type,
      is_default,
      header_custom_text,
      footer_custom_text
    ) VALUES (
      org.id,
      'Default Report Template',
      'report',
      true,
      'REPORT',
      'Confidential'
    ) ON CONFLICT (organization_id, name) DO NOTHING;
  END LOOP;
END $$;

-- Add comment
COMMENT ON TABLE document_templates IS 'Stores customizable document header and footer templates for PDF generation';
