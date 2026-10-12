import { createFileRoute } from "@tanstack/react-router";
import { MidiaKitLista } from "@/modules/midiakit/pages/pages";

export const Route = createFileRoute("/midiakit/")({
  head: () => ({
    meta: [
      { title: "Mídia Kit — Studio Taiane Oliveira" },
      { name: "description", content: "Crie Mídia Kits profissionais para influenciadoras." },
      { property: "og:title", content: "Mídia Kit — Studio Taiane Oliveira" },
      { property: "og:description", content: "Crie Mídia Kits profissionais para influenciadoras." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MidiaKitLista,
});
