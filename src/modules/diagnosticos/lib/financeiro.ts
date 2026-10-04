import { supabase } from "@/integrations/supabase/client";
import { DEF } from "@/modules/site/lib/landing-defaults";

export type Cobranca = { id: string; diagnostico_id: string; descricao: string; valor: number; desconto: number; ordem: number };
export type Pagamento = { id: string; diagnostico_id: string; valor: number; forma: string | null; pago_em: string; obs: string | null };

export type Resumo = { bruto: number; desconto: number; total: number; pago: number; aberto: number };

export function resumo(cob: Pick<Cobranca, "valor" | "desconto">[], pag: Pick<Pagamento, "valor">[]): Resumo {
  const bruto = cob.reduce((s, c) => s + Number(c.valor || 0), 0);
  const desconto = cob.reduce((s, c) => s + Number(c.desconto || 0), 0);
  const total = Math.max(0, bruto - desconto);
  const pago = pag.reduce((s, p) => s + Number(p.valor || 0), 0);
  return { bruto, desconto, total, pago, aberto: Math.max(0, total - pago) };
}

export async function loadFinanceiro(diagId: string) {
  const [c, p] = await Promise.all([
    supabase.from("diag_cobrancas").select("*").eq("diagnostico_id", diagId).order("ordem").order("criado_em"),
    supabase.from("diag_pagamentos").select("*").eq("diagnostico_id", diagId).order("pago_em"),
  ]);
  if (c.error) throw c.error;
  if (p.error) throw p.error;
  return { cobrancas: (c.data ?? []) as Cobranca[], pagamentos: (p.data ?? []) as Pagamento[] };
}

export const addCobranca = async (diagId: string, descricao: string, valor: number, ordem: number) => {
  const { error } = await supabase.from("diag_cobrancas").insert({ diagnostico_id: diagId, descricao, valor, ordem });
  if (error) throw error;
};
export const updateCobranca = async (id: string, patch: Partial<Pick<Cobranca, "descricao" | "valor" | "desconto">>) => {
  const { error } = await supabase.from("diag_cobrancas").update(patch).eq("id", id);
  if (error) throw error;
};
export const deleteCobranca = async (id: string) => {
  const { error } = await supabase.from("diag_cobrancas").delete().eq("id", id);
  if (error) throw error;
};
export const addPagamento = async (diagId: string, valor: number, forma: string, pago_em: string) => {
  const { error } = await supabase.from("diag_pagamentos").insert({ diagnostico_id: diagId, valor, forma, pago_em });
  if (error) throw error;
};
export const deletePagamento = async (id: string) => {
  const { error } = await supabase.from("diag_pagamentos").delete().eq("id", id);
  if (error) throw error;
};

/** Converte "a partir de R$ 1.200,50" em 1200.5 (0 se não houver número). */
export function parsePreco(s: string): number {
  const m = (s ?? "").match(/(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?/);
  if (!m) return 0;
  return Number(m[1].replace(/\./g, "") + (m[2] ? "." + m[2] : ""));
}

/** Planos/serviços publicados no site (com preço), para lançar com um toque. */
export async function loadPlanos(): Promise<{ nome: string; objetivo: string; valor: number }[]> {
  const { data } = await supabase.from("site_paginas").select("publicado_json, atualizado_em").order("atualizado_em", { ascending: false });
  for (const row of data ?? []) {
    const secs = ((row.publicado_json as any)?.sections ?? []) as any[];
    const sv = secs.find((s) => s?.tipo === "servicos");
    const lista = sv?.data?.itens ?? sv?.data?.servicos ?? sv?.itens;
    if (Array.isArray(lista) && lista.length) {
      return lista.filter((x: any) => x?.nome).map((x: any) => ({ nome: String(x.nome), objetivo: String(x.objetivo || x.nome), valor: parsePreco(String(x.preco ?? "")) }));
    }
  }
  return DEF.servicos.map((x) => ({ nome: x.nome, objetivo: x.objetivo || x.nome, valor: parsePreco(x.preco) }));
}

/** Totais de todas as consultorias (para o painel inicial). */
export async function loadFinanceiroGeral() {
  const [c, p] = await Promise.all([
    supabase.from("diag_cobrancas").select("diagnostico_id, valor, desconto"),
    supabase.from("diag_pagamentos").select("diagnostico_id, valor, pago_em"),
  ]);
  if (c.error) throw c.error;
  if (p.error) throw p.error;
  const cob = c.data ?? [];
  const pag = p.data ?? [];
  const ids = new Set([...cob.map((x) => x.diagnostico_id)]);
  const porDiag = new Map<string, Resumo>();
  for (const id of ids) {
    porDiag.set(id, resumo(cob.filter((x) => x.diagnostico_id === id), pag.filter((x) => x.diagnostico_id === id)));
  }
  return { geral: resumo(cob, pag), porDiag, pagamentos: pag };
}

const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
/** Planos que a cliente marcou no cadastro do site (pelo texto do objetivo). */
export function planosEscolhidos<T extends { nome: string; objetivo: string }>(planos: T[], objetivo: string | null): T[] {
  const o = norm(objetivo ?? "");
  if (!o) return [];
  return planos.filter((p) => o.includes(norm(p.objetivo)) || o.includes(norm(p.nome)));
}
