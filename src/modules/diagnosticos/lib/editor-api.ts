import { supabase } from "@/integrations/supabase/client";
import { BUCKET, uploadImage } from "./api";

export type ItemStatus = "ideal" | "precisa_ajustes";
export type DiagItem = {
  id: string;
  diagnostico_id: string;
  ordem: number;
  secao: string;
  titulo: string;
  status: ItemStatus;
  o_que_eu_vi: string;
  sua_tarefa: string;
};
export type MidiaTipo = "positivo" | "negativo";
export type DiagMidia = {
  id: string;
  diagnostico_id: string;
  item_id: string | null;
  tipo: MidiaTipo;
  url_arquivo: string;
  legenda: string;
  ordem: number;
};
export type DiagCompleto = {
  id: string;
  cliente_id: string;
  titulo: string;
  status: "rascunho" | "finalizado";
  resumo_plano_acao: string;
  criado_em: string;
  atualizado_em: string;
  cliente: { id: string; nome: string; instagram: string | null; whatsapp: string | null };
};

export async function loadDiagnostico(id: string) {
  const [d, i, m] = await Promise.all([
    supabase.from("diag_diagnosticos").select("*, cliente:diag_clientes(id, nome, instagram, whatsapp)").eq("id", id).single(),
    supabase.from("diag_itens").select("*").eq("diagnostico_id", id).order("ordem"),
    supabase.from("diag_midias").select("*").eq("diagnostico_id", id).order("ordem"),
  ]);
  if (d.error) throw d.error;
  if (i.error) throw i.error;
  if (m.error) throw m.error;
  return {
    diag: d.data as unknown as DiagCompleto,
    itens: (i.data ?? []) as DiagItem[],
    midias: (m.data ?? []) as DiagMidia[],
  };
}

export async function updateDiag(id: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from("diag_diagnosticos").update(patch as never).eq("id", id);
  if (error) throw error;
}
export async function updateItem(id: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from("diag_itens").update(patch as never).eq("id", id);
  if (error) throw error;
}
export async function updateMidia(id: string, patch: Record<string, unknown>) {
  const { error } = await supabase.from("diag_midias").update(patch as never).eq("id", id);
  if (error) throw error;
}

export async function addItem(diagnosticoId: string, ordem: number, secao: string): Promise<DiagItem> {
  const { data, error } = await supabase
    .from("diag_itens")
    .insert({ diagnostico_id: diagnosticoId, ordem, secao, titulo: "Novo item", status: "precisa_ajustes" })
    .select("*")
    .single();
  if (error) throw error;
  return data as DiagItem;
}
export async function deleteItem(id: string) {
  const { error } = await supabase.from("diag_itens").delete().eq("id", id);
  if (error) throw error;
}

export async function addMidia(diagnosticoId: string, tipo: MidiaTipo, file: File, ordem: number): Promise<DiagMidia> {
  const path = await uploadImage(diagnosticoId, file);
  const { data, error } = await supabase
    .from("diag_midias")
    .insert({ diagnostico_id: diagnosticoId, tipo, url_arquivo: path, ordem })
    .select("*")
    .single();
  if (error) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw error;
  }
  return data as DiagMidia;
}
export async function deleteMidia(m: DiagMidia) {
  await supabase.storage.from(BUCKET).remove([m.url_arquivo]);
  const { error } = await supabase.from("diag_midias").delete().eq("id", m.id);
  if (error) throw error;
}
