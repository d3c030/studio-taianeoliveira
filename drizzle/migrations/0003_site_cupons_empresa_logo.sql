ALTER TABLE public.site_cupons ADD COLUMN IF NOT EXISTS empresa text NOT NULL DEFAULT '';
ALTER TABLE public.site_cupons ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.site_cupons ADD COLUMN IF NOT EXISTS ordem integer NOT NULL DEFAULT 0;
GRANT SELECT ON public.site_cupons TO anon;
GRANT ALL ON public.site_cupons TO authenticated, service_role;
GRANT ALL ON public.site_leads TO authenticated, service_role;