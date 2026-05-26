import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search } from "lucide-react";
import {
  fetchAppointments, fetchDistinctProcedures, createAppointment,
  updateAppointment, deleteAppointment, type Appointment,
} from "@/lib/data";
import { formatBRL, formatDateBR, weekdayBR } from "@/lib/format";
import { MonthPicker } from "@/components/MonthPicker";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/atendimentos")({
  head: () => ({ meta: [{ title: "Atendimentos — Studio Taiane Oliveira" }] }),
  component: AtendimentosPage,
});

function AtendimentosPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIdx, setMonthIdx] = useState(now.getMonth());
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);

  const qc = useQueryClient();
  const apptsQ = useQuery({
    queryKey: ["appts", year, monthIdx],
    queryFn: () => fetchAppointments(year, monthIdx),
  });
  const procsQ = useQuery({
    queryKey: ["procedures"],
    queryFn: fetchDistinctProcedures,
  });

  const filtered = useMemo(() => {
    const list = apptsQ.data ?? [];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(
      (a) =>
        a.client_name.toLowerCase().includes(q) ||
        (a.procedure ?? "").toLowerCase().includes(q)
    );
  }, [apptsQ.data, search]);

  const grouped = useMemo(() => {
    const byDate = new Map<string, Appointment[]>();
    filtered.forEach((a) => {
      const arr = byDate.get(a.date) ?? [];
      arr.push(a);
      byDate.set(a.date, arr);
    });
    return [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["appts"] });
    qc.invalidateQueries({ queryKey: ["procedures"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl">Atendimentos</h2>
          <p className="text-sm text-muted-foreground">
            {apptsQ.data?.length ?? 0} no mês · {formatBRL(
              (apptsQ.data ?? []).reduce((s, a) => s + Number(a.amount || 0), 0)
            )}
          </p>
        </div>
        <MonthPicker
          year={year}
          monthIdx={monthIdx}
          onChange={(y, m) => { setYear(y); setMonthIdx(m); }}
        />
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Procurar por cliente ou procedimento"
            className="pl-9 bg-card"
          />
        </div>
        <Button
          onClick={() => { setEditing(null); setDialogOpen(true); }}
          className="hidden sm:inline-flex"
        >
          <Plus className="h-4 w-4 mr-1" /> Novo
        </Button>
      </div>

      {apptsQ.isLoading ? (
        <p className="text-sm text-muted-foreground py-10 text-center">A carregar...</p>
      ) : grouped.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          Sem atendimentos neste mês.
        </Card>
      ) : (
        <div className="space-y-5">
          {grouped.map(([date, items]) => {
            const total = items.reduce((s, a) => s + Number(a.amount || 0), 0);
            return (
              <section key={date}>
                <div className="flex items-baseline justify-between mb-2 px-1">
                  <h3 className="text-sm font-medium">
                    {formatDateBR(date)}
                    <span className="text-muted-foreground ml-2 capitalize text-xs">
                      {weekdayBR(date)}
                    </span>
                  </h3>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {formatBRL(total)}
                  </span>
                </div>
                <Card className="divide-y divide-border/70 overflow-hidden">
                  {items.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => { setEditing(a); setDialogOpen(true); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/60 transition-colors"
                    >
                      <div className="w-12 shrink-0 text-sm font-medium tabular-nums text-primary">
                        {a.time?.slice(0, 5) ?? "--:--"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{a.client_name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {a.procedure || "—"}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-sm font-semibold tabular-nums">
                          {formatBRL(Number(a.amount))}
                        </span>
                        {a.payment_method && (
                          <Badge variant="secondary" className="text-[10px] font-normal">
                            {a.payment_method}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </Card>
              </section>
            );
          })}
        </div>
      )}

      {/* Floating add button (mobile) */}
      <Button
        onClick={() => { setEditing(null); setDialogOpen(true); }}
        className="sm:hidden fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full shadow-lg p-0"
        aria-label="Novo atendimento"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <AppointmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        procedureSuggestions={procsQ.data}
        onSubmit={async (data) => {
          try {
            if (editing) {
              await updateAppointment(editing.id, data);
              toast.success("Atendimento atualizado");
            } else {
              await createAppointment(data);
              toast.success("Atendimento adicionado");
            }
            invalidate();
          } catch (e) {
            toast.error("Erro ao guardar");
            throw e;
          }
        }}
        onDelete={
          editing
            ? async () => {
                try {
                  await deleteAppointment(editing.id);
                  toast.success("Atendimento apagado");
                  invalidate();
                } catch {
                  toast.error("Erro ao apagar");
                }
              }
            : undefined
        }
      />
    </div>
  );
}
