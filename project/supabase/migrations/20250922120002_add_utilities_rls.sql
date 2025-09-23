-- Enable RLS on utilities table
ALTER TABLE "public"."utilities" ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view utilities in their farm
CREATE POLICY "Users can view utilities in their farm" ON "public"."utilities"
    FOR SELECT USING (
        farm_id IN (
            SELECT id
            FROM farms
            WHERE organization_id IN (
                SELECT organization_id
                FROM organization_users
                WHERE user_id = auth.uid() AND is_active = true
            )
        )
    );

-- Policy to allow users to insert utilities in their farm
CREATE POLICY "Users can insert utilities in their farm" ON "public"."utilities"
    FOR INSERT WITH CHECK (
        farm_id IN (
            SELECT id
            FROM farms
            WHERE organization_id IN (
                SELECT organization_id
                FROM organization_users
                WHERE user_id = auth.uid() AND is_active = true
            )
        )
    );

-- Policy to allow users to update utilities in their farm
CREATE POLICY "Users can update utilities in their farm" ON "public"."utilities"
    FOR UPDATE USING (
        farm_id IN (
            SELECT id
            FROM farms
            WHERE organization_id IN (
                SELECT organization_id
                FROM organization_users
                WHERE user_id = auth.uid() AND is_active = true
            )
        )
    );

-- Policy to allow users to delete utilities in their farm
CREATE POLICY "Users can delete utilities in their farm" ON "public"."utilities"
    FOR DELETE USING (
        farm_id IN (
            SELECT id
            FROM farms
            WHERE organization_id IN (
                SELECT organization_id
                FROM organization_users
                WHERE user_id = auth.uid() AND is_active = true
            )
        )
    );
