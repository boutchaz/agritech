-- Abstract Module System Implementation
-- Migration Date: 2026-01-29
-- Description: Creates an abstract module system for handling diverse entity types

-- Create abstract_entities table for unified entity management
CREATE TABLE IF NOT EXISTS abstract_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL, -- crop, tree, animal, equipment, etc.
  entity_id UUID NOT NULL, -- References the actual entity in its specific table
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(entity_type, entity_id)
);

COMMENT ON TABLE abstract_entities IS 'Abstract entity table for unified access to all module entities';

-- Create entity_types configuration table
CREATE TABLE IF NOT EXISTS entity_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  slug VARCHAR(50) NOT NULL UNIQUE,
  module_slug VARCHAR(50) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  display_name VARCHAR(100),
  display_name_plural VARCHAR(100),
  icon VARCHAR(50),
  color VARCHAR(20),
  config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE entity_types IS 'Configuration for different entity types in the abstract system';

-- Insert default entity types
INSERT INTO entity_types (name, slug, module_slug, table_name, display_name, display_name_plural, icon, color, config) VALUES
  ('Crop', 'crop', 'crops', 'crops', 'Crop', 'Crops', '🌱', '#22c55e',
   '{"has_farm": true, "has_parcel": true, "has_crop_type": true}'::jsonb),
  ('Tree', 'tree', 'orchards', 'trees', 'Tree', 'Trees', '🌳', '#84cc16',
   '{"has_farm": true, "has_orchard": true, "has_tree_category": true}'::jsonb),
  ('Pruning Record', 'pruning_record', 'pruning', 'pruning_records', 'Pruning Task', 'Pruning Tasks', '✂️', '#f59e0b',
   '{"has_farm": true, "has_orchard": true, "has_tree": true}'::jsonb),
  ('Farm', 'farm', 'farms', 'farms', 'Farm', 'Farms', '🏡', '#8b5cf6',
   '{"location": true, "area": true}'::jsonb),
  ('Parcel', 'parcel', 'parcels', 'parcels', 'Parcel', 'Parcels', '🗺️', '#3b82f6',
   '{"location": true, "area": true, "has_farm": true}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- Create entity_relationships table for related entities
CREATE TABLE IF NOT EXISTS entity_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_entity_type VARCHAR(50) NOT NULL,
  parent_entity_id UUID NOT NULL,
  child_entity_type VARCHAR(50) NOT NULL,
  child_entity_id UUID NOT NULL,
  relationship_type VARCHAR(50) NOT NULL, -- contains, located_in, belongs_to, etc.
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(parent_entity_type, parent_entity_id, child_entity_type, child_entity_id, relationship_type)
);

COMMENT ON TABLE entity_relationships IS 'Relationships between different entity types';

-- Create entity_events table for tracking entity events
CREATE TABLE IF NOT EXISTS entity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- created, updated, deleted, status_changed, etc.
  event_data JSONB DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE entity_events IS 'Audit log for entity events';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_abstract_entities_type ON abstract_entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_abstract_entities_org ON abstract_entities(organization_id);
CREATE INDEX IF NOT EXISTS idx_abstract_entities_tags ON abstract_entities USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_entity_types_slug ON entity_types(slug);
CREATE INDEX IF NOT EXISTS idx_entity_types_module ON entity_types(module_slug);
CREATE INDEX IF NOT EXISTS idx_entity_relationships_parent ON entity_relationships(parent_entity_type, parent_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_relationships_child ON entity_relationships(child_entity_type, child_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_events_entity ON entity_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_events_org ON entity_events(organization_id);
CREATE INDEX IF NOT EXISTS idx_entity_events_created ON entity_events(created_at DESC);

-- Enable Row Level Security
ALTER TABLE abstract_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "org_read_abstract_entities"
ON abstract_entities FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "org_write_abstract_entities"
ON abstract_entities FOR ALL
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "public_read_entity_types" ON entity_types FOR SELECT USING (is_active = true);

CREATE POLICY "org_read_entity_relationships"
ON entity_relationships FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM abstract_entities ae
    WHERE ae.entity_type = entity_relationships.parent_entity_type
      AND ae.entity_id = entity_relationships.parent_entity_id
      AND ae.organization_id IN (
        SELECT organization_id FROM organization_users
        WHERE user_id = auth.uid() AND is_active = true
      )
  )
);

