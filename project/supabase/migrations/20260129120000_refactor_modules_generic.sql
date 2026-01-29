-- Refactor Modules to Use Generic Routes with Filters
-- Migration Date: 2026-01-29
-- Description: Refactors the module system to use generic routes with filter-based data access

-- This migration ensures the modules table has proper configuration
-- for the generic route system with filters

-- Add route configuration columns to modules
ALTER TABLE modules
ADD COLUMN IF NOT EXISTS route_base VARCHAR(100),
ADD COLUMN IF NOT EXISTS filter_config JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS default_filters JSONB DEFAULT '{}';

COMMENT ON COLUMN modules.route_base IS 'Base route path for this module (e.g., /crops, /orchards)';
COMMENT ON COLUMN modules.filter_config IS 'Configuration of available filters for this module';
COMMENT ON COLUMN modules.default_filters IS 'Default filter values for this module';

-- Update modules with route configurations
UPDATE modules SET
  route_base = '/crops',
  filter_config = '{
    "crop_type": {"type": "select", "field": "crop_type_id"},
    "farm": {"type": "select", "field": "farm_id"},
    "parcel": {"type": "select", "field": "parcel_id"},
    "status": {"type": "select", "field": "status", "options": ["active", "archived"]},
    "date_range": {"type": "date", "field": "created_at"}
  }'::jsonb,
  default_filters = '{
    "status": "active"
  }'::jsonb
WHERE slug = 'crops';

UPDATE modules SET
  route_base = '/orchards',
  filter_config = '{
    "farm": {"type": "select", "field": "farm_id"},
    "tree_category": {"type": "select", "field": "tree_category_id"},
    "variety": {"type": "select", "field": "variety_id"},
    "status": {"type": "select", "field": "status", "options": ["active", "removed", "dead"]},
    "age_range": {"type": "range", "field": "planting_year"}
  }'::jsonb,
  default_filters = '{
    "status": "active"
  }'::jsonb
WHERE slug = 'orchards';

UPDATE modules SET
  route_base = '/pruning',
  filter_config = '{
    "orchard": {"type": "select", "field": "orchard_id"},
    "farm": {"type": "select", "field": "farm_id"},
    "task_type": {"type": "select", "field": "task_type"},
    "status": {"type": "select", "field": "status", "options": ["pending", "in_progress", "completed"]},
    "season": {"type": "select", "field": "season", "options": ["winter", "spring", "summer", "fall"]},
    "date_range": {"type": "date", "field": "scheduled_date"}
  }'::jsonb,
  default_filters = '{
    "status": "pending"
  }'::jsonb
WHERE slug = 'pruning';

-- Create generic_filter_options function for dynamic filter options
CREATE OR REPLACE FUNCTION get_generic_filter_options(p_module_slug VARCHAR, p_filter_name VARCHAR)
RETURNS TABLE (
  value VARCHAR,
  label VARCHAR,
  count BIGINT
) LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
DECLARE
  v_route_base VARCHAR(100);
  v_filter_config JSONB;
  v_filter_type VARCHAR;
  v_filter_field VARCHAR;
  v_table_name VARCHAR;
  v_sql TEXT;
BEGIN
  -- Get module configuration
  SELECT m.route_base, m.filter_config
  INTO v_route_base, v_filter_config
  FROM modules m
  WHERE m.slug = p_module_slug;

  IF v_filter_config IS NULL THEN
    RETURN;
  END IF;

  -- Get specific filter config
  SELECT
    (v_filter_config -> p_filter_name ->> 'type')::VARCHAR,
    (v_filter_config -> p_filter_name ->> 'field')::VARCHAR
  INTO v_filter_type, v_filter_field;

  IF v_filter_field IS NULL THEN
    RETURN;
  END IF;

  -- Determine table based on route base
  v_table_name := CASE
    WHEN v_route_base = '/crops' THEN 'crops'
    WHEN v_route_base = '/orchards' THEN 'trees'
    WHEN v_route_base = '/pruning' THEN 'pruning_records'
    ELSE NULL
  END;

  IF v_table_name IS NULL THEN
    RETURN;
  END IF;

  -- Build dynamic SQL based on filter type
  IF v_filter_type = 'select' THEN
    -- For foreign key based selects, get related table values
    IF v_filter_field LIKE '%\_id' THEN
      v_sql := format(
        'SELECT
          related.id::TEXT as value,
          COALESCE(related.name, related.title, related.id::TEXT) as label,
          COUNT(*)::BIGINT as count
        FROM %I AS main
        LEFT JOIN %I AS related ON related.id = main.%s
        WHERE main.organization_id IN (
          SELECT organization_id FROM organization_users
          WHERE user_id = auth.uid() AND is_active = true
        )
        GROUP BY related.id, related.name, related.title
        ORDER BY label',
        v_table_name,
        rtrim(v_filter_field, '_id') || 's',
        v_filter_field
      );

      EXECUTE v_sql;
    END IF;
  END IF;
