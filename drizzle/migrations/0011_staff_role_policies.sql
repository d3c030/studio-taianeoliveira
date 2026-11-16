DO $$ BEGIN CREATE TYPE public.app_role AS ENUM ('admin','staff'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(auth.uid(), 'staff') $$;

INSERT INTO public.user_roles (user_id, role) SELECT id, 'staff' FROM auth.users ON CONFLICT DO NOTHING;

DO $$
DECLARE r record; t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['appointments','appointment_payments','clients','expenses','procedures','contact_settings','agenda_days','diag_clientes','diag_cobrancas','diag_compartilhamentos','diag_diagnosticos','diag_itens','diag_midias','diag_pagamentos','mk_kits','site_cupons','site_leads','site_acessos'] LOOP
    FOR r IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t AND 'authenticated' = ANY(roles) LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, t);
    END LOOP;
    IF t = 'site_acessos' THEN
      EXECUTE format('CREATE POLICY "staff read" ON public.%I FOR SELECT TO authenticated USING (public.is_staff())', t);
    ELSE
      EXECUTE format('CREATE POLICY "staff all" ON public.%I FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff())', t);
    END IF;
  END LOOP;
END $$;

DROP POLICY IF EXISTS "Auth delete branding" ON storage.objects;
DROP POLICY IF EXISTS "Auth list branding" ON storage.objects;
DROP POLICY IF EXISTS "Auth update branding" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload branding" ON storage.objects;
DROP POLICY IF EXISTS "diag storage delete staff" ON storage.objects;
DROP POLICY IF EXISTS "diag storage insert own" ON storage.objects;
DROP POLICY IF EXISTS "diag storage select staff" ON storage.objects;
DROP POLICY IF EXISTS "diag storage update staff" ON storage.objects;
DROP POLICY IF EXISTS "midiakit staff delete" ON storage.objects;
DROP POLICY IF EXISTS "midiakit staff write" ON storage.objects;
DROP POLICY IF EXISTS "site bucket auth delete" ON storage.objects;
DROP POLICY IF EXISTS "site bucket auth insert" ON storage.objects;
DROP POLICY IF EXISTS "site bucket auth update" ON storage.objects;

CREATE POLICY "staff select files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id IN ('branding','diagnosticos','midiakit','site') AND public.is_staff());
CREATE POLICY "staff insert files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('branding','diagnosticos','midiakit','site') AND public.is_staff());
CREATE POLICY "staff update files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('branding','diagnosticos','midiakit','site') AND public.is_staff())
  WITH CHECK (bucket_id IN ('branding','diagnosticos','midiakit','site') AND public.is_staff());
CREATE POLICY "staff delete files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id IN ('branding','diagnosticos','midiakit','site') AND public.is_staff());