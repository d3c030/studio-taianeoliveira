import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import defaultLogo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { loadPublishedPage } from "../lib/api";
import { SectionView, contatoWhatsapp } from "../components/SectionView";

export function Landing() {
  const q = useQuery({ queryKey: ["site-publicado"], queryFn: loadPublishedPage });
  const sections = (q.data?.pagina.sections ?? []).filter((s) => s.visivel !== false);
  const wa = contatoWhatsapp(sections);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-center py-6">
        <img src={defaultLogo} alt="Studio Taiane Oliveira" className="h-16 w-auto" />
      </header>
      <main className="flex-1">
        {q.isLoading ? (
          <p className="py-20 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : sections.length ? (
          sections.map((s) => <SectionView key={s.id} s={s} whatsapp={wa} />)
        ) : (
          <div className="mx-auto max-w-md px-5 py-20 text-center">
            <h1 className="text-2xl font-semibold">Studio Taiane Oliveira</h1>
            <p className="mt-3 text-muted-foreground">Em breve, novidades por aqui.</p>
          </div>
        )}
      </main>
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        <Button asChild variant="link" size="sm"><Link to="/login">Área do gestor</Link></Button>
      </footer>
    </div>
  );
}
