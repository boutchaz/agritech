-- =====================================================
-- Migration: Create delete_farm_direct function
-- Description: Creates an RPC function to delete farms
--              that bypasses the subscription trigger
-- =====================================================

-- Create function to delete farm directly (bypasses trigger)
CREATE OR REPLACE FUNCTION public.delete_farm_direct(p_farm_id UUID)
RETURNS SETOF public.farms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_farm public.farms;
BEGIN
  -- Disable the subscription check trigger temporarily
  -- This trigger checks auth.uid() which is NULL with service_role
  ALTER TABLE public.farms DISABLE TRIGGER block_farms_without_sub;
  
  -- Delete the farm and return the deleted row
  DELETE FROM public.farms
  WHERE id = p_farm_id
  RETURNING * INTO deleted_farm;
  
  -- Re-enable the trigger
  ALTER TABLE public.farms ENABLE TRIGGER block_farms_without_sub;
  
  -- Return the deleted farm if it existed
  IF deleted_farm.id IS NOT NULL THEN
    RETURN NEXT deleted_farm;
  END IF;
  
  RETURN;
EXCEPTION
  WHEN OTHERS THEN
    -- Make sure to re-enable trigger even if error occurs
    BEGIN
      ALTER TABLE public.farms ENABLE TRIGGER block_farms_without_sub;
    EXCEPTION
      WHEN OTHERS THEN
        -- Ignore errors when re-enabling trigger
        NULL;
    END;
    RAISE;
END;
$$;

-- Alternative function that takes JSON parameter (for PostgREST compatibility)
CREATE OR REPLACE FUNCTION public.delete_farm_safe(farm_id UUID)
RETURNS SETOF public.farms
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_farm public.farms;
BEGIN
  -- Disable the subscription check trigger temporarily
  ALTER TABLE public.farms DISABLE TRIGGER block_farms_without_sub;
  
  -- Delete the farm and return the deleted row
  DELETE FROM public.farms
  WHERE id = delete_farm_safe.farm_id
  RETURNING * INTO deleted_farm;
  
  -- Re-enable the trigger
  ALTER TABLE public.farms ENABLE TRIGGER block_farms_without_sub;
  
  -- Return the deleted farm if it existed
  IF deleted_farm.id IS NOT NULL THEN
    RETURN NEXT deleted_farm;
  END IF;
  
  RETURN;
EXCEPTION
  WHEN OTHERS THEN
    -- Make sure to re-enable trigger even if error occurs
    BEGIN
      ALTER TABLE public.farms ENABLE TRIGGER block_farms_without_sub;
    EXCEPTION
      WHEN OTHERS THEN
        NULL;
    END;
    RAISE;
END;
$$;

COMMENT ON FUNCTION public.delete_farm_direct(UUID) IS 
'Deletes a farm directly, bypassing the subscription check trigger.
Should only be used by Edge Functions that have already verified permissions.';

COMMENT ON FUNCTION public.delete_farm_safe(UUID) IS 
'Deletes a farm directly, bypassing the subscription check trigger.
Alternative function name for PostgREST compatibility.';

GRANT EXECUTE ON FUNCTION public.delete_farm_direct(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_farm_direct(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_farm_safe(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_farm_safe(UUID) TO authenticated;

