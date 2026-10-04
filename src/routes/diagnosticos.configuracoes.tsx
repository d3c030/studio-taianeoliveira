import { createFileRoute } from "@tanstack/react-router";
import { DiagConfiguracoes } from "@/modules/diagnosticos/pages/DiagConfiguracoes";

export const Route = createFileRoute("/diagnosticos/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações dos Diagnósticos — Studio Taiane Oliveira" },
      { name: "description", content: "Identidade do PDF e modelo de checklist dos diagnósticos." },
      { property: "og:title", content: "Configurações dos Diagnósticos — Studio Taiane Oliveira" },
      { property: "og:description", content: "Identidade do PDF e modelo de checklist dos diagnósticos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DiagConfiguracoes,
});
