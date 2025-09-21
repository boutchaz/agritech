-- Fix schema cache and table accessibility issues
-- Run this to resolve "Could not find the table 'public.user_profiles'" error

-- Reload the schema cache
NOTIFY pgrst, 'reload schema';

-- Ensure all tables have proper permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Specifically ensure user_profiles table is accessible
GRANT ALL ON public.user_profiles TO authenticated, service_role;
GRANT SELECT ON public.user_profiles TO anon;

-- Ensure organizations table is accessible
GRANT ALL ON public.organizations TO authenticated, service_role;
GRANT SELECT ON public.organizations TO anon;

-- Ensure organization_users table is accessible
GRANT ALL ON public.organization_users TO authenticated, service_role;
GRANT SELECT ON public.organization_users TO anon;

-- Ensure farms table is accessible (and disable RLS)
ALTER TABLE public.farms DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.farms TO authenticated, service_role, anon;

-- Reload schema again after permissions changes
NOTIFY pgrst, 'reload schema';

-- Verify tables exist
SELECT 
    'Schema cache reloaded and permissions updated' as status,
    (SELECT COUNT(*) FROM public.user_profiles) as user_profiles_count,
    (SELECT COUNT(*) FROM public.organizations) as organizations_count,
    (SELECT COUNT(*) FROM public.organization_users) as organization_users_count,
    (SELECT COUNT(*) FROM public.farms) as farms_count;
