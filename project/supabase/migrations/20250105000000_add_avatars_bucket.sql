-- =====================================================
-- AVATARS STORAGE BUCKET
-- =====================================================

-- Create avatars storage bucket for user profile images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,  -- 2MB limit
  ARRAY['image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png'];

-- Drop existing policies if they exist (cleanup for idempotency)
DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload for avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;

-- Policy: Public read access for avatars bucket
CREATE POLICY "Public read access for avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Policy: Authenticated users can upload to avatars bucket
CREATE POLICY "Authenticated upload for avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own avatars
CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own avatars
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add bucket to file_registry tracking
INSERT INTO file_registry (bucket_name, organization_id, file_path, file_name, file_size, mime_type, uploaded_by)
SELECT 
  'avatars',
  (auth.uid())::text,
  name,
  (storage.filename(name))[1],
  0,
  COALESCE(metadata->>'mimetype', 'application/octet-stream'),
  auth.uid()::text
FROM storage.objects
WHERE bucket_id = 'avatars'
ON CONFLICT (bucket_name, file_path) DO NOTHING;
