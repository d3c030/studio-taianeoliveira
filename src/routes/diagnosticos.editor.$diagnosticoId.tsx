import { createFileRoute } from "@tanstack/react-router";
import { DiagnosticoEditor } from "@/modules/diagnosticos/pages/DiagnosticoEditor";

export const Route = createFileRoute("/diagnosticos/editor/$diagnosticoId")({
  head: () => ({
    meta: [
      { title: "Editor de diagnóstico — Diagnósticos" },
      { name: "description", content: "Checklist, destaques visuais e plano de ação do diagnóstico de perfil." },
      { property: "og:title", content: "Editor de diagnóstico — Diagnósticos" },
      { property: "og:description", content: "Checklist, destaques visuais e plano de ação do diagnóstico de perfil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const { diagnosticoId } = Route.useParams();
  return <DiagnosticoEditor key={diagnosticoId} diagnosticoId={diagnosticoId} />;
}
