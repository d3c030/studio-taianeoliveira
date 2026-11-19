// @ts-ignore bun test runner
import { describe, expect, test } from "bun:test";
import { urlPerfilInstagram, cadastroEntrada, hojeSaoPaulo, cruzar, emojisDuplicados, parseLista, parseCadastroManual, ordenarUsernames, textoEmojis, pontuar, textoSemana, diaPadrao, podeCriarRodada, participantesDaRodada, resumoSemana, conferenciasPendentes, type Participante } from "./lib";

const P = (o: Partial<Participante>): Participante => ({ id: o.username ?? "x", grupo_id: "g", nome_exibicao: null, emoji_habitual: null, apelidos: [], ativo: true, novata: false, entrou_em: "2026-01-01", username: "x", ...o });

describe("check de grupos", () => {
  test("URL de perfil normaliza minúsculas e codifica o username", () => {
    expect(urlPerfilInstagram(" @Mari.Celia_2 ")).toBe("https://www.instagram.com/mari.celia_2/");
    expect(urlPerfilInstagram("A/B?C#D")).toBe("https://www.instagram.com/a%2Fb%3Fc%23d/");
  });
  test("hoje mantém 16/11 após 21h de São Paulo, mesmo com UTC em 17/11", () => {
    expect(hojeSaoPaulo(new Date("2026-11-17T01:10:00Z"))).toBe("2026-11-16");
    expect(hojeSaoPaulo(new Date("2026-11-17T03:00:00Z"))).toBe("2026-11-17");
  });
  test("importação e cadastro manual são veteranas por padrão", () => {
    expect(cadastroEntrada()).toEqual({ novata: false, entrou_em: "2000-01-01" });
    expect(participantesDaRodada([P({ ...cadastroEntrada() })], "2026-11-16")).toHaveLength(1);
  });
  test("novata usa hoje em São Paulo e não a data da rodada antiga", () => {
    expect(cadastroEntrada(true, new Date("2026-11-17T01:10:00Z"))).toEqual({ novata: true, entrou_em: "2026-11-16" });
  });
  test("voltar a veterana restaura elegibilidade histórica", () => {
    expect(cadastroEntrada(false, new Date("2026-11-17T01:10:00Z"))).toEqual({ novata: false, entrou_em: "2000-01-01" });
  });
  const dias = ["seg", "qua", "sex"];
  test("exportação usa status ajustado sem indicador nem status original", () => {
    const linha = textoSemana({ dias, rodadas: [{ id: "s", data: "2026-11-16", dia_semana: "seg", status: "fechada" }], checks: [{ rodada_id: "s", participante_id: "ana", status: "ok", status_original: "nao", ajustado_em: "2026-11-20T15:00:00Z", obs: "Atualizou depois" }], participantes: [P({ username: "ana" })] }).split("\n").at(-1);
    expect(linha).toBe("1. @ana ✅");
  });
  test("dia padrão quando hoje é dia de missão", () => {
    expect(diaPadrao("2026-11-16", dias, "2026-11-18")).toBe("2026-11-18");
  });
  test("dia padrão quando hoje não é dia de missão", () => {
    expect(diaPadrao("2026-11-16", dias, "2026-11-17")).toBe("2026-11-16");
  });
  test("semana sem conferência passada não seleciona o futuro", () => {
    expect(diaPadrao("2026-11-23", dias, "2026-11-17")).toBeNull();
    expect(diaPadrao("2026-11-16", ["qua", "sex"], "2026-11-16")).toBeNull();
  });
  test("não permite criar rodada fora da missão", () => {
    expect(podeCriarRodada("2026-11-17", dias, "2026-11-17")).toBe(false);
  });
  test("não permite criar rodada futura", () => {
    expect(podeCriarRodada("2026-11-18", dias, "2026-11-17")).toBe(false);
    expect(podeCriarRodada("2026-11-16", dias, "2026-11-17")).toBe(true);
  });
  test("participante que entrou depois não faz parte da rodada", () => {
    expect(participantesDaRodada([P({ username: "antes", entrou_em: "2026-11-16" }), P({ username: "depois", entrou_em: "2026-11-17" })], "2026-11-16").map((p) => p.username)).toEqual(["antes"]);
  });
  const rodadas = [
    { id: "s", data: "2026-11-16", dia_semana: "seg", status: "fechada" as const },
    { id: "q", data: "2026-11-18", dia_semana: "qua", status: "fechada" as const },
    { id: "f", data: "2026-11-20", dia_semana: "sex", status: "aberta" as const },
  ];
  test("cabeçalho representa somente dias fechados", () => {
    const r = resumoSemana("2026-11-16", dias, rodadas, []);
    expect(textoSemana({ dias, rodadas: r.fechadas, checks: [], participantes: [] })).toContain("(Seg✅|Qua✅|Sex❌)");
  });
  test("marcas de Seg e Qua fechadas, não da Sex aberta nem de outra semana", () => {
    const checks = [
      { rodada_id: "s", participante_id: "ana", status: "ok" as const },
      { rodada_id: "q", participante_id: "ana", status: "nao" as const },
      { rodada_id: "f", participante_id: "ana", status: "ok" as const },
    ];
    const r = resumoSemana("2026-11-16", dias, [...rodadas, { id: "outra", data: "2026-11-23", dia_semana: "seg", status: "fechada" }], checks);
    expect(r.ultima?.id).toBe("q");
    expect(textoSemana({ dias: ["sex", "qua", "seg"], rodadas: r.fechadas, checks, participantes: [P({ username: "ana" })] })).toContain("1. @ana ✅❌");
  });
  test("sem rodada fechada veterana fica sem marca e novata é 🆕", () => {
    const r = resumoSemana("2026-11-16", dias, [rodadas[2]], [{ rodada_id: "f", participante_id: "ana", status: "ok" }]);
    expect(r.ultima).toBeNull();
    expect(textoSemana({ dias, rodadas: r.fechadas, checks: [{ rodada_id: "f", participante_id: "ana", status: "ok" }], participantes: [P({ username: "ana" }), P({ username: "bia", novata: true })] })).toContain("1. @ana\n2. @bia 🆕");
  });
  test("preserva posições sem elegibilidade ou check; novata sem marcas recebe 🆕", () => {
    const participantes = [P({ username: "nova", novata: true, entrou_em: "2026-11-19" }), P({ username: "antes", novata: true, entrou_em: "2026-11-17" }), P({ username: "semcheck" })];
    const texto = textoSemana({ dias, rodadas, participantes, checks: [
      { rodada_id: "s", participante_id: "antes", status: "ok" },
      { rodada_id: "q", participante_id: "antes", status: "nao" },
      { rodada_id: "q", participante_id: "nova", status: "ok" },
    ] });
    expect(texto.split("\n").slice(6)).toEqual(["1. @antes ➖❌", "2. @nova 🆕", "3. @semcheck ➖➖"]);
  });
  test("sexta só aparece nas marcas depois do fechamento e mantém filtro de participantes", () => {
    const ps = [P({ username: "l2", lista: 2 }), P({ username: "l1", lista: 1 })];
    const texto = textoSemana({ dias, rodadas: rodadas.map((r) => ({ ...r, status: "fechada" })), participantes: ps.filter((p) => p.lista === 2), checks: [
      { rodada_id: "s", participante_id: "l2", status: "ok" },
      { rodada_id: "q", participante_id: "l2", status: "nao" },
      { rodada_id: "f", participante_id: "l2", status: "ok" },
    ] });
    expect(texto.split("\n").slice(6)).toEqual(["1. @l2 ✅❌✅"]);
  });
  test("check ausente na quarta mantém sua posição entre segunda e sexta", () => {
    const texto = textoSemana({ dias: ["sex", "seg", "qua"], rodadas: rodadas.map((r) => ({ ...r, status: "fechada" })), participantes: [P({ username: "ana" })], checks: [
      { rodada_id: "s", participante_id: "ana", status: "ok" },
      { rodada_id: "f", participante_id: "ana", status: "nao" },
    ] });
    expect(texto.split("\n").at(-1)).toBe("1. @ana ✅➖❌");
  });
  test("pendências incluem só dias passados nas duas semanas, sem fechadas", () => {
    expect(conferenciasPendentes("2026-11-19", dias, rodadas, "2026-11-11")).toEqual(["2026-11-11", "2026-11-13"]);
  });
  test("formato antigo do Notas: ✅❌🆕 não viram emoji", () => {
    expect(parseLista("Lista de atualização da semana\n(Seg✅|Qua❌|Sex❌)\n✅=Atualizou\n1. @Adri.anacostaalves ❌\n2. @alinesaionery 🆕\n")).toEqual([
      { username: "adri.anacostaalves", emoji: "", lista: null }, { username: "alinesaionery", emoji: "", lista: null }]);
  });
  test("lista de emojis: 2 por linha, ZWJ, cabeçalho LISTA N e @ repetido", () => {
    const r = parseLista("LISTA 1 - de emojis escolhidos\n\n@claudia4343_silva ♋️\n@izabellycristina19 ❤️‍🩹\n@adv.larissagregorio   💕 @dannybene  💞\nLISTA 2 - outra\n@Kamylli_Sales 🍓\n@zen 🧘🏻‍♀️ @fenix 🐦‍🔥\n@dannybene 😮");
    expect(r).toEqual([
      { username: "claudia4343_silva", emoji: "♋️", lista: 1 },
      { username: "izabellycristina19", emoji: "❤️‍🩹", lista: 1 },
      { username: "adv.larissagregorio", emoji: "💕", lista: 1 },
      { username: "dannybene", emoji: "💞", lista: 1 },
      { username: "kamylli_sales", emoji: "🍓", lista: 2 },
      { username: "zen", emoji: "🧘🏻‍♀️", lista: 2 },
      { username: "fenix", emoji: "🐦‍🔥", lista: 2 },
    ]);
  });
  test("✅ escolhido como emoji é mantido fora do formato numerado", () => {
    expect(parseLista("@gaabydelenaa25 ✅\n@professora_kammylla ✅")).toEqual([
      { username: "gaabydelenaa25", emoji: "✅", lista: null }, { username: "professora_kammylla", emoji: "✅", lista: null }]);
  });
  test("formato antigo numerado: ✅ é status, emoji vazio", () => {
    expect(parseLista("Lista de atualização da semana\n1. @fulana ✅")).toEqual([{ username: "fulana", emoji: "", lista: null }]);
  });
  test("numeração sem cabeçalho de atualização preserva ✅❌🆕", () => {
    expect(parseLista("1. @fulana ✅\n2. @sicrana ❌\n3. @novata 🆕").map((p) => p.emoji)).toEqual(["✅", "❌", "🆕"]);
  });
  test("ordena usernames ignorando pontos e sublinhados iniciais com números naturais", () => {
    expect(["_ericarodrigss", "adri.anacostaalves", "thaynara2_8", "thaynara10", "Zeca", "_mavii.estelar"].sort(ordenarUsernames)).toEqual(["adri.anacostaalves", "_ericarodrigss", "_mavii.estelar", "thaynara2_8", "thaynara10", "Zeca"]);
    expect([".._erica", "adri"].sort(ordenarUsernames)).toEqual(["adri", ".._erica"]);
  });
  test("exportar emojis e ler novamente mantém username, emoji e lista inclusive ✅", () => {
    const parts = [P({ username: "sicrana", emoji_habitual: "👄", lista: 1 }), P({ username: "fulana", emoji_habitual: "💅🏽", lista: 1 }), P({ username: "gaabydelenaa25", emoji_habitual: "✅", lista: 2 }), P({ username: "professora_kammylla", emoji_habitual: "✅", lista: 3 }), P({ username: "sem_lista", emoji_habitual: "🙆🏻‍♀️", lista: null }), P({ username: "inativa", ativo: false, lista: 1 })];
    expect(parseLista(textoEmojis(parts))).toEqual([
      { username: "fulana", emoji: "💅🏽", lista: 1 }, { username: "sicrana", emoji: "👄", lista: 1 },
      { username: "gaabydelenaa25", emoji: "✅", lista: 2 }, { username: "professora_kammylla", emoji: "✅", lista: 3 },
      { username: "sem_lista", emoji: "🙆🏻‍♀️", lista: null },
    ]);
  });
  test("exportações numeram sem pular e usam a mesma ordem", () => {
    const parts = [P({ username: "thaynara10", lista: 1 }), P({ username: "_ericarodrigss", lista: 1 }), P({ username: "adri.anacostaalves", lista: 1 }), P({ username: "inativa", ativo: false, lista: 1 })];
    const esperado = ["1. @adri.anacostaalves", "2. @_ericarodrigss", "3. @thaynara10"];
    expect(textoEmojis(parts).split("\n").filter((l) => /^\d+\./.test(l))).toEqual(esperado);
    expect(textoSemana({ dias: ["seg"], rodadas: [], participantes: parts, checks: [] }).split("\n").filter((l) => /^\d+\./.test(l))).toEqual(esperado);
  });
  test("cadastro manual separa username e emoji composto", () => {
    expect(parseCadastroManual("@mariicelia_santos 🙆🏻‍♀️")).toEqual({ username: "mariicelia_santos", emoji: "🙆🏻‍♀️", lista: null });
    expect(parseCadastroManual("  Mari.Celia_2 ✅ ")).toEqual({ username: "mari.celia_2", emoji: "✅", lista: null });
  });
  test("cadastro manual rejeita caracteres fora de a-z0-9._ e várias participantes", () => {
    for (const texto of ["@maria-silva", "@mária", "@maria/", "@maria @outra", "", "@maria🙆🏻‍♀️"]) expect(parseCadastroManual(texto)).toBeNull();
  });
  test("sugestão por emoji único = 0.75", () => {
    const m = cruzar([{ nome: "Fulana Qualquer", emoji: "🍓", cortado: false }], [P({ username: "kamylli", emoji_habitual: "🍓" }), P({ username: "outra", emoji_habitual: "💕" })]);
    expect(m[0].participante?.username).toBe("kamylli"); expect(m[0].confianca).toBe(0.75); expect(m[0].porEmoji).toBe(true);
  });
  test("sem sugestão com emoji duplicado (tom de pele não diferencia)", () => {
    const parts = [P({ username: "a", emoji_habitual: "👍🏼" }), P({ username: "b", emoji_habitual: "👍🏻" })];
    expect(cruzar([{ nome: "Fulana", emoji: "👍", cortado: false }], parts)[0].participante).toBeNull();
    expect(emojisDuplicados(parts).size).toBe(1);
  });
  test("❤️ é diferente de ❤️‍🩹", () => {
    const m = cruzar([{ nome: "Fulana", emoji: "❤️", cortado: false }], [P({ username: "iza", emoji_habitual: "❤️‍🩹" })]);
    expect(m[0].participante).toBeNull();
  });
  test("username exato = 1.0", () => expect(pontuar({ nome: "@alinesaionery", emoji: "", cortado: false }, P({ username: "alinesaionery" }))).toBe(1));
  test("apelido = 0.95", () => expect(pontuar({ nome: "Edna Kardashians", emoji: "", cortado: false }, P({ username: "edna1", apelidos: ["Edna Kardashians"] }))).toBe(0.95));
  test("cortado como prefixo = 0.85", () => expect(pontuar({ nome: "Vanessa Baggett | vida...", emoji: "", cortado: true }, P({ username: "vb", nome_exibicao: "Vanessa Baggett | vida real e maternidade" }))).toBe(0.85));
  test("emoji sozinho não pontua por nome", () => expect(pontuar({ nome: "Fulana", emoji: "🌸", cortado: false }, P({ username: "outra", emoji_habitual: "🌸" }))).toBe(0));
  test("emoji igual soma 0.1", () => expect(pontuar({ nome: "Edna Kardashians", emoji: "🌸", cortado: false }, P({ username: "e", apelidos: ["Edna Kardashians"], emoji_habitual: "🌸" }))).toBe(1));
  test("emoji desempata", () => {
    const m = cruzar([{ nome: "Ana...", emoji: "💖", cortado: true }], [P({ username: "anabela" }), P({ username: "anacarla", emoji_habitual: "💖" })]);
    expect(m[0].participante?.username).toBe("anacarla");
  });
  test("exportação em ordem alfabética com 🆕", () => {
    const a = P({ username: "bia" }), b = P({ username: "ana", novata: true });
    const t = textoSemana({ dias, rodadas, participantes: [a, b], checks: [{ rodada_id: "s", participante_id: "bia", status: "ok" }] });
    expect(t).toContain("(Seg✅|Qua✅|Sex❌)");
    expect(t).toContain("1. @ana 🆕\n2. @bia ✅➖");
  });
});

