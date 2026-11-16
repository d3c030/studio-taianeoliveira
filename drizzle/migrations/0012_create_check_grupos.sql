CREATE TABLE public.grupo_engaj (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  dias_missao text[] NOT NULL DEFAULT ARRAY['seg','qua','sex'],
  criado_em timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.grupo_participante (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id uuid NOT NULL REFERENCES public.grupo_engaj(id) ON DELETE CASCADE,
  username text NOT NULL,
  nome_exibicao text,
  emoji_habitual text,
  apelidos text[] NOT NULL DEFAULT '{}',
  ativo boolean NOT NULL DEFAULT true,
  novata boolean NOT NULL DEFAULT false,
  entrou_em date NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (grupo_id, username)
);
CREATE TABLE public.grupo_rodada (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id uuid NOT NULL REFERENCES public.grupo_engaj(id) ON DELETE CASCADE,
  data date NOT NULL,
  dia_semana text NOT NULL,
  status text NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','fechada')),
  criado_em timestamptz NOT NULL DEFAULT now(),
  UNIQUE (grupo_id, data)
);
CREATE TABLE public.grupo_check (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rodada_id uuid NOT NULL REFERENCES public.grupo_rodada(id) ON DELETE CASCADE,
  participante_id uuid NOT NULL REFERENCES public.grupo_participante(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('ok','nao')),
  origem text NOT NULL DEFAULT 'manual' CHECK (origem IN ('auto','manual')),
  nome_lido text,
  emoji_lido text,
  confianca numeric CHECK (confianca IS NULL OR (confianca >= 0 AND confianca <= 1)),
  UNIQUE (rodada_id, participante_id)
);
CREATE TABLE public.grupo_leitura_nao_vinculada (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rodada_id uuid NOT NULL REFERENCES public.grupo_rodada(id) ON DELETE CASCADE,
  nome_lido text NOT NULL,
  emoji_lido text,
  resolvido boolean NOT NULL DEFAULT false
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupo_engaj, public.grupo_participante, public.grupo_rodada, public.grupo_check, public.grupo_leitura_nao_vinculada TO authenticated;
GRANT ALL ON public.grupo_engaj, public.grupo_participante, public.grupo_rodada, public.grupo_check, public.grupo_leitura_nao_vinculada TO service_role;
ALTER TABLE public.grupo_engaj ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupo_participante ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupo_rodada ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupo_check ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupo_leitura_nao_vinculada ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff all" ON public.grupo_engaj FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "staff all" ON public.grupo_participante FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "staff all" ON public.grupo_rodada FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "staff all" ON public.grupo_check FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY "staff all" ON public.grupo_leitura_nao_vinculada FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());