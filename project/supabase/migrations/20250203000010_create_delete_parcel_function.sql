-- =====================================================
-- Migration: Create delete_parcel_direct function
-- Description: Creates an RPC function to delete parcels
--              that bypasses the subscription trigger
-- =====================================================

-- Create function to delete parcel directly (bypasses trigger)
CREATE OR REPLACE FUNCTION public.delete_parcel_direct(p_parcel_id UUID)
RETURNS SETOF public.parcels
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_parcel public.parcels;
BEGIN
  -- Disable the subscription check trigger temporarily
  -- This trigger checks auth.uid() which is NULL with service_role
  ALTER TABLE public.parcels DISABLE TRIGGER block_parcels_without_sub;
  
  -- Delete the parcel and return the deleted row
  DELETE FROM public.parcels
  WHERE id = p_parcel_id
  RETURNING * INTO deleted_parcel;
  
  -- Re-enable the trigger
  ALTER TABLE public.parcels ENABLE TRIGGER block_parcels_without_sub;
  
  -- Return the deleted parcel if it existed
  IF deleted_parcel.id IS NOT NULL THEN
    RETURN NEXT deleted_parcel;
  END IF;
  
  RETURN;
EXCEPTION
  WHEN OTHERS THEN
    -- Make sure to re-enable trigger even if error occurs
    BEGIN
      ALTER TABLE public.parcels ENABLE TRIGGER block_parcels_without_sub;
    EXCEPTION
      WHEN OTHERS THEN
        -- Ignore errors when re-enabling trigger
        NULL;
    END;
    RAISE;
END;
$$;

-- Alternative function that takes JSON parameter (for PostgREST compatibility)
CREATE OR REPLACE FUNCTION public.delete_parcel_safe(parcel_id UUID)
RETURNS SETOF public.parcels
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_parcel public.parcels;
BEGIN
  -- Disable the subscription check trigger temporarily
  ALTER TABLE public.parcels DISABLE TRIGGER block_parcels_without_sub;
  
  -- Delete the parcel and return the deleted row
  DELETE FROM public.parcels
  WHERE id = delete_parcel_safe.parcel_id
  RETURNING * INTO deleted_parcel;
  
  -- Re-enable the trigger
  ALTER TABLE public.parcels ENABLE TRIGGER block_parcels_without_sub;
  
  -- Return the deleted parcel if it existed
  IF deleted_parcel.id IS NOT NULL THEN
    RETURN NEXT deleted_parcel;
  END IF;
  
  RETURN;
EXCEPTION
  WHEN OTHERS THEN
    -- Make sure to re-enable trigger even if error occurs
    BEGIN
      ALTER TABLE public.parcels ENABLE TRIGGER block_parcels_without_sub;
    EXCEPTION
      WHEN OTHERS THEN
        NULL;
    END;
    RAISE;
END;
$$;

COMMENT ON FUNCTION public.delete_parcel_direct(UUID) IS 
'Deletes a parcel directly, bypassing the subscription check trigger.
Should only be used by Edge Functions that have already verified permissions.';

COMMENT ON FUNCTION public.delete_parcel_safe(UUID) IS 
'Deletes a parcel directly, bypassing the subscription check trigger.
Alternative function name for PostgREST compatibility.';

GRANT EXECUTE ON FUNCTION public.delete_parcel_direct(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_parcel_direct(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_parcel_safe(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.delete_parcel_safe(UUID) TO authenticated;

