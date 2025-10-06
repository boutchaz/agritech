-- Migration to add trigger on auth.users table to automatically setup new users
-- This trigger calls the edge function to create user profile and organization

-- Drop trigger if it exists (for idempotency)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_on_user_created();

-- Comment on the trigger
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Automatically setup new user profile and organization via edge function';
