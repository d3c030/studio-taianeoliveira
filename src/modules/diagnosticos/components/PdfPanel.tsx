import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, ExternalLink, Loader2, MessageCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DiagCompleto, DiagItem, DiagMidia } from "../lib/editor-api";
import { buildPdfBlob, pdfFileName } from "../pdf/generate";
import { supabase } from "@/integrations/supabase/client";

type Props = { diag: DiagCompleto; itens: DiagItem[]; midias: DiagMidia[]; beforeBuild: () => Promise<void> };

export function PdfPanel({ diag, itens, midias, beforeBuild }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const gerar = async () => {
    setLoading(true);
    try {
      await beforeBuild();
      const blob = await buildPdfBlob(diag, itens, midias);
      const href = URL.createObjectURL(blob);
      setUrl(href);
      return href;
    } catch (e: any) {
      console.error(e);
      if (String(e?.message ?? "").includes("dynamically imported module")) {
        toast.error("O app foi atualizado. Recarregando a página…");
        setTimeout(() => window.location.reload(), 1200);
      } else {
        toast.error("Erro ao gerar o PDF");
      }
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Celular/tablet: navegadores móveis não exibem PDF embutido e travam ao montar automaticamente.
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(max-width: 1024px), (pointer: coarse)").matches;
    setMobile(m);
    if (!m) void gerar();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const baixar = (href: string) => {
    const a = document.createElement("a");
    a.href = href;
    a.download = pdfFileName(diag);
    a.click();
  };

  const compartilhar = async () => {
    // Abre a janela já no clique (evita bloqueio de pop-up) e preenche depois
    const win = window.open("about:blank", "_blank");
    const href = url ?? (await gerar());
    if (!href) { win?.close(); return; }
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      const blob = await (await fetch(href)).blob();
      const path = `${u.user.id}/pdfs/${diag.id}/${crypto.randomUUID()}.pdf`;
      const up = await supabase.storage.from("diagnosticos").upload(path, blob, { contentType: "application/pdf" });
      if (up.error) throw up.error;
      const { data: share, error } = await supabase
        .from("diag_compartilhamentos")
        .insert({ diagnostico_id: diag.id, arquivo: path, nome_arquivo: pdfFileName(diag), cliente_nome: diag.cliente.nome })
        .select("token")
        .single();
      if (error) throw error;
      const link = `${window.location.origin}/pdf/${share.token}`;
      const nome = diag.cliente.nome.split(" ")[0];
      const msg = `Oi ${nome}! Seu diagnóstico de perfil ficou pronto 💖\n\nToque no link para baixar o seu PDF (disponível por 24h):\n${link}\n\nQualquer dúvida, me chama!`;
      const num = (diag.cliente.whatsapp ?? "").replace(/\D/g, "");
      const phone = num && num.length <= 11 ? `55${num}` : num;
      const wa = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
      if (win) win.location.href = wa; else window.location.href = wa;
    } catch (e: any) {
      win?.close();
      console.error(e);
      toast.error(`Não foi possível criar o link: ${e?.message ?? "erro"}`);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={gerar} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Atualizar prévia
        </Button>
        <Button onClick={async () => { const h = url ?? (await gerar()); if (h) baixar(h); }} disabled={loading}>
          <Download className="h-4 w-4" /> Gerar PDF
        </Button>
        <Button variant="secondary" onClick={compartilhar} disabled={loading}>
          <MessageCircle className="h-4 w-4" /> Compartilhar no WhatsApp
        </Button>
        {url && (
          <Button variant="ghost" asChild>
            <a href={url} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" /> Abrir em tela cheia</a>
          </Button>
        )}
      </div>
      {mobile ? (
        <div className="rounded-xl border border-border bg-muted p-6 text-center text-sm text-muted-foreground">
          {loading ? (
            <span className="inline-flex items-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Montando o PDF…</span>
          ) : url ? (
            <>PDF pronto. Toque em "Abrir em tela cheia" para ver ou em "Gerar PDF" para baixar.</>
          ) : (
            <>No celular, toque em "Atualizar prévia" para montar o PDF e depois em "Abrir em tela cheia".</>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-muted">
          {loading && !url ? (
            <div className="flex h-[70vh] items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Montando o PDF…
            </div>
          ) : url ? (
            <iframe src={url} title="Pré-visualização do PDF" className="h-[75vh] w-full" />
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">Prévia indisponível.</div>
          )}
        </div>
      )}
    </div>
  );
}
