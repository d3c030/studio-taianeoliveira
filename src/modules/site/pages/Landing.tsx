import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, ChevronDown, Copy, ExternalLink, Handshake, Instagram, Loader2, Mail, Menu, MessageSquareText, Search, Send, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import defaultLogo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { getPublicContactSettings } from "@/lib/settings.functions";
import { submitSiteLead } from "@/lib/site-leads.functions";
import { loadPublishedPage } from "../lib/api";
import { contatoWhatsapp, orderSections } from "../components/SectionView";
import { waLink } from "../lib/sections";

/* ====== Conteúdo fácil de editar ====== */
const SERVICOS = [
  { icon: Search, nome: "Análise de Perfil", objetivo: "Análise de perfil", preco: "a partir de R$ ___", desc: "Diagnóstico completo do seu perfil com relatório e pontos de melhoria.", inclui: ["Bio e destaques", "Feed e linha editorial", "Conteúdo e métricas", "Relatório em PDF"] },
  { icon: MessageSquareText, nome: "Consultoria 1:1", objetivo: "Consultoria 1:1", preco: "a partir de R$ ___", desc: "Sessão individual para montar sua estratégia de crescimento.", inclui: ["Estratégia de conteúdo", "Engajamento", "Crescimento de seguidores", "Plano de ação"] },
  { icon: Handshake, nome: "Mentoria para Parcerias", objetivo: "Atrair marcas", preco: "a partir de R$ ___", desc: "Posicionamento e abordagem para atrair e negociar com marcas.", inclui: ["Posicionamento", "Mídia kit", "Abordagem às marcas", "Negociação"] },
];
const PASSOS = [
  ["Preencha o cadastro", "Conte seu objetivo e seu @."],
  ["Receba o diagnóstico", "Analiso seu perfil e te mostro o que ajustar."],
  ["Coloque o plano em ação", "Estratégia clara para crescer e atrair marcas."],
];
const NUMEROS = [["+X mil", "seguidores"], ["+X", "parcerias fechadas"], ["X anos", "criando conteúdo"]];
const FAQ = [
  ["A consultoria é online?", "Sim, 100% online, por videochamada e WhatsApp."],
  ["Para quem é indicada?", "Influenciadores e aspirantes de beleza, moda e lifestyle."],
  ["Quanto tempo dura?", "[Defina a duração da consultoria]"],
  ["Preciso ter muitos seguidores?", "Não, a estratégia se adapta ao momento do seu perfil."],
  ["Como funciona o pagamento?", "[Descreva as formas de pagamento]"],
];
const EMAIL = "[seu-email@exemplo.com]";
const OBJETIVOS = ["Engajamento", "Seguidores", "Atrair marcas", "Organizar o perfil", "Análise de perfil", "Consultoria 1:1"];
const NAV = [["Serviços", "#servicos"], ["Sobre", "#sobre"], ["Parcerias", "#parcerias"], ["Contato", "#contato"]];

type Cupom = { id: string; codigo: string; empresa: string; titulo: string; desconto: string; logo_url: string | null };

function Reveal({ children, id, className = "" }: { children: React.ReactNode; id?: string; className?: string }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add("is-visible"); io.disconnect(); } }, { threshold: 0.1 });
    io.observe(el); return () => io.disconnect();
  }, []);
  return <section ref={ref} id={id} className={`reveal scroll-mt-20 ${className}`}><div className="mx-auto w-full max-w-6xl px-5 py-20 sm:py-24">{children}</div></section>;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand">{children}</p>;
}
function Title({ eyebrow, titulo, sub }: { eyebrow: string; titulo: string; sub?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">{titulo}</h2>
      {sub && <p className="mt-3 text-muted-foreground">{sub}</p>}
    </div>
  );
}

function WhatsIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.79h-.01a9.87 9.87 0 0 1-5.03-1.38l-.36-.21-3.74.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.51-5.26c0-5.45 4.44-9.88 9.89-9.88 2.64 0 5.12 1.03 6.99 2.9a9.82 9.82 0 0 1 2.89 6.99c0 5.45-4.44 9.88-9.88 9.88m8.41-18.3A11.82 11.82 0 0 0 12.05 0C5.5 0 .16 5.34.16 11.89c0 2.1.55 4.14 1.59 5.94L.06 24l6.3-1.65a11.88 11.88 0 0 0 5.68 1.45h.01c6.55 0 11.89-5.34 11.89-11.89 0-3.18-1.24-6.16-3.48-8.41" />
    </svg>
  );
}

