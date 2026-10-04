import { createFileRoute } from "@tanstack/react-router";
import { SiteEditor } from "@/modules/site/pages/SiteEditor";

export const Route = createFileRoute("/site")({
  head: () => ({
    meta: [
      { title: "Editor da página — Studio Taiane Oliveira" },
      { name: "description", content: "Monte e publique a página inicial do studio." },
      { property: "og:title", content: "Editor da página — Studio Taiane Oliveira" },
      { property: "og:description", content: "Monte e publique a página inicial do studio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SiteEditor,
});
