-- Enable RLS on day_laborers and add policies scoped to the user's organizations via farm -> organization

ALTER TABLE "public"."day_laborers" ENABLE ROW LEVEL SECURITY;

-- Allow reading day_laborers for farms in organizations the user belongs to
CREATE POLICY "Users can view day_laborers in their organizations" ON "public"."day_laborers"
  FOR SELECT USING (
    farm_id IN (
      SELECT f.id
      FROM farms f
      JOIN organization_users ou ON ou.organization_id = f.organization_id
      WHERE ou.user_id = auth.uid() AND ou.is_active = true
    )
  );

-- Allow inserting day_laborers for farms in organizations the user belongs to
CREATE POLICY "Users can insert day_laborers in their organizations" ON "public"."day_laborers"
  FOR INSERT WITH CHECK (
    farm_id IN (
      SELECT f.id
      FROM farms f
      JOIN organization_users ou ON ou.organization_id = f.organization_id
      WHERE ou.user_id = auth.uid() AND ou.is_active = true
    )
  );

-- Allow updating day_laborers for farms in organizations the user belongs to
CREATE POLICY "Users can update day_laborers in their organizations" ON "public"."day_laborers"
  FOR UPDATE USING (
    farm_id IN (
      SELECT f.id
      FROM farms f
      JOIN organization_users ou ON ou.organization_id = f.organization_id
      WHERE ou.user_id = auth.uid() AND ou.is_active = true
    )
  );

-- Allow deleting day_laborers for farms in organizations the user belongs to
CREATE POLICY "Users can delete day_laborers in their organizations" ON "public"."day_laborers"
  FOR DELETE USING (
    farm_id IN (
      SELECT f.id
      FROM farms f
      JOIN organization_users ou ON ou.organization_id = f.organization_id
      WHERE ou.user_id = auth.uid() AND ou.is_active = true
    )
  );

-- Optional: comments for docs
COMMENT ON POLICY "Users can view day_laborers in their organizations" ON "public"."day_laborers" IS 'Allow SELECT where day_laborers.farm_id is within organizations the user belongs to.';
COMMENT ON POLICY "Users can insert day_laborers in their organizations" ON "public"."day_laborers" IS 'Allow INSERT where day_laborers.farm_id is within organizations the user belongs to.';
COMMENT ON POLICY "Users can update day_laborers in their organizations" ON "public"."day_laborers" IS 'Allow UPDATE where day_laborers.farm_id is within organizations the user belongs to.';
COMMENT ON POLICY "Users can delete day_laborers in their organizations" ON "public"."day_laborers" IS 'Allow DELETE where day_laborers.farm_id is within organizations the user belongs to.';
