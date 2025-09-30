-- =================================
-- FIX USER PROFILES RLS POLICIES
-- =================================
-- This migration fixes the 500 error on user_profiles by simplifying the RLS policies
-- and ensuring they don't cause recursion or reference issues

-- First, temporarily disable RLS to clean up
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- Drop all existing user_profiles policies
DROP POLICY IF EXISTS "users_can_view_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "org_admins_can_view_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Org admins can view user profiles" ON public.user_profiles;

-- Re-enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies for user_profiles
-- Policy 1: Allow users to view their own profile (most common case)
CREATE POLICY "user_profiles_select_own" ON public.user_profiles
    FOR SELECT
    USING (id = auth.uid());

-- Policy 2: Allow users to update their own profile
CREATE POLICY "user_profiles_update_own" ON public.user_profiles
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Policy 3: Allow users to insert their own profile (for new users)
CREATE POLICY "user_profiles_insert_own" ON public.user_profiles
    FOR INSERT
    WITH CHECK (id = auth.uid());

-- Policy 4: Allow organization admins to view profiles
-- Use a simpler, non-recursive query with explicit table references
CREATE POLICY "user_profiles_select_org_admin" ON public.user_profiles
    FOR SELECT
    USING (
        id IN (
            SELECT ou2.user_id
            FROM public.organization_users ou1
            INNER JOIN public.organization_users ou2
                ON ou1.organization_id = ou2.organization_id
            INNER JOIN public.roles r
                ON r.id = ou1.role_id
            WHERE ou1.user_id = auth.uid()
                AND ou1.is_active = true
                AND r.level <= 2
        )
    );

-- Verify the table structure
DO $$
BEGIN
    -- Check if id column exists and is correct type
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'id'
        AND udt_name = 'uuid'
    ) THEN
        RAISE EXCEPTION 'user_profiles.id column is missing or incorrect type';
    END IF;

    RAISE NOTICE 'user_profiles table structure verified successfully';
END $$;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';