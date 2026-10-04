import { supabase } from "@/integrations/supabase/client";

export type SiteSection = {
  id: string;
  tipo: string;
  visivel?: boolean;
  dados?: Record<string, any>;
};
export type SitePagina = { sections: SiteSection[] };
export type SiteSeo = { title?: string; description?: string; og_image?: string };

export async function loadPublishedPage(): Promise<{ pagina: SitePagina; seo: SiteSeo }> {
  const { data, error } = await supabase
    .from("site_paginas")
    .select("publicado_json, seo")
    .not("publicado_json", "is", null)
    .order("atualizado_em", { ascending: false })
    .limit(10);
  if (error) throw error;
  // Usa a página publicada mais recente que tenha conteúdo, para nunca sumir
  const row = (data ?? []).find((r: any) => Array.isArray(r?.publicado_json?.sections) && r.publicado_json.sections.length > 0);
  const pj = (row?.publicado_json ?? {}) as Partial<SitePagina>;
  return {
    pagina: { sections: Array.isArray(pj.sections) ? pj.sections : [] },
    seo: (row?.seo ?? {}) as SiteSeo,
  };
}
