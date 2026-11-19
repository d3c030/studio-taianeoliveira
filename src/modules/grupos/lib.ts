// Regras do Check de Grupos: leitura da lista do Notas, cruzamento dos prints e exportação.
export type Participante = {
  id: string; grupo_id: string; username: string; nome_exibicao: string | null;
  emoji_habitual: string | null; apelidos: string[]; ativo: boolean; novata: boolean; entrou_em: string;
  lista?: number | null;
};
export type Leitura = { nome: string; emoji: string; cortado: boolean };
export type Match = { leitura: Leitura; participante: Participante | null; confianca: number; porEmoji?: boolean };
export type ItemLista = { username: string; emoji: string; lista: number | null };

export const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const;
export const DIA_LABEL: Record<string, string> = { dom: "Dom", seg: "Seg", ter: "Ter", qua: "Qua", qui: "Qui", sex: "Sex", sab: "Sáb" };
export const diaSemana = (iso: string) => DIAS[new Date(iso + "T12:00:00Z").getUTCDay()];
export function hojeSaoPaulo(instante = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-US", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(instante);
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? "";
  return `${valor("year")}-${valor("month")}-${valor("day")}`;
}
export function cadastroEntrada(novata = false, instante = new Date()) {
  return { novata, entrou_em: novata ? hojeSaoPaulo(instante) : "2000-01-01" };
}

export const norm = (s: string) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/(\.\.\.|…)\s*$/, "").replace(/[^a-z0-9]/g, "");
export const normUser = (s: string) => s.trim().replace(/^@/, "").toLowerCase();
export const urlPerfilInstagram = (username: string) => `https://www.instagram.com/${encodeURIComponent(normUser(username))}/`;
/** Normaliza emoji: tira variation selectors e tom de pele, mantém o ZWJ (❤️‍🩹 ≠ ❤️). */
export const normEmoji = (e?: string | null) => (e || "").replace(/[\uFE0E\uFE0F]/g, "").replace(/\p{Emoji_Modifier}/gu, "").replace(/\s+/g, "");

/** Extrai {username, emoji, lista} do texto colado (lista de emojis ou formato antigo do Notas). */
export function parseLista(texto: string): ItemLista[] {
  const out: ItemLista[] = [];
  const atualizacao = /Lista de atualização da semana/i.test(texto);
  let lista: number | null = null;
  for (const linha of texto.split(/\r?\n/)) {
    if (/^\s*SEM LISTA\s*$/i.test(linha)) { lista = null; continue; }
    const h = linha.match(/^\s*LISTA\s*(\d+)/i);
    if (h) { lista = Number(h[1]); continue; }
    const antigo = atualizacao && /^\s*\d+\.\s*@/.test(linha);
    for (const m of linha.matchAll(/@([A-Za-z0-9._]+)([^@]*)/g)) {
      const username = m[1].replace(/\.+$/, "").toLowerCase();
      if (!username || out.some((x) => x.username === username)) continue;
      let emoji = m[2].replace(/\s+/g, "");
      if (antigo) emoji = emoji.replace(/[✅❌✔✖]|🆕/gu, "");
      out.push({ username, emoji, lista });
    }
  }
  return out;
}

/** Uma única ordem para tabelas e textos: ignora pontuação inicial e compara números. */
export const ordenarUsernames = (a: string, b: string) =>
  a.replace(/^[_.]+/, "").localeCompare(b.replace(/^[_.]+/, ""), "pt-BR", { sensitivity: "base", numeric: true });

export function listasEmojis(parts: Participante[]) {
  const ativas = parts.filter((p) => p.ativo);
  const numeros = [...new Set(ativas.flatMap((p) => p.lista == null ? [] : [p.lista]))].sort((a, b) => a - b);
  const listas: (number | null)[] = [...numeros, ...(ativas.some((p) => p.lista == null) ? [null] : [])];
  return listas.map((lista) => ({ lista, participantes: ativas.filter((p) => (p.lista ?? null) === lista).sort((a, b) => ordenarUsernames(a.username, b.username)) }));
}

