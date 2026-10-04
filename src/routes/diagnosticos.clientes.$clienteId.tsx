import { createFileRoute } from "@tanstack/react-router";
import { ClientePerfil } from "@/modules/diagnosticos/pages/ClientePerfil";

export const Route = createFileRoute("/diagnosticos/clientes/$clienteId")({
  head: () => ({
    meta: [
      { title: "Perfil da cliente — Diagnósticos" },
      { name: "description", content: "Dados da cliente e histórico de diagnósticos de perfil." },
      { property: "og:title", content: "Perfil da cliente — Diagnósticos" },
      { property: "og:description", content: "Dados da cliente e histórico de diagnósticos de perfil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const { clienteId } = Route.useParams();
  return <ClientePerfil clienteId={clienteId} />;
}
