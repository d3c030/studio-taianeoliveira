import { createFileRoute } from "@tanstack/react-router";
import { Relatorios } from "@/modules/site/pages/Relatorios";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios do site — Studio Taiane Oliveira" },
      { name: "description", content: "Visitas, origens e interesses de quem acessa a página." },
      { property: "og:title", content: "Relatórios do site — Studio Taiane Oliveira" },
      { property: "og:description", content: "Visitas, origens e interesses de quem acessa a página." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Relatorios,
});
