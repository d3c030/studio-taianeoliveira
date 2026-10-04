import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Instagram, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import type { SiteSection } from "../lib/api";
import { waLink } from "../lib/sections";

function Wrap({ children, alt }: { children: React.ReactNode; alt?: boolean }) {
  return (
    <section className={alt ? "bg-muted/40" : ""}>
      <div className="mx-auto w-full max-w-4xl px-5 py-14">{children}</div>
    </section>
  );
}

function Cupons({ d }: { d: Record<string, any> }) {
  const q = useQuery({
    queryKey: ["site-cupons-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_cupons")
        .select("id, codigo, titulo, descricao, desconto")
        .eq("ativo", true);
      if (error) throw error;
      return data ?? [];
    },
  });
  const cupons = q.data ?? [];
  return (
    <Wrap alt>
      <h2 className="text-center text-2xl font-semibold sm:text-3xl">{d.titulo}</h2>
      {d.subtitulo && <p className="mt-2 text-center text-muted-foreground">{d.subtitulo}</p>}
      {cupons.length === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">Nenhum cupom ativo no momento.</p>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {cupons.map((c) => (
            <div key={c.id} className="rounded-xl border-2 border-dashed border-primary/50 bg-card p-5 text-center">
              {c.desconto && <p className="text-2xl font-bold text-primary">{c.desconto}</p>}
              <p className="mt-1 font-medium">{c.titulo}</p>
              {c.descricao && <p className="mt-1 text-sm text-muted-foreground">{c.descricao}</p>}
              <p className="mt-3 inline-block rounded-md bg-muted px-3 py-1 font-mono text-sm">{c.codigo}</p>
            </div>
          ))}
        </div>
      )}
      {d.link && (
        <div className="mt-8 text-center">
          <Button asChild variant="outline">
            <a href={/^https?:\/\//.test(d.link) ? d.link : `https://${d.link}`} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />{d.link_texto || "Ver no Linktree"}
            </a>
          </Button>
        </div>
      )}
    </Wrap>
  );
}

export function SectionView({ s, whatsapp }: { s: SiteSection; whatsapp?: string }) {
  const d = s.dados ?? {};
  switch (s.tipo) {
    case "hero": {
      const link = waLink(whatsapp, "Olá! Gostaria de agendar um horário.");
      return (
        <section className="relative overflow-hidden">
          {d.imagem && <img src={d.imagem} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />}
          <div className="relative mx-auto max-w-3xl px-5 py-24 text-center">
            <h1 className="text-4xl font-semibold sm:text-5xl">{d.titulo}</h1>
            {d.subtitulo && <p className="mt-4 text-lg text-muted-foreground">{d.subtitulo}</p>}
            {d.botao_texto && link && (
              <Button asChild size="lg" className="mt-8">
                <a href={link} target="_blank" rel="noreferrer"><MessageCircle className="mr-2 h-4 w-4" />{d.botao_texto}</a>
              </Button>
            )}
          </div>
        </section>
      );
    }
    case "sobre":
      return (
        <Wrap>
          <div className="grid items-center gap-8 sm:grid-cols-2">
            {d.imagem && <img src={d.imagem} alt={d.titulo} className="w-full rounded-2xl object-cover" />}
            <div className={d.imagem ? "" : "sm:col-span-2 text-center"}>
              <h2 className="text-2xl font-semibold sm:text-3xl">{d.titulo}</h2>
              <p className="mt-4 whitespace-pre-line text-muted-foreground">{d.texto}</p>
            </div>
          </div>
        </Wrap>
      );
    case "servicos":
      return (
        <Wrap alt>
          <h2 className="text-center text-2xl font-semibold sm:text-3xl">{d.titulo}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {(d.itens ?? []).map((it: any, i: number) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-medium">{it.nome}</p>
                  {it.preco && <p className="text-sm font-semibold text-primary">{it.preco}</p>}
                </div>
                {it.descricao && <p className="mt-2 text-sm text-muted-foreground">{it.descricao}</p>}
              </div>
            ))}
          </div>
        </Wrap>
      );
    case "depoimentos":
      return (
        <Wrap>
          <h2 className="text-center text-2xl font-semibold sm:text-3xl">{d.titulo}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {(d.itens ?? []).map((it: any, i: number) => (
              <figure key={i} className="rounded-xl border border-border bg-card p-5">
                <blockquote className="italic">“{it.texto}”</blockquote>
                <figcaption className="mt-3 text-sm font-medium text-muted-foreground">— {it.nome}</figcaption>
              </figure>
            ))}
          </div>
        </Wrap>
      );
    case "cupons":
      return <Cupons d={d} />;
    case "contato": {
      const wa = waLink(d.whatsapp || whatsapp, "Olá! Vim pelo site.");
      return (
        <Wrap alt>
          <div className="text-center">
            <h2 className="text-2xl font-semibold sm:text-3xl">{d.titulo}</h2>
            {d.subtitulo && <p className="mt-2 text-muted-foreground">{d.subtitulo}</p>}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {wa && <Button asChild><a href={wa} target="_blank" rel="noreferrer"><MessageCircle className="mr-2 h-4 w-4" />WhatsApp</a></Button>}
              {d.instagram && <Button asChild variant="outline"><a href={d.instagram} target="_blank" rel="noreferrer"><Instagram className="mr-2 h-4 w-4" />Instagram</a></Button>}
            </div>
          </div>
        </Wrap>
      );
    }
    default:
      return null;
  }
}

export function contatoWhatsapp(sections: SiteSection[]) {
  return sections.find((s) => s.tipo === "contato")?.dados?.whatsapp as string | undefined;
}
