import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/atendimentos")({
  beforeLoad: () => { throw redirect({ to: "/agenda", search: { tab: "agendamentos" } }); },
});
