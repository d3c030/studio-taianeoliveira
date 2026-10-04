import { supabase } from "@/integrations/supabase/client";
import type { SitePagina, SiteSeo } from "./api";

export type SiteDraft = { rascunho: SitePagina; publicado: SitePagina; seo: SiteSeo; atualizado_em?: string };

function norm(j: any): SitePagina {
  return { sections: Array.isArray(j?.sections) ? j.sections : [] };
}

export async function loadDraft(): Promise<SiteDraft> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Não autenticado");
  const { data, error } = await supabase
    .from("site_paginas")
    .select("rascunho_json, publicado_json, seo, atualizado_em")
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (error) throw error;
  let src: any = data;
  // Se a página desta conta estiver vazia, carrega a página da equipe que tem conteúdo
  if (!src || norm(src.rascunho_json).sections.length === 0) {
    const { data: rows } = await supabase
      .from("site_paginas")
      .select("rascunho_json, publicado_json, seo, atualizado_em")
      .order("atualizado_em", { ascending: false })
      .limit(10);
    const shared = (rows ?? []).find((r: any) => norm(r.rascunho_json).sections.length > 0 || norm(r.publicado_json).sections.length > 0);
    if (shared) {
      src = { ...shared, rascunho_json: norm(shared.rascunho_json).sections.length ? shared.rascunho_json : shared.publicado_json };
    }
  }
  return {
    rascunho: norm(src?.rascunho_json),
    publicado: norm(src?.publicado_json),
    seo: (src?.seo ?? {}) as SiteSeo,
    atualizado_em: src?.atualizado_em,
  };
}

export async function saveDraft(rascunho: SitePagina, seo: SiteSeo, publicar = false) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Não autenticado");
  const row: any = {
    user_id: u.user.id,
    rascunho_json: rascunho,
    seo,
    atualizado_em: new Date().toISOString(),
  };
  if (publicar) row.publicado_json = rascunho;
  const { error } = await supabase.from("site_paginas").upsert(row, { onConflict: "user_id" });
  if (error) throw error;
}

export async function uploadSiteImage(file: File): Promise<string> {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("site").upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from("site").getPublicUrl(path).data.publicUrl;
}
