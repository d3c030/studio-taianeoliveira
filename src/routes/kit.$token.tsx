import { createFileRoute } from "@tanstack/react-router";
import { getMidiaKitPublico } from "@/lib/midiakit.functions";
import { MidiaKitView } from "@/modules/midiakit/MidiaKitView";

export const Route = createFileRoute("/kit/$token")({
  loader: ({ params }) => getMidiaKitPublico({ data: { token: params.token } }),
  head: ({ loaderData }) => {
    const nome = loaderData?.textos?.titulo || loaderData?.dados?.nome || "Mídia Kit";
    const desc = loaderData?.textos?.slogan || "Mídia Kit para parcerias com marcas.";
    const meta: any[] = [
      { title: `${nome} — Mídia Kit` },
      { name: "description", content: desc },
      { property: "og:title", content: `${nome} — Mídia Kit` },
      { property: "og:description", content: desc },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: loaderData?.dados?.capa ? "summary_large_image" : "summary" },
    ];
    if (loaderData?.dados?.capa) meta.push({ property: "og:image", content: loaderData.dados.capa }, { name: "twitter:image", content: loaderData.dados.capa });
    return { meta };
  },
  component: Page,
});

function Page() {
  const k = Route.useLoaderData();
  if (!k) return <div className="flex min-h-screen items-center justify-center p-6 text-center text-muted-foreground">Este Mídia Kit não está disponível.</div>;
  return (
    <main className="min-h-screen bg-background py-0 sm:py-8">
      <MidiaKitView dados={k.dados} textos={k.textos} fotos={k.fotos ?? []} />
    </main>
  );
}
