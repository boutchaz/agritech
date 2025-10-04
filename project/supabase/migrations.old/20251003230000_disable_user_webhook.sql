-- Temporarily disable the user creation webhook trigger
-- This trigger requires edge function setup which isn't configured yet
-- User creation is currently handled via authSetup.ts on the frontend

DROP TRIGGER IF EXISTS on_auth_user_created_webhook ON auth.users;

-- Keep the function for future use, but don't execute it automatically
COMMENT ON FUNCTION public.trigger_on_user_created() IS 'Disabled: Triggers edge function to setup new user profile and organization. Currently handled by frontend authSetup.ts';
