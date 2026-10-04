import { supabase } from "@/integrations/supabase/client";
import { TEMPLATE_PADRAO, type TemplateItem } from "./template";

export const BUCKET = "diagnosticos";

export type DiagCliente = {
  id: string;
  nome: string;
  instagram: string | null;
  email: string | null;
  whatsapp: string | null;
  foto_perfil: string | null;
  criado_em: string;
};

export type DiagClienteComTotal = DiagCliente & { total: number };

export type DiagDiagnostico = {
  id: string;
  cliente_id: string;
  titulo: string;
  status: "rascunho" | "finalizado";
  criado_em: string;
  atualizado_em: string;
};

export type ClienteInput = {
  nome: string;
  instagram: string;
  email: string;
  whatsapp: string;
  foto_perfil: string | null;
};

const clean = (s: string) => (s.trim() ? s.trim() : null);
export const normalizeInstagram = (s: string) => s.trim().replace(/^@+/, "");

export async function listClientes(): Promise<DiagClienteComTotal[]> {
  const { data, error } = await supabase
    .from("diag_clientes")
    .select("*, diag_diagnosticos(count)")
    .order("nome");
  if (error) throw error;
  return (data ?? []).map((c: any) => ({
    ...c,
    total: c.diag_diagnosticos?.[0]?.count ?? 0,
  }));
}

export async function getCliente(id: string): Promise<DiagCliente> {
  const { data, error } = await supabase.from("diag_clientes").select("*").eq("id", id).single();
  if (error) throw error;
  return data as DiagCliente;
}

export async function saveCliente(input: ClienteInput, id?: string) {
  const row = {
    nome: input.nome.trim(),
    instagram: clean(normalizeInstagram(input.instagram)),
    email: clean(input.email),
    whatsapp: clean(input.whatsapp),
    foto_perfil: input.foto_perfil,
  };
  if (id) {
    const { error } = await supabase.from("diag_clientes").update(row).eq("id", id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await supabase.from("diag_clientes").insert(row).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteCliente(id: string) {
  const { error } = await supabase.from("diag_clientes").delete().eq("id", id);
  if (error) throw error;
}

export async function listDiagnosticos(clienteId: string): Promise<DiagDiagnostico[]> {
  const { data, error } = await supabase
    .from("diag_diagnosticos")
    .select("id, cliente_id, titulo, status, criado_em, atualizado_em")
    .eq("cliente_id", clienteId)
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DiagDiagnostico[];
}

async function getTemplate(): Promise<TemplateItem[]> {
  const { data } = await supabase.from("diag_configuracoes").select("template_json").maybeSingle();
  const t = data?.template_json as TemplateItem[] | null | undefined;
  return Array.isArray(t) && t.length ? t : TEMPLATE_PADRAO;
}

export async function createDiagnostico(clienteId: string) {
  const { data, error } = await supabase
    .from("diag_diagnosticos")
    .insert({ cliente_id: clienteId })
    .select("id")
    .single();
  if (error) throw error;
  const template = await getTemplate();
  const { error: e2 } = await supabase.from("diag_itens").insert(
    template.map((t, i) => ({ ...t, diagnostico_id: data.id, ordem: i, status: "precisa_ajustes" })),
  );
  if (e2) throw e2;
  return data.id as string;
}

export async function deleteDiagnostico(id: string) {
  const { data: midias } = await supabase.from("diag_midias").select("url_arquivo").eq("diagnostico_id", id);
  const paths = (midias ?? []).map((m) => m.url_arquivo);
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  const { error } = await supabase.from("diag_diagnosticos").delete().eq("id", id);
  if (error) throw error;
}

/** Compress an image in the browser (max side, JPEG). */
export async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error("Falha ao comprimir"))), "image/jpeg", quality),
  );
}

export async function uploadImage(folder: string, file: File): Promise<string> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Sessão expirada");
  const blob = await compressImage(file);
  const path = `${u.user.id}/${folder}/${crypto.randomUUID()}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: "image/jpeg" });
  if (error) throw error;
  return path;
}

export async function signedUrl(path: string) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}
