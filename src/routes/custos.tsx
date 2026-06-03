import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, TrendingDown, TrendingUp, Minus } from "lucide-react";
import {
  fetchExpenses, createExpense, updateExpense, deleteExpense, fetchExpensesRange, type Expense,
} from "@/lib/data";
import { formatBRL, formatDateBR } from "@/lib/format";
import { MonthPicker } from "@/components/MonthPicker";
import { ExpenseDialog } from "@/components/ExpenseDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/custos")({
  head: () => ({ meta: [{ title: "Custos — Studio Taiane Oliveira" }] }),
  component: CustosPage,
});

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function CustosPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIdx, setMonthIdx] = useState(now.getMonth());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const qc = useQueryClient();
  const expQ = useQuery({
    queryKey: ["expenses", year, monthIdx],
    queryFn: () => fetchExpenses(year, monthIdx),
  });

  // BI: last 6 months range
  const biRange = useMemo(() => {
    const end = new Date(year, monthIdx + 1, 0); // last day of selected month
    const start = new Date(year, monthIdx - 5, 1); // 5 months before, day 1
    return { startDate: isoDate(start), endDate: isoDate(end) };
  }, [year, monthIdx]);

  const biQ = useQuery({
    queryKey: ["expenses-range", biRange.startDate, biRange.endDate],
    queryFn: () => fetchExpensesRange(biRange.startDate, biRange.endDate),
  });

  const total = useMemo(
    () => (expQ.data ?? []).reduce((s, e) => s + Number(e.total || 0), 0),
    [expQ.data]
  );

  // Category aggregation for selected month
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    (expQ.data ?? []).forEach((e) => {
      const cat = (e.category?.trim() || "Sem categoria");
      map.set(cat, (map.get(cat) ?? 0) + Number(e.total || 0));
    });
    return Array.from(map.entries())
      .map(([category, value]) => ({ category, value }))
      .sort((a, b) => b.value - a.value);
  }, [expQ.data]);

  // MoM aggregation: last 6 months totals
  const momData = useMemo(() => {
    const buckets = new Map<string, number>();
    // seed 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, monthIdx - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets.set(key, 0);
    }
    (biQ.data ?? []).forEach((e) => {
      const key = e.date.slice(0, 7); // YYYY-MM
      if (buckets.has(key)) {
        buckets.set(key, (buckets.get(key) ?? 0) + Number(e.total || 0));
      }
    });
    return Array.from(buckets.entries()).map(([key, value]) => {
      const [, m] = key.split("-");
      return { month: MONTHS_SHORT[Number(m) - 1], value, key };
    });
  }, [biQ.data, year, monthIdx]);

  const momCompare = useMemo(() => {
    if (momData.length < 2) return null;
    const current = momData[momData.length - 1].value;
    const previous = momData[momData.length - 2].value;
    const diff = current - previous;
    const pct = previous > 0 ? (diff / previous) * 100 : null;
    return { current, previous, diff, pct };
  }, [momData]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["expenses"] });
    qc.invalidateQueries({ queryKey: ["expenses-range"] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl">Custos</h2>
          <p className="text-sm text-muted-foreground">
            {expQ.data?.length ?? 0} despesa{(expQ.data?.length ?? 0) === 1 ? "" : "s"} · {formatBRL(total)}
          </p>
        </div>
        <MonthPicker
          year={year}
          monthIdx={monthIdx}
          onChange={(y, m) => { setYear(y); setMonthIdx(m); }}
        />
      </div>

      <Tabs defaultValue="lista" className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="lista">Despesas</TabsTrigger>
            <TabsTrigger value="bi">Análise (BI)</TabsTrigger>
          </TabsList>
          <Button
            onClick={() => { setEditing(null); setDialogOpen(true); }}
            className="hidden sm:inline-flex"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" /> Novo custo
          </Button>
        </div>

        <TabsContent value="lista" className="space-y-4">
          {expQ.isLoading ? (
            <p className="text-sm text-muted-foreground py-10 text-center">A carregar...</p>
          ) : (expQ.data?.length ?? 0) === 0 ? (
            <Card className="p-10 text-center text-muted-foreground">
              Sem custos registados neste mês.
            </Card>
          ) : (
            <Card className="divide-y divide-border/70 overflow-hidden">
              {(expQ.data ?? []).map((e) => (
                <button
                  key={e.id}
                  onClick={() => { setEditing(e); setDialogOpen(true); }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/60 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{e.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateBR(e.date)} · {Number(e.quantity)} × {formatBRL(Number(e.unit_price))}
                      {e.category ? ` · ${e.category}` : ""}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-sm font-semibold tabular-nums text-destructive">
                      −{formatBRL(Number(e.total))}
                    </span>
                    {e.payment_method && (
                      <Badge variant="secondary" className="text-[10px] font-normal">
                        {e.payment_method}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="bi" className="space-y-6">
          {/* MoM summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Mês selecionado</div>
              <div className="text-2xl font-semibold tabular-nums mt-1">
                {formatBRL(momCompare?.current ?? 0)}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Mês anterior</div>
              <div className="text-2xl font-semibold tabular-nums mt-1">
                {formatBRL(momCompare?.previous ?? 0)}
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-xs text-muted-foreground">Variação (MoM)</div>
              <div className={cn(
                "text-2xl font-semibold tabular-nums mt-1 flex items-center gap-1",
                momCompare && momCompare.diff > 0 && "text-destructive",
                momCompare && momCompare.diff < 0 && "text-success",
              )}>
                {momCompare && momCompare.diff > 0 && <TrendingUp className="h-5 w-5" />}
                {momCompare && momCompare.diff < 0 && <TrendingDown className="h-5 w-5" />}
                {momCompare && momCompare.diff === 0 && <Minus className="h-5 w-5" />}
                {momCompare ? (momCompare.diff >= 0 ? "+" : "") + formatBRL(momCompare.diff) : "—"}
                {momCompare?.pct !== null && momCompare?.pct !== undefined && (
                  <span className="text-sm text-muted-foreground font-normal">
                    ({momCompare.pct >= 0 ? "+" : ""}{momCompare.pct.toFixed(1)}%)
                  </span>
                )}
              </div>
            </Card>
          </div>

          {/* MoM bar chart */}
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">Evolução dos últimos 6 meses</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={momData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" tickFormatter={(v) => `R$ ${v}`} />
                  <Tooltip
                    formatter={(v: number) => formatBRL(v)}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                    }}
                  />
                  <Legend />
                  <Bar dataKey="value" name="Despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Category breakdown */}
          <Card className="p-4">
            <h3 className="text-sm font-medium mb-3">Despesas por categoria (mês selecionado)</h3>
            {byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Sem dados para este mês.
              </p>
            ) : (
              <div className="space-y-2">
                {byCategory.map((c) => {
                  const pct = total > 0 ? (c.value / total) * 100 : 0;
                  return (
                    <div key={c.category} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{c.category}</span>
                        <span className="tabular-nums text-muted-foreground">
                          {formatBRL(c.value)} · {pct.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <Button
        onClick={() => { setEditing(null); setDialogOpen(true); }}
        className="sm:hidden fixed bottom-20 right-4 z-30 h-14 w-14 rounded-full shadow-lg p-0"
        aria-label="Novo custo"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <ExpenseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
        onSubmit={async (data) => {
          try {
            if (editing) {
              await updateExpense(editing.id, data);
              toast.success("Custo atualizado");
            } else {
              await createExpense(data);
              toast.success("Custo adicionado");
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
                  await deleteExpense(editing.id);
                  toast.success("Custo apagado");
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
