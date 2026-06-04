DROP POLICY IF EXISTS "Public read branding" ON storage.objects;
CREATE POLICY "Auth list branding" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'branding');