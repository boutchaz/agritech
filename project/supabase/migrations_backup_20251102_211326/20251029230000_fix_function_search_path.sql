-- Migration: Fix Function Search Path Mutable Warnings
-- Date: 2025-10-29
-- Description: Adds SET search_path = '' to all SECURITY DEFINER functions
-- This addresses the Supabase linter warning: function_search_path_mutable
-- Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- ============================================================================
-- Dynamic Function to Add search_path to All SECURITY DEFINER Functions
-- ============================================================================

DO $$
DECLARE
  func_record RECORD;
  func_def TEXT;
  new_func_def TEXT;
BEGIN
  -- Loop through all SECURITY DEFINER functions in public schema
  FOR func_record IN
    SELECT
      p.proname AS function_name,
      pg_get_functiondef(p.oid) AS function_definition
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.prosecdef = true  -- SECURITY DEFINER functions only
      AND pg_get_functiondef(p.oid) NOT LIKE '%SET search_path%'  -- Not already fixed
  LOOP
    func_def := func_record.function_definition;

    -- Replace the function definition to add SET search_path = ''
    -- Find the line with SECURITY DEFINER and add SET search_path after it
    new_func_def := regexp_replace(
      func_def,
      'SECURITY DEFINER',
      E'SECURITY DEFINER\nSET search_path = ''''',
      'g'
    );

    -- Execute the modified function definition
    BEGIN
      EXECUTE new_func_def;
      RAISE NOTICE 'Updated function: %', func_record.function_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Failed to update function %: %', func_record.function_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- ============================================================================
-- Verify all functions have been updated
-- ============================================================================

DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND pg_get_functiondef(p.oid) NOT LIKE '%SET search_path%';

  IF remaining_count > 0 THEN
    RAISE WARNING '% functions still need manual search_path configuration', remaining_count;
  ELSE
    RAISE NOTICE 'All SECURITY DEFINER functions have been updated with search_path';
  END IF;
END $$;
