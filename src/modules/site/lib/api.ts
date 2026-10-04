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
    .order("atualizado_em", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const pj = (data?.publicado_json ?? {}) as Partial<SitePagina>;
  return {
    pagina: { sections: Array.isArray(pj.sections) ? pj.sections : [] },
    seo: (data?.seo ?? {}) as SiteSeo,
  };
}
