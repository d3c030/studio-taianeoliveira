CREATE TABLE public.grupo_leitura (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 rodada_id uuid NOT NULL REFERENCES public.grupo_rodada(id) ON DELETE CASCADE,
 print_idx int NOT NULL CHECK (print_idx > 0),
 ordem int NOT NULL CHECK (ordem >= 0),
 nome_lido text NOT NULL,
 emoji_lido text NOT NULL DEFAULT '',
 cortado boolean NOT NULL DEFAULT false,
 participante_id uuid REFERENCES public.grupo_participante(id) ON DELETE SET NULL,
 confianca numeric NOT NULL DEFAULT 0,
 total_linhas_visiveis int NOT NULL DEFAULT 0,
 criado_em timestamptz NOT NULL DEFAULT now(),
 UNIQUE(rodada_id, print_idx, ordem)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grupo_leitura TO authenticated;
GRANT ALL ON public.grupo_leitura TO service_role;
ALTER TABLE public.grupo_leitura ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Equipe gerencia auditoria" ON public.grupo_leitura FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
ALTER TABLE public.grupo_rodada ADD COLUMN total_reacoes int;
ALTER TABLE public.grupo_rodada ADD CONSTRAINT grupo_total_reacoes_valido CHECK (total_reacoes IS NULL OR total_reacoes >= 0);