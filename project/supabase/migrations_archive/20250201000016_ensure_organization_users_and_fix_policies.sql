-- =====================================================
-- Migration: Ensure organization_users exists and fix all policies
-- Description: Creates table if missing and fixes all policies to use helper functions
-- =====================================================

-- =====================================================
-- 1. ENSURE organization_users TABLE EXISTS
-- =====================================================

CREATE TABLE IF NOT EXISTS public.organization_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'manager', 'member', 'viewer')),
    role_id INTEGER,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    invited_by UUID REFERENCES auth.users(id),
    UNIQUE(organization_id, user_id)
);

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_organization_users_organization_id
    ON public.organization_users(organization_id);

CREATE INDEX IF NOT EXISTS idx_organization_users_user_id
    ON public.organization_users(user_id);

CREATE INDEX IF NOT EXISTS idx_organization_users_org_user
    ON public.organization_users(organization_id, user_id);

CREATE INDEX IF NOT EXISTS idx_organization_users_role
    ON public.organization_users(role);

CREATE INDEX IF NOT EXISTS idx_organization_users_is_active
    ON public.organization_users(is_active);

-- Enable RLS
ALTER TABLE public.organization_users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. FIX farms_select_policy TO USE HELPER FUNCTION
-- =====================================================

-- Drop the policy that directly queries organization_users
DROP POLICY IF EXISTS "farms_select_policy" ON public.farms;

-- Recreate using is_active_org_member helper function (already fixed)
CREATE POLICY "farms_select_policy" ON public.farms
    FOR SELECT
    TO authenticated
    USING (
        public.is_active_org_member(auth.uid(), organization_id)
        AND public.has_valid_subscription(organization_id)
    );

-- =====================================================
-- NOTES
-- =====================================================

-- This migration:
-- 1. Ensures organization_users table exists with all indexes
-- 2. Fixes farms_select_policy to use helper function instead of direct query
-- 3. Uses helper functions that have proper search_path = '' settings

