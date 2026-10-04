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
  return {
    rascunho: norm(data?.rascunho_json),
    publicado: norm(data?.publicado_json),
    seo: (data?.seo ?? {}) as SiteSeo,
    atualizado_em: data?.atualizado_em,
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
