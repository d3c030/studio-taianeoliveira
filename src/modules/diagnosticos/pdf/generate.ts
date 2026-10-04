import { createElement } from "react";
import { supabase } from "@/integrations/supabase/client";
import defaultLogo from "@/assets/logo.png";
import { signedUrl } from "../lib/api";
import type { DiagCompleto, DiagItem, DiagMidia } from "../lib/editor-api";
import type { PdfData } from "./DiagnosticoPDF";

const COR_PADRAO = "#B06F68";

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const b = await r.blob();
    return await new Promise((res) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result as string);
      fr.onerror = () => res(null);
      fr.readAsDataURL(b);
    });
  } catch {
    return null;
  }
}

async function loadConfig() {
  const { data } = await supabase
    .from("diag_configuracoes")
    .select("nome_exibicao, logo_url, cor_destaque, rodape")
    .maybeSingle();
  return data;
}

export async function buildPdfBlob(diag: DiagCompleto, itens: DiagItem[], midias: DiagMidia[]): Promise<Blob> {
  const [{ pdf }, { DiagnosticoPDF }, cfg] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./DiagnosticoPDF"),
    loadConfig(),
  ]);

  let logoSrc: string = defaultLogo;
  if (cfg?.logo_url) {
    logoSrc = cfg.logo_url.startsWith("http") ? cfg.logo_url : await signedUrl(cfg.logo_url);
  } else {
    const { data: studio } = await supabase.from("contact_settings").select("logo_url").limit(1).maybeSingle();
    if (studio?.logo_url) logoSrc = studio.logo_url;
  }
  const logo = (await toDataUrl(logoSrc)) ?? (await toDataUrl(defaultLogo));

  const ordered = [...midias].sort((a, b) => (a.tipo === b.tipo ? a.ordem - b.ordem : a.tipo === "positivo" ? -1 : 1));
  const imagens = (
    await Promise.all(
      ordered.map(async (m) => {
        const src = await toDataUrl(await signedUrl(m.url_arquivo));
        return src ? { src, legenda: m.legenda, tipo: m.tipo, item_id: m.item_id } : null;
      }),
    )
  ).filter(Boolean) as PdfData["imagens"];

  const itemIds = new Set(itens.map((i) => i.id));
  const data: PdfData = {
    titulo: diag.titulo,
    feitoPor: cfg?.nome_exibicao?.trim() || "",
    paraInstagram: diag.cliente.instagram ? `@${diag.cliente.instagram}` : diag.cliente.nome,
    data: new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" }),
    logo,
    cor: cfg?.cor_destaque?.trim() || COR_PADRAO,
    rodape: cfg?.rodape?.trim() || "",
    itens: [...itens].sort((a, b) => a.ordem - b.ordem),
    imagens: imagens.map((i) => (i.item_id && !itemIds.has(i.item_id) ? { ...i, item_id: null } : i)),
    plano: diag.resumo_plano_acao,
  };

  return pdf(createElement(DiagnosticoPDF, { d: data }) as any).toBlob();
}

export function pdfFileName(diag: DiagCompleto) {
  const base = (diag.cliente.instagram || diag.cliente.nome).replace(/[^\w-]+/g, "_");
  return `diagnostico_${base}.pdf`;
}
