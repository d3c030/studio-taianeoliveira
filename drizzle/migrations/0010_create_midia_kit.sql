CREATE TABLE public.mk_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  dados jsonb NOT NULL DEFAULT '{}'::jsonb,
  textos jsonb NOT NULL DEFAULT '{}'::jsonb,
  fotos jsonb NOT NULL DEFAULT '[]'::jsonb,
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-',''),
  publico boolean NOT NULL DEFAULT false,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mk_kits TO authenticated;
GRANT ALL ON public.mk_kits TO service_role;
ALTER TABLE public.mk_kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mk_kits staff" ON public.mk_kits FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "midiakit staff write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='midiakit');
CREATE POLICY "midiakit staff delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='midiakit');