export function textoEmojis(parts: Participante[]) {
  return listasEmojis(parts).map(({ lista, participantes }) => [
    lista == null ? "SEM LISTA" : `LISTA ${lista} - de emojis escolhidos para fixar nos pedidos.`,
    "", ...participantes.map((p, i) => `${i + 1}. @${p.username}${p.emoji_habitual ? ` ${p.emoji_habitual}` : ""}`),
  ].join("\n")).join("\n\n");
}

export function parseCadastroManual(texto: string): ItemLista | null {
  const token = texto.trim().split(/\s+/)[0]?.replace(/^@/, "").toLowerCase();
  if (!token || !/^[a-z0-9._]+$/.test(token)) return null;
  const itens = parseLista(texto.trim().startsWith("@") ? texto : `@${texto.trim()}`);
  return itens.length === 1 ? itens[0] : null;
}

/** Ids das participantes ativas que compartilham o mesmo emoji (normalizado). */
export function emojisDuplicados(parts: Participante[]): Map<string, string[]> {
  const g = new Map<string, string[]>();
  for (const p of parts) {
    if (!p.ativo) continue;
    const e = normEmoji(p.emoji_habitual); if (!e) continue;
    g.set(e, [...(g.get(e) ?? []), p.id]);
  }
  return new Map([...g].filter(([, ids]) => ids.length > 1));
}

