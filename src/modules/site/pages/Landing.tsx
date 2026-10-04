import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Instagram } from "lucide-react";
import defaultLogo from "@/assets/logo.png";
import { getPublicContactSettings } from "@/lib/settings.functions";
import { loadPublishedPage } from "../lib/api";
import { FloatingWhatsApp, Hero, SectionView, contatoWhatsapp, orderSections } from "../components/SectionView";

export function Landing() {
  const q = useQuery({ queryKey: ["site-publicado"], queryFn: loadPublishedPage });
  const st = useQuery({ queryKey: ["public-contact-settings"], queryFn: () => getPublicContactSettings() });
  const logo = st.data?.logo_url || defaultLogo;
  const sections = orderSections(q.data?.pagina.sections ?? []);
  const wa = contatoWhatsapp(sections) || st.data?.whatsapp_phone;
  const hasHero = sections.some((s) => s.tipo === "hero");
  const ig = st.data?.instagram_url;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {!hasHero && !q.isLoading && <Hero d={{ titulo: "Studio Taiane Oliveira", subtitulo: "Em breve, novidades por aqui." }} logo={logo} />}
      <main className="flex-1">
        {q.isLoading ? (
          <div className="flex min-h-screen items-center justify-center">
            <div className="relative flex h-32 w-32 items-center justify-center">
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
              <div className="h-24 w-24 overflow-hidden rounded-full animate-pulse"><img src={logo} alt="Carregando" className="h-full w-full scale-150 object-cover object-[center_60%]" style={{ transformOrigin: "center 65%" }} /></div>
            </div>
          </div>
        ) : (
          sections.map((s) => <SectionView key={s.id} s={s} whatsapp={wa} logo={logo} />)
        )}
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 px-5 py-10 text-sm text-muted-foreground">
          <img src={logo} alt="Studio Taiane Oliveira" className="h-12 w-auto opacity-80" />
          {ig && <a href={ig} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-primary"><Instagram className="h-4 w-4" />Instagram</a>}
          <p>© {new Date().getFullYear()} Studio Taiane Oliveira</p>
          <Link to="/login" className="text-xs hover:text-primary">Área do gestor</Link>
        </div>
      </footer>
      <FloatingWhatsApp phone={wa} />
    </div>
  );
}
