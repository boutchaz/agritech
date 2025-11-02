-- =====================================================
-- BILLING CYCLE: Quotes, Sales Orders, Purchase Orders
-- =====================================================
-- This migration creates the complete billing cycle:
-- Sales: Quote → Sales Order → Invoice → Payment
-- Purchase: Purchase Request → Purchase Order → Bill → Payment
-- =====================================================

-- =====================================================
-- 1. QUOTES (Proforma Invoices / Quotations)
-- =====================================================

DO $$ BEGIN
  CREATE TYPE quote_status AS ENUM (
    'draft',        -- Being prepared
    'sent',         -- Sent to customer
    'accepted',     -- Customer accepted
    'rejected',     -- Customer rejected
    'expired',      -- Validity period expired
    'converted',    -- Converted to sales order
    'cancelled'     -- Cancelled
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Quote Details
  quote_number VARCHAR(100) NOT NULL,
  quote_date DATE NOT NULL,
  valid_until DATE NOT NULL,

  -- Customer Information
  customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
  customer_name VARCHAR(255) NOT NULL,

  -- Contact Details
  contact_person VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),

  -- Amounts
  subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
  tax_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(15, 2) DEFAULT 0,
  grand_total DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Currency
  currency_code VARCHAR(3) DEFAULT 'MAD' REFERENCES currencies(code),
  exchange_rate DECIMAL(12, 6) DEFAULT 1.0,

  -- Status & Workflow
  status quote_status DEFAULT 'draft',

  -- Terms & Conditions
  payment_terms TEXT,
  delivery_terms TEXT,
  terms_and_conditions TEXT,
  notes TEXT,

  -- References
  reference_number VARCHAR(100), -- Customer's reference/RFQ number
  sales_order_id UUID, -- Linked sales order (after conversion)

  -- Farm/Parcel (optional)
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  sent_at TIMESTAMPTZ,
  sent_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ,
  converted_by UUID REFERENCES auth.users(id),

  UNIQUE(organization_id, quote_number),
  CHECK (valid_until >= quote_date),
  CHECK (grand_total >= 0)
);

CREATE INDEX idx_quotes_org ON quotes(organization_id);
CREATE INDEX idx_quotes_customer ON quotes(customer_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quotes_date ON quotes(quote_date DESC);
CREATE INDEX idx_quotes_sales_order ON quotes(sales_order_id) WHERE sales_order_id IS NOT NULL;

-- =====================================================
-- 2. QUOTE ITEMS
-- =====================================================

CREATE TABLE IF NOT EXISTS quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,

  line_number INTEGER NOT NULL,

  item_name VARCHAR(255) NOT NULL,
  description TEXT,

  quantity DECIMAL(10, 3) NOT NULL,
  unit_of_measure VARCHAR(50) DEFAULT 'unit',
  unit_price DECIMAL(12, 2) NOT NULL,

  -- Calculations
  amount DECIMAL(15, 2) NOT NULL, -- quantity × unit_price
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,

  -- Tax
  tax_id UUID REFERENCES taxes(id),
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,

  -- Line Total
  line_total DECIMAL(15, 2) NOT NULL, -- amount - discount + tax

  -- Linking
  account_id UUID REFERENCES accounts(id), -- Revenue account

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(quote_id, line_number),
  CHECK (quantity > 0),
  CHECK (unit_price >= 0)
);

CREATE INDEX idx_quote_items_quote ON quote_items(quote_id);

-- =====================================================
-- 3. SALES ORDERS
-- =====================================================

