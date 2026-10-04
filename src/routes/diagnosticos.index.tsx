import { createFileRoute } from "@tanstack/react-router";
import { DiagnosticosHome } from "@/modules/diagnosticos/pages/DiagnosticosHome";

export const Route = createFileRoute("/diagnosticos/")({
  head: () => ({
    meta: [
      { title: "Diagnósticos — Studio Taiane Oliveira" },
      { name: "description", content: "Diagnósticos de perfil de Instagram das clientes." },
      { property: "og:title", content: "Diagnósticos — Studio Taiane Oliveira" },
      { property: "og:description", content: "Diagnósticos de perfil de Instagram das clientes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DiagnosticosHome,
});
