// Regras do Check de Grupos: leitura da lista do Notas, cruzamento dos prints e exportação.
export type Participante = {
  id: string; grupo_id: string; username: string; nome_exibicao: string | null;
  emoji_habitual: string | null; apelidos: string[]; ativo: boolean; novata: boolean; entrou_em: string;
};
export type Leitura = { nome: string; emoji: string; cortado: boolean };
export type Match = { leitura: Leitura; participante: Participante | null; confianca: number };

export const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const;
export const DIA_LABEL: Record<string, string> = { dom: "Dom", seg: "Seg", ter: "Ter", qua: "Qua", qui: "Qui", sex: "Sex", sab: "Sáb" };
export const diaSemana = (iso: string) => DIAS[new Date(iso + "T12:00:00").getDay()];

export const norm = (s: string) =>
  (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/(\.\.\.|…)\s*$/, "").replace(/[^a-z0-9]/g, "");
export const normUser = (s: string) => s.trim().replace(/^@/, "").toLowerCase();
const normEmoji = (e?: string | null) => (e || "").replace(/[\uFE0E\uFE0F\u200D]/g, "").replace(/\p{Emoji_Modifier}/gu, "").trim();

/** Extrai os @usernames do texto colado do Notas (ignora numeração, emojis e cabeçalho). */
export function parseLista(texto: string): string[] {
  const out: string[] = [];
  for (const m of texto.matchAll(/@([A-Za-z0-9._]+)/g)) {
    const u = m[1].replace(/\.+$/, "").toLowerCase();
    if (u && !out.includes(u)) out.push(u);
  }
  return out;
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
  const d = new Date(iso + "T12:00:00");
  const off = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - off);
  return d.toISOString().slice(0, 10);
}
export function addDias(iso: string, n: number) {
  const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10);
}

/** Gera o texto no mesmo formato da lista do Notas. */
export function textoSemana(opts: {
  dias: string[]; fechados: Set<string>; participantes: Participante[];
  status: Map<string, "ok" | "nao">;
}) {
  const cab = opts.dias.map((d) => `${DIA_LABEL[d] ?? d}${opts.fechados.has(d) ? "✅" : "❌"}`).join("|");
  const lista = opts.participantes.filter((p) => p.ativo).sort((a, b) => a.username.localeCompare(b.username))
    .map((p, i) => {
      const st = opts.status.get(p.id);
      const e = st === "ok" ? "✅" : st === "nao" ? "❌" : p.novata ? "🆕" : "❌";
      return `${i + 1}. @${p.username} ${e}`;
    });
  return ["Lista de atualização da semana", `(${cab})`, "✅=Atualizou os pedidos do dia", "❌=Não atualizou os pedidos do dia", "🆕=Novatas(não estava no grupo)", "", ...lista].join("\n");
}
