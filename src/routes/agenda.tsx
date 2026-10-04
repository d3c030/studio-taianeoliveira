import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { CalendarCheck, CalendarDays, Users } from "lucide-react";
import { AtendimentosPage } from "@/components/pages/AtendimentosCalendario";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AgendaPage } from "@/components/pages/AgendaDias";
import { ClientsPage } from "@/components/pages/ClientesLista";

export const Route = createFileRoute("/agenda")({
  validateSearch: (s) => z.object({ tab: z.enum(["agendamentos", "calendario", "clientes"]).optional() }).parse(s),
  head: () => ({ meta: [{ title: "Agenda e Clientes — Studio Taiane Oliveira" }] }),
  component: Page,
});

function Page() {
  const { tab = "agendamentos" } = Route.useSearch();
  const navigate = useNavigate({ from: "/agenda" });
  return (
    <Tabs value={tab} onValueChange={(v) => navigate({ search: { tab: v as "agendamentos" | "calendario" | "clientes" }, replace: true })} className="space-y-6">
      <TabsList>
        <TabsTrigger value="agendamentos" className="gap-2"><CalendarDays className="h-4 w-4" /> Agendamentos</TabsTrigger>
        <TabsTrigger value="calendario" className="gap-2"><CalendarCheck className="h-4 w-4" /> Dias abertos</TabsTrigger>
        <TabsTrigger value="clientes" className="gap-2"><Users className="h-4 w-4" /> Clientes</TabsTrigger>
      </TabsList>
      <TabsContent value="agendamentos"><AtendimentosPage /></TabsContent>
      <TabsContent value="calendario"><AgendaPage /></TabsContent>
      <TabsContent value="clientes"><ClientsPage /></TabsContent>
    </Tabs>
  );
}
