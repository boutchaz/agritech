-- Create storage bucket for invoice files
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', true);

-- Create storage policy to allow authenticated users to upload/download their organization's invoices
CREATE POLICY "Users can upload invoices to their farm folders" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'invoices' AND
  auth.uid()::text = (storage.foldername(name))[1] AND
  (SELECT COUNT(*) > 0 FROM user_organizations uo
   JOIN farms f ON f.organization_id = uo.organization_id
   WHERE uo.user_id = auth.uid() AND f.id::text = (storage.foldername(name))[2])
);

CREATE POLICY "Users can view invoices from their organization's farms" ON storage.objects
FOR SELECT USING (
  bucket_id = 'invoices' AND
  (SELECT COUNT(*) > 0 FROM user_organizations uo
   JOIN farms f ON f.organization_id = uo.organization_id
   WHERE uo.user_id = auth.uid() AND f.id::text = (storage.foldername(name))[2])
);

CREATE POLICY "Users can delete invoices from their organization's farms" ON storage.objects
FOR DELETE USING (
  bucket_id = 'invoices' AND
  (SELECT COUNT(*) > 0 FROM user_organizations uo
   JOIN farms f ON f.organization_id = uo.organization_id
   WHERE uo.user_id = auth.uid() AND f.id::text = (storage.foldername(name))[2])
);