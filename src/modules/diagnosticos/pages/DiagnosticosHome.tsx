import { ClipboardCheck } from "lucide-react";

export function DiagnosticosHome() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Diagnósticos</h1>
      <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground">
        <ClipboardCheck className="mx-auto mb-3 h-8 w-8 text-primary" />
        <p>Módulo em construção — a lista de clientes chega na próxima etapa.</p>
      </div>
    </div>
  );
}
