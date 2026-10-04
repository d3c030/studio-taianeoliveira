import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSharedPdf } from "@/lib/diag-share.functions";

export const Route = createFileRoute("/pdf/$token")({
  head: () => ({
    meta: [
      { title: "Seu diagnóstico de perfil — Studio Taiane Oliveira" },
      { name: "description", content: "Baixe o PDF do seu diagnóstico de perfil." },
      { property: "og:title", content: "Seu diagnóstico de perfil — Studio Taiane Oliveira" },
      { property: "og:description", content: "Toque para baixar o PDF do seu diagnóstico de perfil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Page,
});

type Res = Awaited<ReturnType<typeof getSharedPdf>>;

function Page() {
  const { token } = Route.useParams();
  const [res, setRes] = useState<Res | null>(null);
  useEffect(() => {
    getSharedPdf({ data: { token } }).then(setRes).catch(() => setRes({ status: "invalido" }));
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        {!res ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        ) : res.status === "ok" ? (
          <>
            <h1 className="text-xl font-semibold">Oi{res.nome ? `, ${res.nome}` : ""}! 💖</h1>
            <p className="text-sm text-muted-foreground">Seu diagnóstico de perfil está pronto.</p>
            <Button asChild className="w-full" size="lg">
              <a href={res.url}><Download className="h-4 w-4" /> Baixar PDF</a>
            </Button>
            <p className="text-xs text-muted-foreground">
              Disponível até {new Date(res.expiraEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold">{res.status === "expirado" ? "Link expirado" : "Link inválido"}</h1>
            <p className="text-sm text-muted-foreground">Peça um novo link para receber seu diagnóstico.</p>
          </>
        )}
      </div>
    </div>
  );
}
