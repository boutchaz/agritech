-- Generic Module Configuration System
-- Migration Date: 2026-01-27
-- Description: Adds generic module configuration with caching and translation support

-- Add slug column to modules (for frontend routing)
ALTER TABLE modules
ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;

-- Update slugs for existing modules (if any)
UPDATE modules SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g')) WHERE slug IS NULL;

-- Add module configuration columns
ALTER TABLE modules
ADD COLUMN IF NOT EXISTS color VARCHAR(20),
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS price_monthly NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_recommended BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS dashboard_widgets JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS navigation_items JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]';

COMMENT ON COLUMN modules.slug IS 'URL-friendly identifier for the module';
COMMENT ON COLUMN modules.color IS 'Color theme for the module (hex code)';
COMMENT ON COLUMN modules.display_order IS 'Display order in UI';
COMMENT ON COLUMN modules.price_monthly IS 'Monthly price when purchased as part of subscription';
COMMENT ON COLUMN modules.is_required IS 'Whether this module is required for all organizations';
COMMENT ON COLUMN modules.is_recommended IS 'Whether this module is recommended for new organizations';
COMMENT ON COLUMN modules.dashboard_widgets IS 'Array of dashboard widgets provided by this module';
COMMENT ON COLUMN modules.navigation_items IS 'Array of navigation items for this module';
COMMENT ON COLUMN modules.features IS 'Array of feature descriptions for marketing';

-- Add translations table
CREATE TABLE IF NOT EXISTS module_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  locale VARCHAR(10) NOT NULL, -- en, fr, ar, etc.
  name VARCHAR(100),
  description TEXT,
  features JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(module_id, locale)
);

COMMENT ON TABLE module_translations IS 'Translations for module names, descriptions, and features';

-- Create module config cache table
CREATE TABLE IF NOT EXISTS module_config_cache (
  cache_key VARCHAR(100) PRIMARY KEY,
  locale VARCHAR(10) NOT NULL DEFAULT 'en',
  data JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE module_config_cache IS 'Cached module configuration for performance';

-- Create widget to module mapping table
CREATE TABLE IF NOT EXISTS widget_module_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_name VARCHAR(100) NOT NULL UNIQUE,
  module_slug VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE widget_module_mapping IS 'Maps dashboard widgets to their owning modules';

-- Enable Row Level Security
ALTER TABLE module_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE module_config_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE widget_module_mapping ENABLE ROW LEVEL SECURITY;

-- Public read for translations and cache
CREATE POLICY "public_read_module_translations" ON module_translations FOR SELECT USING (true);
CREATE POLICY "public_read_module_config_cache" ON module_config_cache FOR SELECT USING (true);
CREATE POLICY "public_read_widget_module_mapping" ON widget_module_mapping FOR SELECT USING (true);

-- Admin write policies
CREATE POLICY "admin_write_module_translations" ON module_translations FOR ALL
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON ou.role_id = r.id
    WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.name IN ('system_admin')
  )
);

CREATE POLICY "admin_write_module_config_cache" ON module_config_cache FOR ALL
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON ou.role_id = r.id
    WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.name IN ('system_admin')
  )
);

CREATE POLICY "admin_write_widget_module_mapping" ON widget_module_mapping FOR ALL
WITH CHECK (
  EXISTS (
    SELECT 1 FROM organization_users ou
    JOIN roles r ON ou.role_id = r.id
    WHERE ou.user_id = auth.uid()
      AND ou.is_active = true
      AND r.name IN ('system_admin')
  )
);

-- Function: get_module_config
CREATE OR REPLACE FUNCTION get_module_config(p_locale VARCHAR DEFAULT 'en')
RETURNS TABLE (
  id UUID,
  slug VARCHAR(100),
  name VARCHAR(100),
  icon VARCHAR(50),
  color VARCHAR(20),
  category VARCHAR(50),
  display_order INTEGER,
  price_monthly NUMERIC(10, 2),
  is_required BOOLEAN,
  is_recommended BOOLEAN,
  is_addon_eligible BOOLEAN,
  is_available BOOLEAN,
  required_plan VARCHAR(50),
  dashboard_widgets JSONB,
  navigation_items JSONB,
  description TEXT,
  features JSONB
) LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
DECLARE
  v_locale VARCHAR(10);
BEGIN
  -- Normalize locale
  v_locale := p_locale;
  IF v_locale NOT IN ('en', 'fr', 'ar') THEN
    v_locale := 'en';
  END IF;

  RETURN QUERY
  SELECT
    m.id,
    m.slug,
    COALESCE(mt.name, m.name) AS name,
    m.icon,
    m.color,
    m.category,
    m.display_order,
    m.price_monthly,
    m.is_required,
    m.is_recommended,
    m.is_addon_eligible,
    m.is_available,
    m.required_plan,
    m.dashboard_widgets,
    m.navigation_items,
    COALESCE(mt.description, m.description) AS description,
    COALESCE(mt.features, m.features) AS features
  FROM modules m
  LEFT JOIN module_translations mt ON mt.module_id = m.id AND mt.locale = v_locale
  WHERE m.is_available = true
  ORDER BY m.display_order, m.name;
END;
$$;

-- Function: get_widget_to_module_map
CREATE OR REPLACE FUNCTION get_widget_to_module_map()
RETURNS TABLE (
  widget_name VARCHAR(100),
  module_slug VARCHAR(100)
) LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT wmm.widget_name, wmm.module_slug
  FROM widget_module_mapping wmm
  ORDER BY wmm.widget_name;
END;
$$;

-- Function: clear_module_config_cache
CREATE OR REPLACE FUNCTION clear_module_config_cache()
RETURNS VOID LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM module_config_cache;
END;
$$;

-- Function: refresh_module_config_cache
CREATE OR REPLACE FUNCTION refresh_module_config_cache(p_locale VARCHAR DEFAULT 'en')
RETURNS VOID LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
DECLARE
  v_cache_key VARCHAR(100);
  v_expires_at TIMESTAMPTZ;
  v_data JSONB;
BEGIN
  v_cache_key := 'module_config_' || p_locale;
  v_expires_at := NOW() + INTERVAL '1 hour';

  -- Build cache data
  SELECT jsonb_agg(row_to_json(t))
  INTO v_data
  FROM get_module_config(p_locale) t;

  -- Upsert cache
  INSERT INTO module_config_cache (cache_key, locale, data, expires_at)
  VALUES (v_cache_key, p_locale, v_data, v_expires_at)
  ON CONFLICT (cache_key) DO UPDATE
  SET data = EXCLUDED.data,
      expires_at = EXCLUDED.expires_at,
      updated_at = NOW();
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER update_module_translations_updated_at
BEFORE UPDATE ON module_translations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_module_config_cache_updated_at
BEFORE UPDATE ON module_config_cache
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_widget_module_mapping_updated_at
BEFORE UPDATE ON widget_module_mapping
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
