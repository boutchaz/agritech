-- Migration to add trigger on auth.users table to automatically setup new users
-- This trigger calls the edge function to create user profile and organization

-- Note: This migration requires superuser privileges to create triggers on auth.users
-- The local Supabase CLI has the necessary privileges.

-- Drop trigger if it exists (for idempotency)
DO $$
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Insufficient privileges to drop trigger on auth.users. This is expected in some environments.';
END $$;

-- Create trigger on auth.users table
DO $$
BEGIN
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_on_user_created();
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Insufficient privileges to create trigger on auth.users. Please apply manually via Supabase Dashboard.';
  WHEN duplicate_object THEN
    RAISE NOTICE 'Trigger on_auth_user_created already exists. Skipping creation.';
END $$;
