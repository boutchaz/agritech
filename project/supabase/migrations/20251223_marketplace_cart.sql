-- =====================================================
-- MARKETPLACE CART SYSTEM
-- Shopping cart for marketplace buyers
-- =====================================================

-- Shopping cart table (one cart per user)
CREATE TABLE IF NOT EXISTS marketplace_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  session_id TEXT, -- For guest carts (future use)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id) -- One active cart per user
);

-- Cart items table
CREATE TABLE IF NOT EXISTS marketplace_cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id UUID NOT NULL REFERENCES marketplace_carts(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES marketplace_listings(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE, -- For inventory items sold on marketplace
  seller_organization_id UUID NOT NULL REFERENCES organizations(id),
  title TEXT NOT NULL, -- Snapshot of product title
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  unit TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure only one entry per product per cart
  UNIQUE(cart_id, listing_id),
  UNIQUE(cart_id, item_id),
  -- Must have either listing_id or item_id
  CHECK (listing_id IS NOT NULL OR item_id IS NOT NULL)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_carts_user ON marketplace_carts(user_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_cart_items_cart ON marketplace_cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_cart_items_listing ON marketplace_cart_items(listing_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_cart_items_item ON marketplace_cart_items(item_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_cart_items_seller ON marketplace_cart_items(seller_organization_id);

-- Enable RLS
ALTER TABLE marketplace_carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_cart_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view own cart" ON marketplace_carts;
DROP POLICY IF EXISTS "Users can create own cart" ON marketplace_carts;
DROP POLICY IF EXISTS "Users can update own cart" ON marketplace_carts;
DROP POLICY IF EXISTS "Users can delete own cart" ON marketplace_carts;
DROP POLICY IF EXISTS "Users can view own cart items" ON marketplace_cart_items;
DROP POLICY IF EXISTS "Users can manage own cart items" ON marketplace_cart_items;

-- Cart policies
CREATE POLICY "Users can view own cart" ON marketplace_carts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create own cart" ON marketplace_carts
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own cart" ON marketplace_carts
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own cart" ON marketplace_carts
  FOR DELETE USING (user_id = auth.uid());

-- Cart items policies
CREATE POLICY "Users can view own cart items" ON marketplace_cart_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM marketplace_carts c
      WHERE c.id = marketplace_cart_items.cart_id
      AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own cart items" ON marketplace_cart_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM marketplace_carts c
      WHERE c.id = marketplace_cart_items.cart_id
      AND c.user_id = auth.uid()
    )
  );

-- Add shipping_details column to marketplace_orders if not exists
ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS
  shipping_details JSONB DEFAULT '{}';
-- Structure: { name, phone, address, city, postal_code, notes }

-- Add payment_method column to marketplace_orders
ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS
  payment_method TEXT DEFAULT 'cod'; -- cod = Cash on Delivery

-- Add buyer contact info
ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS
  buyer_name TEXT;

ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS
  buyer_phone TEXT;

ALTER TABLE marketplace_orders ADD COLUMN IF NOT EXISTS
  buyer_email TEXT;

-- Trigger to update updated_at on cart
DROP TRIGGER IF EXISTS trg_marketplace_carts_updated_at ON marketplace_carts;
CREATE TRIGGER trg_marketplace_carts_updated_at
  BEFORE UPDATE ON marketplace_carts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on cart items
DROP TRIGGER IF EXISTS trg_marketplace_cart_items_updated_at ON marketplace_cart_items;
CREATE TRIGGER trg_marketplace_cart_items_updated_at
  BEFORE UPDATE ON marketplace_cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON marketplace_carts TO authenticated;
GRANT ALL ON marketplace_cart_items TO authenticated;
GRANT SELECT ON marketplace_carts TO anon;
GRANT SELECT ON marketplace_cart_items TO anon;

COMMENT ON TABLE marketplace_carts IS 'Shopping carts for marketplace buyers';
COMMENT ON TABLE marketplace_cart_items IS 'Items in marketplace shopping carts';
