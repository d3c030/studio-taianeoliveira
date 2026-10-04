import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Instagram, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listClientes } from "../lib/api";
import { ClienteAvatar } from "../components/ClienteAvatar";
import { ClienteDialog } from "../components/ClienteDialog";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function DiagnosticosHome() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [open, setOpen] = useState(false);
  const q = useQuery({ queryKey: ["diag-clientes"], queryFn: listClientes });

  const filtradas = useMemo(() => {
    const t = norm(busca.trim().replace(/^@/, ""));
    if (!t) return q.data ?? [];
    return (q.data ?? []).filter((c) => norm(c.nome).includes(t) || norm(c.instagram ?? "").includes(t));
  }, [q.data, busca]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Diagnósticos</h1>
          <p className="text-sm text-muted-foreground">Clientes e análises de perfil</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Nova cliente
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por nome ou @" className="pl-9" />
      </div>

      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : q.error ? (
        <p className="text-sm text-destructive">Erro ao carregar clientes.</p>
      ) : !q.data?.length ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <ClipboardCheck className="mx-auto mb-3 h-8 w-8 text-primary" />
          <p className="font-medium">Nenhuma cliente ainda</p>
          <p className="text-sm text-muted-foreground mb-4">Cadastre a primeira para começar um diagnóstico.</p>
          <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Cadastrar cliente</Button>
        </div>
      ) : !filtradas.length ? (
        <p className="text-sm text-muted-foreground text-center py-8">Nenhuma cliente encontrada para "{busca}".</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtradas.map((c) => (
            <Link
              key={c.id}
              to="/diagnosticos/clientes/$clienteId"
              params={{ clienteId: c.id }}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent/50"
            >
              <ClienteAvatar path={c.foto_perfil} nome={c.nome} />
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{c.nome}</p>
                {c.instagram && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                    <Instagram className="h-3.5 w-3.5" />@{c.instagram}
                  </p>
                )}
              </div>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground whitespace-nowrap">
                {c.total} {c.total === 1 ? "diagnóstico" : "diagnósticos"}
              </span>
            </Link>
          ))}
        </div>
      )}

      <ClienteDialog
        open={open}
        onOpenChange={setOpen}
        onSaved={() => qc.invalidateQueries({ queryKey: ["diag-clientes"] })}
      />
    </div>
  );
}
