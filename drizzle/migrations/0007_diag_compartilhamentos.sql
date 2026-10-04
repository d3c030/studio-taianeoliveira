CREATE TABLE public.diag_compartilhamentos (
  token text PRIMARY KEY DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''),
  diagnostico_id uuid NOT NULL REFERENCES public.diag_diagnosticos(id) ON DELETE CASCADE,
  arquivo text NOT NULL,
  nome_arquivo text NOT NULL,
  cliente_nome text NOT NULL DEFAULT '',
  expira_em timestamptz NOT NULL DEFAULT now() + interval '24 hours',
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diag_compartilhamentos TO authenticated;
GRANT ALL ON public.diag_compartilhamentos TO service_role;
ALTER TABLE public.diag_compartilhamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diag_compartilhamentos staff" ON public.diag_compartilhamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);