DO $$ BEGIN
  CREATE TYPE sales_order_status AS ENUM (
    'draft',          -- Being prepared
    'confirmed',      -- Order confirmed
    'processing',     -- Being processed/fulfilled
    'partially_delivered', -- Some items delivered
    'delivered',      -- All items delivered
    'partially_invoiced',  -- Some items invoiced
    'invoiced',       -- Fully invoiced
    'cancelled'       -- Cancelled
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Order Details
  order_number VARCHAR(100) NOT NULL,
  order_date DATE NOT NULL,
  expected_delivery_date DATE,

  -- Customer Information
  customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
  customer_name VARCHAR(255) NOT NULL,

  -- Shipping Address
  shipping_address TEXT,
  shipping_city VARCHAR(100),
  shipping_postal_code VARCHAR(20),
  shipping_country VARCHAR(100),

  -- Contact Details
  contact_person VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),

  -- Amounts
  subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
  tax_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(15, 2) DEFAULT 0,
  shipping_charges DECIMAL(12, 2) DEFAULT 0,
  grand_total DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Delivery & Invoicing Status
  delivered_amount DECIMAL(15, 2) DEFAULT 0,
  invoiced_amount DECIMAL(15, 2) DEFAULT 0,
  outstanding_amount DECIMAL(15, 2) DEFAULT 0,

  -- Currency
  currency_code VARCHAR(3) DEFAULT 'MAD' REFERENCES currencies(code),
  exchange_rate DECIMAL(12, 6) DEFAULT 1.0,

  -- Status & Workflow
  status sales_order_status DEFAULT 'draft',

  -- Terms
  payment_terms TEXT,
  delivery_terms TEXT,
  notes TEXT,

  -- References
  quote_id UUID REFERENCES quotes(id), -- Source quote
  customer_po_number VARCHAR(100), -- Customer's PO number

  -- Farm/Parcel (optional)
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ,
  confirmed_by UUID REFERENCES auth.users(id),

  UNIQUE(organization_id, order_number),
  CHECK (grand_total >= 0)
);

CREATE INDEX idx_sales_orders_org ON sales_orders(organization_id);
CREATE INDEX idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX idx_sales_orders_status ON sales_orders(status);
CREATE INDEX idx_sales_orders_date ON sales_orders(order_date DESC);
CREATE INDEX idx_sales_orders_quote ON sales_orders(quote_id) WHERE quote_id IS NOT NULL;

-- =====================================================
-- 4. SALES ORDER ITEMS
-- =====================================================

CREATE TABLE IF NOT EXISTS sales_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,

  line_number INTEGER NOT NULL,

  item_name VARCHAR(255) NOT NULL,
  description TEXT,

  quantity DECIMAL(10, 3) NOT NULL,
  unit_of_measure VARCHAR(50) DEFAULT 'unit',
  unit_price DECIMAL(12, 2) NOT NULL,

  -- Calculations
  amount DECIMAL(15, 2) NOT NULL,
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,

  -- Tax
  tax_id UUID REFERENCES taxes(id),
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,

  -- Line Total
  line_total DECIMAL(15, 2) NOT NULL,

  -- Delivery Status
  delivered_quantity DECIMAL(10, 3) DEFAULT 0,
  invoiced_quantity DECIMAL(10, 3) DEFAULT 0,

  -- Linking
  account_id UUID REFERENCES accounts(id), -- Revenue account
  quote_item_id UUID, -- Source quote item

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(sales_order_id, line_number),
  CHECK (quantity > 0),
  CHECK (unit_price >= 0),
  CHECK (delivered_quantity >= 0 AND delivered_quantity <= quantity),
  CHECK (invoiced_quantity >= 0 AND invoiced_quantity <= quantity)
);

CREATE INDEX idx_sales_order_items_order ON sales_order_items(sales_order_id);

-- =====================================================
-- 5. PURCHASE ORDERS (Bills)
-- =====================================================

