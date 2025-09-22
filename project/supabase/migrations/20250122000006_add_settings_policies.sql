-- Enable RLS on user_profiles table if not already enabled
ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for user_profiles
CREATE POLICY "Users can view their own profile" ON "public"."user_profiles"
    FOR SELECT USING (
        auth.uid() = id
    );

CREATE POLICY "Users can update their own profile" ON "public"."user_profiles"
    FOR UPDATE USING (
        auth.uid() = id
    );

CREATE POLICY "Users can insert their own profile" ON "public"."user_profiles"
    FOR INSERT WITH CHECK (
        auth.uid() = id
    );

-- Enable RLS on organizations table if not already enabled
ALTER TABLE "public"."organizations" ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for organizations
CREATE POLICY "Users can view organizations they belong to" ON "public"."organizations"
    FOR SELECT USING (
        id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

CREATE POLICY "Users can update organizations they belong to" ON "public"."organizations"
    FOR UPDATE USING (
        id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Add comments for documentation
COMMENT ON POLICY "Users can view their own profile" ON "public"."user_profiles" IS 'Allow users to view their own profile data';
COMMENT ON POLICY "Users can update their own profile" ON "public"."user_profiles" IS 'Allow users to update their own profile data';
COMMENT ON POLICY "Users can insert their own profile" ON "public"."user_profiles" IS 'Allow users to create their own profile';

COMMENT ON POLICY "Users can view organizations they belong to" ON "public"."organizations" IS 'Allow users to view organizations they are members of';
COMMENT ON POLICY "Users can update organizations they belong to" ON "public"."organizations" IS 'Allow users to update organizations they are members of';