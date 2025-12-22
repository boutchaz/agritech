-- =====================================================
-- FIX MARKETPLACE REVIEWS RLS POLICIES
-- The marketplace_reviews table has RLS enabled but no policies defined
-- =====================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can read reviews" ON marketplace_reviews;
DROP POLICY IF EXISTS "Order participants can create reviews" ON marketplace_reviews;
DROP POLICY IF EXISTS "Reviewers can update own reviews" ON marketplace_reviews;
DROP POLICY IF EXISTS "Reviewers can delete own reviews" ON marketplace_reviews;

-- Anyone can read reviews (public)
CREATE POLICY "Anyone can read reviews" ON marketplace_reviews
  FOR SELECT USING (true);

-- Only order participants can create reviews (after order is delivered)
CREATE POLICY "Order participants can create reviews" ON marketplace_reviews
  FOR INSERT WITH CHECK (
    -- Reviewer must be from the user's organization
    reviewer_organization_id = (
      SELECT organization_id FROM auth_users_view WHERE id = auth.uid()
    )
    -- And the order must exist and be delivered
    AND EXISTS (
      SELECT 1 FROM marketplace_orders o
      WHERE o.id = order_id
      AND o.status = 'delivered'
      AND (
        o.buyer_organization_id = reviewer_organization_id
        OR o.seller_organization_id = reviewer_organization_id
      )
    )
    -- And reviewee must be the other party in the order
    AND EXISTS (
      SELECT 1 FROM marketplace_orders o
      WHERE o.id = order_id
      AND (
        (o.buyer_organization_id = reviewer_organization_id AND o.seller_organization_id = reviewee_organization_id)
        OR (o.seller_organization_id = reviewer_organization_id AND o.buyer_organization_id = reviewee_organization_id)
      )
    )
  );

-- Reviewers can update their own reviews (within 7 days)
CREATE POLICY "Reviewers can update own reviews" ON marketplace_reviews
  FOR UPDATE USING (
    reviewer_organization_id = (
      SELECT organization_id FROM auth_users_view WHERE id = auth.uid()
    )
    AND created_at > NOW() - INTERVAL '7 days'
  );

-- Reviewers can delete their own reviews
CREATE POLICY "Reviewers can delete own reviews" ON marketplace_reviews
  FOR DELETE USING (
    reviewer_organization_id = (
      SELECT organization_id FROM auth_users_view WHERE id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT ON marketplace_reviews TO anon;
GRANT ALL ON marketplace_reviews TO authenticated;

COMMENT ON TABLE marketplace_reviews IS 'Reviews between buyers and sellers after order completion';
