-- Handle users who accept invitations
-- When a user signs up via invitation, automatically add them to the organization

CREATE OR REPLACE FUNCTION public.handle_invited_user_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user was invited to an organization (metadata from invite)
  IF NEW.raw_user_meta_data ? 'invited_to_organization' AND
     NEW.raw_user_meta_data ? 'invited_with_role' THEN

    -- Add user to the organization they were invited to
    INSERT INTO public.organization_users (
      user_id,
      organization_id,
      role_id,
      is_active
    ) VALUES (
      NEW.id,
      (NEW.raw_user_meta_data->>'invited_to_organization')::UUID,
      (NEW.raw_user_meta_data->>'invited_with_role')::UUID,
      true
    )
    ON CONFLICT (user_id, organization_id)
    DO UPDATE SET
      role_id = EXCLUDED.role_id,
      is_active = true,
      updated_at = NOW();

    -- Create user profile if name was provided
    IF NEW.raw_user_meta_data ? 'first_name' OR NEW.raw_user_meta_data ? 'last_name' THEN
      INSERT INTO public.user_profiles (
        id,
        first_name,
        last_name,
        created_at,
        updated_at
      ) VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        NOW(),
        NOW()
      )
      ON CONFLICT (id)
      DO UPDATE SET
        first_name = COALESCE(EXCLUDED.first_name, user_profiles.first_name),
        last_name = COALESCE(EXCLUDED.last_name, user_profiles.last_name),
        updated_at = NOW();
    END IF;

    RAISE NOTICE 'User % added to organization % via invitation', NEW.id, NEW.raw_user_meta_data->>'invited_to_organization';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users for new signups
DROP TRIGGER IF EXISTS on_auth_user_created_handle_invitation ON auth.users;
CREATE TRIGGER on_auth_user_created_handle_invitation
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_invited_user_signup();

-- Verify trigger was created
DO $$
BEGIN
  RAISE NOTICE 'Invitation handler trigger created successfully';
END $$;
