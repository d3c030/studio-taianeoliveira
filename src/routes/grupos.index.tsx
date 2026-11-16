import { createFileRoute } from "@tanstack/react-router";
import { GruposLista } from "@/modules/grupos/pages";

const t = "Check de Grupos — Studio Taiane Oliveira";
const d = "Confira quem cumpriu a missão nos grupos de engajamento do Instagram.";
export const Route = createFileRoute("/grupos/")({
  head: () => ({ meta: [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
  component: GruposLista,
});
