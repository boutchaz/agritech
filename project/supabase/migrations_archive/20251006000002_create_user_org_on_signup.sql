-- Migration to automatically create user profile and organization on signup
-- This replaces the edge function approach with a direct database trigger

-- Create the trigger function that handles user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_org_id uuid;
  org_name text;
  user_email text;
BEGIN
  -- Get organization name from user metadata
  org_name := NEW.raw_user_meta_data->>'organization_name';
  user_email := NEW.email;

  -- Default organization name if not provided
  IF org_name IS NULL OR org_name = '' THEN
    org_name := split_part(user_email, '@', 1) || '''s Organization';
  END IF;

  -- Create user profile first
  INSERT INTO public.user_profiles (id, email, full_name, first_name, last_name)
  VALUES (
    NEW.id,
    user_email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', user_email),
    COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(user_email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'last_name', '')
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create organization
  INSERT INTO public.organizations (name, slug, owner_id)
  VALUES (
    org_name,
    lower(regexp_replace(org_name, '[^a-zA-Z0-9]+', '-', 'g')),
    NEW.id
  )
  RETURNING id INTO new_org_id;

  -- Get the organization_admin role
  -- Create organization_user link with admin role
  INSERT INTO public.organization_users (organization_id, user_id, role, is_active)
  SELECT
    new_org_id,
    NEW.id,
    'admin',
    true
  WHERE EXISTS (SELECT 1 FROM public.organizations WHERE id = new_org_id);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Error in handle_new_user trigger: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create new trigger
DO $$
BEGIN
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Insufficient privileges to create trigger on auth.users. Please apply this manually:';
    RAISE NOTICE 'CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();';
  WHEN duplicate_object THEN
    RAISE NOTICE 'Trigger on_auth_user_created already exists. Skipping.';
END $$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Comment on function
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates user profile and organization when a new user signs up';
