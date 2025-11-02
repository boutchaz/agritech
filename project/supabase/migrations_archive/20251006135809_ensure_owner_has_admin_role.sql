-- Ensure organization owners have admin role in organization_users table

-- First, get the admin role ID
DO $$
DECLARE
  admin_role_id uuid;
BEGIN
  -- Get the organization_admin role ID
  SELECT id INTO admin_role_id 
  FROM roles 
  WHERE name = 'organization_admin' 
  LIMIT 1;

  -- If we found the role, update all organization owners to have it
  IF admin_role_id IS NOT NULL THEN
    -- Update existing organization_users where user is owner but role_id is NULL or wrong
    UPDATE organization_users ou
    SET role_id = admin_role_id
    FROM organizations o
    WHERE ou.organization_id = o.id
      AND ou.user_id = o.owner_id
      AND (ou.role_id IS NULL OR ou.role_id != admin_role_id);

    RAISE NOTICE 'Updated organization owners to have admin role';
  ELSE
    RAISE NOTICE 'organization_admin role not found';
  END IF;
END $$;

-- Create a function to automatically assign admin role to organization owner
CREATE OR REPLACE FUNCTION assign_owner_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_role_id uuid;
  is_owner boolean;
BEGIN
  -- Check if this user is the organization owner
  SELECT EXISTS(
    SELECT 1 FROM organizations 
    WHERE id = NEW.organization_id 
    AND owner_id = NEW.user_id
  ) INTO is_owner;

  -- If user is the owner and doesn't have a role assigned
  IF is_owner AND NEW.role_id IS NULL THEN
    -- Get the admin role ID
    SELECT id INTO admin_role_id 
    FROM roles 
    WHERE name = 'organization_admin' 
    LIMIT 1;

    IF admin_role_id IS NOT NULL THEN
      NEW.role_id := admin_role_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to run before insert on organization_users
DROP TRIGGER IF EXISTS ensure_owner_has_admin_role ON organization_users;
CREATE TRIGGER ensure_owner_has_admin_role
  BEFORE INSERT ON organization_users
  FOR EACH ROW
  EXECUTE FUNCTION assign_owner_admin_role();
