import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Copy, ExternalLink, Instagram, Loader2, LogIn, MessageCircle, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { submitSiteLead } from "@/lib/site-leads.functions";
import type { SiteSection } from "../lib/api";
import { waLink } from "../lib/sections";

function Wrap({ children, alt, id }: { children: React.ReactNode; alt?: boolean; id?: string }) {
  return (
    <section id={id} className={alt ? "bg-secondary/40" : ""}>
      <div className="mx-auto w-full max-w-5xl px-5 py-20 sm:py-24">{children}</div>
    </section>
  );
}

function Heading({ eyebrow, titulo, subtitulo }: { eyebrow?: string; titulo?: string; subtitulo?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow && (
        <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary">
          <Sparkles className="h-3.5 w-3.5" />{eyebrow}
        </p>
      )}
      <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">{titulo}</h2>
      {subtitulo && <p className="mt-3 text-muted-foreground">{subtitulo}</p>}
    </div>
  );
}

const OBJETIVOS = ["Engajamento", "Seguidores", "Atrair marcas", "Organizar o perfil"];

const leadSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(100),
  instagram: z.string().trim().min(2, "Informe seu @").max(60),
  whatsapp: z.string().trim().refine((v) => v.replace(/\D/g, "").length >= 10, "WhatsApp com DDD"),
  email: z.string().trim().email("E-mail inválido").max(255),
  objetivo: z.string().trim().min(3, "Conte seu objetivo").max(1000),
});

function LeadForm({ d, whatsapp }: { d: Record<string, any>; whatsapp?: string }) {
  const [f, setF] = useState({ nome: "", instagram: "", whatsapp: "", email: "", objetivo: "" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const tag = (o: string) => set("objetivo", f.objetivo ? (f.objetivo.includes(o) ? f.objetivo : `${f.objetivo}, ${o}`) : o);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = leadSchema.safeParse(f);
    if (!r.success) {
      const m: Record<string, string> = {};
      r.error.issues.forEach((i) => { m[String(i.path[0])] = i.message; });
      setErrs(m);
      return;
    }
    setErrs({});
    const ig = r.data.instagram.replace(/^@?/, "@");
    const msg = `Olá, Taiane! Tudo bem? 😊\nAcabei de preencher o cadastro para atendimento no seu site.\n\nNome: ${r.data.nome}\nInstagram: ${ig}\nE-mail: ${r.data.email}\nObjetivo: ${r.data.objetivo}`;
    const url = waLink(d.whatsapp || whatsapp, msg);
    // Open a tab synchronously so mobile browsers don't block it.
    const win = url ? window.open("", "_blank") : null;
    setBusy(true);
    try {
      await submitSiteLead({ data: r.data });
      if (url) {
        if (win) win.location.href = url; else window.location.href = url;
      }
      toast.success("Cadastro enviado! Abrindo o WhatsApp…");
      setF({ nome: "", instagram: "", whatsapp: "", email: "", objetivo: "" });
    } catch (err: any) {
      win?.close();
      toast.error(err?.message ?? "Erro ao enviar");
    } finally { setBusy(false); }
  };

  const field = (k: keyof typeof f, label: string, props: React.ComponentProps<typeof Input>) => (
    <div className="space-y-1.5">
      <Label htmlFor={`lead-${k}`}>{label}</Label>
      <Input id={`lead-${k}`} value={f[k]} onChange={(e) => set(k, e.target.value)} className="h-11 bg-background" {...props} />
      {errs[k] && <p className="text-xs text-destructive">{errs[k]}</p>}
    </div>
  );

  return (
    <Wrap alt id="cadastro">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
        <div className="text-center lg:text-left">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.2em] text-primary"><Sparkles className="h-3.5 w-3.5" />Atendimento</p>
          <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">{(d.titulo && d.titulo !== "Vamos conversar?") ? d.titulo : "Quero levar meu perfil para o próximo nível"}</h2>
          <p className="mt-4 text-muted-foreground">{(d.subtitulo && !d.subtitulo.startsWith("Me chame")) ? d.subtitulo : "Preencha o cadastro e continue a conversa comigo direto no WhatsApp."}</p>
          <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
            <li>✦ Diagnóstico do seu perfil</li>
            <li>✦ Estratégia para engajamento e seguidores</li>
            <li>✦ Posicionamento para chamar a atenção das marcas</li>
          </ul>
          {d.instagram && (
            <Button asChild variant="link" className="mt-4 px-0">
              <a href={d.instagram} target="_blank" rel="noreferrer"><Instagram className="mr-2 h-4 w-4" />Me acompanhe no Instagram</a>
            </Button>
          )}
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2">
            {field("nome", "Nome", { placeholder: "Seu nome", autoComplete: "name", maxLength: 100 })}
            {field("instagram", "Instagram", { placeholder: "@seuperfil", maxLength: 60 })}
            {field("whatsapp", "WhatsApp", { placeholder: "(11) 99999-9999", inputMode: "tel", autoComplete: "tel", maxLength: 20 })}
            {field("email", "E-mail", { placeholder: "voce@email.com", type: "email", autoComplete: "email", maxLength: 255 })}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lead-objetivo">Objetivo</Label>
            <div className="flex flex-wrap gap-2">
              {OBJETIVOS.map((o) => (
                <button type="button" key={o} onClick={() => tag(o)} className="rounded-full border border-border px-3 py-1 text-xs transition-colors hover:border-primary hover:text-primary">{o}</button>
              ))}
            </div>
            <Textarea id="lead-objetivo" rows={4} maxLength={1000} value={f.objetivo} onChange={(e) => set("objetivo", e.target.value)} className="bg-background" placeholder="Conte o que você precisa: mais engajamento, crescer em seguidores, chamar a atenção das marcas…" />
            {errs.objetivo && <p className="text-xs text-destructive">{errs.objetivo}</p>}
          </div>
          <Button type="submit" size="lg" className="h-12 w-full rounded-full" disabled={busy}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Enviar e falar no WhatsApp
          </Button>
          <p className="text-center text-xs text-muted-foreground">Seus dados são usados apenas para o seu atendimento.</p>
        </form>
      </div>
    </Wrap>
  );
}

