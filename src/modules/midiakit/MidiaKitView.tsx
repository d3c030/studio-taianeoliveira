import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Instagram, Mail, MessageCircle, Sparkles } from "lucide-react";
import { fmtNum, totalSeguidores, type MkDados, type MkFoto, type MkTextos } from "./types";

const C1 = "var(--primary)";
const C2 = "var(--muted-foreground)";

export function MidiaKitView({ dados: d, textos: t, fotos }: { dados: MkDados; textos: MkTextos; fotos: MkFoto[] }) {
  const arroba = (d.arroba ?? "").replace(/^@/, "");
  const fem = Math.round(Math.min(100, Math.max(0, Number(d.publico_feminino ?? 0))) * 10) / 10;
  const masc = Math.round((100 - fem) * 10) / 10;
  const pct = (v: number) => `${String(v).replace(".", ",")}%`;
  const genero = fem ? [{ n: "Mulheres", v: fem }, { n: "Homens", v: masc }] : [];
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
              <PieChart><Pie data={genero} dataKey="v" nameKey="n" innerRadius={35} outerRadius={60} startAngle={90} endAngle={-270} stroke="none" isAnimationActive={false}>
                {genero.map((_, i) => <Cell key={i} fill={i ? C2 : C1} />)}</Pie><Tooltip formatter={(v) => pct(Number(v))} /></PieChart>
              <div className="flex justify-center gap-3 text-xs">
                <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-primary" />Mulheres {pct(fem)}</span>
                <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />Homens {pct(masc)}</span>
              </div>
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

        <section className="relative overflow-hidden rounded-3xl bg-primary px-6 py-10 text-center text-primary-foreground break-inside-avoid sm:px-10">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary-foreground/10" />
          <div className="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-primary-foreground/10" />
          <div className="relative">
            <p className="text-xs uppercase tracking-[0.3em] opacity-80">Vamos conversar</p>
            <p className="mx-auto mt-3 max-w-xl text-2xl font-bold leading-snug sm:text-3xl">{t.cta || "Vamos criar algo juntos?"}</p>
            <div className="mx-auto mt-4 h-px w-16 bg-primary-foreground/40" />
            <div className="mx-auto mt-6 grid max-w-xl gap-3 sm:grid-cols-3">
              {arroba && <Contato href={`https://instagram.com/${arroba}`} icon={<Instagram className="h-5 w-5" />} rotulo="Instagram" valor={`@${arroba}`} />}
              {d.email && <Contato href={`mailto:${d.email}`} icon={<Mail className="h-5 w-5" />} rotulo="E-mail" valor={d.email} />}
              {wa && <Contato href={`https://wa.me/${wa.length <= 11 ? "55" + wa : wa}`} icon={<MessageCircle className="h-5 w-5" />} rotulo="WhatsApp" valor={d.whatsapp!} />}
            </div>
            {d.cidade && <p className="mt-5 text-xs opacity-80">{d.cidade}</p>}
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