DO $$ BEGIN
  CREATE TYPE purchase_order_status AS ENUM (
    'draft',          -- Being prepared
    'submitted',      -- Submitted to supplier
    'confirmed',      -- Supplier confirmed
    'partially_received', -- Some items received
    'received',       -- All items received
    'partially_billed',   -- Some items billed
    'billed',         -- Fully billed
    'cancelled'       -- Cancelled
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Order Details
  po_number VARCHAR(100) NOT NULL,
  po_date DATE NOT NULL,
  expected_delivery_date DATE,

  -- Supplier Information
  supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT,
  supplier_name VARCHAR(255) NOT NULL,

  -- Delivery Address (our warehouse/farm)
  delivery_address TEXT,
  delivery_city VARCHAR(100),
  delivery_postal_code VARCHAR(20),
  delivery_country VARCHAR(100),

  -- Contact Details
  contact_person VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),

  -- Amounts
  subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
  tax_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(15, 2) DEFAULT 0,
  shipping_charges DECIMAL(12, 2) DEFAULT 0,
  grand_total DECIMAL(15, 2) NOT NULL DEFAULT 0,

  -- Receipt & Billing Status
  received_amount DECIMAL(15, 2) DEFAULT 0,
  billed_amount DECIMAL(15, 2) DEFAULT 0,
  outstanding_amount DECIMAL(15, 2) DEFAULT 0,

  -- Currency
  currency_code VARCHAR(3) DEFAULT 'MAD' REFERENCES currencies(code),
  exchange_rate DECIMAL(12, 6) DEFAULT 1.0,

  -- Status & Workflow
  status purchase_order_status DEFAULT 'draft',

  -- Terms
  payment_terms TEXT,
  delivery_terms TEXT,
  notes TEXT,

  -- References
  supplier_quote_ref VARCHAR(100), -- Supplier's quote reference

  -- Farm/Parcel (optional)
  farm_id UUID REFERENCES farms(id) ON DELETE SET NULL,
  parcel_id UUID REFERENCES parcels(id) ON DELETE SET NULL,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ,

  UNIQUE(organization_id, po_number),
  CHECK (grand_total >= 0)
);

CREATE INDEX idx_purchase_orders_org ON purchase_orders(organization_id);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_date ON purchase_orders(po_date DESC);

-- =====================================================
-- 6. PURCHASE ORDER ITEMS
-- =====================================================

CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,

  line_number INTEGER NOT NULL,

  item_name VARCHAR(255) NOT NULL,
  description TEXT,

  quantity DECIMAL(10, 3) NOT NULL,
  unit_of_measure VARCHAR(50) DEFAULT 'unit',
  unit_price DECIMAL(12, 2) NOT NULL,

  -- Calculations
  amount DECIMAL(15, 2) NOT NULL,
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  discount_amount DECIMAL(12, 2) DEFAULT 0,

  -- Tax
  tax_id UUID REFERENCES taxes(id),
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(12, 2) DEFAULT 0,

  -- Line Total
  line_total DECIMAL(15, 2) NOT NULL,

  -- Receipt Status
  received_quantity DECIMAL(10, 3) DEFAULT 0,
  billed_quantity DECIMAL(10, 3) DEFAULT 0,

  -- Linking
  account_id UUID REFERENCES accounts(id), -- Expense account
  inventory_item_id UUID, -- Link to inventory if applicable

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(purchase_order_id, line_number),
  CHECK (quantity > 0),
  CHECK (unit_price >= 0),
  CHECK (received_quantity >= 0 AND received_quantity <= quantity),
  CHECK (billed_quantity >= 0 AND billed_quantity <= quantity)
);

CREATE INDEX idx_purchase_order_items_po ON purchase_order_items(purchase_order_id);

-- =====================================================
-- 7. LINK INVOICES TO ORDERS
-- =====================================================

-- Add references to invoices table
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS sales_order_id UUID REFERENCES sales_orders(id),
  ADD COLUMN IF NOT EXISTS purchase_order_id UUID REFERENCES purchase_orders(id);

CREATE INDEX IF NOT EXISTS idx_invoices_sales_order ON invoices(sales_order_id) WHERE sales_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invoices_purchase_order ON invoices(purchase_order_id) WHERE purchase_order_id IS NOT NULL;

-- =====================================================
-- 8. TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER trg_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_sales_orders_updated_at
  BEFORE UPDATE ON sales_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. RLS POLICIES
-- =====================================================

