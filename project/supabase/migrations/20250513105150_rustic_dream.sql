-- Temporarily disable RLS
ALTER TABLE day_laborers DISABLE ROW LEVEL SECURITY;

-- Add task types if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'day_laborers' 
    AND column_name = 'task_types'
  ) THEN
    ALTER TABLE day_laborers 
    ADD COLUMN task_types text[] DEFAULT ARRAY['taille', 'récolte', 'traitement', 'irrigation', 'fertilisation', 'désherbage', 'plantation'];
  END IF;
END $$;

-- Re-enable RLS
ALTER TABLE day_laborers ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists
DROP POLICY IF EXISTS "Users can manage their own day laborers" ON day_laborers;

-- Create new comprehensive policy
CREATE POLICY "Users can manage their own day laborers"
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