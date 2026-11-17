ALTER TABLE public.grupo_check ADD COLUMN ajustado_em timestamptz, ADD COLUMN status_original text, ADD COLUMN obs text;
ALTER TABLE public.grupo_check DROP CONSTRAINT grupo_check_origem_check;
ALTER TABLE public.grupo_check ADD CONSTRAINT grupo_check_origem_check CHECK (origem IN ('auto','manual','ajuste'));
ALTER TABLE public.grupo_check ADD CONSTRAINT grupo_check_status_original_check CHECK (status_original IS NULL OR status_original IN ('ok','nao'));

CREATE OR REPLACE FUNCTION public.grupo_proteger_check()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE r public.grupo_rodada; ajuste boolean;
BEGIN
 IF TG_OP = 'DELETE' THEN
  SELECT * INTO r FROM public.grupo_rodada WHERE id = OLD.rodada_id FOR UPDATE;
 ELSE
  SELECT * INTO r FROM public.grupo_rodada WHERE id = NEW.rodada_id FOR UPDATE;
 END IF;
 ajuste := COALESCE(current_setting('grupo.ajuste', true), '') = 'on' AND public.is_staff() AND TG_OP <> 'DELETE';
 IF r.status = 'fechada' AND NOT ajuste THEN RAISE EXCEPTION 'Reabra a rodada para corrigir os checks'; END IF;
 IF TG_OP = 'UPDATE' AND (NEW.rodada_id <> OLD.rodada_id OR NEW.participante_id <> OLD.participante_id) THEN RAISE EXCEPTION 'O check pertence a uma única rodada e participante'; END IF;
 IF TG_OP <> 'DELETE' THEN
  IF NOT EXISTS (SELECT 1 FROM public.grupo_participante p WHERE p.id = NEW.participante_id AND p.grupo_id = r.grupo_id AND p.ativo AND p.entrou_em <= r.data) THEN RAISE EXCEPTION 'Participante não elegível nesta rodada'; END IF;
  IF NEW.origem = 'ajuste' AND NOT ajuste AND (TG_OP = 'INSERT' OR NEW IS DISTINCT FROM OLD) THEN RAISE EXCEPTION 'Use a ação de ajuste para alterar este check'; END IF;
  RETURN NEW;
 END IF;
 RETURN OLD;
END $$;

CREATE OR REPLACE FUNCTION public.grupo_ajustar_check(p_rodada uuid, p_participante uuid, p_status text, p_obs text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE r public.grupo_rodada; anterior text;
BEGIN
 IF NOT public.is_staff() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 IF p_status IS NULL OR p_status NOT IN ('ok','nao') THEN RAISE EXCEPTION 'Status inválido'; END IF;
 SELECT * INTO r FROM public.grupo_rodada WHERE id = p_rodada FOR UPDATE;
 IF r.id IS NULL THEN RAISE EXCEPTION 'Rodada não encontrada'; END IF;
 IF NOT EXISTS (SELECT 1 FROM public.grupo_participante p WHERE p.id = p_participante AND p.grupo_id = r.grupo_id AND p.ativo AND p.entrou_em <= r.data) THEN RAISE EXCEPTION 'Participante não elegível nesta rodada'; END IF;
 anterior := COALESCE(current_setting('grupo.ajuste', true), '');
 PERFORM set_config('grupo.ajuste', 'on', true);
 INSERT INTO public.grupo_check (rodada_id, participante_id, status, origem, ajustado_em, status_original, obs)
 VALUES (p_rodada, p_participante, p_status, 'ajuste', now(), 'nao', p_obs)
 ON CONFLICT (rodada_id, participante_id) DO UPDATE
 SET status_original = COALESCE(grupo_check.status_original, grupo_check.status), status = EXCLUDED.status, origem = 'ajuste', ajustado_em = now(), obs = EXCLUDED.obs;
 PERFORM set_config('grupo.ajuste', anterior, true);
EXCEPTION WHEN OTHERS THEN
 PERFORM set_config('grupo.ajuste', COALESCE(anterior, ''), true);
 RAISE;
END $$;
REVOKE ALL ON FUNCTION public.grupo_ajustar_check(uuid, uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grupo_ajustar_check(uuid, uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.grupo_regularizar_semana(p_grupo uuid, p_participante uuid, p_semana date, p_obs text)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE r record; segunda date; total integer := 0;
BEGIN
 IF NOT public.is_staff() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 IF p_semana IS NULL THEN RAISE EXCEPTION 'Semana inválida'; END IF;
 segunda := p_semana - (extract(isodow FROM p_semana)::integer - 1);
 FOR r IN SELECT id FROM public.grupo_rodada WHERE grupo_id = p_grupo AND status = 'fechada' AND data >= segunda AND data < segunda + 7 ORDER BY data, id FOR UPDATE LOOP
  IF EXISTS (SELECT 1 FROM public.grupo_check c WHERE c.rodada_id = r.id AND c.participante_id = p_participante AND c.status = 'nao') THEN
   PERFORM public.grupo_ajustar_check(r.id, p_participante, 'ok', p_obs);
   total := total + 1;
  END IF;
 END LOOP;
 RETURN total;
END $$;
REVOKE ALL ON FUNCTION public.grupo_regularizar_semana(uuid, uuid, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grupo_regularizar_semana(uuid, uuid, date, text) TO authenticated;
COMMENT ON COLUMN public.grupo_check.status_original IS 'Status antes do primeiro ajuste manual; ausência de check equivale a nao.';