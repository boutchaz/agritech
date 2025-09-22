-- ============================================================================
-- MULTI-TENANT LOOKUP TABLES MIGRATION
-- ============================================================================
-- This migration adds organization_id to all lookup/definitional tables
-- to make them multi-tenant. NULL organization_id indicates global/shared data.
-- ============================================================================

-- ============================================================================
-- 1. CROP DEFINITION TABLES
-- ============================================================================

-- Add organization_id to crop_types
ALTER TABLE crop_types
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_crop_types_organization_id ON crop_types(organization_id);

-- Update unique constraint to include organization_id
ALTER TABLE crop_types
DROP CONSTRAINT IF EXISTS crop_types_name_key;

ALTER TABLE crop_types
ADD CONSTRAINT crop_types_org_name_unique
UNIQUE(organization_id, name);

-- Add organization_id to crop_categories
ALTER TABLE crop_categories
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_crop_categories_organization_id ON crop_categories(organization_id);

-- Update unique constraint to include organization_id
ALTER TABLE crop_categories
DROP CONSTRAINT IF EXISTS crop_categories_type_id_name_key;

ALTER TABLE crop_categories
ADD CONSTRAINT crop_categories_org_type_name_unique
UNIQUE(organization_id, type_id, name);

-- Add organization_id to crop_varieties
ALTER TABLE crop_varieties
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_crop_varieties_organization_id ON crop_varieties(organization_id);

-- Update unique constraint to include organization_id
ALTER TABLE crop_varieties
DROP CONSTRAINT IF EXISTS crop_varieties_category_id_name_key;

ALTER TABLE crop_varieties
ADD CONSTRAINT crop_varieties_org_category_name_unique
UNIQUE(organization_id, category_id, name);

-- ============================================================================
-- 2. PRODUCT DEFINITION TABLES
-- ============================================================================

-- Add organization_id to product_categories
ALTER TABLE product_categories
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_product_categories_organization_id ON product_categories(organization_id);

-- Update unique constraint to include organization_id
ALTER TABLE product_categories
DROP CONSTRAINT IF EXISTS product_categories_name_key;

ALTER TABLE product_categories
ADD CONSTRAINT product_categories_org_name_unique
UNIQUE(organization_id, name);

-- Add organization_id to product_subcategories
ALTER TABLE product_subcategories
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_product_subcategories_organization_id ON product_subcategories(organization_id);

-- Update unique constraint to include organization_id
ALTER TABLE product_subcategories
DROP CONSTRAINT IF EXISTS product_subcategories_category_id_name_key;

ALTER TABLE product_subcategories
ADD CONSTRAINT product_subcategories_org_category_name_unique
UNIQUE(organization_id, category_id, name);

-- ============================================================================
-- 3. TASK DEFINITION TABLES
-- ============================================================================

-- Add organization_id to task_categories
ALTER TABLE task_categories
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_task_categories_organization_id ON task_categories(organization_id);

-- Update unique constraint to include organization_id
ALTER TABLE task_categories
DROP CONSTRAINT IF EXISTS task_categories_name_key;

ALTER TABLE task_categories
ADD CONSTRAINT task_categories_org_name_unique
UNIQUE(organization_id, name);

-- Add organization_id to task_templates
ALTER TABLE task_templates
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_task_templates_organization_id ON task_templates(organization_id);

-- ============================================================================
-- 4. TEST DEFINITION TABLES
-- ============================================================================

-- Add organization_id to test_types
ALTER TABLE test_types
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_test_types_organization_id ON test_types(organization_id);

