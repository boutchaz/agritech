-- COMPLETE DATABASE FIX
-- Run this to fix all schema cache and function issues

-- =====================================================
-- STEP 1: RELOAD SCHEMA CACHE
-- =====================================================
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- STEP 2: FIX PERMISSIONS
-- =====================================================
-- Ensure all tables have proper permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Specifically ensure all tables are accessible
GRANT ALL ON public.user_profiles TO authenticated, service_role;
GRANT SELECT ON public.user_profiles TO anon;

GRANT ALL ON public.organizations TO authenticated, service_role;
GRANT SELECT ON public.organizations TO anon;

GRANT ALL ON public.organization_users TO authenticated, service_role;
GRANT SELECT ON public.organization_users TO anon;

-- Ensure farms table is accessible (disable RLS)
ALTER TABLE public.farms DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.farms TO authenticated, service_role, anon;

-- =====================================================
-- STEP 3: CREATE MISSING FUNCTIONS
-- =====================================================

-- Function to get user organizations
CREATE OR REPLACE FUNCTION public.get_user_organizations(user_uuid UUID)
RETURNS TABLE (
    organization_id UUID,
    organization_name TEXT,
    organization_slug TEXT,
    user_role TEXT,
    is_active BOOLEAN,
    joined_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        o.id,
        o.name,
        o.slug,
        ou.role,
        ou.is_active,
        ou.created_at as joined_at
    FROM public.organizations o
    JOIN public.organization_users ou ON o.id = ou.organization_id
    WHERE ou.user_id = user_uuid AND ou.is_active = true
    ORDER BY ou.created_at;
END;
$$;

-- Function to get organization farms
CREATE OR REPLACE FUNCTION public.get_organization_farms(org_uuid UUID)
RETURNS TABLE (
    farm_id UUID,
    farm_name TEXT,
    farm_location TEXT,
    farm_size DECIMAL,
    manager_name TEXT,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        f.id,
        f.name,
        f.location,
        f.size,
        f.manager_name,
        f.status
    FROM public.farms f
    WHERE f.organization_id = org_uuid AND f.status = 'active'
    ORDER BY f.created_at;
END;
$$;

-- Function to get current user profile
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    profile_data json;
BEGIN
    INSERT INTO public.user_profiles (id, email, created_at, updated_at)
    SELECT auth.uid(), auth.email(), NOW(), NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM public.user_profiles WHERE id = auth.uid()
    );

    SELECT to_json(user_profiles.*)
    INTO profile_data
    FROM public.user_profiles
    WHERE id = auth.uid();

    RETURN profile_data;
END;
$$;

-- Function to create organization with owner
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
    org_name TEXT,
    org_slug TEXT,
    owner_user_id UUID,
    org_email TEXT DEFAULT NULL,
    org_phone TEXT DEFAULT NULL,
    org_address TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    org_id UUID;
BEGIN
    -- Create organization
    INSERT INTO public.organizations (name, slug, email, phone, address)
    VALUES (org_name, org_slug, org_email, org_phone, org_address)
    RETURNING id INTO org_id;

    -- Add owner to organization
    INSERT INTO public.organization_users (organization_id, user_id, role)
    VALUES (org_id, owner_user_id, 'owner');

    -- Create user profile if it doesn't exist
    INSERT INTO public.user_profiles (id, email, created_at, updated_at)
    SELECT owner_user_id, auth.email(), NOW(), NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM public.user_profiles WHERE id = owner_user_id
    );

    RETURN org_id;
END;
$$;

-- Auto-create user profile trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, created_at, updated_at)
    VALUES (new.id, new.email, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- =====================================================
-- STEP 4: GRANT FUNCTION PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION public.get_user_organizations(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_organization_farms(UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_current_user_profile() TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.create_organization_with_owner(TEXT, TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated, service_role;

-- =====================================================
-- STEP 5: CREATE TRIGGERS
-- =====================================================
-- Create triggers if they don't exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at triggers for tables
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_organizations_updated_at ON public.organizations;
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_organization_users_updated_at ON public.organization_users;
CREATE TRIGGER update_organization_users_updated_at
    BEFORE UPDATE ON public.organization_users
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_farms_updated_at ON public.farms;
CREATE TRIGGER update_farms_updated_at
    BEFORE UPDATE ON public.farms
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- STEP 6: FINAL SCHEMA RELOAD
-- =====================================================
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- STEP 7: VERIFICATION
-- =====================================================
SELECT 
    'Database fix completed successfully!' as status,
    (SELECT COUNT(*) FROM public.user_profiles) as user_profiles_count,
    (SELECT COUNT(*) FROM public.organizations) as organizations_count,
    (SELECT COUNT(*) FROM public.organization_users) as organization_users_count,
    (SELECT COUNT(*) FROM public.farms) as farms_count;
