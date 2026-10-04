import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, FileEdit, CheckCircle2, UserPlus, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Row = {
  id: string;
  titulo: string;
  status: string;
  criado_em: string;
  atualizado_em: string;
  cliente: { nome: string; instagram: string | null; objetivo: string | null } | null;
};

type Filtro = "todos" | "rascunho" | "finalizado";

const diasAtras = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
const quando = (iso: string) => {
  const d = diasAtras(iso);
  return d <= 0 ? "hoje" : d === 1 ? "ontem" : `há ${d} dias`;
};

export function ConsultoriasPainel() {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const q = useQuery({
    queryKey: ["painel-consultorias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("diag_diagnosticos")
        .select("id, titulo, status, criado_em, atualizado_em, cliente:diag_clientes(nome, instagram, objetivo)")
        .order("atualizado_em", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });
  const rows = q.data ?? [];

  const stats = useMemo(() => {
    const rascunho = rows.filter((r) => r.status !== "finalizado").length;
    const finalizado = rows.length - rascunho;
    const novos = rows.filter((r) => diasAtras(r.criado_em) <= 7).length;
    const objetivos = new Map<string, number>();
    for (const r of rows) {
      for (const o of (r.cliente?.objetivo ?? "").split(/[,;/]| e /)) {
        const k = o.trim().toLowerCase();
        if (k) objetivos.set(k, (objetivos.get(k) ?? 0) + 1);
      }
    }
    const top = [...objetivos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
    return { rascunho, finalizado, novos, top };
  }, [rows]);

  const lista = rows
    .filter((r) => filtro === "todos" || (filtro === "finalizado" ? r.status === "finalizado" : r.status !== "finalizado"))
    .slice(0, 8);
  const pct = rows.length ? Math.round((stats.finalizado / rows.length) * 100) : 0;

  const Mini = ({ icon: Icon, label, value, hint }: { icon: typeof ClipboardCheck; label: string; value: number | string; hint?: string }) => (
    <div className="rounded-xl border border-border/70 bg-card p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><Icon className="h-3.5 w-3.5 text-primary" />{label}</div>
      <div className="mt-1 font-display text-2xl tracking-tight">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-4 w-4 text-primary" /> Consultorias
        </CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link to="/diagnosticos">Ver todas <ArrowRight className="h-4 w-4" /></Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Mini icon={ClipboardCheck} label="Total" value={rows.length} />
          <Mini icon={FileEdit} label="Em andamento" value={stats.rascunho} hint="rascunhos a terminar" />
          <Mini icon={CheckCircle2} label="Finalizadas" value={stats.finalizado} hint={`${pct}% do total`} />
          <Mini icon={UserPlus} label="Novas (7 dias)" value={stats.novos} hint="inclui cadastros do site" />
        </div>

        <div>
          <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>Andamento geral</span><span>{pct}% concluído</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {stats.top.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted-foreground">O que as clientes buscam:</span>
            {stats.top.map(([k, v]) => (
              <span key={k} className="rounded-full bg-secondary px-2.5 py-1 capitalize text-secondary-foreground">{k} · {v}</span>
            ))}
          </div>
        )}

        <div className="flex gap-1 rounded-lg bg-muted p-1 text-sm w-fit">
          {([["todos", "Todas"], ["rascunho", "Em andamento"], ["finalizado", "Finalizadas"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)}
              className={`rounded-md px-3 py-1 transition ${filtro === k ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>{l}</button>
          ))}
        </div>

        {q.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : lista.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma consultoria aqui ainda.</p>
        ) : (
          <ul className="divide-y divide-border/70">
            {lista.map((r) => {
              const fin = r.status === "finalizado";
              return (
                <li key={r.id}>
                  <Link to="/diagnosticos/editor/$diagnosticoId" params={{ diagnosticoId: r.id }}
                    className="flex items-center gap-3 py-2.5 hover:bg-muted/50 rounded-md px-2 -mx-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{r.cliente?.nome ?? "Cliente"}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {r.cliente?.instagram ? `@${r.cliente.instagram} · ` : ""}{r.cliente?.objetivo || r.titulo}
                      </div>
                    </div>
                    <span className="hidden text-xs text-muted-foreground sm:inline">{quando(r.atualizado_em)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${fin ? "bg-primary/10 text-primary" : "bg-accent text-accent-foreground"}`}>
                      {fin ? "Finalizada" : "Em andamento"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