const leadSchema = z.object({
  nome: z.string().trim().min(2, "Informe seu nome").max(100),
  instagram: z.string().trim().min(2, "Informe seu @").max(60),
  whatsapp: z.string().trim().refine((v) => v.replace(/\D/g, "").length >= 10, "WhatsApp com DDD"),
  email: z.string().trim().email("E-mail inválido").max(255),
  objetivo: z.string().trim().min(3, "Conte seu objetivo").max(1000),
});

function LeadForm({ phone, chips, setChips }: { phone?: string; chips: string[]; setChips: (c: string[]) => void }) {
  const [f, setF] = useState({ nome: "", instagram: "", whatsapp: "", email: "", detalhes: "" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const toggle = (o: string) => setChips(chips.includes(o) ? chips.filter((c) => c !== o) : [...chips, o]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const objetivo = [chips.join(", "), f.detalhes.trim()].filter(Boolean).join(" — ");
    const r = leadSchema.safeParse({ ...f, objetivo });
    if (!r.success) {
      const m: Record<string, string> = {};
      r.error.issues.forEach((i) => { m[String(i.path[0])] = i.message; });
      setErrs(m); return;
    }
    setErrs({});
    const ig = r.data.instagram.replace(/^@?/, "@");
    const msg = `Olá, Taiane! Tudo bem? 😊\nAcabei de preencher o cadastro para atendimento no seu site.\n\nNome: ${r.data.nome}\nInstagram: ${ig}\nE-mail: ${r.data.email}\nObjetivo: ${r.data.objetivo}`;
    const url = waLink(phone, msg);
    const win = url ? window.open("", "_blank") : null;
    setBusy(true);
    try {
      await submitSiteLead({ data: r.data });
      if (url) { if (win) win.location.href = url; else window.location.href = url; }
      toast.success("Cadastro enviado! Abrindo o WhatsApp…");
      setF({ nome: "", instagram: "", whatsapp: "", email: "", detalhes: "" }); setChips([]);
    } catch (err: any) {
      win?.close(); toast.error(err?.message ?? "Erro ao enviar");
    } finally { setBusy(false); }
  };

  const field = (k: "nome" | "instagram" | "whatsapp" | "email", label: string, props: React.ComponentProps<typeof Input>) => (
    <div className="space-y-1.5">
      <Label htmlFor={`lead-${k}`}>{label}</Label>
      <Input id={`lead-${k}`} value={f[k]} onChange={(e) => set(k, e.target.value)} className="h-11 bg-background" {...props} />
      {errs[k] && <p className="text-xs text-destructive">{errs[k]}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        {field("nome", "Nome", { placeholder: "Seu nome", autoComplete: "name", maxLength: 100 })}
        {field("instagram", "Instagram", { placeholder: "@seuperfil", maxLength: 60 })}
        {field("whatsapp", "WhatsApp", { placeholder: "(11) 99999-9999", inputMode: "tel", autoComplete: "tel", maxLength: 20 })}
        {field("email", "E-mail", { placeholder: "voce@email.com", type: "email", autoComplete: "email", maxLength: 255 })}
      </div>
      <div className="space-y-2">
        <div className="flex items-baseline justify-between"><Label>Objetivo</Label><span className="text-xs text-muted-foreground">Selecione uma ou mais</span></div>
        <div className="flex flex-wrap gap-2">
          {OBJETIVOS.map((o) => {
            const on = chips.includes(o);
            return (
              <button type="button" key={o} aria-pressed={on} onClick={() => toggle(o)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition-colors ${on ? "border-brand bg-brand text-ink-foreground" : "border-border hover:border-brand hover:text-brand"}`}>
                {on && <Check className="h-3 w-3" />}{o}
              </button>
            );
          })}
        </div>
        <Textarea rows={3} maxLength={800} value={f.detalhes} onChange={(e) => set("detalhes", e.target.value)} className="bg-background" placeholder="Quer contar mais? Fale do seu momento e do que precisa…" />
        {errs.objetivo && <p className="text-xs text-destructive">{errs.objetivo}</p>}
      </div>
      <Button type="submit" size="lg" className="h-12 w-full rounded-full bg-ink text-ink-foreground hover:bg-ink/90" disabled={busy}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}Enviar e falar no WhatsApp
      </Button>
      <div className="space-y-1 text-center text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Respondo em até 24h</p>
        <p>Seus dados são usados apenas para o seu atendimento. <Link to="/privacidade" className="underline hover:text-brand">Política de privacidade</Link></p>
      </div>
    </form>
  );
}

export function Landing() {
  const q = useQuery({ queryKey: ["site-publicado"], queryFn: loadPublishedPage });
  const st = useQuery({ queryKey: ["public-contact-settings"], queryFn: () => getPublicContactSettings() });
  const cq = useQuery({
    queryKey: ["site-cupons-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_cupons").select("id, codigo, empresa, titulo, desconto, logo_url").eq("ativo", true).order("ordem").order("criado_em");
      if (error) throw error;
      return (data ?? []) as Cupom[];
    },
  });
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [chips, setChips] = useState<string[]>([]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 10);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const logo = st.data?.logo_url || defaultLogo;
  const sections = orderSections(q.data?.pagina.sections ?? []);
  const get = (t: string) => sections.find((s) => s.tipo === t)?.dados ?? {};
  const sobre = get("sobre"), hero = get("hero"), cupSec = get("cupons"), gal = get("galeria");
  const wa = contatoWhatsapp(sections) || st.data?.whatsapp_phone;
  const ig = get("contato").instagram || st.data?.instagram_url;
  const fotoHero: string = sobre.imagem || hero.imagem || ""; // troque aqui para usar outra foto
  const fotos: { url: string; legenda?: string }[] = (gal.fotos ?? []).filter((f: any) => f?.url);
  const depo = ((get("depoimentos").itens ?? []) as any[]).filter((d) => d?.texto?.trim());
  const cupons = cq.data ?? [];
  const marcas = cupons.filter((c) => c.logo_url);
  const link = cupSec.link ? (/^https?:\/\//.test(cupSec.link) ? cupSec.link : `https://${cupSec.link}`) : "";
  const paragrafos: string[] = String(sobre.texto ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const queroEste = (obj: string) => {
    setChips((c) => (c.includes(obj) ? c : [...c, obj]));
    document.getElementById("contato")?.scrollIntoView({ behavior: "smooth" });
  };
  const copy = async (c: string) => { try { await navigator.clipboard.writeText(c); toast.success("Código copiado!"); } catch { /* ignore */ } };

  if (q.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="relative flex h-32 w-32 items-center justify-center">
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-brand/20 border-t-brand" />
          <div className="h-24 w-24 overflow-hidden rounded-full animate-pulse"><img src={logo} alt="Carregando" className="h-full w-full scale-150 object-cover object-[center_60%]" style={{ transformOrigin: "center 65%" }} /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Cabeçalho */}
      <header className={`fixed inset-x-0 top-0 z-40 transition-all ${scrolled || menu ? "border-b border-border bg-background/80 backdrop-blur-md" : "bg-transparent"}`}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <a href="#topo" className="font-display text-xl">Taiane Oliveira</a>
          <nav className="hidden items-center gap-7 text-sm md:flex">
            {NAV.map(([l, h]) => <a key={h} href={h} className="text-muted-foreground transition-colors hover:text-brand">{l}</a>)}
          </nav>
          <Button asChild size="sm" className="hidden rounded-full bg-ink text-ink-foreground hover:bg-ink/90 md:inline-flex"><a href="#contato">Agendar diagnóstico</a></Button>
          <button className="md:hidden" aria-label="Menu" onClick={() => setMenu((m) => !m)}>{menu ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}</button>
        </div>
        {menu && (
          <nav className="flex flex-col gap-1 border-t border-border px-5 pb-5 pt-2 md:hidden">
            {NAV.map(([l, h]) => <a key={h} href={h} onClick={() => setMenu(false)} className="py-2 text-base hover:text-brand">{l}</a>)}
            <Button asChild className="mt-2 rounded-full bg-ink text-ink-foreground hover:bg-ink/90"><a href="#contato" onClick={() => setMenu(false)}>Agendar diagnóstico</a></Button>
          </nav>
        )}
      </header>

      {/* Hero */}
      <section id="topo" className="pt-24 sm:pt-28">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 md:grid-cols-[1.1fr_1fr]">
          <div className="text-center md:text-left">
            <Eyebrow>Consultora especialista em redes sociais</Eyebrow>
            <h1 className="mt-4 font-display text-4xl leading-[1.08] sm:text-6xl">Transformo seu perfil em uma vitrine que atrai marcas</h1>
            <p className="mt-5 text-lg text-muted-foreground">Diagnóstico, estratégia e posicionamento para influenciadores de beleza, moda e lifestyle que querem crescer e fechar parcerias.</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row md:justify-start">
              <Button asChild size="lg" className="h-12 rounded-full bg-ink px-7 text-ink-foreground hover:bg-ink/90"><a href="#contato">Quero meu diagnóstico<ArrowRight className="ml-2 h-4 w-4" /></a></Button>
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-7"><a href="#como-funciona">Como funciona</a></Button>
            </div>
          </div>
          {fotoHero && <img src={fotoHero} alt="Taiane Oliveira" className="mx-auto aspect-[4/5] w-full max-w-md rounded-3xl object-cover object-top shadow-xl" />}
        </div>
        {marcas.length > 0 && (
          <div className="border-y border-border bg-secondary/30">
            <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-5 py-8 sm:flex-row">
              <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Já trabalhei com</p>
              <div className="flex flex-wrap items-center justify-center gap-6 sm:justify-start">
                {marcas.map((m) => <img key={m.id} src={m.logo_url!} alt={m.empresa} title={m.empresa} className="h-10 w-20 object-contain opacity-70 grayscale transition hover:opacity-100 hover:grayscale-0" loading="lazy" />)}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Serviços */}
      <Reveal id="servicos">
        <Title eyebrow="Serviços" titulo="Como posso te ajudar" />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {SERVICOS.map((s) => (
            <div key={s.nome} className="flex flex-col rounded-3xl border border-border bg-card p-7 shadow-sm transition-shadow hover:shadow-md">
              <s.icon className="h-7 w-7 text-brand" />
              <h3 className="mt-4 font-display text-2xl">{s.nome}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {s.inclui.map((i) => <li key={i} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-brand" />{i}</li>)}
              </ul>
              <p className="mt-5 text-sm font-medium text-muted-foreground">{s.preco}</p>
              <Button onClick={() => queroEste(s.objetivo)} className="mt-4 rounded-full bg-ink text-ink-foreground hover:bg-ink/90">Quero este</Button>
            </div>
          ))}
        </div>
      </Reveal>

      {/* Como funciona */}
      <Reveal id="como-funciona" className="bg-secondary/40">
        <Title eyebrow="Como funciona" titulo="Simples, do cadastro ao plano" />
        <ol className="mt-12 grid gap-8 md:grid-cols-3">
          {PASSOS.map(([t, d], i) => (
            <li key={t} className="text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-brand font-display text-2xl text-brand">{i + 1}</span>
              <h3 className="mt-4 font-display text-xl">{t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{d}</p>
            </li>
          ))}
        </ol>
      </Reveal>

      {/* Sobre */}
      <Reveal id="sobre">
        <div className="grid items-center gap-12 md:grid-cols-2">
          {sobre.imagem && <img src={sobre.imagem} alt={sobre.titulo || "Taiane Oliveira"} className="aspect-[4/5] w-full rounded-3xl object-cover shadow-md" loading="lazy" />}
          <div className={sobre.imagem ? "" : "md:col-span-2 text-center"}>
            <Eyebrow>Prazer, eu sou</Eyebrow>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl">{sobre.titulo || "Taiane Oliveira"}</h2>
            <div className="mt-5 space-y-4 leading-relaxed text-muted-foreground">{paragrafos.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}</div>
            <div className="mt-8 grid grid-cols-3 gap-4 border-t border-border pt-6">
              {NUMEROS.map(([n, l]) => <div key={l}><p className="font-display text-2xl text-brand sm:text-3xl">{n}</p><p className="mt-1 text-xs text-muted-foreground">{l}</p></div>)}
            </div>
          </div>
        </div>
      </Reveal>

      {/* Parcerias */}
      <Reveal id="parcerias" className="bg-secondary/40">
        <Title eyebrow="Parcerias ativas" titulo="Marcas que confiam no meu trabalho" sub="Parcerias fechadas com estratégia — é isso que eu te ensino. Aproveite também meus cupons exclusivos." />
        {fotos.length > 0 && (
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
        )}
        {cupons.length > 0 && (
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cupons.map((c) => (
              <div key={c.id} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-card p-2">
                  {c.logo_url ? <img src={c.logo_url} alt={c.empresa} className="h-full w-full object-contain" loading="lazy" /> : <span className="font-display text-xl">{(c.empresa || c.codigo)[0]}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{c.empresa || c.titulo}</p>
                  {c.desconto?.trim() && <p className="text-xs text-brand">{c.desconto}</p>}
                  <button onClick={() => copy(c.codigo)} className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-md border border-dashed border-brand/60 px-2 py-0.5 text-left font-mono text-xs text-brand hover:bg-brand/5 sm:text-sm">
                    <span className="break-all">{c.codigo}</span><Copy className="h-3 w-3 shrink-0" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {link && (
          <div className="mt-10 text-center">
            <Button asChild size="lg" variant="outline" className="rounded-full">
              <a href={link} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Ver todos os cupons e links</a>
            </Button>
          </div>
        )}
      </Reveal>

      {/* Formulário */}
      <Reveal id="contato">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div className="text-center lg:text-left">
            <Eyebrow>Atendimento</Eyebrow>
            <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">Quero levar meu perfil para o próximo nível</h2>
            <p className="mt-4 text-muted-foreground">Preencha o cadastro e continue a conversa comigo direto no WhatsApp.</p>
            <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
              {["Diagnóstico do seu perfil", "Estratégia para engajamento e seguidores", "Posicionamento para chamar a atenção das marcas"].map((t) => <li key={t} className="flex justify-center gap-2 lg:justify-start"><Check className="h-4 w-4 text-brand" />{t}</li>)}
            </ul>
          </div>
          <LeadForm phone={wa} chips={chips} setChips={setChips} />
        </div>
      </Reveal>

      {/* Depoimentos */}
      {depo.length > 0 && (
        <Reveal className="bg-secondary/40">
          <Title eyebrow="Depoimentos" titulo="Quem já passou por aqui" />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {depo.slice(0, 3).map((d, i) => (
              <figure key={i} className="flex flex-col rounded-3xl border border-border bg-card p-6">
                {d.resultado && <p className="font-display text-xl text-brand">{d.resultado}</p>}
                <blockquote className="mt-3 flex-1 leading-relaxed text-muted-foreground">“{d.texto}”</blockquote>
                <figcaption className="mt-5 flex items-center gap-3">
                  {d.foto && <img src={d.foto} alt={d.nome} className="h-10 w-10 rounded-full object-cover" />}
                  <div><p className="text-sm font-medium">{d.nome}</p>{d.instagram && <p className="text-xs text-muted-foreground">{d.instagram}</p>}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </Reveal>
      )}

      {/* FAQ */}
      <Reveal>
        <Title eyebrow="Dúvidas" titulo="Perguntas frequentes" />
        <div className="mx-auto mt-10 max-w-2xl divide-y divide-border rounded-3xl border border-border bg-card">
          {FAQ.map(([p, r]) => (
            <details key={p} className="group px-6 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">{p}<ChevronDown className="h-4 w-4 shrink-0 text-brand transition-transform group-open:rotate-180" /></summary>
              <p className="mt-3 text-sm text-muted-foreground">{r}</p>
            </details>
          ))}
        </div>
      </Reveal>

      {/* Rodapé */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-5 py-12 text-sm text-muted-foreground">
          <img src={logo} alt="Taiane Oliveira" className="h-14 w-14 rounded-full object-cover" />
          <div className="flex flex-wrap justify-center gap-5">
            {ig && <a href={ig} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-brand"><Instagram className="h-4 w-4" />Instagram</a>}
            {wa && <a href={waLink(wa, "Olá, Taiane! Vim pelo seu site.")} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-brand"><WhatsIcon className="h-4 w-4" />WhatsApp</a>}
            <span className="inline-flex items-center gap-1.5"><Mail className="h-4 w-4" />{EMAIL}</span>
          </div>
          <Link to="/privacidade" className="hover:text-brand">Política de privacidade</Link>
          <p>© 2026 Studio Taiane Oliveira</p>
          <Link to="/login" className="text-xs opacity-60 hover:text-brand">Área do gestor</Link>
        </div>
      </footer>

      {wa && (
        <a href={waLink(wa, "Olá, Taiane! Vim pelo seu site.")} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-whatsapp text-whatsapp-foreground shadow-xl transition-transform hover:scale-105">
          <WhatsIcon />
        </a>
      )}
    </div>
  );
}
