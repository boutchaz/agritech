-- Persistent cache for satellite heatmap responses.
-- Stores the full JSON response (pixel_data, statistics, bounds, etc.)
-- keyed by parcel + index + date + grid_size.

CREATE TABLE IF NOT EXISTS satellite_heatmap_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  parcel_id UUID NOT NULL REFERENCES parcels(id) ON DELETE CASCADE,
  index_name TEXT NOT NULL,
  date DATE NOT NULL,
  grid_size INTEGER NOT NULL DEFAULT 1000,
  response_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

-- Fast lookups by the cache key
CREATE UNIQUE INDEX IF NOT EXISTS idx_heatmap_cache_unique
  ON satellite_heatmap_cache(parcel_id, index_name, date, grid_size);

CREATE INDEX IF NOT EXISTS idx_heatmap_cache_org
  ON satellite_heatmap_cache(organization_id);

CREATE INDEX IF NOT EXISTS idx_heatmap_cache_expires
  ON satellite_heatmap_cache(expires_at);

-- RLS
ALTER TABLE satellite_heatmap_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_read_satellite_heatmap_cache" ON satellite_heatmap_cache
  FOR SELECT USING (is_organization_member(organization_id));

CREATE POLICY "org_write_satellite_heatmap_cache" ON satellite_heatmap_cache
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND is_organization_member(organization_id)
  );

CREATE POLICY "org_update_satellite_heatmap_cache" ON satellite_heatmap_cache
  FOR UPDATE USING (is_organization_member(organization_id));

CREATE POLICY "org_delete_satellite_heatmap_cache" ON satellite_heatmap_cache
  FOR DELETE USING (is_organization_member(organization_id));
