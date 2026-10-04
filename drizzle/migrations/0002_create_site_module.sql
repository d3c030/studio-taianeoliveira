CREATE TABLE public.site_paginas (
  user_id uuid PRIMARY KEY DEFAULT auth.uid(),
  rascunho_json jsonb NOT NULL DEFAULT '{"sections":[]}'::jsonb,
  publicado_json jsonb NOT NULL DEFAULT '{"sections":[]}'::jsonb,
  seo jsonb NOT NULL DEFAULT '{}'::jsonb,
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_paginas TO authenticated;
GRANT SELECT (user_id, publicado_json, seo, atualizado_em) ON public.site_paginas TO anon;
GRANT ALL ON public.site_paginas TO service_role;
ALTER TABLE public.site_paginas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_paginas public read" ON public.site_paginas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "site_paginas owner write" ON public.site_paginas FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.site_cupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  titulo text NOT NULL DEFAULT '',
  descricao text NOT NULL DEFAULT '',
  desconto text NOT NULL DEFAULT '',
  validade_inicio date,
  validade_fim date,
  limite_usos integer,
  usos integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_cupons TO authenticated;
GRANT SELECT ON public.site_cupons TO anon;
GRANT ALL ON public.site_cupons TO service_role;
ALTER TABLE public.site_cupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_cupons public active" ON public.site_cupons FOR SELECT TO anon USING (
  ativo AND (validade_inicio IS NULL OR validade_inicio <= current_date) AND (validade_fim IS NULL OR validade_fim >= current_date));
CREATE POLICY "site_cupons staff" ON public.site_cupons FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.site_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  instagram text,
  email text,
  whatsapp text,
  nicho text,
  objetivo text,
  mensagem text,
  origem_cupom text,
  utm_source text, utm_medium text, utm_campaign text,
  status text NOT NULL DEFAULT 'novo' CHECK (status IN ('novo','em_contato','convertido','descartado')),
  cliente_id uuid,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_leads TO authenticated;
GRANT ALL ON public.site_leads TO service_role;
ALTER TABLE public.site_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_leads staff" ON public.site_leads FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.site_acessos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  data timestamptz NOT NULL DEFAULT now(),
  pagina text,
  referrer text,
  utm_source text, utm_medium text, utm_campaign text,
  dispositivo text
);
GRANT SELECT, DELETE ON public.site_acessos TO authenticated;
GRANT ALL ON public.site_acessos TO service_role;
ALTER TABLE public.site_acessos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "site_acessos staff read" ON public.site_acessos FOR SELECT TO authenticated USING (true);

CREATE POLICY "site bucket auth insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'site');
CREATE POLICY "site bucket auth update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'site');
CREATE POLICY "site bucket auth delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'site');