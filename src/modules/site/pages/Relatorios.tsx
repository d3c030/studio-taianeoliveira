import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Eye, MousePointerClick, UserPlus, Percent, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const PERIODOS = [7, 30, 90] as const;
const SECOES: Record<string, string> = {
  topo: "Capa", servicos: "Serviços", "como-funciona": "Como funciona", sobre: "Sobre",
  parcerias: "Parcerias e cupons", contato: "Formulário de cadastro",
};
const DISP: Record<string, string> = { mobile: "Celular", tablet: "Tablet", desktop: "Computador" };

function origem(ref: string | null, utm: string | null) {
  if (utm) return utm;
  if (!ref) return "Acesso direto / link";
  try {
    const h = new URL(ref).hostname.replace(/^www\.|^m\.|^l\./, "");
    if (/instagram/.test(h)) return "Instagram";
    if (/google/.test(h)) return "Google";
    if (/facebook|fb\./.test(h)) return "Facebook";
    if (/linktr/.test(h)) return "Linktree";
    if (/whatsapp|wa\.me/.test(h)) return "WhatsApp";
    if (/tiktok/.test(h)) return "TikTok";
    return h;
  } catch { return "Outro"; }
}

function contar(arr: string[]) {
  const m = new Map<string, number>();
  arr.forEach((k) => m.set(k, (m.get(k) ?? 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function Ranking({ titulo, dados, total }: { titulo: string; dados: [string, number][]; total?: number }) {
  const max = Math.max(1, ...dados.map((d) => d[1]));
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-display text-lg">{titulo}</h3>
      {dados.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">Ainda sem dados neste período.</p> : (
        <ul className="mt-4 space-y-3">
          {dados.slice(0, 8).map(([k, v]) => (
            <li key={k}>
              <div className="flex justify-between gap-3 text-sm"><span className="truncate">{k}</span>
                <span className="shrink-0 text-muted-foreground">{v}{total ? ` · ${Math.round((v / total) * 100)}%` : ""}</span></div>
              <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-brand" style={{ width: `${(v / max) * 100}%` }} /></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Card({ icon: Icon, label, valor, sub }: { icon: any; label: string; valor: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-sm text-muted-foreground"><Icon className="h-4 w-4 text-brand" />{label}</div>
      <p className="mt-2 font-display text-3xl">{valor}</p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function Relatorios() {
  const [dias, setDias] = useState<number>(30);
  const desde = useMemo(() => new Date(Date.now() - dias * 86400000).toISOString(), [dias]);

  const aq = useQuery({
    queryKey: ["relatorio-acessos", dias],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_acessos")
        .select("data, pagina, referrer, utm_source, dispositivo").gte("data", desde).order("data").limit(20000);
      if (error) throw error;
      return data ?? [];
    },
  });
  const lq = useQuery({
    queryKey: ["relatorio-leads", dias],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_leads").select("criado_em, objetivo").gte("criado_em", desde);
      if (error) throw error;
      return data ?? [];
    },
  });

  const r = useMemo(() => {
    const rows = aq.data ?? [];
    const visitas = rows.filter((x) => x.pagina === "visita");
    const secoes = rows.filter((x) => x.pagina?.startsWith("secao:")).map((x) => SECOES[x.pagina!.slice(6)] ?? x.pagina!.slice(6));
    const cliques = rows.filter((x) => x.pagina?.startsWith("clique:")).map((x) => x.pagina!.slice(7));
    const porDia = new Map<string, number>();
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000);
      porDia.set(d.toISOString().slice(0, 10), 0);
    }
    visitas.forEach((v) => { const k = v.data.slice(0, 10); if (porDia.has(k)) porDia.set(k, porDia.get(k)! + 1); });
    const objetivos = (lq.data ?? []).flatMap((l) => String(l.objetivo ?? "").split(/[,;\n]/).map((s) => s.trim()).filter((s) => s && s.length <= 40));
    return {
      visitas: visitas.length,
      grafico: [...porDia.entries()].map(([d, n]) => ({ dia: d.slice(8, 10) + "/" + d.slice(5, 7), visitas: n })),
      origens: contar(visitas.map((v) => origem(v.referrer, v.utm_source))),
      disp: contar(visitas.map((v) => DISP[v.dispositivo ?? ""] ?? "Outro")),
      secoes: contar(secoes),
      cliques: contar(cliques),
      whats: cliques.filter((c) => c === "WhatsApp").length,
      objetivos: contar(objetivos),
    };
  }, [aq.data, lq.data, dias]);

  const leads = lq.data?.length ?? 0;
  const conv = r.visitas ? ((leads / r.visitas) * 100).toFixed(1).replace(".", ",") + "%" : "—";

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Relatórios do site</h1>
          <p className="text-sm text-muted-foreground">Quem visita a sua página, de onde vem e o que mais chama a atenção.</p>
        </div>
        <div className="flex rounded-full border border-border p-1">
          {PERIODOS.map((p) => (
            <button key={p} onClick={() => setDias(p)} className={`rounded-full px-4 py-1.5 text-sm ${dias === p ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{p} dias</button>
          ))}
        </div>
      </div>

      {aq.isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : aq.error ? <p className="text-sm text-destructive">Não foi possível carregar os dados.</p> : <>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Card icon={Eye} label="Visitas" valor={r.visitas} sub={`últimos ${dias} dias`} />
          <Card icon={UserPlus} label="Cadastros" valor={leads} sub="formulário enviado" />
          <Card icon={Percent} label="Conversão" valor={conv} sub="visitas que viraram cadastro" />
          <Card icon={MessageCircle} label="Cliques no WhatsApp" valor={r.whats} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="font-display text-lg">Visitas por dia</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={r.grafico}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={30} />
                <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
                <Area type="monotone" dataKey="visitas" name="Visitas" stroke="var(--brand)" fill="var(--brand)" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Ranking titulo="De onde vêm" dados={r.origens} total={r.visitas} />
          <Ranking titulo="Aparelho usado" dados={r.disp} total={r.visitas} />
          <Ranking titulo="Partes da página mais vistas" dados={r.secoes} total={r.visitas} />
          <Ranking titulo="Onde mais clicam" dados={r.cliques} />
          <Ranking titulo="O que procuram (objetivos no cadastro)" dados={r.objetivos} total={leads} />
        </div>
        <p className="flex items-center gap-1 text-xs text-muted-foreground"><MousePointerClick className="h-3.5 w-3.5" />As visitas começam a contar a partir de hoje. Acessos feitos pelo editor não entram.</p>
      </>}
    </div>
  );
}
