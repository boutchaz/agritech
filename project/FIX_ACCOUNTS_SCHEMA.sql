-- =====================================================
-- FIX ACCOUNTS TABLE SCHEMA
-- =====================================================
-- This script removes legacy multilingual columns from the accounts table
-- Run this in Supabase SQL Editor before deploying the full schema
-- =====================================================

-- Drop legacy multilingual columns if they exist
DO $$
BEGIN
  -- Drop description_fr column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'accounts'
    AND column_name = 'description_fr'
  ) THEN
    RAISE NOTICE 'Dropping column description_fr from accounts table';
    ALTER TABLE accounts DROP COLUMN description_fr;
  END IF;

  -- Drop description_ar column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'accounts'
    AND column_name = 'description_ar'
  ) THEN
    RAISE NOTICE 'Dropping column description_ar from accounts table';
    ALTER TABLE accounts DROP COLUMN description_ar;
  END IF;

  -- Drop description_en column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'accounts'
    AND column_name = 'description_en'
  ) THEN
    RAISE NOTICE 'Dropping column description_en from accounts table';
    ALTER TABLE accounts DROP COLUMN description_en;
  END IF;

  -- Drop name_fr column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'accounts'
    AND column_name = 'name_fr'
  ) THEN
    RAISE NOTICE 'Dropping column name_fr from accounts table';
    ALTER TABLE accounts DROP COLUMN name_fr;
  END IF;

  -- Drop name_ar column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'accounts'
    AND column_name = 'name_ar'
  ) THEN
    RAISE NOTICE 'Dropping column name_ar from accounts table';
    ALTER TABLE accounts DROP COLUMN name_ar;
  END IF;

  -- Drop name_en column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'accounts'
    AND column_name = 'name_en'
  ) THEN
    RAISE NOTICE 'Dropping column name_en from accounts table';
    ALTER TABLE accounts DROP COLUMN name_en;
  END IF;

  RAISE NOTICE 'Schema cleanup complete!';
END $$;

-- Verify the current schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'accounts'
ORDER BY ordinal_position;

-- Expected columns:
-- id, organization_id, code, name, account_type, account_subtype,
-- parent_id, description, currency_code, is_group, is_active,
-- allow_cost_center, created_at, created_by, updated_at
