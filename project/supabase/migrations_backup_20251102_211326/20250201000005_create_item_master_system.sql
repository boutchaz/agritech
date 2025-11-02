-- =====================================================
-- Migration: Item Master System (ERPNext-style)
-- Description: Comprehensive item management with groups, variants, pricing, and supplier/customer codes
-- =====================================================

-- =====================================================
-- 1. ITEM GROUPS (Hierarchical Categorization)
-- =====================================================
CREATE TABLE IF NOT EXISTS item_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Basic Information
  name TEXT NOT NULL,
  code TEXT, -- Optional code for programmatic access
  description TEXT,
  
  -- Hierarchy
  parent_group_id UUID REFERENCES item_groups(id) ON DELETE SET NULL,
  path TEXT, -- Materialized path for easy querying (e.g., 'Agriculture/Crops/Fruits/Olives')
  
  -- Defaults (inherited by items in this group)
  default_sales_account_id UUID REFERENCES accounts(id),
  default_expense_account_id UUID REFERENCES accounts(id),
  default_cost_center_id UUID REFERENCES cost_centers(id),
  default_tax_id UUID REFERENCES taxes(id),
  default_warehouse_id UUID REFERENCES warehouses(id),
  
  -- Display
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  updated_by UUID REFERENCES user_profiles(id)
);

-- Unique constraint: same name + parent within organization
CREATE UNIQUE INDEX idx_item_groups_unique_name
  ON item_groups(organization_id, name, COALESCE(parent_group_id, '00000000-0000-0000-0000-000000000000'::UUID));

CREATE INDEX idx_item_groups_org ON item_groups(organization_id);
CREATE INDEX idx_item_groups_parent ON item_groups(parent_group_id) WHERE parent_group_id IS NOT NULL;
CREATE INDEX idx_item_groups_path ON item_groups(path) WHERE path IS NOT NULL;
CREATE INDEX idx_item_groups_active ON item_groups(is_active) WHERE is_active = true;

COMMENT ON TABLE item_groups IS 'Hierarchical categorization of items (e.g., Agriculture > Crops > Fruits > Olives)';
COMMENT ON COLUMN item_groups.path IS 'Materialized path for hierarchical queries (e.g., Agriculture/Crops/Fruits/Olives)';

-- =====================================================
-- 2. ITEMS (Enhanced Item Master)
-- =====================================================
CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Identification
  item_code TEXT NOT NULL, -- Unique SKU/code: "OLIV-FRUIT-001"
  item_name TEXT NOT NULL, -- Display name: "Olives - Picholine"
  description TEXT,
  
  -- Categorization
  item_group_id UUID NOT NULL REFERENCES item_groups(id) ON DELETE RESTRICT,
  brand TEXT, -- Optional brand name
  
  -- Status Flags
  is_active BOOLEAN DEFAULT true,
  is_sales_item BOOLEAN DEFAULT true, -- Can be sold
  is_purchase_item BOOLEAN DEFAULT true, -- Can be purchased
  is_stock_item BOOLEAN DEFAULT true, -- Track stock for this item
  
  -- Units of Measure
  default_unit TEXT NOT NULL, -- Primary UoM: "kg"
  stock_uom TEXT NOT NULL, -- Stock keeping unit (usually same as default)
  
  -- Inventory Settings
  maintain_stock BOOLEAN DEFAULT true,
  has_batch_no BOOLEAN DEFAULT false,
  has_serial_no BOOLEAN DEFAULT false,
  has_expiry_date BOOLEAN DEFAULT false,
  
  -- Valuation
  valuation_method TEXT DEFAULT 'FIFO' CHECK (valuation_method IN ('FIFO', 'Moving Average', 'LIFO')),
  
  -- Defaults (can be overridden per transaction)
  default_sales_account_id UUID REFERENCES accounts(id),
  default_expense_account_id UUID REFERENCES accounts(id),
  default_cost_center_id UUID REFERENCES cost_centers(id),
  default_warehouse_id UUID REFERENCES warehouses(id),
  
  -- Pricing
  standard_rate NUMERIC(12, 2), -- Standard price
  last_purchase_rate NUMERIC(12, 2), -- Last purchase price
  last_sales_rate NUMERIC(12, 2), -- Last sales price
  
  -- Dimensions & Weight (for shipping/logistics)
  weight_per_unit NUMERIC(10, 3), -- Weight in kg
  weight_uom TEXT DEFAULT 'kg',
  length NUMERIC(10, 2),
  width NUMERIC(10, 2),
  height NUMERIC(10, 2),
  volume NUMERIC(10, 2),
  
  -- Barcode & External IDs
  barcode TEXT, -- For scanning
  manufacturer_code TEXT, -- Manufacturer's part number
  supplier_part_number TEXT, -- Supplier's reference (generic)

  -- Tax Settings (can be added later when item_tax_templates table is created)
  -- item_tax_template_id UUID REFERENCES item_tax_templates(id),

  -- Quality & Inspection
  inspection_required_before_purchase BOOLEAN DEFAULT false,
  inspection_required_before_delivery BOOLEAN DEFAULT false,
  
  -- Agricultural Specific
  crop_type TEXT, -- For crops: 'olive', 'citrus', 'grape', etc.
  variety TEXT, -- Variety: 'Picholine', 'Manzanilla', etc.
  seasonality TEXT, -- When available: 'spring', 'summer', 'year-round'
  shelf_life_days INTEGER, -- Expected shelf life in days
  
  -- Website/Portal
  show_in_website BOOLEAN DEFAULT false,
  website_image_url TEXT,
  website_description TEXT,
  
  -- Images & Media
  image_url TEXT,
  images JSONB DEFAULT '[]'::jsonb, -- Array of image URLs
  
  -- Notes
  notes TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES user_profiles(id),
  
  -- Constraints
  UNIQUE(organization_id, item_code)
);

