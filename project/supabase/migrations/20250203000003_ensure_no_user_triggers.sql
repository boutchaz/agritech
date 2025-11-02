-- Migration to ensure ALL triggers on auth.users are disabled
-- This is critical to prevent 500 errors during signup

-- Drop ALL possible triggers on auth.users
DO $$
BEGIN
  -- Drop any triggers that might exist
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  DROP TRIGGER IF EXISTS on_auth_user_created_webhook ON auth.users;
  DROP TRIGGER IF EXISTS on_auth_user_created_handle_invitation ON auth.users;
  
  RAISE NOTICE 'All user creation triggers dropped';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Insufficient privileges to drop triggers on auth.users.';
    RAISE NOTICE 'Please disable triggers manually via Supabase Dashboard SQL Editor:';
    RAISE NOTICE 'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;';
    RAISE NOTICE 'DROP TRIGGER IF EXISTS on_auth_user_created_webhook ON auth.users;';
    RAISE NOTICE 'DROP TRIGGER IF EXISTS on_auth_user_created_handle_invitation ON auth.users;';
END $$;

-- List any remaining triggers for debugging
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgrelid = 'auth.users'::regclass
    AND tgisinternal = false;
  
  IF trigger_count > 0 THEN
    RAISE WARNING 'Warning: % trigger(s) still exist on auth.users. User creation may fail.', trigger_count;
  ELSE
    RAISE NOTICE 'Success: No triggers found on auth.users';
  END IF;
END $$;

