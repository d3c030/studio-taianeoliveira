
BEGIN;
SELECT set_config('request.jwt.claim.sub', (SELECT user_id::text FROM public.user_roles WHERE role = 'staff' LIMIT 1), true);
INSERT INTO public.grupo_engaj(id,nome,dias_missao) VALUES ('10000000-0000-0000-0000-000000000001','Teste transacional ajustes',ARRAY['seg','ter','qua','qui','sex']);
INSERT INTO public.grupo_participante(id,grupo_id,username,entrou_em) VALUES
 ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','teste_ajuste','2000-01-01'),
 ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','teste_novata','2026-11-10');
INSERT INTO public.grupo_rodada(id,grupo_id,data,dia_semana,status) VALUES
 ('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','2026-11-02','seg','aberta'),
 ('30000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000001','2026-11-04','qua','aberta'),
 ('30000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','2026-11-06','sex','aberta'),
 ('30000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000001','2026-11-09','seg','aberta'),
 ('30000000-0000-0000-0000-000000000005','10000000-0000-0000-0000-000000000001','2026-11-05','qui','aberta');
INSERT INTO public.grupo_check(rodada_id,participante_id,status)
 SELECT id,'20000000-0000-0000-0000-000000000001',CASE WHEN data='2026-11-06' THEN 'ok' ELSE 'nao' END FROM public.grupo_rodada WHERE grupo_id='10000000-0000-0000-0000-000000000001';
UPDATE public.grupo_rodada SET status='fechada' WHERE grupo_id='10000000-0000-0000-0000-000000000001' AND data <> '2026-11-05';
SET LOCAL ROLE authenticated;

-- rodada fechada bloqueia escrita direta antes e depois da RPC

DO $$ BEGIN
 BEGIN UPDATE public.grupo_check SET status='ok' WHERE rodada_id='30000000-0000-0000-0000-000000000001'; RAISE EXCEPTION 'TEST: direct write allowed';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'Reabra a rodada para corrigir os checks' THEN RAISE; END IF; END;
 PERFORM public.grupo_ajustar_check('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','ok','Atualizou depois');
 IF NOT EXISTS(SELECT 1 FROM public.grupo_check WHERE rodada_id='30000000-0000-0000-0000-000000000001' AND status='ok' AND origem='ajuste' AND ajustado_em IS NOT NULL) THEN RAISE EXCEPTION 'TEST: RPC did not adjust'; END IF;
 BEGIN UPDATE public.grupo_check SET status='nao' WHERE rodada_id='30000000-0000-0000-0000-000000000001'; RAISE EXCEPTION 'TEST: authorization leaked';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'Reabra a rodada para corrigir os checks' THEN RAISE; END IF; END;
END $$;

-- status_original permanece nao depois de dois ajustes

DO $$ BEGIN
 PERFORM public.grupo_ajustar_check('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','ok','Primeiro');
 PERFORM public.grupo_ajustar_check('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','nao','Segundo');
 IF NOT EXISTS(SELECT 1 FROM public.grupo_check WHERE rodada_id='30000000-0000-0000-0000-000000000001' AND status_original='nao' AND status='nao' AND obs='Segundo' AND origem='ajuste') THEN RAISE EXCEPTION 'TEST: original changed'; END IF;
END $$;

-- regularizar semana muda somente os dois nao fechados da semana

DO $$ DECLARE total integer; BEGIN
 total := public.grupo_regularizar_semana('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','2026-11-06','Atualizou depois');
 IF total <> 2 THEN RAISE EXCEPTION 'TEST: wrong count %',total; END IF;
 IF (SELECT count(*) FROM public.grupo_check WHERE participante_id='20000000-0000-0000-0000-000000000001' AND origem='ajuste' AND status='ok') <> 2 THEN RAISE EXCEPTION 'TEST: wrong adjusted rows'; END IF;
 IF (SELECT count(*) FROM public.grupo_check WHERE participante_id='20000000-0000-0000-0000-000000000001' AND status='nao') <> 2 THEN RAISE EXCEPTION 'TEST: open or other week changed'; END IF;
 IF EXISTS(SELECT 1 FROM public.grupo_check WHERE rodada_id='30000000-0000-0000-0000-000000000003' AND ajustado_em IS NOT NULL) THEN RAISE EXCEPTION 'TEST: ok was adjusted'; END IF;
 IF public.grupo_regularizar_semana('10000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','2026-11-02','Again') <> 0 THEN RAISE EXCEPTION 'TEST: not idempotent'; END IF;
END $$;

-- RPC insere check elegível ausente e rejeita participante que entrou depois

RESET ROLE;
INSERT INTO public.grupo_participante(id,grupo_id,username,entrou_em) VALUES ('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000001','teste_ausente','2000-01-01');
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 PERFORM public.grupo_ajustar_check('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000003','ok','Inserido');
 IF NOT EXISTS(SELECT 1 FROM public.grupo_check WHERE participante_id='20000000-0000-0000-0000-000000000003' AND status='ok' AND status_original='nao') THEN RAISE EXCEPTION 'TEST: missing check not inserted'; END IF;
 BEGIN PERFORM public.grupo_ajustar_check('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002','ok','Ineligible'); RAISE EXCEPTION 'TEST: ineligible allowed';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'Participante não elegível nesta rodada' THEN RAISE; END IF; END;
END $$;

-- RPC recusa pessoa sem is_staff mesmo autenticada

SELECT set_config('request.jwt.claim.sub','90000000-0000-0000-0000-000000000001',true);
DO $$ BEGIN
 BEGIN PERFORM public.grupo_ajustar_check('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','ok','Denied'); RAISE EXCEPTION 'TEST: non-staff allowed';
 EXCEPTION WHEN OTHERS THEN IF SQLERRM <> 'Acesso negado' THEN RAISE; END IF; END;
END $$;

ROLLBACK;