type Cupom = { id: string; codigo: string; empresa: string; titulo: string; desconto: string; logo_url: string | null };

function Cupons({ d }: { d: Record<string, any> }) {
  const q = useQuery({
    queryKey: ["site-cupons-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_cupons")
        .select("id, codigo, empresa, titulo, desconto, logo_url")
        .eq("ativo", true)
        .order("ordem")
        .order("criado_em");
      if (error) throw error;
      return (data ?? []) as Cupom[];
    },
  });
  const cupons = q.data ?? [];
  const link = d.link ? (/^https?:\/\//.test(d.link) ? d.link : `https://${d.link}`) : "";
  const copy = async (c: string) => {
    try { await navigator.clipboard.writeText(c); toast.success(`Cupom ${c} copiado`); } catch { /* ignore */ }
  };
  return (
    <Wrap id="cupons">
      <Heading eyebrow="Parcerias" titulo={d.titulo || "Cupons das minhas parceiras"} subtitulo={d.subtitulo} />
      {cupons.length > 0 && (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cupons.map((c) => (
            <div key={c.id} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-secondary">
                {c.logo_url ? <img src={c.logo_url} alt={c.empresa} className="h-full w-full object-contain" loading="lazy" /> : <span className="font-display text-xl">{(c.empresa || c.codigo)[0]}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.empresa || c.titulo}</p>
                {c.desconto && <p className="text-xs text-muted-foreground">{c.desconto}</p>}
                <button onClick={() => copy(c.codigo)} className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border border-dashed border-primary/60 px-2 py-0.5 font-mono text-sm text-primary">
                  {c.codigo}<Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {link && (
        <div className="mt-10 text-center">
          <Button asChild size="lg" variant="outline" className="rounded-full">
            <a href={link} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />{d.link_texto || "Ver todos os cupons no Linktree"}</a>
          </Button>
        </div>
      )}
      {!link && cupons.length === 0 && <p className="mt-6 text-center text-sm text-muted-foreground">Em breve, novos cupons.</p>}
    </Wrap>
  );
}

export function Hero({ d, logo, preview }: { d: Record<string, any>; logo: string; preview?: boolean }) {
  return (
    <section className="relative isolate flex min-h-[88vh] flex-col overflow-hidden bg-secondary/50">
      {d.imagem && <img src={d.imagem} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-[center_15%]" />}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/70 via-background/60 to-background" />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-end px-5 py-5">
        {!preview && (
          <Button asChild variant="ghost" size="sm" className="rounded-full">
            <Link to="/login"><LogIn className="mr-1.5 h-4 w-4" />Login</Link>
          </Button>
        )}
      </header>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center px-5 pb-20 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary">Consultora especialista em redes sociais</p>
        <h1 className="mt-4 font-display text-5xl leading-[1.05] sm:text-7xl">{d.titulo}</h1>
        {d.subtitulo && <p className="mt-5 max-w-xl text-lg text-muted-foreground">{d.subtitulo}</p>}
        <Button asChild size="lg" className="mt-9 h-12 rounded-full px-8 shadow-lg">
          <a href="#cadastro">{d.botao_texto || "Quero meu atendimento"}<ArrowRight className="ml-2 h-4 w-4" /></a>
        </Button>
      </div>
    </section>
  );
}

export function SectionView({ s, whatsapp, logo = "", preview }: { s: SiteSection; whatsapp?: string; logo?: string; preview?: boolean }) {
  const d = s.dados ?? {};
  switch (s.tipo) {
    case "hero":
      return <Hero d={d} logo={logo} preview={preview} />;
    case "sobre":
      return (
        <Wrap>
          <div className="grid items-center gap-10 sm:grid-cols-2">
            {d.imagem && <img src={d.imagem} alt={d.titulo} className="aspect-[4/5] w-full rounded-3xl object-cover shadow-md" loading="lazy" />}
            <div className={d.imagem ? "" : "sm:col-span-2 text-center"}>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">Prazer, eu sou</p>
              <h2 className="mt-3 font-display text-3xl sm:text-4xl">{d.titulo}</h2>
              <p className="mt-5 whitespace-pre-line leading-relaxed text-muted-foreground">{d.texto}</p>
            </div>
          </div>
        </Wrap>
      );
    case "servicos":
      return (
        <Wrap alt>
          <Heading eyebrow="Como posso ajudar" titulo={d.titulo} />
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {(d.itens ?? []).map((it: any, i: number) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-display text-lg">{it.nome}</p>
                  {it.preco && <p className="shrink-0 text-sm font-semibold text-primary">{it.preco}</p>}
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
          <Heading eyebrow="Quem já passou por aqui" titulo={d.titulo} />
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {(d.itens ?? []).map((it: any, i: number) => (
              <figure key={i} className="rounded-2xl border border-border bg-card p-6">
                <blockquote className="font-display text-lg italic leading-relaxed">“{it.texto}”</blockquote>
                <figcaption className="mt-4 text-sm font-medium text-muted-foreground">— {it.nome}</figcaption>
              </figure>
            ))}
          </div>
        </Wrap>
      );
    case "galeria": {
      const fotos: { url: string; legenda?: string }[] = (d.fotos ?? []).filter((f: any) => f?.url);
      if (!fotos.length) return null;
      return (
        <Wrap alt>
          <Heading eyebrow="Galeria" titulo={d.titulo} />
          <Carousel opts={{ loop: true, align: "start" }} className="mx-auto mt-10 w-full px-10 sm:px-12">
            <CarouselContent>
              {fotos.map((f, i) => (
                <CarouselItem key={i} className="basis-full sm:basis-1/2 lg:basis-1/3">
                  <figure className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    <img src={f.url} alt={f.legenda || ""} className="aspect-[4/5] w-full object-cover" loading="lazy" />
                    {f.legenda && <figcaption className="p-3 text-center text-sm text-muted-foreground">{f.legenda}</figcaption>}
                  </figure>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-0" />
            <CarouselNext className="right-0" />
          </Carousel>
        </Wrap>
      );
    }
    case "cupons":
      return <Cupons d={d} />;
    case "contato":
      return <LeadForm d={d} whatsapp={whatsapp} />;
    default:
      return null;
  }
}

export function FloatingWhatsApp({ phone }: { phone?: string }) {
  const url = waLink(phone, "Olá, Taiane! Vim pelo seu site.");
  if (!url) return null;
  return (
    <a href={url} target="_blank" rel="noreferrer" aria-label="WhatsApp" className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-105">
      <MessageCircle className="h-6 w-6" />
    </a>
  );
}

/** Hero always first, coupons always last, others keep their order. */
export function orderSections(sections: SiteSection[]) {
  const vis = sections.filter((s) => s.visivel !== false);
  return [
    ...vis.filter((s) => s.tipo === "hero").slice(0, 1),
    ...vis.filter((s) => s.tipo !== "hero" && s.tipo !== "cupons" && s.tipo !== "contato"),
    ...vis.filter((s) => s.tipo === "cupons").slice(0, 1),
    ...vis.filter((s) => s.tipo === "contato").slice(0, 1),
  ];
}

export function contatoWhatsapp(sections: SiteSection[]) {
  return sections.find((s) => s.tipo === "contato")?.dados?.whatsapp as string | undefined;
}
