import { createElement } from "react";
import { supabase } from "@/integrations/supabase/client";
import defaultLogo from "@/assets/logo.png";
import { signedUrl } from "../lib/api";
import type { DiagCompleto, DiagItem, DiagMidia } from "../lib/editor-api";
import type { PdfData } from "./DiagnosticoPDF";
import { loadFinanceiro, resumo } from "../lib/financeiro";

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

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = () => res(null);
    im.src = src;
  });
}

// Recorte circular da personagem, igual ao carregamento do site
async function circleLogo(src: string): Promise<string | null> {
  const im = await loadImg(src);
  if (!im) return null;
  const W = im.naturalWidth, H = im.naturalHeight;
  const side = Math.min(W, H) / 1.35;
  const sx = (W - side) / 2;
  const sy = Math.max(0, Math.min(H - side, H * 0.52 - side / 2));
  const c = document.createElement("canvas");
  c.width = c.height = 300;
  const ctx = c.getContext("2d")!;
  ctx.beginPath();
  ctx.arc(150, 150, 150, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(im, sx, sy, side, side, 0, 0, 300, 300);
  return c.toDataURL("image/png");
}

async function loadConfig() {
  const { data } = await supabase
    .from("diag_configuracoes")
    .select("nome_exibicao, logo_url, cor_destaque, rodape")
    .maybeSingle();
  return data;
}

export async function buildPdfBlob(diag: DiagCompleto, itens: DiagItem[], midias: DiagMidia[]): Promise<Blob> {
  if (!(globalThis as any).Buffer) {
    const { Buffer } = await import("buffer");
    (globalThis as any).Buffer = Buffer;
  }
  const [{ pdf }, { DiagnosticoPDF }, cfg] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./DiagnosticoPDF"),
    loadConfig(),
  ]);
  const fin = await loadFinanceiro(diag.id).catch(() => null);

  let logoSrc: string = defaultLogo;
  if (cfg?.logo_url) {
    logoSrc = cfg.logo_url.startsWith("http") ? cfg.logo_url : await signedUrl(cfg.logo_url);
  } else {
    const { data: studio } = await supabase.from("contact_settings").select("logo_url").limit(1).maybeSingle();
    if (studio?.logo_url) logoSrc = studio.logo_url;
  }
  const rawLogo = (await toDataUrl(logoSrc)) ?? (await toDataUrl(defaultLogo));
  const logo = rawLogo ? (await circleLogo(rawLogo)) ?? rawLogo : null;

  const ordered = [...midias].sort((a, b) => (a.tipo === b.tipo ? a.ordem - b.ordem : a.tipo === "positivo" ? -1 : 1));
  const imagens = (
    await Promise.all(
      ordered.map(async (m) => {
        const src = await toDataUrl(await signedUrl(m.url_arquivo));
        const im = src ? await loadImg(src) : null;
        const ratio = im && im.naturalHeight ? im.naturalWidth / im.naturalHeight : 0.75;
        return src ? { src, ratio, legenda: m.legenda, tipo: m.tipo, item_id: m.item_id } : null;
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
    convite: !(fin?.cobrancas ?? []).some((c) => {
      const t = (c.descricao || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      return /consultoria\s*1\s*[:x]?\s*1|mentoria/.test(t);
    }),
    financeiro: fin && fin.cobrancas.length
      ? {
          itens: fin.cobrancas.map((c) => ({ descricao: c.descricao, valor: Number(c.valor), desconto: Number(c.desconto) })),
          pagamentos: fin.pagamentos.map((p) => ({ data: new Date(p.pago_em + "T12:00:00").toLocaleDateString("pt-BR"), forma: p.forma ?? "", valor: Number(p.valor) })),
          ...resumo(fin.cobrancas, fin.pagamentos),
        }
      : null,
  };

  return pdf(createElement(DiagnosticoPDF, { d: data }) as any).toBlob();
}

export function pdfFileName(diag: DiagCompleto) {
  const base = (diag.cliente.instagram || diag.cliente.nome).replace(/[^\w-]+/g, "_");
  return `diagnostico_${base}.pdf`;
}
