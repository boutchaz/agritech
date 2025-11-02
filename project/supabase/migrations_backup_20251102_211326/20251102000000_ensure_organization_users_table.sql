-- Migration: Ensure organization_users table exists
-- This migration creates the organization_users table if it doesn't exist
-- and ensures all necessary indexes and constraints are in place

-- Create organization_users table if it doesn't exist
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

-- Note: RLS policies are defined in migration 20251102000001_fix_organization_users_rls_recursion.sql
-- to avoid infinite recursion issues

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_organization_users_updated_at ON public.organization_users;

-- Create trigger for updated_at
CREATE TRIGGER update_organization_users_updated_at
    BEFORE UPDATE ON public.organization_users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add helpful comment
COMMENT ON TABLE public.organization_users IS 'Maps users to organizations with roles and permissions';
COMMENT ON COLUMN public.organization_users.role IS 'User role in the organization: owner, admin, manager, member, viewer';
COMMENT ON COLUMN public.organization_users.is_active IS 'Whether the user membership is currently active';