CREATE INDEX idx_items_org ON items(organization_id);
CREATE INDEX idx_items_code ON items(item_code);
CREATE INDEX idx_items_group ON items(item_group_id);
CREATE INDEX idx_items_active ON items(is_active) WHERE is_active = true;
CREATE INDEX idx_items_barcode ON items(barcode) WHERE barcode IS NOT NULL;
CREATE INDEX idx_items_crop_type ON items(crop_type) WHERE crop_type IS NOT NULL;
CREATE INDEX idx_items_sales_item ON items(is_sales_item) WHERE is_sales_item = true;
CREATE INDEX idx_items_purchase_item ON items(is_purchase_item) WHERE is_purchase_item = true;

COMMENT ON TABLE items IS 'Enhanced item master with comprehensive metadata for stock, sales, and purchasing';
COMMENT ON COLUMN items.item_code IS 'Unique item code/SKU for this item within the organization';
COMMENT ON COLUMN items.valuation_method IS 'Stock valuation method: FIFO, Moving Average, or LIFO';

-- =====================================================
-- 3. ITEM VARIANTS (For size/color/packaging variations)
-- =====================================================
CREATE TABLE IF NOT EXISTS item_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  
  variant_code TEXT NOT NULL, -- e.g., "OLIV-FRUIT-001-PACK-500G"
  variant_name TEXT NOT NULL, -- e.g., "Olives Picholine - 500g Package"
  
  -- Attributes
  attribute_1_name TEXT, -- e.g., "Package Size"
  attribute_1_value TEXT, -- e.g., "500g"
  attribute_2_name TEXT, -- e.g., "Quality Grade"
  attribute_2_value TEXT, -- e.g., "Extra Virgin"
  attribute_3_name TEXT,
  attribute_3_value TEXT,
  
  -- Overrides from parent item
  standard_rate NUMERIC(12, 2),
  weight_per_unit NUMERIC(10, 3),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(item_id, variant_code)
);

CREATE INDEX idx_item_variants_item ON item_variants(item_id);
CREATE INDEX idx_item_variants_active ON item_variants(is_active) WHERE is_active = true;

COMMENT ON TABLE item_variants IS 'Variants of items (e.g., different package sizes, quality grades)';

-- =====================================================
-- 4. ITEM UNIT CONVERSIONS (UoM Conversions)
-- =====================================================
CREATE TABLE IF NOT EXISTS item_unit_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  
  from_unit TEXT NOT NULL,
  to_unit TEXT NOT NULL,
  conversion_factor NUMERIC(12, 6) NOT NULL, -- e.g., 1 kg = 1000 g, factor = 1000
  
  -- Example: 1 box = 10 kg
  -- from_unit = 'box', to_unit = 'kg', conversion_factor = 10
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(item_id, from_unit, to_unit)
);

CREATE INDEX idx_item_unit_conversions_item ON item_unit_conversions(item_id);

COMMENT ON TABLE item_unit_conversions IS 'Unit of measure conversions for items (e.g., 1 box = 10 kg)';

-- =====================================================
-- 5. ITEM SUPPLIER DETAILS (Supplier-specific item codes)
-- =====================================================
CREATE TABLE IF NOT EXISTS item_supplier_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  
  supplier_part_number TEXT, -- Supplier's code for this item
  supplier_item_name TEXT, -- Supplier's name for this item
  
  -- Procurement Details
  lead_time_days INTEGER, -- Days to receive from supplier
  last_purchase_rate NUMERIC(12, 2),
  minimum_order_quantity NUMERIC(10, 2),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(item_id, supplier_id)
);

CREATE INDEX idx_item_supplier_details_item ON item_supplier_details(item_id);
CREATE INDEX idx_item_supplier_details_supplier ON item_supplier_details(supplier_id);

