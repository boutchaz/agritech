-- ============================================================================
-- Add Missing Storage Buckets
-- Migration Date: 2026-03-23
-- Description: Creates storage buckets (files, invoices, agritech-documents)
-- that are referenced in application code but were never created in migrations.
-- ============================================================================

-- =====================================================
-- FILES STORAGE BUCKET
-- Used by: backend files.service.ts (general file uploads),
--          web TaskAttachments.tsx (task file attachments)
-- =====================================================

INSERT INTO storage.buckets (id, name, "public")
VALUES ('files', 'files', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated read access for files" ON storage.objects;
CREATE POLICY "Authenticated read access for files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'files');

DROP POLICY IF EXISTS "Authenticated upload for files" ON storage.objects;
CREATE POLICY "Authenticated upload for files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'files');

DROP POLICY IF EXISTS "Authenticated update for files" ON storage.objects;
CREATE POLICY "Authenticated update for files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'files')
WITH CHECK (bucket_id = 'files');

DROP POLICY IF EXISTS "Authenticated delete for files" ON storage.objects;
CREATE POLICY "Authenticated delete for files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'files');

-- =====================================================
-- INVOICES STORAGE BUCKET
-- Used by: web UtilitiesManagement.tsx (utility invoice uploads)
-- Private bucket, org-scoped via farm_id folder prefix
-- =====================================================

INSERT INTO storage.buckets (id, name, "public")
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated read access for invoices" ON storage.objects;
CREATE POLICY "Authenticated read access for invoices"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'invoices');

DROP POLICY IF EXISTS "Authenticated upload for invoices" ON storage.objects;
CREATE POLICY "Authenticated upload for invoices"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'invoices');

DROP POLICY IF EXISTS "Authenticated update for invoices" ON storage.objects;
CREATE POLICY "Authenticated update for invoices"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'invoices')
WITH CHECK (bucket_id = 'invoices');

DROP POLICY IF EXISTS "Authenticated delete for invoices" ON storage.objects;
CREATE POLICY "Authenticated delete for invoices"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'invoices');

-- =====================================================
-- AGRITECH-DOCUMENTS STORAGE BUCKET
-- Used by: web useTifUpload.ts (TIF/satellite imagery for parcels)
-- Private bucket for geospatial documents
-- =====================================================

INSERT INTO storage.buckets (id, name, "public")
VALUES ('agritech-documents', 'agritech-documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated read access for agritech-documents" ON storage.objects;
CREATE POLICY "Authenticated read access for agritech-documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'agritech-documents');

DROP POLICY IF EXISTS "Authenticated upload for agritech-documents" ON storage.objects;
CREATE POLICY "Authenticated upload for agritech-documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'agritech-documents');

DROP POLICY IF EXISTS "Authenticated update for agritech-documents" ON storage.objects;
CREATE POLICY "Authenticated update for agritech-documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'agritech-documents')
WITH CHECK (bucket_id = 'agritech-documents');

DROP POLICY IF EXISTS "Authenticated delete for agritech-documents" ON storage.objects;
CREATE POLICY "Authenticated delete for agritech-documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'agritech-documents');
