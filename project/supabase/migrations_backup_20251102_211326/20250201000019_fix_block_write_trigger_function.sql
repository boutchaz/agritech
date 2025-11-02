-- =====================================================
-- Migration: Fix block_write_without_subscription trigger function
-- Description: Updates the trigger function that fires BEFORE DELETE on farms
--              to use public. schema prefix for organization_users
-- =====================================================

CREATE OR REPLACE FUNCTION public.block_write_without_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_org_id UUID;
  is_valid BOOLEAN;
BEGIN
  -- Get current user's organization
  -- Use fully qualified table name
  SELECT organization_id INTO user_org_id
  FROM public.organization_users
  WHERE user_id = auth.uid()
    AND is_active = true
  LIMIT 1;

  -- No organization membership = block
  IF user_org_id IS NULL THEN
    RAISE EXCEPTION 'User is not a member of any organization';
  END IF;

  -- Check if organization has valid subscription
  -- Use fully qualified function name
  is_valid := public.has_valid_subscription(user_org_id);

  -- Block if subscription invalid
  IF NOT is_valid THEN
    RAISE EXCEPTION 'Organization does not have a valid subscription. Please upgrade to continue.';
  END IF;

  -- Return appropriate record based on operation
  -- For DELETE, return OLD; for INSERT/UPDATE, return NEW
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- =====================================================
-- NOTES
-- =====================================================

-- This function is called by BEFORE triggers on farms, parcels, and analyses.
-- Key fixes:
-- 1. SET search_path = '' for security
-- 2. Use public.organization_users explicitly (not just organization_users)
-- 3. Use public.has_valid_subscription() with schema prefix
-- 4. Handle DELETE operations by returning OLD instead of NEW