import { naoFizeram, textoNaoFizeram } from "./lib";
import { linhasAuditoria, carregarLeituras, faltantesLeitura, conflitoApelido, sugestaoUsername, participanteDuplicada } from "./lib";
import { gravarAuditoria, consultarAuditoria } from "./leituras-store";
describe("auditoria das leituras", () => {
  const itens = [{ nome: "larissa_moreira_oficial", emoji: "🍓", cortado: false }, { nome: "Ana...", emoji: "❤️", cortado: true }, { nome: "larissa_moreira_oficial", emoji: "🍓", cortado: false }];
  test("grava todas as linhas por print e carrega únicas em ordem", async () => {
    const rows = linhasAuditoria("r", 3, itens, 3, [P({ username: "larissa_moreira_oficial" })]);
    let armazenadas: typeof rows = [];
    await gravarAuditoria(rows, async (r) => { armazenadas = structuredClone(r); return { error: null }; });
    const carregadas = await consultarAuditoria(async () => ({ data: [...armazenadas].reverse() }));
    expect(carregadas.rows).toHaveLength(3);
    expect(armazenadas.map((r) => [r.print_idx, r.ordem])).toEqual([[3, 0], [3, 1], [3, 2]]);
    expect(armazenadas[0].participante_id).toBe("larissa_moreira_oficial");
    expect(carregadas.leituras).toEqual(itens.slice(0, 2));
    expect(carregarLeituras(armazenadas)).toEqual(itens.slice(0, 2));
  });
  test("falha de persistência e consulta não descarta erro", async () => {
    await expect(gravarAuditoria(linhasAuditoria("r", 1, itens, 3, []), async () => ({ error: { message: "negado" } }))).rejects.toThrow("negado");
    await expect(consultarAuditoria(async () => ({ error: { message: "offline" } }))).rejects.toThrow("offline");
  });
  test("alerta conta nomes únicos e faltantes sem confundir com total de participantes", () => {
    expect(faltantesLeitura(itens, 119)).toBe(117);
    expect(faltantesLeitura(itens, 2)).toBe(0);
    expect(faltantesLeitura(itens, null)).toBe(0);
    expect(faltantesLeitura([...itens, { ...itens[0], emoji: "👍" }], 119)).toBe(117);
  });
  test("bloqueia apelido que é username ou apelido de outra participante", () => {
    const parts = [P({ username: "edchristopfer" }), P({ username: "larissa_moreira_oficial", apelidos: ["ANA SIQUEIRA | UGC"] })];
    expect(conflitoApelido("larissa_moreira_oficial", "edchristopfer", parts)?.username).toBe("larissa_moreira_oficial");
    expect(conflitoApelido("Ana Siqueira UGC", "edchristopfer", parts)?.username).toBe("larissa_moreira_oficial");
    expect(conflitoApelido("edchristopfer", "edchristopfer", parts)).toBeUndefined();
  });
  test("username verdadeiro prevalece sobre apelido aprendido errado", () => {
    const parts = [P({ username: "edchristopfer", apelidos: ["larissa_moreira_oficial"] }), P({ username: "larissa_moreira_oficial" })];
    expect(cruzar([itens[0]], parts)[0].participante?.username).toBe("larissa_moreira_oficial");
  });
  test("não sugere pelo emoji genérico nem com variante de tom de pele", () => {
    for (const emoji of ["❤️", "♥️", "🩷", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "❤️‍🔥", "😍", "🥰", "👍", "👍🏽"]) {
      expect(cruzar([{ nome: "Pessoa desconhecida", emoji, cortado: false }], [P({ username: "xyz", emoji_habitual: emoji })])[0].participante).toBeNull();
    }
  });
  test("sugestão preserva ponto e sublinhado e não inventa username de nome", () => {
    expect(sugestaoUsername("larissa_moreira_oficial")).toBe("larissa_moreira_oficial");
    expect(sugestaoUsername(" @Laay.Fer_ ")).toBe("laay.fer_");
    expect(sugestaoUsername("ANA SIQUEIRA | UGC")).toBe("");
  });
  test("detecta duplicada normalizada inclusive inativa", () => {
    const parts = [P({ username: "larissa_moreira_oficial", ativo: false })];
    expect(participanteDuplicada("larissamoreiraoficial", parts)?.username).toBe("larissa_moreira_oficial");
    expect(participanteDuplicada("outra", parts)).toBeUndefined();
  });
});
describe("não fizeram", () => {
  const seg = { id: "rs", data: "2026-11-16", dia_semana: "seg", status: "fechada" as const };
  const qua = { id: "rq", data: "2026-11-18", dia_semana: "qua", status: "fechada" as const };
  const sex = { id: "rx", data: "2026-11-20", dia_semana: "sex", status: "aberta" as const };
  const parts = [P({ username: "bia" }), P({ username: "ana" }), P({ username: "caca" }), P({ username: "inativa", ativo: false }), P({ username: "nova", entrou_em: "2026-11-19" })];
  const checks = [
    { rodada_id: "rq", participante_id: "bia", status: "nao" as const },
    { rodada_id: "rq", participante_id: "ana", status: "ok" as const, ajustado_em: "2026-11-19T10:00:00Z", status_original: "nao" as const },
    { rodada_id: "rq", participante_id: "caca", status: "nao" as const },
    { rodada_id: "rs", participante_id: "bia", status: "ok" as const },
    { rodada_id: "rs", participante_id: "ana", status: "ok" as const },
  ];
  test("modo dia lista só ❌ da rodada, alfabético no texto", () => {
    const r = naoFizeram({ participantes: parts, rodadas: [qua], checks });
    expect(r.map((x) => x.participante.username).sort()).toEqual(["bia", "caca"]);
    expect(textoNaoFizeram(r, { dia: qua })).toBe("Não atualizaram – Qua 18/11\n1. @bia\n2. @caca");
  });
  test("status ajustado conta como ✅", () => {
    expect(naoFizeram({ participantes: parts, rodadas: [qua], checks }).some((x) => x.participante.username === "ana")).toBe(false);
  });
  test("inativas e não elegíveis ficam fora", () => {
    const nomes = naoFizeram({ participantes: parts, rodadas: [seg, qua], checks }).map((x) => x.participante.username);
    expect(nomes).not.toContain("inativa");
    expect(nomes).not.toContain("nova");
  });
  test("modo semana ordena por faltas, ignora rodada aberta e mostra os dias", () => {
    const r = naoFizeram({ participantes: parts, rodadas: [seg, qua, sex], checks });
    expect(r.map((x) => [x.participante.username, x.faltas.length])).toEqual([["caca", 2], ["bia", 1]]);
    expect(textoNaoFizeram(r, { semana: "2026-11-18" })).toBe("Não atualizaram – semana de 16/11 a 22/11\n1. @bia (Qua)\n2. @caca (Seg, Qua)");
  });
  test("filtro por lista", () => {
    const ps = [P({ username: "l1", lista: 1 }), P({ username: "l2", lista: 2 })];
    expect(naoFizeram({ participantes: ps, rodadas: [qua], checks: [], lista: 2 }).map((x) => x.participante.username)).toEqual(["l2"]);
  });
});
