-- Enable RLS on employees and add policies scoped to the user's organizations via farm -> organization

ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;

-- Allow reading employees for farms in organizations the user belongs to
CREATE POLICY "Users can view employees in their organizations" ON "public"."employees"
  FOR SELECT USING (
    farm_id IN (
      SELECT f.id
      FROM farms f
      JOIN organization_users ou ON ou.organization_id = f.organization_id
      WHERE ou.user_id = auth.uid() AND ou.is_active = true
    )
  );

-- Allow inserting employees for farms in organizations the user belongs to
CREATE POLICY "Users can insert employees in their organizations" ON "public"."employees"
  FOR INSERT WITH CHECK (
    farm_id IN (
      SELECT f.id
      FROM farms f
      JOIN organization_users ou ON ou.organization_id = f.organization_id
      WHERE ou.user_id = auth.uid() AND ou.is_active = true
    )
  );

-- Allow updating employees for farms in organizations the user belongs to
CREATE POLICY "Users can update employees in their organizations" ON "public"."employees"
  FOR UPDATE USING (
    farm_id IN (
      SELECT f.id
      FROM farms f
      JOIN organization_users ou ON ou.organization_id = f.organization_id
      WHERE ou.user_id = auth.uid() AND ou.is_active = true
    )
  );

-- Allow deleting employees for farms in organizations the user belongs to
CREATE POLICY "Users can delete employees in their organizations" ON "public"."employees"
  FOR DELETE USING (
    farm_id IN (
      SELECT f.id
      FROM farms f
      JOIN organization_users ou ON ou.organization_id = f.organization_id
      WHERE ou.user_id = auth.uid() AND ou.is_active = true
    )
  );

-- Optional: comments for docs
COMMENT ON POLICY "Users can view employees in their organizations" ON "public"."employees" IS 'Allow SELECT where employees.farm_id is within organizations the user belongs to.';
COMMENT ON POLICY "Users can insert employees in their organizations" ON "public"."employees" IS 'Allow INSERT where employees.farm_id is within organizations the user belongs to.';
COMMENT ON POLICY "Users can update employees in their organizations" ON "public"."employees" IS 'Allow UPDATE where employees.farm_id is within organizations the user belongs to.';
COMMENT ON POLICY "Users can delete employees in their organizations" ON "public"."employees" IS 'Allow DELETE where employees.farm_id is within organizations the user belongs to.';


