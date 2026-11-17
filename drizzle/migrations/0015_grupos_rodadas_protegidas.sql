CREATE OR REPLACE FUNCTION public.grupo_validar_rodada() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE dias text[]; dia text;
BEGIN
 IF TG_OP = 'UPDATE' THEN
  IF NEW.grupo_id <> OLD.grupo_id OR NEW.data <> OLD.data OR NEW.dia_semana <> OLD.dia_semana THEN RAISE EXCEPTION 'A data e o grupo da rodada não podem ser alterados'; END IF;
  RETURN NEW;
 END IF;
 SELECT dias_missao INTO dias FROM public.grupo_engaj WHERE id = NEW.grupo_id;
 dia := (ARRAY['dom','seg','ter','qua','qui','sex','sab'])[extract(dow FROM NEW.data)::int + 1];
 IF NEW.data > (now() AT TIME ZONE 'America/Sao_Paulo')::date OR NOT (dia = ANY(dias)) THEN RAISE EXCEPTION 'Escolha um dia de conferência que já chegou'; END IF;
 NEW.dia_semana := dia;
 RETURN NEW;
END $$;
CREATE TRIGGER grupo_validar_rodada BEFORE INSERT OR UPDATE ON public.grupo_rodada FOR EACH ROW EXECUTE FUNCTION public.grupo_validar_rodada();
CREATE OR REPLACE FUNCTION public.grupo_proteger_check() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE r public.grupo_rodada; pid uuid;
BEGIN
 IF TG_OP = 'DELETE' THEN SELECT * INTO r FROM public.grupo_rodada WHERE id = OLD.rodada_id FOR UPDATE;
 ELSE SELECT * INTO r FROM public.grupo_rodada WHERE id = NEW.rodada_id FOR UPDATE; END IF;
 IF r.status = 'fechada' THEN RAISE EXCEPTION 'Reabra a rodada para corrigir os checks'; END IF;
 IF TG_OP = 'UPDATE' AND (NEW.rodada_id <> OLD.rodada_id OR NEW.participante_id <> OLD.participante_id) THEN RAISE EXCEPTION 'O check pertence a uma única rodada e participante'; END IF;
 IF TG_OP <> 'DELETE' THEN
  pid := NEW.participante_id;
  IF NOT EXISTS (SELECT 1 FROM public.grupo_participante p WHERE p.id = pid AND p.grupo_id = r.grupo_id AND p.ativo AND p.entrou_em <= r.data) THEN RAISE EXCEPTION 'Participante não elegível nesta rodada'; END IF;
  RETURN NEW;
 END IF;
 RETURN OLD;
END $$;
CREATE TRIGGER grupo_proteger_check BEFORE INSERT OR UPDATE OR DELETE ON public.grupo_check FOR EACH ROW EXECUTE FUNCTION public.grupo_proteger_check();
CREATE OR REPLACE FUNCTION public.grupo_fechar_rodada(p_rodada uuid, p_checks jsonb, p_sobras jsonb DEFAULT '[]'::jsonb) RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE r public.grupo_rodada; total integer;
BEGIN
 IF NOT public.is_staff() THEN RAISE EXCEPTION 'Acesso negado'; END IF;
 SELECT * INTO r FROM public.grupo_rodada WHERE id = p_rodada FOR UPDATE;
 IF r.id IS NULL THEN RAISE EXCEPTION 'Rodada não encontrada'; END IF;
 IF r.status <> 'aberta' THEN RAISE EXCEPTION 'Reabra a rodada para corrigir'; END IF;
 DELETE FROM public.grupo_check WHERE rodada_id = r.id;
 INSERT INTO public.grupo_check (rodada_id, participante_id, status, origem, nome_lido, emoji_lido, confianca)
 SELECT r.id, p.id, COALESCE(c.status, 'nao'), COALESCE(c.origem, 'manual'), c.nome_lido, c.emoji_lido, c.confianca
 FROM public.grupo_participante p
 LEFT JOIN jsonb_to_recordset(p_checks) AS c(participante_id uuid, status text, origem text, nome_lido text, emoji_lido text, confianca numeric) ON c.participante_id = p.id
 WHERE p.grupo_id = r.grupo_id AND p.ativo AND p.entrou_em <= r.data;
 GET DIAGNOSTICS total = ROW_COUNT;
 DELETE FROM public.grupo_leitura_nao_vinculada WHERE rodada_id = r.id;
 INSERT INTO public.grupo_leitura_nao_vinculada (rodada_id, nome_lido, emoji_lido)
 SELECT r.id, c.nome, NULLIF(c.emoji, '') FROM jsonb_to_recordset(p_sobras) AS c(nome text, emoji text);
 UPDATE public.grupo_rodada SET status = 'fechada' WHERE id = r.id;
 RETURN total;
END $$;
REVOKE ALL ON FUNCTION public.grupo_fechar_rodada(uuid, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grupo_fechar_rodada(uuid, jsonb, jsonb) TO authenticated, service_role;