END;
$$;

-- Create function to get module data with filters
CREATE OR REPLACE FUNCTION get_module_data(
  p_module_slug VARCHAR,
  p_filters JSONB DEFAULT '{}',
  p_page INTEGER DEFAULT 1,
  p_page_size INTEGER DEFAULT 20
)
RETURNS TABLE (
  data JSONB,
  total_count BIGINT,
  page INTEGER,
  page_size INTEGER
) LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
DECLARE
  v_route_base VARCHAR(100);
  v_table_name VARCHAR;
  v_organization_id UUID;
  v_sql TEXT;
  v_where_clause TEXT := '';
  v_offset INTEGER;
  v_result JSONB;
  v_total BIGINT;
BEGIN
  -- Get module configuration
  SELECT m.route_base
  INTO v_route_base
  FROM modules m
  WHERE m.slug = p_module_slug;

  IF v_route_base IS NULL THEN
    RAISE EXCEPTION 'Module not found: %', p_module_slug;
  END IF;

  -- Determine table
  v_table_name := CASE
    WHEN v_route_base = '/crops' THEN 'crops'
    WHEN v_route_base = '/orchards' THEN 'trees'
    WHEN v_route_base = '/pruning' THEN 'pruning_records'
    ELSE NULL
  END;

  IF v_table_name IS NULL THEN
    RAISE EXCEPTION 'Unknown route base: %', v_route_base;
  END IF;

  -- Build WHERE clause from filters
  IF p_filters IS NOT NULL AND jsonb_object_keys(p_filters) IS NOT NULL THEN
    -- TODO: Implement proper filter building
    v_where_clause := 'WHERE 1=1'; -- Placeholder
  END IF;

  -- Get user's organizations
  v_organization_id := (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
    LIMIT 1
  );

  IF v_organization_id IS NULL THEN
    RAISE EXCEPTION 'No organization found for user';
  END IF;

  -- Get total count
  v_sql := format('SELECT COUNT(*) FROM %I WHERE organization_id = $1', v_table_name);
  EXECUTE v_sql USING v_organization_id INTO v_total;

  -- Get paginated data
  v_offset := (p_page - 1) * p_page_size;
  v_sql := format(
    'SELECT jsonb_agg(row_to_json(t)) FROM (
      SELECT * FROM %I
      WHERE organization_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    ) t',
    v_table_name
  );

  EXECUTE v_sql USING v_organization_id, p_page_size, v_offset INTO v_result;

  RETURN QUERY SELECT v_result, v_total, p_page, p_page_size;
END;
$$;

-- Update navigation_items to use generic route pattern
UPDATE modules SET
  navigation_items = '[
    {
      "to": "/crops",
      "label": "All Crops",
      "icon": "🌱"
    },
    {
      "to": "/crops?status=active",
      "label": "Active Crops",
      "icon": "✅"
    }
  ]'::jsonb
WHERE slug = 'crops';

UPDATE modules SET
  navigation_items = '[
    {
      "to": "/orchards",
      "label": "All Orchards",
      "icon": "🌳"
    },
    {
      "to": "/orchards?status=active",
      "label": "Active Trees",
      "icon": "✅"
    }
  ]'::jsonb
WHERE slug = 'orchards';