export function similaridade(a: string, b: string) {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const d: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = d[0]; d[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = d[j];
      d[j] = Math.min(d[j] + 1, d[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return 1 - d[b.length] / Math.max(a.length, b.length);
}

/** Pontua uma leitura contra uma participante. O emoji nunca identifica sozinho. */
export function pontuar(l: Leitura, p: Participante): number {
  const n = norm(l.nome);
  if (!n) return 0;
  const cortado = l.cortado || /(\.\.\.|…)\s*$/.test(l.nome);
  const user = norm(p.username);
  const nomes = [p.nome_exibicao, ...(p.apelidos || [])].filter(Boolean).map((x) => norm(x!));
  let s = 0;
  if (n === user) s = 1;
  else if (nomes.includes(n)) s = 0.95;
  else if (cortado && n.length >= 3 && [user, ...nomes].some((c) => c.startsWith(n))) s = 0.85;
  else {
    const sim = Math.max(...[user, ...nomes].map((c) => similaridade(n, c)));
    if (sim >= 0.8) s = 0.6 + (sim - 0.8) * 1.25; // 0.6 a 0.85
  }
  if (s > 0 && l.emoji && normEmoji(l.emoji) === normEmoji(p.emoji_habitual)) s = Math.min(1, s + 0.1);
  return Math.round(s * 1000) / 1000;
}

/** Cruza todas as leituras com as participantes; cada participante só é usada uma vez. */
export function cruzar(leituras: Leitura[], parts: Participante[]): Match[] {
  const pares: { li: number; p: Participante; s: number; emo: boolean }[] = [];
  leituras.forEach((l, li) => parts.forEach((p) => {
    const s = pontuar(l, p);
    if (s > 0) pares.push({ li, p, s, emo: !!l.emoji && normEmoji(l.emoji) === normEmoji(p.emoji_habitual) });
  }));
  pares.sort((a, b) => b.s - a.s || Number(b.emo) - Number(a.emo));
  const usadoL = new Set<number>(), usadoP = new Set<string>();
  const res: Match[] = leituras.map((l) => ({ leitura: l, participante: null, confianca: 0 }));
  for (const x of pares) {
    if (usadoL.has(x.li) || usadoP.has(x.p.id)) continue;
    usadoL.add(x.li); usadoP.add(x.p.id);
    res[x.li] = { leitura: leituras[x.li], participante: x.p, confianca: x.s };
  }
  // Sem casamento por nome: sugere pelo emoji só se ele for de UMA participante ativa
  res.forEach((r, i) => {
    if (r.participante) return;
    const e = normEmoji(r.leitura.emoji); if (!e) return;
    const donas = parts.filter((p) => p.ativo && normEmoji(p.emoji_habitual) === e);
    if (donas.length !== 1 || usadoP.has(donas[0].id)) return;
    usadoP.add(donas[0].id);
    res[i] = { leitura: r.leitura, participante: donas[0], confianca: 0.75, porEmoji: true };
  });
  return res;
}

export const faixa = (c: number, temP: boolean) => (!temP || c < 0.6 ? "nao" : c >= 0.85 ? "ok" : "conferir");

export function dedupe(ls: Leitura[]): Leitura[] {
  const seen = new Set<string>();
  return ls.filter((l) => {
    const k = norm(l.nome) + "|" + normEmoji(l.emoji);
    if (!norm(l.nome) || seen.has(k)) return false;
    seen.add(k); return true;
  });
}

/** Segunda-feira da semana da data (ISO). */
export function inicioSemana(iso: string) {
  const d = new Date(iso + "T12:00:00Z");
  const off = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - off);
  return d.toISOString().slice(0, 10);
}
export function addDias(iso: string, n: number) {
  const d = new Date(iso + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}

export type RodadaSemana = { id: string; data: string; dia_semana: string; status: "aberta" | "fechada" };
export type CheckSemana = { rodada_id: string; participante_id: string; status: "ok" | "nao"; ajustado_em?: string | null; status_original?: "ok" | "nao" | null; obs?: string | null };
export function descricaoAjuste(check?: CheckSemana) {
  if (!check?.ajustado_em) return null;
  const data = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }).format(new Date(check.ajustado_em));
  return `Ajustado em ${data}${check.obs ? ` · ${check.obs}` : ""}${check.status_original ? ` · antes ${check.status_original === "ok" ? "✅" : "❌"}` : ""}`;
}
export const diasConferencia = (semana: string, dias: string[]) =>
  Array.from({ length: 7 }, (_, i) => addDias(inicioSemana(semana), i)).filter((d) => dias.includes(diaSemana(d)));
/** Sem dia passado nesta semana, não seleciona/cria uma rodada futura. */
export function diaPadrao(semana: string, dias: string[], hoje: string): string | null {
  return diasConferencia(semana, dias).filter((d) => d <= hoje).at(-1) ?? null;
}
export const podeCriarRodada = (data: string, dias: string[], hoje: string) => data <= hoje && dias.includes(diaSemana(data));
export const participantesDaRodada = (parts: Participante[], data: string) => parts.filter((p) => p.ativo && p.entrou_em <= data);
export function resumoSemana(semana: string, dias: string[], rodadas: RodadaSemana[], checks: CheckSemana[]) {
  const datas = new Set(diasConferencia(semana, dias));
  const fechadas = rodadas.filter((r) => datas.has(r.data) && r.status === "fechada").sort((a, b) => a.data.localeCompare(b.data));
  const ultima = fechadas.at(-1) ?? null;
  return {
    ultima,
    fechadas,
    fechados: new Set(fechadas.map((r) => r.dia_semana)),
    status: new Map(checks.filter((c) => c.rodada_id === ultima?.id).map((c) => [c.participante_id, c.status])),
  };
}
export function conferenciasPendentes(hoje: string, dias: string[], rodadas: RodadaSemana[], criadoEm: string) {
  const semana = inicioSemana(hoje);
  return [...diasConferencia(addDias(semana, -7), dias), ...diasConferencia(semana, dias)]
    .filter((d) => d < hoje && d >= hojeSaoPaulo(new Date(criadoEm)) && !rodadas.some((r) => r.data === d && r.status === "fechada"));
}

/** Exporta cada dia fechado com o status salvo atual, sem inventar checks ausentes. */
export function textoSemana(opts: {
  dias: string[]; rodadas: RodadaSemana[]; checks: CheckSemana[]; participantes: Participante[];
}) {
  const dias = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"].filter((d) => opts.dias.includes(d));
  const porDia = new Map(opts.rodadas.filter((r) => r.status === "fechada" && dias.includes(r.dia_semana)).map((r) => [r.dia_semana, r]));
  const status = new Map(opts.checks.map((c) => [`${c.rodada_id}|${c.participante_id}`, c.status]));
  const cab = dias.map((d) => `${DIA_LABEL[d]}${porDia.has(d) ? "✅" : "❌"}`).join("|");
  const lista = opts.participantes.filter((p) => p.ativo).sort((a, b) => ordenarUsernames(a.username, b.username))
    .map((p, i) => {
      const marcas = dias.flatMap((d) => {
        const r = porDia.get(d);
        if (!r || p.entrou_em > r.data) return [];
        const st = status.get(`${r.id}|${p.id}`);
        return st ? [`${DIA_LABEL[d]}${st === "ok" ? "✅" : "❌"}`] : [];
      });
      const sufixo = marcas.length ? marcas.join(" ") : p.novata ? "🆕" : "";
      return `${i + 1}. @${p.username}${sufixo ? ` ${sufixo}` : ""}`;
    });
  return ["Lista de atualização da semana", `(${cab})`, "✅=Atualizou os pedidos do dia", "❌=Não atualizou os pedidos do dia", "🆕=Novatas(não estava no grupo)", "", ...lista].join("\n");
}

/** Faltas por participante em rodadas FECHADAS. Sem check = ❌; status ajustado vale. Inativas e não elegíveis ficam fora. */
export type FaltaDia = { rodada: RodadaSemana; fez: boolean | null };
export type NaoFez = { participante: Participante; dias: FaltaDia[]; faltas: RodadaSemana[] };
export function naoFizeram(opts: { participantes: Participante[]; rodadas: RodadaSemana[]; checks: CheckSemana[]; lista?: number | null }): NaoFez[] {
  const fechadas = opts.rodadas.filter((r) => r.status === "fechada").sort((a, b) => a.data.localeCompare(b.data));
  const st = new Map(opts.checks.map((c) => [`${c.rodada_id}|${c.participante_id}`, c.status]));
  return opts.participantes
    .filter((p) => p.ativo && (opts.lista == null || p.lista === opts.lista))
    .map((p) => {
      const dias = fechadas.map((r) => ({ rodada: r, fez: p.entrou_em > r.data ? null : st.get(`${r.id}|${p.id}`) === "ok" }));
      return { participante: p, dias, faltas: dias.filter((d) => d.fez === false).map((d) => d.rodada) };
    })
    .filter((x) => x.faltas.length > 0)
    .sort((a, b) => b.faltas.length - a.faltas.length || ordenarUsernames(a.participante.username, b.participante.username));
}
const ddmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
export function textoNaoFizeram(itens: NaoFez[], modo: { dia: RodadaSemana } | { semana: string }) {
  const ord = [...itens].sort((a, b) => ordenarUsernames(a.participante.username, b.participante.username));
  if ("dia" in modo) {
    return [`Não atualizaram – ${DIA_LABEL[modo.dia.dia_semana] ?? modo.dia.dia_semana} ${ddmm(modo.dia.data)}`, ...ord.map((x, i) => `${i + 1}. @${normUser(x.participante.username)}`)].join("\n");
  }
  const ini = inicioSemana(modo.semana);
  return [`Não atualizaram – semana de ${ddmm(ini)} a ${ddmm(addDias(ini, 6))}`,
    ...ord.map((x, i) => `${i + 1}. @${normUser(x.participante.username)} (${x.faltas.map((r) => DIA_LABEL[r.dia_semana] ?? r.dia_semana).join(", ")})`)].join("\n");
}
