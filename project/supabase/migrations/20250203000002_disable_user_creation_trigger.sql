-- Migration to disable ALL database triggers that handle user creation
-- We're now calling the Edge Function directly from the client side after signup
-- This avoids "Database error saving new user" errors caused by trigger failures

-- Drop ALL triggers on auth.users that handle user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_webhook ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_handle_invitation ON auth.users;

-- Disable the handle_new_user trigger if it exists (may have different names)
DO $$
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Insufficient privileges to drop trigger on auth.users. This is expected in some environments.';
END $$;

-- Keep the functions but don't use them via trigger
-- The functions can still be called manually if needed
COMMENT ON FUNCTION IF EXISTS public.trigger_on_user_created() IS 'Edge Function trigger - DISABLED: Now called directly from client after signup';
COMMENT ON FUNCTION IF EXISTS public.handle_new_user() IS 'User creation trigger - DISABLED: Now called via Edge Function from client after signup';

