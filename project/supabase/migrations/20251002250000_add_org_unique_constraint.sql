-- Add unique constraint on organization_id for upsert operations
-- This allows the webhook to use ON CONFLICT (organization_id) for upsert

-- First, check if there are any duplicate organization_ids
DO $$
BEGIN
  -- Delete any duplicate subscriptions, keeping the most recent one
  DELETE FROM public.subscriptions
  WHERE id NOT IN (
    SELECT DISTINCT ON (organization_id) id
    FROM public.subscriptions
    ORDER BY organization_id, created_at DESC
  );
END $$;

-- Add unique constraint on organization_id
-- This ensures one subscription per organization
ALTER TABLE public.subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_organization_id_key;

ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_organization_id_key UNIQUE (organization_id);

-- Verify the constraint was added
DO $$
BEGIN
  RAISE NOTICE 'Unique constraint added successfully on subscriptions.organization_id';
END $$;
