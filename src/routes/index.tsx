import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Wallet, Sparkles, CalendarRange, ClipboardList, Clock, Eye, Pencil } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import {
  fetchAppointments, fetchExpenses, fetchUpcomingAppointments,
  fetchDistinctProcedures, updateAppointment, updateAppointmentStatus,
  deleteAppointment, APPOINTMENT_STATUS_LABEL,
  type Appointment, type AppointmentStatus,
} from "@/lib/data";
import { formatBRL, PAYMENT_METHODS } from "@/lib/format";
import { MonthPicker } from "@/components/MonthPicker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppointmentDialog } from "@/components/AppointmentDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Painel — Studio Taiane Oliveira" }] }),
  component: Dashboard,
});

function StatCard({
  icon: Icon, label, value, accent, hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: "primary" | "success" | "destructive";
  hint?: string;
}) {
  const accentClass =
    accent === "success"
      ? "bg-[color:var(--success)]/12 text-[color:var(--success)]"
      : accent === "destructive"
      ? "bg-destructive/10 text-destructive"
      : "bg-primary/10 text-primary";
  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className={`h-9 w-9 rounded-full flex items-center justify-center ${accentClass}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="font-display text-3xl tracking-tight">{value}</div>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIdx, setMonthIdx] = useState(now.getMonth());

  const apptsQ = useQuery({
    queryKey: ["appts", year, monthIdx],
    queryFn: () => fetchAppointments(year, monthIdx),
  });
  const expQ = useQuery({
    queryKey: ["expenses", year, monthIdx],
    queryFn: () => fetchExpenses(year, monthIdx),
  });
  const upcomingQ = useQuery({
    queryKey: ["appts-upcoming"],
    queryFn: () => fetchUpcomingAppointments(),
  });

  const bruto = useMemo(
    () => (apptsQ.data ?? []).reduce((s, a) => s + Number(a.amount || 0), 0),
    [apptsQ.data]
  );
  const custos = useMemo(
    () => (expQ.data ?? []).reduce((s, e) => s + Number(e.total || 0), 0),
    [expQ.data]
  );
  const liquido = bruto - custos;

  const byPayment = useMemo(() => {
    const map = new Map<string, number>();
    PAYMENT_METHODS.forEach((p) => map.set(p, 0));
    (apptsQ.data ?? []).forEach((a) => {
      const k = a.payment_method?.trim() || "Outros";
      const normalized = PAYMENT_METHODS.find(
        (p) => p.toLowerCase() === k.toLowerCase()
      ) || k;
      map.set(normalized, (map.get(normalized) ?? 0) + Number(a.amount || 0));
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [apptsQ.data]);

  const maxPay = Math.max(1, ...byPayment.map(([, v]) => v));
  const total = apptsQ.data?.length ?? 0;

  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const isCurrentMonth =
    year === now.getFullYear() && monthIdx === now.getMonth();
  const todayDay = now.getDate();

  const dailyData = useMemo(() => {
    const sums = new Array(daysInMonth).fill(0) as number[];
    const counts = new Array(daysInMonth).fill(0) as number[];
    (apptsQ.data ?? []).forEach((a) => {
      // a.date is "YYYY-MM-DD"
      const d = Number(String(a.date).slice(8, 10));
      if (d >= 1 && d <= daysInMonth) {
        sums[d - 1] += Number(a.amount || 0);
        counts[d - 1] += 1;
      }
    });
    return sums.map((v, i) => ({
      day: i + 1,
      label: String(i + 1).padStart(2, "0"),
      value: v,
      count: counts[i],
      isToday: isCurrentMonth && i + 1 === todayDay,
      isFuture: isCurrentMonth && i + 1 > todayDay,
    }));
  }, [apptsQ.data, daysInMonth, isCurrentMonth, todayDay]);

  const bestDay = useMemo(() => {
    const ranked = [...dailyData].filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)[0];
    return ranked;
  }, [dailyData]);

  return (
    <div className="space-y-6">

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-3xl sm:text-4xl">Painel</h2>
          <p className="text-sm text-muted-foreground">Resumo financeiro do mês.</p>
        </div>
        <MonthPicker
          year={year}
          monthIdx={monthIdx}
          onChange={(y, m) => { setYear(y); setMonthIdx(m); }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <StatCard
          icon={TrendingUp}
          label="Faturamento Bruto"
          value={formatBRL(bruto)}
          accent="primary"
          hint={`${total} atendimento${total === 1 ? "" : "s"}`}
        />
        <StatCard
          icon={TrendingDown}
          label="Custos"
          value={formatBRL(custos)}
          accent="destructive"
          hint={`${expQ.data?.length ?? 0} despesa${(expQ.data?.length ?? 0) === 1 ? "" : "s"}`}
        />
        <StatCard
          icon={Wallet}
          label="Faturamento Líquido"
          value={formatBRL(liquido)}
          accent={liquido >= 0 ? "success" : "destructive"}
          hint="Bruto − Custos"
        />
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-primary" />
            A fazer
          </CardTitle>
          <span className="text-xs text-muted-foreground">
            {(upcomingQ.data?.length ?? 0)} agendamento{(upcomingQ.data?.length ?? 0) === 1 ? "" : "s"} futuro{(upcomingQ.data?.length ?? 0) === 1 ? "" : "s"}
          </span>
        </CardHeader>
        <CardContent>
          {upcomingQ.isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Carregando…</p>
          ) : (upcomingQ.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhum agendamento futuro. <Link to="/atendimentos" className="text-primary hover:underline">Novo atendimento</Link>
            </p>
          ) : (
            <ul className="divide-y divide-border/70">
              {(upcomingQ.data ?? []).slice(0, 12).map((a) => {
                const [y, m, d] = a.date.split("-");
                const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
                const dateLabel = dateObj.toLocaleDateString("pt-BR", {
                  weekday: "short", day: "2-digit", month: "short",
                });
                const time = a.time ? String(a.time).slice(0, 5) : null;
                const isToday = a.date === `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`;
                return (
                  <li key={a.id} className="flex items-center gap-3 py-3">
                    <div className={`h-10 w-10 rounded-full flex flex-col items-center justify-center text-[10px] font-medium ${isToday ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                      <span className="leading-none">{dateObj.toLocaleDateString("pt-BR", { day: "2-digit" })}</span>
                      <span className="leading-none mt-0.5 uppercase opacity-80">{dateObj.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{a.client_name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {a.procedure ?? "Atendimento"} · <span className="capitalize">{dateLabel}</span>
                        {time && (
                          <> · <Clock className="inline h-3 w-3 -mt-0.5" /> {time}</>
                        )}
                      </div>
                    </div>
                    {a.amount > 0 && (
                      <span className="text-sm tabular-nums text-muted-foreground">{formatBRL(Number(a.amount))}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>



      <Card className="border-border/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="h-4 w-4 text-primary" />
            Movimento por dia
          </CardTitle>
          {bestDay && (
            <span className="text-xs text-muted-foreground">
              Melhor dia: <span className="font-medium text-foreground">dia {bestDay.day}</span> · {formatBRL(bestDay.value)}
            </span>
          )}
        </CardHeader>
        <CardContent>
          {bruto === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">
              Sem atendimentos neste mês.
            </p>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    interval={0}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={0}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    tickFormatter={(v: number) =>
                      v >= 1000 ? `R$${(v / 1000).toFixed(1)}k` : `R$${v}`
                    }
                  />
                  <Tooltip
                    cursor={{ fill: "var(--accent)", opacity: 0.4 }}
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: number, _n, item: { payload?: { count?: number } }) => [
                      `${formatBRL(value)} · ${item?.payload?.count ?? 0} atend.`,
                      "Entradas",
                    ]}
                    labelFormatter={(l: string) => `Dia ${l}`}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {dailyData.map((d) => (
                      <Cell
                        key={d.day}
                        fill={
                          d.isFuture
                            ? "var(--muted)"
                            : d.isToday
                            ? "var(--primary)"
                            : "color-mix(in oklab, var(--primary) calc(0.65 * 100%), transparent)"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">

        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            Entradas por forma de pagamento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {byPayment.length === 0 || bruto === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Sem entradas neste mês.
            </p>
          ) : (
            <ul className="space-y-3">
              {byPayment.map(([label, value]) => {
                const pct = bruto > 0 ? (value / bruto) * 100 : 0;
                const w = (value / maxPay) * 100;
                return (
                  <li key={label}>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <span className="text-sm font-medium">{label}</span>
                      <span className="text-sm tabular-nums">
                        {formatBRL(value)}{" "}
                        <span className="text-xs text-muted-foreground">
                          ({pct.toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${w}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
