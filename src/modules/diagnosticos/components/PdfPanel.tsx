import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, ExternalLink, Loader2, MessageCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DiagCompleto, DiagItem, DiagMidia } from "../lib/editor-api";
import { buildPdfBlob, pdfFileName } from "../pdf/generate";

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
      setUrl(URL.createObjectURL(blob));
      return URL.createObjectURL(blob);
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao gerar o PDF");
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void gerar(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const baixar = (href: string) => {
    const a = document.createElement("a");
    a.href = href;
    a.download = pdfFileName(diag);
    a.click();
  };

  const compartilhar = async () => {
    const href = url ?? (await gerar());
    if (!href) return;
    baixar(href);
    const num = (diag.cliente.whatsapp ?? "").replace(/\D/g, "");
    const phone = num && num.length <= 11 ? `55${num}` : num;
    const nome = diag.cliente.nome.split(" ")[0];
    const msg = `Oi ${nome}! Seu diagnóstico de perfil ficou pronto 💖 Estou te enviando o PDF aqui. Qualquer dúvida, me chama!`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
    toast.info("PDF baixado — anexe-o na conversa do WhatsApp.");
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
      <p className="text-xs text-muted-foreground">No celular, se a prévia não aparecer, use "Abrir em tela cheia".</p>
    </div>
  );
}