-- ============================================================================
-- 5. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to get crop types for an organization (including global ones)
CREATE OR REPLACE FUNCTION get_crop_types_for_org(org_id uuid)
RETURNS TABLE (
    id uuid,
    name text,
    description text,
    organization_id uuid,
    is_global boolean
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        id,
        name,
        description,
        organization_id,
        (organization_id IS NULL) as is_global
    FROM crop_types
    WHERE organization_id = org_id OR organization_id IS NULL
    ORDER BY is_global, name;
$$;

-- Function to get product categories for an organization (including global ones)
CREATE OR REPLACE FUNCTION get_product_categories_for_org(org_id uuid)
RETURNS TABLE (
    id uuid,
    name text,
    description text,
    organization_id uuid,
    is_global boolean
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        id,
        name,
        description,
        organization_id,
        (organization_id IS NULL) as is_global
    FROM product_categories
    WHERE organization_id = org_id OR organization_id IS NULL
    ORDER BY is_global, name;
$$;

-- Function to get task categories for an organization (including global ones)
CREATE OR REPLACE FUNCTION get_task_categories_for_org(org_id uuid)
RETURNS TABLE (
    id uuid,
    name text,
    description text,
    color text,
    organization_id uuid,
    is_global boolean
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        id,
        name,
        description,
        color,
        organization_id,
        (organization_id IS NULL) as is_global
    FROM task_categories
    WHERE organization_id = org_id OR organization_id IS NULL
    ORDER BY is_global, name;
$$;

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all lookup tables
ALTER TABLE crop_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE crop_varieties ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_types ENABLE ROW LEVEL SECURITY;

-- Policy for crop_types
CREATE POLICY "Users can view global and their organization's crop types" ON crop_types
    FOR SELECT
    USING (
        organization_id IS NULL
        OR organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can insert crop types for their organization" ON crop_types
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can update their organization's crop types" ON crop_types
    FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can delete their organization's crop types" ON crop_types
    FOR DELETE
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Policy for crop_categories (similar pattern)
CREATE POLICY "Users can view global and their organization's crop categories" ON crop_categories
    FOR SELECT
    USING (
        organization_id IS NULL
        OR organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can manage their organization's crop categories" ON crop_categories
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Policy for crop_varieties (similar pattern)
CREATE POLICY "Users can view global and their organization's crop varieties" ON crop_varieties
    FOR SELECT
    USING (
        organization_id IS NULL
        OR organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can manage their organization's crop varieties" ON crop_varieties
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Policy for product_categories
CREATE POLICY "Users can view global and their organization's product categories" ON product_categories
    FOR SELECT
    USING (
        organization_id IS NULL
        OR organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can manage their organization's product categories" ON product_categories
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Policy for product_subcategories
CREATE POLICY "Users can view global and their organization's product subcategories" ON product_subcategories
    FOR SELECT
    USING (
        organization_id IS NULL
        OR organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can manage their organization's product subcategories" ON product_subcategories
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Policy for task_categories
CREATE POLICY "Users can view global and their organization's task categories" ON task_categories
    FOR SELECT
    USING (
        organization_id IS NULL
        OR organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can manage their organization's task categories" ON task_categories
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Policy for task_templates
CREATE POLICY "Users can view global and their organization's task templates" ON task_templates
    FOR SELECT
    USING (
        organization_id IS NULL
        OR organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can manage their organization's task templates" ON task_templates
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Policy for test_types
CREATE POLICY "Users can view global and their organization's test types" ON test_types
    FOR SELECT
    USING (
        organization_id IS NULL
        OR organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can manage their organization's test types" ON test_types
    FOR ALL
    USING (
        organization_id IN (
            SELECT organization_id FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- ============================================================================
-- 7. INSERT DEFAULT GLOBAL DATA
-- ============================================================================

-- Insert global crop types (available to all organizations)
INSERT INTO crop_types (name, description, organization_id) VALUES
    ('Fruits', 'Fruit crops', NULL),
    ('Vegetables', 'Vegetable crops', NULL),
    ('Grains', 'Grain crops', NULL),
    ('Legumes', 'Legume crops', NULL)
ON CONFLICT (organization_id, name) DO NOTHING;

-- Insert global product categories
INSERT INTO product_categories (name, description, organization_id) VALUES
    ('Seeds', 'Seeds and planting materials', NULL),
    ('Fertilizers', 'Fertilizers and nutrients', NULL),
    ('Pesticides', 'Pest control products', NULL),
    ('Equipment', 'Farm equipment and tools', NULL)
ON CONFLICT (organization_id, name) DO NOTHING;

-- Insert global task categories
INSERT INTO task_categories (name, description, color, organization_id) VALUES
    ('Planting', 'Planting and seeding tasks', '#10B981', NULL),
    ('Irrigation', 'Watering and irrigation tasks', '#3B82F6', NULL),
    ('Harvesting', 'Harvest related tasks', '#F59E0B', NULL),
    ('Maintenance', 'Equipment and field maintenance', '#6B7280', NULL)
ON CONFLICT (organization_id, name) DO NOTHING;

-- Insert global test types
INSERT INTO test_types (name, description, organization_id) VALUES
    ('Soil pH', 'Soil acidity/alkalinity test', NULL),
    ('NPK Analysis', 'Nitrogen, Phosphorus, Potassium analysis', NULL),
    ('Organic Matter', 'Soil organic matter content', NULL),
    ('Water Quality', 'Irrigation water quality test', NULL)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. COMMENTS
-- ============================================================================

COMMENT ON COLUMN crop_types.organization_id IS 'NULL for global types, UUID for organization-specific types';
COMMENT ON COLUMN crop_categories.organization_id IS 'NULL for global categories, UUID for organization-specific categories';
COMMENT ON COLUMN crop_varieties.organization_id IS 'NULL for global varieties, UUID for organization-specific varieties';
COMMENT ON COLUMN product_categories.organization_id IS 'NULL for global categories, UUID for organization-specific categories';
COMMENT ON COLUMN product_subcategories.organization_id IS 'NULL for global subcategories, UUID for organization-specific subcategories';
COMMENT ON COLUMN task_categories.organization_id IS 'NULL for global categories, UUID for organization-specific categories';
COMMENT ON COLUMN task_templates.organization_id IS 'NULL for global templates, UUID for organization-specific templates';
COMMENT ON COLUMN test_types.organization_id IS 'NULL for global types, UUID for organization-specific types';