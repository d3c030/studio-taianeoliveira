import { createFileRoute } from "@tanstack/react-router";
import { MidiaKitEditor } from "@/modules/midiakit/pages/pages";

export const Route = createFileRoute("/midiakit/$kitId")({
  head: () => ({
    meta: [
      { title: "Editar Mídia Kit — Studio Taiane Oliveira" },
      { name: "description", content: "Preencha dados, fotos e textos do Mídia Kit." },
      { property: "og:title", content: "Editar Mídia Kit — Studio Taiane Oliveira" },
      { property: "og:description", content: "Preencha dados, fotos e textos do Mídia Kit." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <MidiaKitEditor kitId={Route.useParams().kitId} />,
});