COMMENT ON TABLE item_supplier_details IS 'Supplier-specific item codes and procurement details';

-- =====================================================
-- 6. ITEM CUSTOMER DETAILS (Customer-specific item codes)
-- =====================================================
CREATE TABLE IF NOT EXISTS item_customer_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  
  ref_code TEXT, -- Customer's reference code for this item
  customer_item_name TEXT, -- Customer's name for this item
  max_discount_percent NUMERIC(5, 2), -- Max discount allowed for this customer
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(item_id, customer_id)
);

CREATE INDEX idx_item_customer_details_item ON item_customer_details(item_id);
CREATE INDEX idx_item_customer_details_customer ON item_customer_details(customer_id);

COMMENT ON TABLE item_customer_details IS 'Customer-specific item codes and pricing rules';

-- =====================================================
-- 7. ITEM PRICING (Price Lists for Sales)
-- =====================================================
CREATE TABLE IF NOT EXISTS item_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  
  price_list_name TEXT NOT NULL, -- e.g., "Standard", "Wholesale", "Retail"
  price_list_type TEXT CHECK (price_list_type IN ('selling', 'buying')),
  
  unit TEXT NOT NULL,
  rate NUMERIC(12, 2) NOT NULL,
  
  -- Validity
  valid_from DATE,
  valid_upto DATE,
  
  -- Customer/Supplier specific (optional)
  customer_id UUID REFERENCES customers(id),
  supplier_id UUID REFERENCES suppliers(id),
  
  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint: prevent duplicate prices for same item + price list + unit + customer/supplier combo
CREATE UNIQUE INDEX idx_item_prices_unique
  ON item_prices(organization_id, item_id, price_list_name, unit,
                 COALESCE(customer_id, '00000000-0000-0000-0000-000000000000'::UUID),
                 COALESCE(supplier_id, '00000000-0000-0000-0000-000000000000'::UUID));

CREATE INDEX idx_item_prices_org ON item_prices(organization_id);
CREATE INDEX idx_item_prices_item ON item_prices(item_id);
CREATE INDEX idx_item_prices_customer ON item_prices(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_item_prices_supplier ON item_prices(supplier_id) WHERE supplier_id IS NOT NULL;
CREATE INDEX idx_item_prices_active ON item_prices(is_active) WHERE is_active = true;

COMMENT ON TABLE item_prices IS 'Price lists for items (standard, wholesale, retail, customer-specific)';

-- =====================================================
-- 8. UPDATE EXISTING TABLES TO REFERENCE ITEMS
-- =====================================================

-- Update stock_entry_items (already has item_id, but ensure it references items table)
-- Note: This will be done carefully to avoid breaking existing data
-- First, we'll add a constraint after migrating data

-- Update invoice_items to add item_id
ALTER TABLE invoice_items
  ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoice_items_item ON invoice_items(item_id) WHERE item_id IS NOT NULL;

-- Update purchase_order_items to add item_id
ALTER TABLE purchase_order_items
  ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES items(id) ON DELETE SET NULL;

-- Rename old inventory_item_id to legacy_item_id for migration tracking
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'purchase_order_items' 
    AND column_name = 'inventory_item_id'
  ) THEN
    ALTER TABLE purchase_order_items
      RENAME COLUMN inventory_item_id TO legacy_item_id;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_purchase_order_items_item ON purchase_order_items(item_id) WHERE item_id IS NOT NULL;

