DROP POLICY IF EXISTS "Public read contact_settings" ON public.contact_settings;
CREATE POLICY "Auth read contact_settings" ON public.contact_settings FOR SELECT TO authenticated USING (true);