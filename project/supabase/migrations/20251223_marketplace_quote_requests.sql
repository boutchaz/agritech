-- Marketplace Quote Requests Table
-- Tracks buyer quote requests to sellers for products

CREATE TABLE IF NOT EXISTS marketplace_quote_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Request details
  requester_organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  seller_organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES marketplace_listings(id) ON DELETE SET NULL,

  -- Product info (snapshot at request time)
  product_title TEXT NOT NULL,
  product_description TEXT,
  requested_quantity NUMERIC(12, 2),
  unit_of_measure TEXT,

  -- Buyer message
  message TEXT,
  buyer_contact_name TEXT,
  buyer_contact_email TEXT,
  buyer_contact_phone TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'viewed', 'responded', 'quoted', 'accepted', 'declined', 'cancelled')),

  -- Seller response
  seller_response TEXT,
  quoted_price NUMERIC(12, 2),
  quoted_currency TEXT DEFAULT 'MAD',
  quote_valid_until TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT has_product CHECK (item_id IS NOT NULL OR listing_id IS NOT NULL)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_quote_requests_requester ON marketplace_quote_requests(requester_organization_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_seller ON marketplace_quote_requests(seller_organization_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON marketplace_quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_item ON marketplace_quote_requests(item_id) WHERE item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quote_requests_listing ON marketplace_quote_requests(listing_id) WHERE listing_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quote_requests_created_at ON marketplace_quote_requests(created_at DESC);

-- RLS Policies
ALTER TABLE marketplace_quote_requests ENABLE ROW LEVEL SECURITY;

-- Buyers can view their own requests
CREATE POLICY "Users can view their own quote requests"
  ON marketplace_quote_requests
  FOR SELECT
  USING (
    requester_organization_id = (SELECT organization_id FROM auth_users_view WHERE id = auth.uid())
  );

-- Sellers can view requests sent to them
CREATE POLICY "Sellers can view requests sent to them"
  ON marketplace_quote_requests
  FOR SELECT
  USING (
    seller_organization_id = (SELECT organization_id FROM auth_users_view WHERE id = auth.uid())
  );

-- Buyers can create quote requests
CREATE POLICY "Authenticated users can create quote requests"
  ON marketplace_quote_requests
  FOR INSERT
  WITH CHECK (
    requester_organization_id = (SELECT organization_id FROM auth_users_view WHERE id = auth.uid())
  );

-- Sellers can update requests sent to them (to respond/quote)
CREATE POLICY "Sellers can update their received requests"
  ON marketplace_quote_requests
  FOR UPDATE
  USING (
    seller_organization_id = (SELECT organization_id FROM auth_users_view WHERE id = auth.uid())
  );

-- Buyers can update their own requests (to cancel)
CREATE POLICY "Buyers can update their own requests"
  ON marketplace_quote_requests
  FOR UPDATE
  USING (
    requester_organization_id = (SELECT organization_id FROM auth_users_view WHERE id = auth.uid())
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quote_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_marketplace_quote_requests_updated_at
  BEFORE UPDATE ON marketplace_quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_quote_request_updated_at();

-- Function to get quote request statistics for a seller
CREATE OR REPLACE FUNCTION get_seller_quote_stats(seller_org_id UUID)
RETURNS TABLE (
  total_requests BIGINT,
  pending_requests BIGINT,
  responded_requests BIGINT,
  accepted_requests BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_requests,
    COUNT(*) FILTER (WHERE status = 'pending')::BIGINT as pending_requests,
    COUNT(*) FILTER (WHERE status IN ('responded', 'quoted'))::BIGINT as responded_requests,
    COUNT(*) FILTER (WHERE status = 'accepted')::BIGINT as accepted_requests
  FROM marketplace_quote_requests
  WHERE seller_organization_id = seller_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on table
COMMENT ON TABLE marketplace_quote_requests IS 'Stores quote requests from buyers to sellers for marketplace products';