CREATE POLICY "org_write_entity_relationships"
ON entity_relationships FOR ALL
WITH CHECK (
  EXISTS (
    SELECT 1 FROM abstract_entities ae
    WHERE ae.entity_type = entity_relationships.parent_entity_type
      AND ae.entity_id = entity_relationships.parent_entity_id
      AND ae.organization_id IN (
        SELECT organization_id FROM organization_users
        WHERE user_id = auth.uid() AND is_active = true
      )
  )
);

CREATE POLICY "org_read_entity_events"
ON entity_events FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM organization_users
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Functions for abstract entity system

-- Function to register an entity in the abstract system
CREATE OR REPLACE FUNCTION register_abstract_entity(
  p_entity_type VARCHAR,
  p_entity_id UUID,
  p_organization_id UUID,
  p_metadata JSONB DEFAULT '{}',
  p_tags TEXT[] DEFAULT '{}'
)
RETURNS UUID LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
DECLARE
  v_abstract_id UUID;
BEGIN
  INSERT INTO abstract_entities (entity_type, entity_id, organization_id, metadata, tags)
  VALUES (p_entity_type, p_entity_id, p_organization_id, p_metadata, p_tags)
  ON CONFLICT (entity_type, entity_id) DO UPDATE
    SET metadata = EXCLUDED.metadata,
        tags = EXCLUDED.tags,
        updated_at = NOW()
  RETURNING id INTO v_abstract_id;

  RETURN v_abstract_id;
END;
$$;

-- Function to log entity events
CREATE OR REPLACE FUNCTION log_entity_event(
  p_entity_type VARCHAR,
  p_entity_id UUID,
  p_event_type VARCHAR,
  p_event_data JSONB DEFAULT '{}'
)
RETURNS UUID LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
DECLARE
  v_organization_id UUID;
  v_event_id UUID;
BEGIN
  -- Get organization_id from abstract entity
  SELECT organization_id INTO v_organization_id
  FROM abstract_entities
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id;

  IF v_organization_id IS NULL THEN
    RAISE EXCEPTION 'Entity not registered in abstract system: % %', p_entity_type, p_entity_id;
  END IF;

  INSERT INTO entity_events (entity_type, entity_id, event_type, event_data, user_id, organization_id)
  VALUES (p_entity_type, p_entity_id, p_event_type, p_event_data, auth.uid(), v_organization_id)
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- Function to get entity by type and ID with metadata
CREATE OR REPLACE FUNCTION get_abstract_entity(
  p_entity_type VARCHAR,
  p_entity_id UUID
)
RETURNS TABLE (
  id UUID,
  entity_type VARCHAR,
  entity_id UUID,
  organization_id UUID,
  metadata JSONB,
  tags TEXT[]
) LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT ae.id, ae.entity_type, ae.entity_id, ae.organization_id, ae.metadata, ae.tags
  FROM abstract_entities ae
  WHERE ae.entity_type = p_entity_type AND ae.entity_id = p_entity_id
    AND ae.organization_id IN (
      SELECT organization_id FROM organization_users
      WHERE user_id = auth.uid() AND is_active = true
    );
END;
$$;

-- Function to search entities across all types
CREATE OR REPLACE FUNCTION search_entities(
  p_search_term VARCHAR,
  p_entity_types VARCHAR[] DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  entity_type VARCHAR,
  entity_id UUID,
  entity_config JSONB,
  metadata JSONB
) LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ae.entity_type,
    ae.entity_id,
    et.config as entity_config,
    ae.metadata
  FROM abstract_entities ae
  JOIN entity_types et ON et.slug = ae.entity_type
  WHERE ae.organization_id IN (
        SELECT organization_id FROM organization_users
        WHERE user_id = auth.uid() AND is_active = true
      )
    AND (p_entity_types IS NULL OR ae.entity_type = ANY(p_entity_types))
    AND (p_tags IS NULL OR ae.tags && p_tags)
    AND (
      p_search_term IS NULL
      OR ae.metadata::text ILIKE '%' || p_search_term || '%'
      OR ae.entity_type ILIKE '%' || p_search_term || '%'
    )
  LIMIT p_limit;
END;
$$;

-- Add updated_at triggers
CREATE TRIGGER update_abstract_entities_updated_at
BEFORE UPDATE ON abstract_entities
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entity_types_updated_at
BEFORE UPDATE ON entity_types
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
