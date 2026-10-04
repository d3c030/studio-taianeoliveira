CREATE TABLE public.diag_clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  nome text NOT NULL,
  instagram text,
  email text,
  whatsapp text,
  foto_perfil text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diag_clientes TO authenticated;
GRANT ALL ON public.diag_clientes TO service_role;
ALTER TABLE public.diag_clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diag_clientes own" ON public.diag_clientes FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.diag_diagnosticos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  cliente_id uuid NOT NULL REFERENCES public.diag_clientes(id) ON DELETE CASCADE,
  titulo text NOT NULL DEFAULT 'Diagnóstico de Perfil: Seu passaporte para parcerias',
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','finalizado')),
  resumo_plano_acao text NOT NULL DEFAULT 'Obrigada por confiar no meu trabalho! Agora é aplicar e ver as marcas chegando.',
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diag_diagnosticos TO authenticated;
GRANT ALL ON public.diag_diagnosticos TO service_role;
ALTER TABLE public.diag_diagnosticos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diag_diagnosticos own" ON public.diag_diagnosticos FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.diag_touch_atualizado_em()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.atualizado_em := now(); RETURN NEW; END; $$;
CREATE TRIGGER trg_diag_diagnosticos_touch BEFORE UPDATE ON public.diag_diagnosticos
  FOR EACH ROW EXECUTE FUNCTION public.diag_touch_atualizado_em();

CREATE TABLE public.diag_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostico_id uuid NOT NULL REFERENCES public.diag_diagnosticos(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 0,
  secao text NOT NULL DEFAULT '',
  titulo text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'precisa_ajustes' CHECK (status IN ('ideal','precisa_ajustes')),
  o_que_eu_vi text NOT NULL DEFAULT '',
  sua_tarefa text NOT NULL DEFAULT ''
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diag_itens TO authenticated;
GRANT ALL ON public.diag_itens TO service_role;
ALTER TABLE public.diag_itens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diag_itens own" ON public.diag_itens FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.diag_diagnosticos d WHERE d.id = diagnostico_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.diag_diagnosticos d WHERE d.id = diagnostico_id AND d.user_id = auth.uid()));

CREATE TABLE public.diag_midias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostico_id uuid NOT NULL REFERENCES public.diag_diagnosticos(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.diag_itens(id) ON DELETE SET NULL,
  tipo text NOT NULL CHECK (tipo IN ('positivo','negativo')),
  url_arquivo text NOT NULL,
  legenda text NOT NULL DEFAULT '',
  ordem integer NOT NULL DEFAULT 0
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diag_midias TO authenticated;
GRANT ALL ON public.diag_midias TO service_role;
ALTER TABLE public.diag_midias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diag_midias own" ON public.diag_midias FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.diag_diagnosticos d WHERE d.id = diagnostico_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.diag_diagnosticos d WHERE d.id = diagnostico_id AND d.user_id = auth.uid()));

CREATE TABLE public.diag_configuracoes (
  user_id uuid PRIMARY KEY DEFAULT auth.uid(),
  nome_exibicao text NOT NULL DEFAULT '',
  logo_url text,
  cor_destaque text NOT NULL DEFAULT '',
  rodape text NOT NULL DEFAULT '',
  template_json jsonb
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diag_configuracoes TO authenticated;
GRANT ALL ON public.diag_configuracoes TO service_role;
ALTER TABLE public.diag_configuracoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diag_configuracoes own" ON public.diag_configuracoes FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX diag_diagnosticos_cliente_idx ON public.diag_diagnosticos(cliente_id);
CREATE INDEX diag_itens_diag_idx ON public.diag_itens(diagnostico_id);
CREATE INDEX diag_midias_diag_idx ON public.diag_midias(diagnostico_id);