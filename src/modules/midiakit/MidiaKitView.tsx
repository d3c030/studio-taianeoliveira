import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Instagram, Mail, MessageCircle, Sparkles } from "lucide-react";
import { fmtNum, totalSeguidores, type MkDados, type MkFoto, type MkTextos } from "./types";

const C1 = "var(--primary)";
const C2 = "var(--muted-foreground)";

export function MidiaKitView({ dados: d, textos: t, fotos }: { dados: MkDados; textos: MkTextos; fotos: MkFoto[] }) {
  const arroba = (d.arroba ?? "").replace(/^@/, "");
  const fem = Number(d.publico_feminino ?? 0);
  const genero = fem ? [{ n: "Mulheres", v: fem }, { n: "Homens", v: Math.max(0, 100 - fem) }] : [];
  const idades = [
    { n: "18-24", v: Number(d.faixa_18_24 ?? 0) }, { n: "25-34", v: Number(d.faixa_25_34 ?? 0) },
    { n: "35-44", v: Number(d.faixa_35_44 ?? 0) }, { n: "45+", v: Number(d.faixa_45 ?? 0) },
  ].filter((x) => x.v > 0);
  const redes = [
    { n: "Instagram", v: Number(d.seguidores_ig ?? 0) }, { n: "TikTok", v: Number(d.seguidores_tt ?? 0) },
    { n: "YouTube", v: Number(d.seguidores_yt ?? 0) },
  ].filter((x) => x.v > 0);
  const stats = [
    { l: "Seguidores", v: fmtNum(totalSeguidores(d)) },
    { l: "Engajamento", v: d.engajamento ? `${String(d.engajamento).replace(".", ",")}%` : "—" },
    { l: "Alcance mensal", v: d.alcance ? fmtNum(d.alcance) : "—" },
    { l: "Visualizações", v: d.visualizacoes ? fmtNum(d.visualizacoes) : "—" },
  ];
  const marcas = (d.marcas ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const wa = (d.whatsapp ?? "").replace(/\D/g, "");

  return (
    <article className="mx-auto max-w-3xl overflow-hidden rounded-2xl bg-card text-card-foreground shadow-sm print:shadow-none print:rounded-none">
      {/* Capa */}
      <header className="relative">
        {d.capa ? <img src={d.capa} alt={d.nome ?? ""} className="h-80 w-full object-cover object-[50%_25%] sm:h-[28rem]" />
          : <div className="h-40 w-full bg-accent" />}
        <div className="bg-primary px-6 py-6 text-primary-foreground sm:px-10">
          <p className="text-xs uppercase tracking-[0.3em] opacity-80">Mídia Kit</p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">{t.titulo || d.nome || "Seu nome"}</h1>
          {arroba && <p className="text-sm opacity-90">@{arroba}</p>}
          {t.slogan && <p className="mt-3 text-lg italic">“{t.slogan}”</p>}
        </div>
      </header>

      <div className="space-y-10 px-6 py-8 sm:px-10">
        {t.bio && <Sec titulo="Sobre mim"><p className="whitespace-pre-line leading-relaxed">{t.bio}</p></Sec>}

        {!!t.nichos?.length && (
          <Sec titulo="Nichos e especialidades">
            <ul className="grid gap-2 sm:grid-cols-2">
              {t.nichos.map((n, i) => <li key={i} className="flex gap-2 rounded-lg bg-accent px-3 py-2 text-sm"><Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{n}</li>)}
            </ul>
          </Sec>
        )}

        <Sec titulo="Audiência e alcance">
          {t.audiencia && <p className="mb-4 leading-relaxed">{t.audiencia}</p>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => <div key={s.l} className="rounded-xl border border-border p-3 text-center"><p className="text-2xl font-bold text-primary">{s.v}</p><p className="text-xs text-muted-foreground">{s.l}</p></div>)}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {!!genero.length && <Grafico titulo="Gênero">
              <PieChart><Pie data={genero} dataKey="v" nameKey="n" innerRadius={35} outerRadius={60} isAnimationActive={false}>
                {genero.map((_, i) => <Cell key={i} fill={i ? C2 : C1} />)}</Pie><Tooltip formatter={(v) => `${v}%`} /></PieChart>
              <p className="text-center text-xs text-muted-foreground">{fem}% mulheres · {100 - fem}% homens</p>
            </Grafico>}
            {!!idades.length && <Grafico titulo="Faixa etária (%)">
              <BarChart data={idades}><XAxis dataKey="n" fontSize={11} /><YAxis hide /><Tooltip formatter={(v) => `${v}%`} /><Bar dataKey="v" fill={C1} radius={4} isAnimationActive={false} /></BarChart>
            </Grafico>}
            {!!redes.length && <Grafico titulo="Seguidores por rede">
              <BarChart data={redes}><XAxis dataKey="n" fontSize={11} /><YAxis hide /><Tooltip formatter={(v) => fmtNum(Number(v))} /><Bar dataKey="v" fill={C1} radius={4} isAnimationActive={false} /></BarChart>
            </Grafico>}
          </div>
          {d.interesses && <p className="mt-3 text-sm text-muted-foreground"><b>Interesses do público:</b> {d.interesses}</p>}
        </Sec>

        {!!t.servicos?.length && (
          <Sec titulo="Serviços oferecidos">
            <div className="grid gap-3 sm:grid-cols-2">
              {t.servicos.map((s, i) => <div key={i} className="rounded-xl border border-border p-4"><p className="font-semibold">{s.nome}</p><p className="mt-1 text-sm text-muted-foreground">{s.descricao}</p></div>)}
            </div>
          </Sec>
        )}

        {!!fotos.length && (
          <Sec titulo="Portfólio">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {fotos.map((f, i) => <figure key={i} className="break-inside-avoid"><img src={f.url} alt={f.legenda ?? ""} className="aspect-[4/5] w-full rounded-lg object-cover" />{f.legenda && <figcaption className="mt-1 text-xs text-muted-foreground">{f.legenda}</figcaption>}</figure>)}
            </div>
          </Sec>
        )}

        {(t.marcas || marcas.length > 0) && (
          <Sec titulo="Marcas parceiras">
            {t.marcas && <p className="mb-3 leading-relaxed">{t.marcas}</p>}
            <div className="flex flex-wrap gap-2">{marcas.map((m) => <span key={m} className="rounded-full border border-border px-3 py-1 text-sm font-medium">{m}</span>)}</div>
          </Sec>
        )}

        <section className="rounded-2xl bg-primary p-6 text-center text-primary-foreground break-inside-avoid">
          <p className="text-xl font-semibold">{t.cta || "Vamos criar algo juntos?"}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
            {arroba && <a href={`https://instagram.com/${arroba}`} target="_blank" rel="noreferrer" className="flex items-center gap-1"><Instagram className="h-4 w-4" />@{arroba}</a>}
            {d.email && <a href={`mailto:${d.email}`} className="flex items-center gap-1"><Mail className="h-4 w-4" />{d.email}</a>}
            {wa && <a href={`https://wa.me/${wa.length <= 11 ? "55" + wa : wa}`} target="_blank" rel="noreferrer" className="flex items-center gap-1"><MessageCircle className="h-4 w-4" />{d.whatsapp}</a>}
          </div>
        </section>
      </div>
    </article>
  );
}

function Sec({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return <section className="break-inside-avoid"><h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-primary">{titulo}</h2>{children}</section>;
}
function Grafico({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const [chart, ...rest] = Array.isArray(children) ? children : [children];
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="mb-1 text-xs font-medium text-muted-foreground">{titulo}</p>
      <div className="h-36"><ResponsiveContainer width="100%" height="100%">{chart}</ResponsiveContainer></div>
      {rest}
    </div>
  );
}