-- Update sales_order_items (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sales_order_items') THEN
    ALTER TABLE sales_order_items
      ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES items(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_sales_order_items_item ON sales_order_items(item_id) WHERE item_id IS NOT NULL;
  END IF;
END $$;

-- =====================================================
-- 9. RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE item_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_unit_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_supplier_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_customer_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_prices ENABLE ROW LEVEL SECURITY;

-- Item Groups Policies
CREATE POLICY "Users can view item groups in their organization"
  ON item_groups FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert item groups in their organization"
  ON item_groups FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update item groups in their organization"
  ON item_groups FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete item groups in their organization"
  ON item_groups FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- Items Policies
CREATE POLICY "Users can view items in their organization"
  ON items FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert items in their organization"
  ON items FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update items in their organization"
  ON items FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete items in their organization"
  ON items FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- Item Variants Policies (inherit from parent item)
CREATE POLICY "Users can view item variants for items in their organization"
  ON item_variants FOR SELECT
  USING (
    item_id IN (
      SELECT id FROM items WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can insert item variants for items in their organization"
  ON item_variants FOR INSERT
  WITH CHECK (
    item_id IN (
      SELECT id FROM items WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update item variants for items in their organization"
  ON item_variants FOR UPDATE
  USING (
    item_id IN (
      SELECT id FROM items WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can delete item variants for items in their organization"
  ON item_variants FOR DELETE
  USING (
    item_id IN (
      SELECT id FROM items WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

-- Item Unit Conversions Policies
CREATE POLICY "Users can manage unit conversions for items in their organization"
  ON item_unit_conversions FOR ALL
  USING (
    item_id IN (
      SELECT id FROM items WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

-- Item Supplier Details Policies
CREATE POLICY "Users can manage supplier details for items in their organization"
  ON item_supplier_details FOR ALL
  USING (
    item_id IN (
      SELECT id FROM items WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

-- Item Customer Details Policies
CREATE POLICY "Users can manage customer details for items in their organization"
  ON item_customer_details FOR ALL
  USING (
    item_id IN (
      SELECT id FROM items WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
      )
    )
  );

-- Item Prices Policies
CREATE POLICY "Users can manage prices for items in their organization"
  ON item_prices FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 10. HELPER FUNCTIONS
-- =====================================================

-- Function to generate item code
CREATE OR REPLACE FUNCTION generate_item_code(
  p_organization_id UUID,
  p_item_group_id UUID,
  p_prefix TEXT DEFAULT NULL
) RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_sequence INTEGER;
  v_item_code TEXT;
  v_group_code TEXT;
BEGIN
  -- Get group code if available
  SELECT code INTO v_group_code
  FROM item_groups
  WHERE id = p_item_group_id;
  
  -- Use provided prefix or group code or default
  v_prefix := COALESCE(p_prefix, v_group_code, 'ITEM');
  
  -- Get next sequence number
  SELECT COALESCE(MAX(CAST(SUBSTRING(item_code FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO v_sequence
  FROM items
  WHERE organization_id = p_organization_id
    AND item_code ~ (v_prefix || '-[0-9]+$');
  
  -- Format: PREFIX-0001
  v_item_code := v_prefix || '-' || LPAD(v_sequence::TEXT, 4, '0');
  
  -- Ensure uniqueness
  WHILE EXISTS (SELECT 1 FROM items WHERE organization_id = p_organization_id AND item_code = v_item_code) LOOP
    v_sequence := v_sequence + 1;
    v_item_code := v_prefix || '-' || LPAD(v_sequence::TEXT, 4, '0');
  END LOOP;
  
  RETURN v_item_code;
END;
$$ LANGUAGE plpgsql;

-- Function to update item path in groups
CREATE OR REPLACE FUNCTION update_item_group_path()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_group_id IS NOT NULL THEN
    SELECT path || '/' || NEW.name
    INTO NEW.path
    FROM item_groups
    WHERE id = NEW.parent_group_id;
  ELSE
    NEW.path := NEW.name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_item_group_path
  BEFORE INSERT OR UPDATE ON item_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_item_group_path();

-- Function to update last purchase/sales rates
CREATE OR REPLACE FUNCTION update_item_rates()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_purchase_rate when material receipt is posted
  IF NEW.status = 'Posted' AND NEW.entry_type = 'Material Receipt' THEN
    UPDATE items i
    SET last_purchase_rate = (
      SELECT AVG(cost_per_unit)
      FROM stock_entry_items sei
      WHERE sei.item_id = i.id
        AND sei.stock_entry_id = NEW.id
    )
    WHERE id IN (
      SELECT item_id FROM stock_entry_items WHERE stock_entry_id = NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on stock_entries (if needed, can be added later)

-- =====================================================
-- 11. DEFAULT ITEM GROUPS (Seed Data Function)
-- =====================================================

CREATE OR REPLACE FUNCTION seed_default_item_groups(p_organization_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Main Agriculture group
  INSERT INTO item_groups (organization_id, name, code, description, sort_order)
  VALUES 
    (p_organization_id, 'Agriculture', 'AGRIC', 'Agricultural products and inputs', 1)
  ON CONFLICT (organization_id, name, COALESCE(parent_group_id, '00000000-0000-0000-0000-000000000000'::UUID)) DO NOTHING;
  
  -- Get agriculture group ID
  DECLARE
    v_agric_id UUID;
  BEGIN
    SELECT id INTO v_agric_id FROM item_groups 
    WHERE organization_id = p_organization_id AND name = 'Agriculture';
    
    -- Sub-groups
    INSERT INTO item_groups (organization_id, parent_group_id, name, code, description, sort_order)
    VALUES 
      (p_organization_id, v_agric_id, 'Crops', 'CROPS', 'Agricultural crops', 1),
      (p_organization_id, v_agric_id, 'Inputs', 'INPUTS', 'Agricultural inputs (fertilizers, seeds, etc.)', 2),
      (p_organization_id, v_agric_id, 'Equipment', 'EQUIP', 'Agricultural equipment and tools', 3)
    ON CONFLICT (organization_id, name, COALESCE(parent_group_id, '00000000-0000-0000-0000-000000000000'::UUID)) DO NOTHING;
  END;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION seed_default_item_groups IS 'Creates default item groups for a new organization';