-- Quotes
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_read_quotes" ON quotes
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "org_write_quotes" ON quotes
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "org_update_quotes" ON quotes
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Quote Items (inherit from quotes)
CREATE POLICY "org_access_quote_items" ON quote_items
  FOR ALL USING (
    quote_id IN (
      SELECT id FROM quotes WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- Sales Orders
ALTER TABLE sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_read_sales_orders" ON sales_orders
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "org_write_sales_orders" ON sales_orders
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "org_update_sales_orders" ON sales_orders
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Sales Order Items
CREATE POLICY "org_access_sales_order_items" ON sales_order_items
  FOR ALL USING (
    sales_order_id IN (
      SELECT id FROM sales_orders WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- Purchase Orders
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_read_purchase_orders" ON purchase_orders
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "org_write_purchase_orders" ON purchase_orders
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "org_update_purchase_orders" ON purchase_orders
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Purchase Order Items
CREATE POLICY "org_access_purchase_order_items" ON purchase_order_items
  FOR ALL USING (
    purchase_order_id IN (
      SELECT id FROM purchase_orders WHERE organization_id IN (
        SELECT organization_id FROM organization_users WHERE user_id = auth.uid() AND is_active = true
      )
    )
  );

-- =====================================================
-- 10. HELPER FUNCTIONS FOR NUMBER GENERATION
-- =====================================================

-- Generate quote number
CREATE OR REPLACE FUNCTION generate_quote_number(
  p_organization_id UUID
)
RETURNS VARCHAR AS $$
DECLARE
  v_count INTEGER;
  v_year VARCHAR(4);
  v_number VARCHAR(100);
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');

  SELECT COUNT(*) INTO v_count
  FROM quotes
  WHERE organization_id = p_organization_id
    AND EXTRACT(YEAR FROM quote_date) = EXTRACT(YEAR FROM NOW());

  v_number := 'QT-' || v_year || '-' || LPAD((v_count + 1)::TEXT, 5, '0');

  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Generate sales order number
CREATE OR REPLACE FUNCTION generate_sales_order_number(
  p_organization_id UUID
)
RETURNS VARCHAR AS $$
DECLARE
  v_count INTEGER;
  v_year VARCHAR(4);
  v_number VARCHAR(100);
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');

  SELECT COUNT(*) INTO v_count
  FROM sales_orders
  WHERE organization_id = p_organization_id
    AND EXTRACT(YEAR FROM order_date) = EXTRACT(YEAR FROM NOW());

  v_number := 'SO-' || v_year || '-' || LPAD((v_count + 1)::TEXT, 5, '0');

  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Generate purchase order number
CREATE OR REPLACE FUNCTION generate_purchase_order_number(
  p_organization_id UUID
)
RETURNS VARCHAR AS $$
DECLARE
  v_count INTEGER;
  v_year VARCHAR(4);
  v_number VARCHAR(100);
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');

  SELECT COUNT(*) INTO v_count
  FROM purchase_orders
  WHERE organization_id = p_organization_id
    AND EXTRACT(YEAR FROM po_date) = EXTRACT(YEAR FROM NOW());

  v_number := 'PO-' || v_year || '-' || LPAD((v_count + 1)::TEXT, 5, '0');

  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 11. COMMENTS
-- =====================================================

COMMENT ON TABLE quotes IS 'Sales quotations/proforma invoices sent to customers';
COMMENT ON TABLE sales_orders IS 'Confirmed sales orders from customers';
COMMENT ON TABLE purchase_orders IS 'Purchase orders sent to suppliers';

COMMENT ON COLUMN quotes.valid_until IS 'Quote validity expiration date';
COMMENT ON COLUMN sales_orders.delivered_amount IS 'Amount of goods delivered so far';
COMMENT ON COLUMN sales_orders.invoiced_amount IS 'Amount invoiced so far (can be partial)';
COMMENT ON COLUMN purchase_orders.received_amount IS 'Amount of goods received so far';
COMMENT ON COLUMN purchase_orders.billed_amount IS 'Amount billed by supplier so far';
