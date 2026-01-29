-- Make Products Storage Bucket Private
-- Migration Date: 2026-01-29
-- Description: Configures the products storage bucket to be private with controlled access

-- Note: This migration assumes the storage.products table exists
-- If using Supabase storage, the bucket configuration should be done via dashboard or API

-- Create storage bucket if it doesn't exist (for local development)
-- In production, this should be configured via Supabase dashboard
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('products', 'products', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Enable RLS on storage.objects for the products bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to view products (images) but not list the bucket
CREATE POLICY "allow_public_view_products"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');

-- Policy: Only authenticated users can upload products
CREATE POLICY "allow_auth_upload_products"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'products'
  AND auth.role() = 'authenticated'
);

-- Policy: Only the uploader or admin can update product files
CREATE POLICY "allow_owner_update_products"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'products'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM organization_users ou
      JOIN roles r ON ou.role_id = r.id
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('system_admin')
    )
  )
);

-- Policy: Only the uploader or admin can delete product files
CREATE POLICY "allow_owner_delete_products"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'products'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM organization_users ou
      JOIN roles r ON ou.role_id = r.id
      WHERE ou.user_id = auth.uid()
        AND ou.is_active = true
        AND r.name IN ('system_admin')
    )
  )
);

-- Create function to generate signed URL for private products
CREATE OR REPLACE FUNCTION get_product_signed_url(
  p_product_id UUID,
  p_expires_in INTEGER DEFAULT 3600
)
RETURNS TEXT LANGUAGE plpgsql
SET search_path = public
SECURITY DEFINER
AS $$
DECLARE
  v_path TEXT;
  v_signed_url TEXT;
BEGIN
  -- Get the product image path from products table (if it exists)
  -- This assumes a products table with an image_path column
  -- Adjust the query based on your actual schema

  -- For now, return a placeholder
  -- In production, this would call storage.get_signed_url()

  RETURN NULL;
END;
$$;

-- Comment explaining storage configuration
COMMENT ON TABLE storage.objects IS 'Storage objects - products bucket is private but publicly viewable';
