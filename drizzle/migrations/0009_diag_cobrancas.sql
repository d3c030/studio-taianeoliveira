CREATE TABLE public.diag_cobrancas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostico_id uuid NOT NULL REFERENCES public.diag_diagnosticos(id) ON DELETE CASCADE,
  descricao text NOT NULL DEFAULT '',
  valor numeric NOT NULL DEFAULT 0,
  desconto numeric NOT NULL DEFAULT 0,
  ordem integer NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diag_cobrancas TO authenticated;
GRANT ALL ON public.diag_cobrancas TO service_role;
ALTER TABLE public.diag_cobrancas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diag_cobrancas staff" ON public.diag_cobrancas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX diag_cobrancas_diag_idx ON public.diag_cobrancas(diagnostico_id);

CREATE TABLE public.diag_pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostico_id uuid NOT NULL REFERENCES public.diag_diagnosticos(id) ON DELETE CASCADE,
  valor numeric NOT NULL DEFAULT 0,
  forma text,
  pago_em date NOT NULL DEFAULT CURRENT_DATE,
  obs text,
  criado_em timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.diag_pagamentos TO authenticated;
GRANT ALL ON public.diag_pagamentos TO service_role;
ALTER TABLE public.diag_pagamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "diag_pagamentos staff" ON public.diag_pagamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX diag_pagamentos_diag_idx ON public.diag_pagamentos(diagnostico_id);