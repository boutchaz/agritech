-- Create demo user if not exists
DO $$
DECLARE
  demo_user_id uuid;
BEGIN
  -- Insert user if not exists and get the id
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
  ) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    'demo@agrosmart.com',
    crypt('demo123456', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    'authenticated',
    'authenticated'
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO demo_user_id;

  -- If user already exists, get their id
  IF demo_user_id IS NULL THEN
    SELECT id INTO demo_user_id
    FROM auth.users
    WHERE email = 'demo@agrosmart.com';
  END IF;

  -- Create default farm for demo user if not exists
  INSERT INTO farms (
    name,
    location,
    size,
    user_id
  )
  VALUES (
    'Ferme de démonstration',
    'Bni Yagrine, Maroc',
    2.5,
    demo_user_id
  )
  ON CONFLICT DO NOTHING;
END $$;