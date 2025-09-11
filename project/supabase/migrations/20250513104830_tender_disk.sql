/*
  # Add Day Laborers Management

  1. Changes
    - Create day_laborers table if not exists
    - Add proper columns for tracking worker information
    - Add payment type options (daily, task, unit based)
    - Enable RLS with proper policies
    
  2. Security
    - Enable RLS on day_laborers table
    - Add policy for authenticated users to manage their laborers
*/

-- Create day_laborers table if not exists
CREATE TABLE IF NOT EXISTS day_laborers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id uuid NOT NULL REFERENCES farms(id),
  first_name text NOT NULL,
  last_name text NOT NULL,
  cin text NOT NULL,
  phone text,
  address text,
  daily_rate numeric NOT NULL,
  specialties text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  payment_type text DEFAULT 'daily' CHECK (payment_type IN ('daily', 'task', 'unit')),
  task_rate numeric,
  unit_rate numeric,
  unit_type text
);

-- Enable RLS
ALTER TABLE day_laborers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their day laborers" ON day_laborers;

-- Create new policy
CREATE POLICY "Users can manage their day laborers"
ON day_laborers
FOR ALL
TO authenticated
USING (
  farm_id IN (
    SELECT id
    FROM farms
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  farm_id IN (
    SELECT id
    FROM farms
    WHERE user_id = auth.uid()
  )
);

-- Add trigger for updating timestamps
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_day_laborers_updated_at'
  ) THEN
    CREATE TRIGGER update_day_laborers_updated_at
      BEFORE UPDATE ON day_laborers
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;