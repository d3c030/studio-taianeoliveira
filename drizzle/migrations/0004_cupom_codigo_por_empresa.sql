ALTER TABLE public.site_cupons DROP CONSTRAINT site_cupons_codigo_key;
CREATE UNIQUE INDEX site_cupons_empresa_codigo_key ON public.site_cupons (lower(empresa), codigo);