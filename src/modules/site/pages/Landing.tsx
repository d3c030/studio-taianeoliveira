import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import defaultLogo from "@/assets/logo.png";
import { Button } from "@/components/ui/button";
import { loadPublishedPage, type SiteSection } from "../lib/api";

function Section({ s }: { s: SiteSection }) {
  const d = s.dados ?? {};
  return (
    <section className="mx-auto w-full max-w-3xl px-5 py-12 text-center">
      {d.titulo && <h2 className="text-2xl font-semibold sm:text-3xl">{d.titulo}</h2>}
      {d.subtitulo && <p className="mt-3 text-muted-foreground">{d.subtitulo}</p>}
      {d.texto && <p className="mt-4 whitespace-pre-line text-left">{d.texto}</p>}
    </section>
  );
}

export function Landing() {
  const q = useQuery({ queryKey: ["site-publicado"], queryFn: loadPublishedPage });
  const sections = (q.data?.pagina.sections ?? []).filter((s) => s.visivel !== false);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-center py-6">
        <img src={defaultLogo} alt="Studio Taiane Oliveira" className="h-16 w-auto" />
      </header>
      <main className="flex-1">
        {q.isLoading ? (
          <p className="py-20 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : sections.length ? (
          sections.map((s) => <Section key={s.id} s={s} />)
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
