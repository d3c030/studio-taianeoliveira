import { createFileRoute } from "@tanstack/react-router";
import { GrupoDetalhe } from "@/modules/grupos/pages";

const t = "Grupo — Check de Grupos";
const d = "Rodada do dia, participantes, lista da semana e histórico do grupo.";
export const Route = createFileRoute("/grupos/$grupoId")({
  head: () => ({ meta: [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: function P() { const { grupoId } = Route.useParams(); return <GrupoDetalhe grupoId={grupoId} />; },
});
