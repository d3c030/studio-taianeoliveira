import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, ChevronLeft, ChevronRight, Check, Copy, ImagePlus, Loader2, Plus, RefreshCw, ListChecks, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { lerPrintReacoes } from "@/lib/grupos.functions";
import {
  cadastroEntrada, hojeSaoPaulo, addDias, diaPadrao, diasConferencia, podeCriarRodada, participantesDaRodada, resumoSemana, conferenciasPendentes, cruzar, emojisDuplicados, normEmoji, DIA_LABEL, diaSemana, faixa, inicioSemana, norm, normUser, parseCadastroManual, ordenarUsernames, listasEmojis, textoEmojis, textoSemana, naoFizeram, textoNaoFizeram, type RodadaSemana,
  conflitoApelido, sugestaoUsername, participanteDuplicada, faltantesLeitura, type Leitura, type Participante, type CheckSemana,
} from "./lib";
import { ImportarLista } from "./ImportarLista";
import { PerfilLink } from "./PerfilLink";
import { IndicadorAjuste } from "./IndicadorAjuste";
import { consultarAuditoria } from "./leituras-store";

const db = supabase as any;
type Grupo = { id: string; nome: string; dias_missao: string[]; criado_em: string };
type Rodada = { id: string; grupo_id: string; data: string; dia_semana: string; status: "aberta" | "fechada"; total_reacoes?: number | null };
type CheckRow = CheckSemana;
const hoje = hojeSaoPaulo;
const fmtData = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

/* ---------------- Grupos ---------------- */
export function GruposLista() {
  const nav = useNavigate();
  const [nome, setNome] = useState("");
  const [criando, setCriando] = useState(false);
  const q = useQuery({
    queryKey: ["grupos"],
    queryFn: async () => {
      const { data, error } = await db.from("grupo_engaj").select("*, grupo_participante(count)").order("criado_em");
      if (error) throw error;
      return data as (Grupo & { grupo_participante: { count: number }[] })[];
    },
  });
  const criar = async () => {
    if (!nome.trim()) return toast.error("Digite o nome do grupo.");
    if (criando) return;
    setCriando(true);
    try {
      const { data, error } = await db.from("grupo_engaj").insert({ nome: nome.trim() }).select("id").single();
      if (error) throw error;
      q.refetch();
      toast.success("Grupo criado!");
      nav({ to: "/grupos/$grupoId", params: { grupoId: data.id } });
    } catch (e) {
      toast.error("Não foi possível criar o grupo: " + ((e as Error)?.message ?? "tente de novo"));
    } finally {
      setCriando(false);
    }
  };
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Check de Grupos</h1><p className="text-sm text-muted-foreground">Confira quem cumpriu a missão nos grupos de engajamento.</p></div>
      <div className="flex gap-2">
        <Input className="h-12" placeholder="Nome do novo grupo" value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === "Enter" && criar()} />
        <Button type="button" className="h-12 shrink-0" onClick={criar} disabled={criando || !nome.trim()}><Plus className="h-4 w-4" /> {criando ? "Criando…" : "Criar"}</Button>
      </div>
      {q.isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : !q.data?.length ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhum grupo ainda.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {q.data.map((g) => (
            <Link key={g.id} to="/grupos/$grupoId" params={{ grupoId: g.id }} className="rounded-xl border border-border bg-card p-4 hover:border-primary">
              <p className="font-semibold">{g.nome}</p>
              <p className="text-xs text-muted-foreground">{g.grupo_participante?.[0]?.count ?? 0} participantes · Missão: {g.dias_missao.map((d) => DIA_LABEL[d]).join(", ")}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Detalhe do grupo ---------------- */
function useParticipantes(grupoId: string) {
  return useQuery({
    queryKey: ["grupo-part", grupoId],
    refetchOnMount: "always",
    queryFn: async () => {
      const { data, error } = await db.from("grupo_participante").select("*").eq("grupo_id", grupoId).order("username");
      if (error) throw error;
      return data as Participante[];
    },
  });
}

export function GrupoDetalhe({ grupoId }: { grupoId: string }) {
  const [aba, setAba] = useState("rodada");
  const [semanaAjuste, setSemanaAjuste] = useState<string | null>(null);
  const g = useQuery({
    queryKey: ["grupo", grupoId],
    queryFn: async () => {
      const { data, error } = await db.from("grupo_engaj").select("*").eq("id", grupoId).single();
      if (error) throw error;
      return data as Grupo;
    },
  });
  if (!g.data) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  return (
    <div className="space-y-4">
      <Link to="/grupos" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" /> Grupos</Link>
      <h1 className="text-2xl font-bold">{g.data.nome}</h1>
      <Pendencias grupo={g.data} />
      <Tabs value={aba} onValueChange={setAba}>
        <TabsList className="flex h-auto w-full justify-start overflow-x-auto">
          <TabsTrigger value="rodada" className="py-2">Rodada</TabsTrigger>
          <TabsTrigger value="nao" className="py-2">Não fizeram</TabsTrigger>
          <TabsTrigger value="part" className="py-2">Participantes</TabsTrigger>
          <TabsTrigger value="emojis" className="py-2">Emojis</TabsTrigger>
          <TabsTrigger value="semana" className="py-2">Semana</TabsTrigger>
          <TabsTrigger value="hist" className="py-2">Histórico</TabsTrigger>
        </TabsList>
        <TabsContent value="rodada"><RodadaDia grupo={g.data} onAjustar={(semana) => { setSemanaAjuste(semana); setAba("semana"); }} /></TabsContent>
        <TabsContent value="nao"><NaoFizeramTab grupo={g.data} onIrRodada={() => setAba("rodada")} /></TabsContent>
        <TabsContent value="part"><ParticipantesTab grupo={g.data} /></TabsContent>
        <TabsContent value="emojis"><EmojisTab grupo={g.data} /></TabsContent>
        <TabsContent value="semana"><SemanaTab grupo={g.data} semanaInicial={semanaAjuste} /></TabsContent>
        <TabsContent value="hist"><HistoricoTab grupo={g.data} /></TabsContent>
      </Tabs>
    </div>
  );
}

function useRodadasSemana(grupoId: string, semana: string) {
  return useQuery({
    queryKey: ["grupo-semana", grupoId, semana],
    refetchOnMount: "always",
    queryFn: async () => {
      const { data: rs, error } = await db.from("grupo_rodada").select("*").eq("grupo_id", grupoId).gte("data", semana).lte("data", addDias(semana, 6));
      if (error) throw error;
      const ids = (rs ?? []).map((r: Rodada) => r.id);
      const result = ids.length ? await db.from("grupo_check").select("rodada_id,participante_id,status,ajustado_em,status_original,obs").in("rodada_id", ids) : { data: [], error: null };
      if (result.error) throw result.error;
      return { rodadas: (rs ?? []) as Rodada[], checks: (result.data ?? []) as CheckRow[] };
    },
  });
}
function SeletorSemana({ semana, onChange, disabled = false }: { semana: string; onChange: (v: string) => void; disabled?: boolean }) {
  return <div className="flex items-center justify-between gap-2">
    <Button variant="outline" className="h-12 w-12 shrink-0" aria-label="Semana anterior" disabled={disabled} onClick={() => onChange(addDias(semana, -7))}><ChevronLeft /></Button>
    <p className="text-center text-sm font-semibold">Semana de {fmtData(semana)} a {fmtData(addDias(semana, 6))}</p>
    <Button variant="outline" className="h-12 w-12 shrink-0" aria-label="Próxima semana" disabled={disabled} onClick={() => onChange(addDias(semana, 7))}><ChevronRight /></Button>
  </div>;
}
function Pendencias({ grupo }: { grupo: Grupo }) {
  const atual = inicioSemana(hoje());
  const anterior = useRodadasSemana(grupo.id, addDias(atual, -7));
  const semana = useRodadasSemana(grupo.id, atual);
  if (!anterior.data || !semana.data) return null;
  const datas = conferenciasPendentes(hoje(), grupo.dias_missao, [...anterior.data.rodadas, ...semana.data.rodadas], grupo.criado_em);
  return datas.length ? <div className="space-y-1 rounded-lg bg-accent p-3 text-sm" role="status">{datas.map((d) => <p key={d}>⚠️ Conferência pendente: {DIA_LABEL[diaSemana(d)]} {fmtData(d)}</p>)}</div> : null;
}

/* ---------------- Participantes ---------------- */
function ParticipantesTab({ grupo }: { grupo: Grupo }) {
  const qc = useQueryClient();
  const q = useParticipantes(grupo.id);
  const [imp, setImp] = useState(false);
  const [busca, setBusca] = useState("");
  const [mostrarInativas, setMostrarInativas] = useState(false);
  const [filtroLista, setFiltroLista] = useState<string>("");
  const dupAtual = new Set([...emojisDuplicados(q.data ?? []).values()].flat());
  const refresh = () => qc.invalidateQueries({ queryKey: ["grupo-part", grupo.id] });

  const patch = async (id: string, v: Partial<Participante>) => {
    const { error } = await db.from("grupo_participante").update(v).eq("id", id);
    if (error) toast.error(error.message); else refresh();
  };
  const listasExist = [...new Set((q.data ?? []).map((p) => p.lista).filter((x): x is number => x != null))].sort((a, b) => a - b);
  const lista = (q.data ?? []).filter((p) => (mostrarInativas || p.ativo) && (!filtroLista || String(p.lista ?? "") === filtroLista) && (!busca || norm(p.username + (p.nome_exibicao ?? "") + p.apelidos.join("")).includes(norm(busca))));

  return (
    <div className="space-y-3 pt-3">
      <div className="flex flex-wrap gap-2">
        <Button className="h-11" onClick={() => setImp(true)}><Upload className="h-4 w-4" /> Importar lista</Button>
        <NovaParticipante grupoId={grupo.id} onDone={refresh} />
      </div>
      <div className="flex items-center gap-3">
        <Input className="h-11" placeholder="Buscar" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <label className="flex shrink-0 items-center gap-2 text-xs"><Switch checked={mostrarInativas} onCheckedChange={setMostrarInativas} /> Inativas</label>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{(q.data ?? []).filter((p) => p.ativo).length} ativas{dupAtual.size ? ` · ${dupAtual.size} com emoji repetido` : ""}</p>
        <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={filtroLista} onChange={(e) => setFiltroLista(e.target.value)}>
          <option value="">Todas as listas</option>
          {listasExist.map((n) => <option key={n} value={String(n)}>Lista {n}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        {lista.map((p) => (
          <div key={p.id} className={cn("rounded-xl border border-border bg-card p-3", !p.ativo && "opacity-60", dupAtual.has(p.id) && "border-destructive")}>
            {dupAtual.has(p.id) && <p className="mb-1 text-xs font-medium text-destructive">⚠️ Emoji igual ao de outra participante ativa</p>}
            <div className="flex items-center justify-between gap-2">
              <p className="min-w-0 font-semibold"><PerfilLink username={p.username} /> {p.novata && "🆕"}</p>
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1">Novata <Switch checked={p.novata} onCheckedChange={(v) => patch(p.id, cadastroEntrada(v))} /></label>
                <label className="flex items-center gap-1">Ativa <Switch checked={p.ativo} onCheckedChange={(v) => patch(p.id, { ativo: v })} /></label>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-[1fr_4.5rem_4.5rem] gap-2">
              <Input defaultValue={p.nome_exibicao ?? ""} placeholder="Nome de exibição" onBlur={(e) => e.target.value !== (p.nome_exibicao ?? "") && patch(p.id, { nome_exibicao: e.target.value || null })} />
              <Input defaultValue={p.emoji_habitual ?? ""} placeholder="Emoji" className="text-center" onBlur={(e) => e.target.value !== (p.emoji_habitual ?? "") && patch(p.id, { emoji_habitual: e.target.value || null })} />
              <Input type="number" inputMode="numeric" defaultValue={p.lista ?? ""} placeholder="Lista" className="text-center" onBlur={(e) => { const v = e.target.value ? Number(e.target.value) : null; if (v !== (p.lista ?? null)) patch(p.id, { lista: v }); }} />
            </div>
            {p.novata && <label className="mt-2 block text-xs text-muted-foreground">Entrou em
              <Input aria-label={`Entrou em @${p.username}`} type="date" defaultValue={p.entrou_em} className="mt-1" onBlur={(e) => { if (e.target.value && e.target.value !== p.entrou_em) patch(p.id, { entrou_em: e.target.value }); }} />
            </label>}
            {p.apelidos.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {p.apelidos.map((a) => (
                  <span key={a} className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs">
                    {a}{conflitoApelido(a, p.id, q.data ?? []) && <span className="text-destructive"> ⚠️ Conflito com @{conflitoApelido(a, p.id, q.data ?? [])?.username}</span>}<Button size="icon" variant="ghost" aria-label={`Remover apelido ${a}`} onClick={() => patch(p.id, { apelidos: p.apelidos.filter((x) => x !== a) })}><X className="h-3 w-3" /></Button>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={imp} onOpenChange={setImp}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Importar lista do Notas</DialogTitle></DialogHeader>
          <ImportarLista grupoId={grupo.id} participantes={q.data ?? []} onDone={() => { refresh(); setImp(false); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmojisTab({ grupo }: { grupo: Grupo }) {
  const qc = useQueryClient();
  const q = useParticipantes(grupo.id);
  const refresh = () => qc.invalidateQueries({ queryKey: ["grupo-part", grupo.id] });
  const duplicados = new Set([...emojisDuplicados(q.data ?? []).values()].flat());
  const patch = async (id: string, valores: Partial<Participante>) => {
    const { error } = await db.from("grupo_participante").update(valores).eq("id", id);
    if (error) toast.error(error.message); else refresh();
  };
  return <div className="space-y-5 pt-3">
    <ImportarLista grupoId={grupo.id} participantes={q.data ?? []} onDone={refresh} />
    <Button variant="outline" className="min-h-12 w-full whitespace-normal" disabled={q.isLoading || !q.data?.some((p) => p.ativo)} onClick={() => navigator.clipboard.writeText(textoEmojis(q.data ?? [])).then(() => toast.success("Lista de emojis copiada"), () => toast.error("Não foi possível copiar"))}><Copy className="h-4 w-4 shrink-0" /> Copiar lista de emojis</Button>
    {listasEmojis(q.data ?? []).map(({ lista, participantes }) => <section key={lista ?? "sem-lista"} className="space-y-2">
      <h2 className="text-lg font-semibold">{lista == null ? "Sem lista" : `Lista ${lista}`} <span className="text-sm text-muted-foreground">({participantes.length})</span></h2>
      <ol className="divide-y divide-border">
        {participantes.map((p, i) => <li key={p.id} className={cn("py-3", duplicados.has(p.id) && "text-destructive")}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="min-w-0 break-all text-sm font-medium">{i + 1}. <PerfilLink username={p.username} /> {p.emoji_habitual}</span>
            <div className="flex shrink-0 gap-2">
              <Input key={`emoji-${p.id}-${p.emoji_habitual}`} aria-label={`Emoji de @${p.username}`} defaultValue={p.emoji_habitual ?? ""} placeholder="Emoji" className="h-11 w-20 text-center text-base" onBlur={(e) => { if (e.target.value !== (p.emoji_habitual ?? "")) patch(p.id, { emoji_habitual: e.target.value || null }); }} />
              <Input key={`lista-${p.id}-${p.lista}`} aria-label={`Lista de @${p.username}`} type="number" inputMode="numeric" defaultValue={p.lista ?? ""} placeholder="Lista" className="h-11 w-20 text-center" onBlur={(e) => { const v = e.target.value ? Number(e.target.value) : null; if (v !== (p.lista ?? null)) patch(p.id, { lista: v }); }} />
            </div>
          </div>
          {duplicados.has(p.id) && <p className="mt-1 text-xs">⚠️ Emoji repetido entre participantes ativas</p>}
        </li>)}
      </ol>
    </section>)}
  </div>;
}

function NovaParticipante({ grupoId, onDone }: { grupoId: string; onDone: () => void }) {
  const [u, setU] = useState("");
  const add = async () => {
    const item = parseCadastroManual(u);
    if (!item) return toast.error("Digite uma @ válida, usando apenas letras, números, ponto e sublinhado, seguida do emoji se desejar.");
    const { error } = await db.from("grupo_participante").insert({ grupo_id: grupoId, username: item.username, emoji_habitual: item.emoji || null, ...cadastroEntrada() });
    if (error) return toast.error(error.code === "23505" ? "Essa @ já está no grupo" : error.message);
    setU(""); onDone();
  };
  return (
    <div className="flex flex-1 gap-2">
      <Input className="h-11" placeholder="@nova" value={u} onChange={(e) => setU(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
      <Button variant="outline" aria-label="Adicionar participante" className="h-11" onClick={add}><Plus className="h-4 w-4" /></Button>
    </div>
  );
}

/* ---------------- Rodada do dia ---------------- */
async function comprimir(file: File): Promise<string> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / img.width);
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Não foi possível abrir a imagem");
  ctx.drawImage(img, 0, 0, c.width, c.height);
  img.close();
  return c.toDataURL("image/jpeg", 0.85);
}

type PrintEstado = { nome: string; status: "lendo" | "ok" | "erro"; erro?: string; file: File; n?: number };

function RodadaDia({ grupo, onAjustar }: { grupo: Grupo; onAjustar: (semana: string) => void }) {
  const qc = useQueryClient();
  const [semana, setSemana] = useState(inicioSemana(hoje()));
  const [data, setData] = useState<string | null>(() => diaPadrao(inicioSemana(hoje()), grupo.dias_missao, hoje()));
  const semanaQ = useRodadasSemana(grupo.id, semana);
  const parts = useParticipantes(grupo.id);
  const rodadaQ = useQuery({
    queryKey: ["grupo-rodada", grupo.id, data],
    enabled: !!data,
    queryFn: async () => {
      if (!data) return null;
      const { data: r, error } = await db.from("grupo_rodada").select("*").eq("grupo_id", grupo.id).eq("data", data).maybeSingle();
      if (error) throw error;
      if (!r) return null;
      const result = await db.from("grupo_check").select("rodada_id,participante_id,status,ajustado_em,status_original,obs").eq("rodada_id", r.id);
      if (result.error) throw result.error;
      return { rodada: r as Rodada, checks: (result.data ?? []) as CheckRow[] };
    },
  });
  const rodada = rodadaQ.data?.rodada;
  
  const fechada = rodada?.status === "fechada";
  const [leituras, setLeituras] = useState<Leitura[]>([]);
  const [auditoriaAberta, setAuditoriaAberta] = useState(false);
  const [totalReacoes, setTotalReacoes] = useState("");
  const [prints, setPrints] = useState<PrintEstado[]>([]);
  const [manual, setManual] = useState<Record<string, "ok" | "nao">>({});
  const [confirmadas, setConfirmadas] = useState<Record<number, string>>({}); // índice da leitura -> participante escolhido
  const [salvando, setSalvando] = useState(false);
  const lerFn = lerPrintReacoes;

  const auditoriaQ = useQuery({
    queryKey: ["grupo-leituras", rodada?.id], enabled: !!rodada?.id, refetchOnMount: "always",
    queryFn: () => consultarAuditoria(() => db.from("grupo_leitura").select("*").eq("rodada_id", rodada?.id).order("print_idx").order("ordem")),
  });
  useEffect(() => {
    setManual({}); setConfirmadas({}); setPrints([]); setLeituras([]);
  }, [data]);
  useEffect(() => {
    setLeituras(auditoriaQ.data?.leituras ?? []);
    setConfirmadas({});
  }, [auditoriaQ.data]);
  useEffect(() => { setTotalReacoes(rodada?.total_reacoes == null ? "" : String(rodada.total_reacoes)); }, [rodada?.id, rodada?.total_reacoes]);
  const garantirRodada = async (): Promise<Rodada> => {
    if (rodada) return rodada;
    if (!data || !podeCriarRodada(data, grupo.dias_missao, hoje())) throw new Error("Selecione um dia de conferência válido.");
    const { data: r, error } = await db.from("grupo_rodada").upsert({ grupo_id: grupo.id, data, dia_semana: diaSemana(data) }, { onConflict: "grupo_id,data", ignoreDuplicates: true }).select("*").maybeSingle();
    if (error) throw error;
    const existente = r ?? (await db.from("grupo_rodada").select("*").eq("grupo_id", grupo.id).eq("data", data).single()).data;
    if (!existente) throw new Error("Não foi possível criar a rodada");
    await rodadaQ.refetch();
    qc.invalidateQueries({ queryKey: ["grupo-semana", grupo.id] });
    return existente as Rodada;
  };
  const limparLeituras = async () => {
    if (!rodada || !window.confirm("Apagar todas as leituras desta rodada?")) return;
    const { error } = await db.from("grupo_leitura").delete().eq("rodada_id", rodada.id);
    if (error) return toast.error(error.message);
    setLeituras([]); setPrints([]); setConfirmadas({}); await auditoriaQ.refetch();
  };
  const salvarTotal = async () => {
    if (totalReacoes && (!/^\d+$/.test(totalReacoes) || Number(totalReacoes) > 2147483647)) return toast.error("Informe um total inteiro válido.");
    try {
      const r = await garantirRodada();
      const { error } = await db.from("grupo_rodada").update({ total_reacoes: totalReacoes === "" ? null : Number(totalReacoes) }).eq("id", r.id);
      if (error) throw error;
      await rodadaQ.refetch();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao salvar total"); }
  };

  const idsSalvos = new Set((rodadaQ.data?.checks ?? []).map((c) => c.participante_id));
  const ativas = fechada ? (parts.data ?? []).filter((p) => idsSalvos.has(p.id)) : data ? participantesDaRodada(parts.data ?? [], data) : [];
  const matches = useMemo(() => cruzar(leituras, ativas).map((m) => {
    const salva = auditoriaQ.data?.rows.find((r) => r.nome_lido === m.leitura.nome && r.emoji_lido === m.leitura.emoji && Number(r.confianca) === 1);
    const p = salva ? ativas.find((p) => p.id === salva.participante_id) : null;
    return p ? { ...m, participante: p, confianca: 1 } : m;
  }), [leituras, ativas, auditoriaQ.data]);

  const lerUm = async (file: File, idx: number) => {
    setPrints((ps) => ps.map((p, i) => (i === idx ? { ...p, status: "lendo", erro: undefined } : p)));
    try {
      const r = await garantirRodada();
      const anteriores = await consultarAuditoria(() => db.from("grupo_leitura").select("*").eq("rodada_id", r.id));
      const base = Math.max(0, ...anteriores.rows.map((r) => r.print_idx));
      const resultado = await lerFn({ data: { imagem: await comprimir(file), rodadaId: r.id, printIdx: base + 1 } });
      if (resultado.aviso) toast.error(resultado.aviso);
      const { rows, leituras: salvas } = await consultarAuditoria(() => db.from("grupo_leitura").select("*").eq("rodada_id", r.id).order("print_idx").order("ordem"));
      qc.setQueryData(["grupo-leituras", r.id], { rows, leituras: salvas });
      setLeituras(salvas);
      setPrints((ps) => ps.map((p, i) => (i === idx ? { ...p, status: "ok", n: resultado.itens.length } : p)));
    } catch (e) {
      setPrints((ps) => ps.map((p, i) => (i === idx ? { ...p, status: "erro", erro: e instanceof Error ? e.message : "Erro ao ler" } : p)));
    }
  };
  const enviar = async (files: FileList | null) => {
    if (!files?.length || fechada || !data) return;
    const base = prints.length;
    const novos = Array.from(files).map((f) => ({ nome: f.name, status: "lendo" as const, file: f }));
    setPrints((ps) => [...ps, ...novos]);
    for (let i = 0; i < novos.length; i++) await lerUm(novos[i].file, base + i); // um por vez
  };
  const lendo = prints.some((p) => p.status === "lendo");

  const refreshParts = () => qc.invalidateQueries({ queryKey: ["grupo-part", grupo.id] });
  const aprender = async (p: Participante, l: Leitura) => {
    const apel = l.nome.trim();
    const v: Partial<Participante> = {};
    if (!conflitoApelido(apel, p.id, parts.data ?? []) && norm(apel) !== norm(p.username) && !p.apelidos.some((a) => norm(a) === norm(apel))) v.apelidos = [...p.apelidos, apel];
    if (!p.emoji_habitual && l.emoji) v.emoji_habitual = l.emoji;
    if (Object.keys(v).length) { const { error } = await db.from("grupo_participante").update(v).eq("id", p.id); if (error) throw error; refreshParts(); }
  };
  const vincular = async (i: number, pid: string) => {
    const p = ativas.find((x) => x.id === pid), l = matches[i]?.leitura;
    if (!p || !l || !rodada) return;
    const conflito = conflitoApelido(l.nome, p.id, parts.data ?? []);
    if (conflito) {
      toast.error(`Esse nome já pertence a @${conflito.username}`);
      if (!window.confirm(`Esse nome já pertence a @${conflito.username}. Vincular somente nesta rodada a @${p.username}, sem salvar apelido?`)) return;
    }
    try {
      const ids = (auditoriaQ.data?.rows ?? []).filter((r) => r.nome_lido === l.nome && r.emoji_lido === l.emoji).map((r) => r.id);
      if (ids.length) {
        const { error } = await db.from("grupo_leitura").update({ participante_id: pid, confianca: 1 }).in("id", ids);
        if (error) throw error;
      }
      await aprender(p, l);
      setConfirmadas((c) => ({ ...c, [i]: pid }));
      await auditoriaQ.refetch();
      toast.success(`Vinculado a @${p.username}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao vincular"); }
  };
  const cadastrarNovata = async (l: Leitura) => {
    if (!data || fechada) return;
    const u = window.prompt("Qual é o @ dela?", sugestaoUsername(l.nome));
    if (!u) return;
    const item = parseCadastroManual(u);
    if (!item) return toast.error("Digite um @ válido.");
    const existente = participanteDuplicada(item.username, parts.data ?? []);
    if (existente) {
      if (window.confirm(`Você quis dizer @${existente.username}?`)) {
        if (!ativas.some((p) => p.id === existente.id)) return toast.error("Essa participante não está ativa ou não era elegível nesta rodada.");
        const i = matches.findIndex((m) => m.leitura.nome === l.nome && m.leitura.emoji === l.emoji);
        if (i >= 0) await vincular(i, existente.id);
      }
      return;
    }
    const conflito = conflitoApelido(l.nome, "", parts.data ?? []);
    const { error } = await db.from("grupo_participante").insert({
      grupo_id: grupo.id, username: item.username, nome_exibicao: conflito ? null : l.nome.trim(), emoji_habitual: l.emoji || null,
      apelidos: conflito || norm(u) === norm(l.nome) ? [] : [l.nome.trim()], ...cadastroEntrada(true),
    });
    if (error) return toast.error(error.code === "23505" ? "Essa @ já está no grupo" : error.message);
    toast.success("Novata cadastrada 🆕"); refreshParts();
  };

  // Status automático por participante
  const auto = new Map<string, { m: (typeof matches)[number]; idx: number }>();
  const conferir: number[] = [], naoRec: number[] = [];
  matches.forEach((m, i) => {
    const escolhido = confirmadas[i];
    if (escolhido) { const p = ativas.find((x) => x.id === escolhido); if (p) { auto.set(p.id, { m: { ...m, participante: p, confianca: Math.max(m.confianca, 0.95) }, idx: i }); return; } }
    const f = faixa(m.confianca, !!m.participante);
    if (f === "ok" && m.participante) auto.set(m.participante.id, { m, idx: i });
    else if (f === "conferir") conferir.push(i);
    else naoRec.push(i);
  });
  const reconhecidas = [...auto.values()].sort((a, b) => ordenarUsernames(a.m.participante?.username ?? "", b.m.participante?.username ?? ""));
  const salvo = new Map((rodadaQ.data?.checks ?? []).map((c) => [c.participante_id, c.status]));
  const statusDe = (pid: string): "ok" | "nao" => fechada ? (salvo.get(pid) ?? "nao") : manual[pid] ?? (auto.has(pid) ? "ok" : (salvo.get(pid) ?? "nao"));
  const totalOk = ativas.filter((p) => statusDe(p.id) === "ok").length;

  const confirmarRodada = async () => {
    if (!data || fechada || !podeCriarRodada(data, grupo.dias_missao, hoje())) return;
    if (conferir.length && !window.confirm(`${conferir.length} leitura(s) em "Conferir" ainda não foram confirmadas e contarão como ❌. Continuar?`)) return;
    setSalvando(true);
    try {
      let atual = rodada;
      if (!atual) {
        const inserted = await db.from("grupo_rodada").insert({ grupo_id: grupo.id, data, dia_semana: diaSemana(data) }).select("*").single();
        if (inserted.error) throw inserted.error;
        atual = inserted.data as Rodada;
      }
      const rows = ativas.map((p) => {
        const a = auto.get(p.id);
        const st = statusDe(p.id);
        const isManual = manual[p.id] !== undefined || (!a && st === "ok");
        return {
          participante_id: p.id, status: st, origem: isManual || !a ? "manual" : "auto",
          nome_lido: a?.m.leitura.nome ?? null, emoji_lido: a?.m.leitura.emoji || null, confianca: a ? a.m.confianca : null,
        };
      });
      const sobras = [...conferir, ...naoRec].map((i) => matches[i].leitura);
      const { error } = await db.rpc("grupo_fechar_rodada", { p_rodada: atual.id, p_checks: rows, p_sobras: sobras });
      if (error) throw error;
      setPrints([]); setManual({}); setConfirmadas({});
      toast.success(`Rodada fechada: ${rows.filter((r) => r.status === "ok").length} ✅ · ${rows.filter((r) => r.status === "nao").length} ❌`);
      qc.invalidateQueries({ queryKey: ["grupo-rodada", grupo.id] });
      qc.invalidateQueries({ queryKey: ["grupo-semana", grupo.id] });
      qc.invalidateQueries({ queryKey: ["grupo-hist", grupo.id] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao salvar"); }
    finally { setSalvando(false); }
  };
  const reabrir = async () => {
    if (!rodada || !window.confirm("Reabrir esta rodada para corrigir? Os checks salvos serão mantidos.")) return;
    const { error } = await db.from("grupo_rodada").update({ status: "aberta" }).eq("id", rodada.id);
    if (error) return toast.error(error.message);
    setManual({}); setConfirmadas({}); setPrints([]);
    auditoriaQ.refetch();
    qc.invalidateQueries({ queryKey: ["grupo-semana", grupo.id] });
    qc.invalidateQueries({ queryKey: ["grupo-rodada", grupo.id, data] });
    qc.invalidateQueries({ queryKey: ["grupo-hist", grupo.id] });
  };

  const SelectPart = ({ value, onChange }: { value?: string; onChange: (v: string) => void }) => (
    <select className="h-11 w-full rounded-md border border-input bg-background px-2 text-sm" value={value ?? ""} onChange={(e) => e.target.value && onChange(e.target.value)}>
      <option value="">Vincular a…</option>
      {ativas.map((p) => <option key={p.id} value={p.id}>@{p.username}{p.nome_exibicao ? ` · ${p.nome_exibicao}` : ""}</option>)}
    </select>
  );

  return (
    <div className="space-y-4 pt-3">
      <SeletorSemana semana={semana} disabled={lendo || salvando} onChange={(v) => { setSemana(v); setData(diaPadrao(v, grupo.dias_missao, hoje())); }} />
      <div className="grid grid-cols-3 gap-2">
        {diasConferencia(semana, grupo.dias_missao).map((d) => {
          const r = semanaQ.data?.rodadas.find((r) => r.data === d);
          return <Button key={d} variant={data === d ? "default" : "outline"} className="h-auto min-h-20 flex-col whitespace-normal px-2" disabled={d > hoje() || lendo || salvando} onClick={() => setData(d)}>
            <span>{DIA_LABEL[diaSemana(d)]} {fmtData(d)}</span>
            <span className="text-xs">{r?.status === "fechada" ? "✅ Fechada" : r ? "🟡 Aberta" : "⏳ Pendente"}</span>
          </Button>;
        })}
      </div>
      {!data && <p className="text-sm text-muted-foreground">Nenhum dia de conferência desta semana chegou ainda.</p>}
      {rodadaQ.isLoading && <p className="text-sm text-muted-foreground">Carregando rodada…</p>}
      {rodadaQ.error && <p className="text-sm text-destructive">Não foi possível carregar a rodada. <Button variant="outline" onClick={() => rodadaQ.refetch()}>Tentar novamente</Button></p>}
      {fechada && <div className="space-y-2 rounded-lg border border-border bg-card p-3 text-sm">
        <p>Rodada fechada · somente leitura.</p>
        <Button variant="link" className="px-0" onClick={() => onAjustar(semana)}>Ajustar na aba Semana</Button>
        <Button variant="outline" className="h-12" onClick={reabrir}>Reabrir para corrigir</Button>
      </div>}

      {data && !rodadaQ.isLoading && !rodadaQ.error && <section className="space-y-3 border-y border-border py-3">
        <label className="block text-sm font-medium">Total de reações no post (Instagram)
          <Input aria-label="Total de reações no post (Instagram)" type="number" min="0" step="1" disabled={fechada || lendo} value={totalReacoes} onChange={(e) => setTotalReacoes(e.target.value)} onBlur={salvarTotal} className="mt-1 max-w-64" />
        </label>
        <p className="text-sm">Lidos: {new Set(leituras.map((l) => norm(l.nome))).size} únicos · Reconhecidas {reconhecidas.length} · Conferir {conferir.length} · Não reconhecidas {naoRec.length}</p>
        {faltantesLeitura(leituras, totalReacoes === "" ? null : Number(totalReacoes)) > 0 && <p role="alert" className="text-sm font-semibold text-destructive">Faltam {faltantesLeitura(leituras, Number(totalReacoes))} nomes — envie mais prints (role a lista de Reações até o fim)</p>}
        {auditoriaQ.isError && <p role="alert" className="text-destructive">Não foi possível carregar as leituras. <Button variant="outline" onClick={() => auditoriaQ.refetch()}>Tentar novamente</Button></p>}
        {[...new Set((auditoriaQ.data?.rows ?? []).map((r) => r.print_idx))].map((idx) => {
          const rows = auditoriaQ.data?.rows.filter((r) => r.print_idx === idx) ?? [];
          const total = Math.max(...rows.map((r) => r.total_linhas_visiveis));
          return <p className="text-sm" key={idx}>Print {idx}: {rows.length} nomes{rows.length < total ? ` · ${total - rows.length} linhas ainda não lidas` : ""}</p>;
        })}
        <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setAuditoriaAberta(true)}>Ver leituras</Button><Button variant="ghost" disabled={fechada || lendo || !leituras.length} onClick={limparLeituras}>Limpar leituras</Button></div>
      </section>}
      <Dialog open={auditoriaAberta} onOpenChange={setAuditoriaAberta}><DialogContent className="max-h-[85vh] overflow-y-auto"><DialogHeader><DialogTitle>Leituras por print</DialogTitle></DialogHeader>
        {!auditoriaQ.data?.rows.length && <p className="text-sm text-muted-foreground">Nenhuma leitura registrada. Prints antigos precisam ser enviados novamente.</p>}
        {(auditoriaQ.data?.rows ?? []).map((r) => {
          const p = parts.data?.find((p) => p.id === r.participante_id);
          return <div key={r.id} className="border-b border-border py-2 text-sm"><p className="font-semibold">Print {r.print_idx} · Linha {r.ordem + 1}</p><p className="break-words">{r.nome_lido} {r.emoji_lido} {r.cortado && "(cortado)"}</p><p>{p ? <PerfilLink username={p.username} /> : "Não vinculada"} · {Math.round(Number(r.confianca) * 100)}%</p></div>;
        })}
      </DialogContent></Dialog>
      {data && !fechada && !rodadaQ.isLoading && !rodadaQ.error && <>
      <label className={cn("flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-primary/50 bg-accent/40 text-sm font-medium", lendo && "pointer-events-none opacity-60")}>
        {lendo ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
        {lendo ? "Lendo os prints…" : "Enviar prints da tela Reações"}
        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { enviar(e.target.files); e.target.value = ""; }} />
      </label>
      {prints.length > 0 && (
        <div className="space-y-1">
          {prints.map((p, i) => (
            <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-xs">
              <span className="truncate">Print {i + 1}</span>
              {p.status === "lendo" && <span className="flex items-center gap-1 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> lendo…</span>}
              {p.status === "ok" && <span>{p.n} nomes lidos</span>}
              {p.status === "erro" && <span className="flex items-center gap-2 text-destructive">{p.erro}<Button size="sm" variant="outline" onClick={() => lerUm(p.file, i)}><RefreshCw className="h-3 w-3" /> Reenviar</Button></span>}
            </div>
          ))}
          
        </div>
      )}

      {leituras.length > 0 && (
        <div className="space-y-3">
          <Bloco titulo={`✅ Reconhecidas (${reconhecidas.length})`}>
            {reconhecidas.map(({ m }) => {
              if (!m.participante) return null;
              return <Linha key={m.participante.id} esq={<><b><PerfilLink username={m.participante.username} /></b><span className="text-muted-foreground"> · lido “{m.leitura.nome}” {m.leitura.emoji}</span></>} dir={<span className="text-xs text-muted-foreground">{Math.round(m.confianca * 100)}%</span>} />;
            })}
          </Bloco>
          {conferir.length > 0 && (
            <Bloco titulo={`⚠️ Conferir (${conferir.length})`}>
              {conferir.map((i) => { const m = matches[i]; const participante = m.participante; if (!participante) return null; return (
                <div key={i} className="space-y-2 border-b border-border py-2 last:border-0">
                  <p className="text-sm">Lido: <b>{m.leitura.nome}</b> {m.leitura.emoji} → sugestão <b><PerfilLink username={participante.username} /></b>{m.porEmoji && <span className="text-xs"> pelo emoji {participante.emoji_habitual}</span>} <span className="text-xs text-muted-foreground">({Math.round(m.confianca * 100)}%)</span></p>
                  <div className="flex gap-2">
                    <Button className="h-11 shrink-0" onClick={() => vincular(i, participante.id)}><Check className="h-4 w-4" /> Confirmar</Button>
                    <SelectPart onChange={(v) => vincular(i, v)} />
                  </div>
                </div>
              ); })}
            </Bloco>
          )}
          {naoRec.length > 0 && (
            <Bloco titulo={`❓ Não reconhecidas (${naoRec.length})`}>
              {naoRec.map((i) => { const m = matches[i]; return (
                <div key={i} className="space-y-2 border-b border-border py-2 last:border-0">
                  <p className="text-sm"><b>{m.leitura.nome}</b> {m.leitura.emoji}</p>
                  <div className="flex gap-2">
                    <SelectPart onChange={(v) => vincular(i, v)} />
                    <Button variant="outline" className="h-11 shrink-0" onClick={() => cadastrarNovata(m.leitura)}>Novata 🆕</Button>
                  </div>
                </div>
              ); })}
            </Bloco>
          )}
        </div>
      )}

      </>}
      {data && !rodadaQ.isLoading && !rodadaQ.error && <Bloco titulo={`Todas as participantes ativas · ${totalOk} ✅ / ${ativas.length}`}>
        {ativas.map((p) => {
          const st = statusDe(p.id);
          return (
            <div key={p.id} className="flex items-center justify-between gap-2 border-b border-border py-1.5 last:border-0">
              <span className="min-w-0 break-all text-sm"><PerfilLink username={p.username} /> {p.novata && "🆕"}{manual[p.id] && <span className="text-xs text-muted-foreground"> · manual</span>}</span>
              <div className="flex shrink-0 items-center gap-1">
                {fechada && <IndicadorAjuste check={rodadaQ.data?.checks.find((c) => c.participante_id === p.id)} />}
                <Button variant="outline" disabled={fechada || salvando} aria-label="Cumpriu" onClick={() => setManual((m) => ({ ...m, [p.id]: "ok" }))} className={cn("h-10 w-12 rounded-lg border text-lg", st === "ok" ? "border-primary bg-primary/15" : "border-border opacity-40")}>✅</Button>
                <Button variant="outline" disabled={fechada || salvando} aria-label="Não cumpriu" onClick={() => setManual((m) => ({ ...m, [p.id]: "nao" }))} className={cn("h-10 w-12 rounded-lg border text-lg", st === "nao" ? "border-destructive bg-destructive/10" : "border-border opacity-40")}>❌</Button>
              </div>
            </div>
          );
        })}
        {!ativas.length && <p className="py-3 text-sm text-muted-foreground">Cadastre as participantes na aba Participantes.</p>}
      </Bloco>}
      {data && !fechada && <Button className="h-14 w-full text-base" disabled={rodadaQ.isLoading || !!rodadaQ.error || parts.isLoading || !!parts.error || salvando || lendo || !ativas.length} onClick={confirmarRodada}>
        {salvando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} Confirmar rodada
      </Button>}
    </div>
  );
}

const Bloco = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <div className="rounded-xl border border-border bg-card p-3"><p className="mb-1 font-semibold">{titulo}</p>{children}</div>
);
const Linha = ({ esq, dir }: { esq: React.ReactNode; dir: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-2 border-b border-border py-1.5 text-sm last:border-0"><span className="min-w-0 truncate">{esq}</span>{dir}</div>
);

/* ---------------- Semana / Exportar ---------------- */
function SemanaTab({ grupo, semanaInicial }: { grupo: Grupo; semanaInicial: string | null }) {
  const qc = useQueryClient();
  const [ini, setIni] = useState(semanaInicial ?? inicioSemana(hoje()));
  const [ajuste, setAjuste] = useState<{ p: Participante; r: Rodada } | null>(null);
  const [regularizar, setRegularizar] = useState<Participante | null>(null);
  const [novoStatus, setNovoStatus] = useState<"ok" | "nao">("ok");
  const [obs, setObs] = useState("Atualizou depois");
  const [salvando, setSalvando] = useState(false);
  const [lst, setLst] = useState("");
  const partsQ = useParticipantes(grupo.id);
  const listasExist = [...new Set((partsQ.data ?? []).map((p) => p.lista).filter((x): x is number => x != null))].sort((a, b) => a - b);
  const parts = { data: (partsQ.data ?? []).filter((p) => !lst || String(p.lista ?? "") === lst).sort((a, b) => ordenarUsernames(a.username, b.username)) };
  const q = useRodadasSemana(grupo.id, ini);
  const rodadas = q.data?.rodadas ?? [];
  const porDia = new Map(rodadas.filter((r) => r.status === "fechada").map((r) => [r.dia_semana, r]));
  const { fechadas, fechados } = resumoSemana(ini, grupo.dias_missao, rodadas, q.data?.checks ?? []);
  const texto = textoSemana({ dias: grupo.dias_missao, rodadas: fechadas, checks: q.data?.checks ?? [], participantes: parts.data ?? [] });
  const diasConferidos = diasConferencia(ini, grupo.dias_missao).map(diaSemana).filter((d) => fechados.has(d)).map((d) => DIA_LABEL[d]);
  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["grupo-semana", grupo.id] }),
      qc.invalidateQueries({ queryKey: ["grupo-rodada", grupo.id] }),
      qc.invalidateQueries({ queryKey: ["grupo-hist", grupo.id] }),
    ]);
  };
  const salvar = async () => {
    if (!ajuste || salvando) return;
    setSalvando(true);
    try {
      const { error } = await supabase.rpc("grupo_ajustar_check", { p_rodada: ajuste.r.id, p_participante: ajuste.p.id, p_status: novoStatus, p_obs: obs.trim() });
      if (error) throw error;
      await refresh(); setAjuste(null); toast.success("Check ajustado");
    } catch (e) { toast.error((e as Error).message || "Não foi possível ajustar"); }
    finally { setSalvando(false); }
  };
  const salvarSemana = async () => {
    if (!regularizar || salvando) return;
    setSalvando(true);
    try {
      const { data, error } = await supabase.rpc("grupo_regularizar_semana", { p_grupo: grupo.id, p_participante: regularizar.id, p_semana: ini, p_obs: "Atualizou depois" });
      if (error) throw error;
      await refresh(); setRegularizar(null); toast.success(`${data} check(s) regularizado(s)`);
    } catch (e) { toast.error((e as Error).message || "Não foi possível regularizar"); }
    finally { setSalvando(false); }
  };
  const cel = (p: Participante, dia: string) => {
    const r = porDia.get(dia); if (!r) return "–";
    const c = q.data?.checks.find((x) => x.rodada_id === r.id && x.participante_id === p.id);
    if (p.entrou_em > r.data) return "–";
    return <Button variant="ghost" aria-label={`Ajustar @${p.username} · ${DIA_LABEL[dia]} ${fmtData(r.data)}`} className="h-11 min-w-11 px-1 text-base" onClick={() => { setNovoStatus(c?.status ?? "nao"); setObs(c?.obs ?? "Atualizou depois"); setAjuste({ p, r }); }}>
      {c ? (c.status === "ok" ? "✅" : "❌") : "–"}<IndicadorAjuste check={c} />
    </Button>;
  };
  const carregando = partsQ.isLoading || q.isLoading;
  const erro = partsQ.error || q.error;
  const atualizar = () => { partsQ.refetch(); q.refetch(); };
  if (carregando) return <p role="status" className="py-4 text-sm text-muted-foreground">Carregando a semana…</p>;
  if (erro) return <div role="alert" className="space-y-3 pt-3"><p className="text-sm text-destructive">Não foi possível carregar a semana. Os checks salvos não foram alterados.</p><Button variant="outline" onClick={atualizar}><RefreshCw className="h-4 w-4" /> Tentar novamente</Button></div>;
  return (
    <div className="space-y-3 pt-3">
      <SeletorSemana semana={ini} onChange={setIni} />
      <Button variant="outline" disabled={q.isFetching || partsQ.isFetching} onClick={atualizar}><RefreshCw className={cn("h-4 w-4", q.isFetching && "animate-spin")} /> Atualizar informações</Button>
      <select className="h-12 w-full rounded-md border border-input bg-background px-2 text-sm" value={lst} onChange={(e) => setLst(e.target.value)}>
        <option value="">Exportar a lista inteira</option>
        {listasExist.map((n) => <option key={n} value={String(n)}>Só a Lista {n}</option>)}
      </select>
      <p className="text-sm font-semibold">{`Dias conferidos: ${diasConferidos.join(", ") || "nenhum"}`}</p>
      <Textarea readOnly rows={12} value={texto} className="font-mono text-xs" />
      <Button className="h-12 w-full" onClick={() => navigator.clipboard.writeText(texto).then(() => toast.success("Lista copiada"), () => toast.error("Não foi possível copiar"))}><Copy className="h-4 w-4" /> Copiar lista</Button>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border"><th className="p-2 text-left">Participante</th>{grupo.dias_missao.map((d) => <th key={d} className="p-2">{DIA_LABEL[d]}</th>)}<th className="p-2">Ajustes</th></tr></thead>
          <tbody>
            {(parts.data ?? []).filter((p) => p.ativo).map((p, i) => (
              <tr key={p.id} className="border-b border-border last:border-0"><td className="p-2">{i + 1}. <PerfilLink username={p.username} /></td>{grupo.dias_missao.map((d) => <td key={d} className="p-2 text-center">{cel(p, d)}</td>)}<td className="p-2"><Button variant="outline" size="sm" className="h-11" aria-label={`Regularizar semana de @${p.username}`} disabled={!q.data?.checks.some((c) => c.participante_id === p.id && c.status === "nao" && rodadas.some((r) => r.id === c.rodada_id && r.status === "fechada" && p.entrou_em <= r.data))} onClick={() => setRegularizar(p)}><ListChecks className="h-4 w-4" /> Regularizar semana</Button></td></tr>
            ))}
          </tbody>
          <tfoot><tr className="border-t border-border font-semibold"><td className="p-2">Total ✅</td>{grupo.dias_missao.map((d) => {
            const r = porDia.get(d);
            const ids = new Set((parts.data ?? []).filter((p) => p.ativo).map((p) => p.id));
            return <td key={d} className="p-2 text-center">{r ? (q.data?.checks ?? []).filter((c) => c.rodada_id === r.id && c.status === "ok" && ids.has(c.participante_id)).length : "–"}</td>;
          })}<td /></tr></tfoot>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">• = ajustado manualmente</p>
      <Dialog open={!!ajuste} onOpenChange={(v) => { if (!v && !salvando) setAjuste(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="break-words">Ajustar {ajuste && <PerfilLink username={ajuste.p.username} />} · {ajuste && `${DIA_LABEL[ajuste.r.dia_semana]} ${fmtData(ajuste.r.data)}`}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <Button aria-label="Marcar cumpriu" aria-pressed={novoStatus === "ok"} variant={novoStatus === "ok" ? "default" : "outline"} disabled={salvando} className="h-12 text-xl" onClick={() => setNovoStatus("ok")}>✅</Button>
            <Button aria-label="Marcar não cumpriu" aria-pressed={novoStatus === "nao"} variant={novoStatus === "nao" ? "default" : "outline"} disabled={salvando} className="h-12 text-xl" onClick={() => setNovoStatus("nao")}>❌</Button>
          </div>
          <label className="space-y-2 text-sm">Observação (opcional)<Textarea aria-label="Observação do ajuste" value={obs} disabled={salvando} onChange={(e) => setObs(e.target.value)} /></label>
          <Button disabled={salvando} className="h-12" onClick={salvar}>{salvando && <Loader2 className="h-4 w-4 animate-spin" />} {salvando ? "Salvando…" : "Salvar"}</Button>
        </DialogContent>
      </Dialog>
      <Dialog open={!!regularizar} onOpenChange={(v) => { if (!v && !salvando) setRegularizar(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Regularizar semana</DialogTitle></DialogHeader>
          <p className="break-words text-sm">Marcar ✅ em todas as rodadas fechadas desta semana para {regularizar && <PerfilLink username={regularizar.username} />}?</p>
          <div className="flex justify-end gap-2"><Button variant="outline" disabled={salvando} onClick={() => setRegularizar(null)}>Cancelar</Button><Button disabled={salvando} onClick={salvarSemana}>{salvando && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- Histórico ---------------- */
function HistoricoTab({ grupo }: { grupo: Grupo }) {
  const [de, setDe] = useState(addDias(hoje(), -30));
  const [ate, setAte] = useState(hoje());
  const parts = useParticipantes(grupo.id);
  const q = useQuery({
    queryKey: ["grupo-hist", grupo.id, de, ate],
    refetchOnMount: "always",
    queryFn: async () => {
      const { data: rs, error } = await db.from("grupo_rodada").select("id").eq("grupo_id", grupo.id).eq("status", "fechada").gte("data", de).lte("data", ate);
      if (error) throw error;
      const ids = (rs ?? []).map((r: { id: string }) => r.id);
      const { data: cs, error: checksError } = ids.length ? await db.from("grupo_check").select("rodada_id,participante_id,status,ajustado_em,status_original,obs").in("rodada_id", ids) : { data: [], error: null };
      if (checksError) throw checksError;
      return { n: ids.length, checks: (cs ?? []) as CheckRow[] };
    },
  });
  const stats = (parts.data ?? []).map((p) => {
    const cs = (q.data?.checks ?? []).filter((c) => c.participante_id === p.id);
    const ok = cs.filter((c) => c.status === "ok").length;
    return { p, ok, ajustes: cs.filter((c) => c.ajustado_em).length, faltas: cs.length - ok, total: cs.length, taxa: cs.length ? ok / cs.length : 0 };
  }).filter((s) => s.total > 0).sort((a, b) => b.faltas - a.faltas || a.taxa - b.taxa || ordenarUsernames(a.p.username, b.p.username));
  const media = stats.length ? stats.reduce((s, x) => s + x.taxa, 0) / stats.length : 0;
  const atualizar = () => { parts.refetch(); q.refetch(); };
  if (parts.isLoading || q.isLoading) return <p role="status" className="py-4 text-sm text-muted-foreground">Carregando o histórico…</p>;
  if (parts.error || q.error) return <div role="alert" className="space-y-3 pt-3"><p className="text-sm text-destructive">Não foi possível carregar o histórico. Os checks salvos não foram alterados.</p><Button variant="outline" onClick={atualizar}><RefreshCw className="h-4 w-4" /> Tentar novamente</Button></div>;
  return (
    <div className="space-y-3 pt-3">
      <Button variant="outline" disabled={q.isFetching || parts.isFetching} onClick={atualizar}><RefreshCw className={cn("h-4 w-4", q.isFetching && "animate-spin")} /> Atualizar informações</Button>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="text-xs text-muted-foreground">De</label><Input type="date" className="h-12" value={de} onChange={(e) => setDe(e.target.value)} /></div>
        <div><label className="text-xs text-muted-foreground">Até</label><Input type="date" className="h-12" value={ate} onChange={(e) => setAte(e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Rodadas fechadas</p><p className="text-2xl font-bold">{q.data?.n ?? 0}</p></div>
        <div className="rounded-xl border border-border bg-card p-3"><p className="text-xs text-muted-foreground">Participação média</p><p className="text-2xl font-bold">{Math.round(media * 100)}%</p></div>
      </div>
      <Bloco titulo="Quem mais falta">
        {stats.map((s, i) => (
          <div key={s.p.id} className="border-b border-border py-2 last:border-0">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="min-w-0">{i + 1}. <PerfilLink username={s.p.username} /></span><span><b>{s.faltas}</b> falta{s.faltas === 1 ? "" : "s"} · {Math.round(s.taxa * 100)}% · <span title="Checks ajustados no período">{s.ajustes} ajuste{s.ajustes === 1 ? "" : "s"} •</span></span></div>
            <div className="mt-1 h-1.5 rounded-full bg-accent"><div className="h-full rounded-full bg-primary" style={{ width: `${s.taxa * 100}%` }} /></div>
          </div>
        ))}
        {!stats.length && <p className="py-3 text-sm text-muted-foreground">Nenhuma rodada fechada no período.</p>}
      </Bloco>
    </div>
  );
}

/* ---------------- Não fizeram ---------------- */
function NaoFizeramTab({ grupo, onIrRodada }: { grupo: Grupo; onIrRodada: () => void }) {
  const qc = useQueryClient();
  const [ini, setIni] = useState(inicioSemana(hoje()));
  const [sel, setSel] = useState<string | null>(null); // data ou "semana"
  const [lst, setLst] = useState("");
  const [escolha, setEscolha] = useState<{ p: Participante; faltas: RodadaSemana[] } | null>(null);
  const [salvando, setSalvando] = useState<string | null>(null);
  const partsQ = useParticipantes(grupo.id);
  const q = useRodadasSemana(grupo.id, ini);
  const rodadas = q.data?.rodadas ?? [];
  const datas = diasConferencia(ini, grupo.dias_missao);
  const ultimaFechada = datas.filter((d) => rodadas.some((r) => r.data === d && r.status === "fechada")).at(-1) ?? null;
  const atual = sel ?? ultimaFechada ?? "semana";
  const listasExist = [...new Set((partsQ.data ?? []).map((p) => p.lista).filter((x): x is number => x != null))].sort((a, b) => a - b);
  const lista = lst ? Number(lst) : null;
  const rodDia = atual !== "semana" ? rodadas.find((r) => r.data === atual) : undefined;
  const ativas = (partsQ.data ?? []).filter((p) => p.ativo && (lista == null || p.lista === lista));
  const totalBase = atual === "semana" ? ativas.length : ativas.filter((p) => p.entrou_em <= atual).length;
  const itens = useMemo(() => {
    const rs = atual === "semana" ? rodadas : rodDia?.status === "fechada" ? [rodDia] : [];
    return naoFizeram({ participantes: partsQ.data ?? [], rodadas: rs, checks: q.data?.checks ?? [], lista });
  }, [atual, rodadas, rodDia, partsQ.data, q.data, lista]);
  const texto = atual === "semana" ? textoNaoFizeram(itens, { semana: ini }) : rodDia ? textoNaoFizeram(itens, { dia: rodDia }) : "";
  const refresh = () => Promise.all([
    qc.invalidateQueries({ queryKey: ["grupo-semana", grupo.id] }),
    qc.invalidateQueries({ queryKey: ["grupo-rodada", grupo.id] }),
    qc.invalidateQueries({ queryKey: ["grupo-hist", grupo.id] }),
  ]);
  const ajustar = async (p: Participante, rs: RodadaSemana[]) => {
    if (salvando) return;
    setSalvando(p.id);
    try {
      for (const r of rs) {
        const { error } = await supabase.rpc("grupo_ajustar_check", { p_rodada: r.id, p_participante: p.id, p_status: "ok", p_obs: "Atualizou depois" });
        if (error) throw error;
      }
      await refresh(); setEscolha(null); toast.success(`@${p.username} marcada como feita`);
    } catch (e) { toast.error((e as Error).message || "Não foi possível ajustar"); }
    finally { setSalvando(null); }
  };
  if (partsQ.isLoading || q.isLoading) return <p role="status" className="py-4 text-sm text-muted-foreground">Carregando…</p>;
  if (partsQ.error || q.error) return <div role="alert" className="space-y-3 pt-3"><p className="text-sm text-destructive">Não foi possível carregar.</p><Button variant="outline" onClick={() => { partsQ.refetch(); q.refetch(); }}><RefreshCw className="h-4 w-4" /> Tentar novamente</Button></div>;
  const naoFechada = atual !== "semana" && rodDia?.status !== "fechada";
  return (
    <div className="space-y-3 pt-3">
      <SeletorSemana semana={ini} onChange={(v) => { setIni(v); setSel(null); }} />
      <div className="flex flex-wrap gap-2">
        {datas.map((d) => {
          const r = rodadas.find((x) => x.data === d);
          return <Button key={d} variant={atual === d ? "default" : "outline"} className="h-12 min-w-20" onClick={() => setSel(d)}>
            {DIA_LABEL[diaSemana(d)]} {fmtData(d)} {r?.status === "fechada" ? "🔒" : r ? "⏳" : ""}
          </Button>;
        })}
        <Button variant={atual === "semana" ? "default" : "outline"} className="h-12" onClick={() => setSel("semana")}>Semana inteira</Button>
      </div>
      <select aria-label="Filtrar por lista" className="h-12 w-full rounded-md border border-input bg-background px-2 text-sm" value={lst} onChange={(e) => setLst(e.target.value)}>
        <option value="">Todas</option>
        {listasExist.map((n) => <option key={n} value={String(n)}>Lista {n}</option>)}
      </select>
      {naoFechada ? (
        <div role="status" className="rounded-xl border border-border bg-card p-4 text-sm">
          <p className="font-semibold">Rodada ainda não fechada</p>
          <Button variant="link" className="h-11 px-0" onClick={onIrRodada}>Ir para a aba Rodada</Button>
        </div>
      ) : (
        <>
          <p className="text-sm font-semibold">{itens.length} não fizeram de {totalBase}</p>
          {itens.length === 0 ? <p className="rounded-xl border border-border bg-card p-6 text-center text-lg">Todas fizeram 🎉</p> : (
            <>
              <Button className="h-12 w-full" onClick={() => navigator.clipboard.writeText(texto).then(() => toast.success("Lista copiada"), () => toast.error("Não foi possível copiar"))}><Copy className="h-4 w-4" /> Copiar lista</Button>
              <ul className="divide-y divide-border rounded-xl border border-border bg-card">
                {itens.map((x, i) => (
                  <li key={x.participante.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 p-2 text-sm">
                    <span className="w-6 text-muted-foreground">{i + 1}.</span>
                    <PerfilLink username={x.participante.username} />
                    <span className="text-lg">{x.participante.emoji_habitual ?? ""}</span>
                    {x.participante.lista != null && <span className="rounded bg-muted px-1.5 text-xs">L{x.participante.lista}</span>}
                    {atual === "semana" && <span className="w-full pl-9 text-xs text-muted-foreground sm:w-auto sm:pl-0">{x.dias.filter((d) => d.fez !== null).map((d) => `${DIA_LABEL[d.rodada.dia_semana]} ${d.fez ? "✅" : "❌"}`).join(" · ")}</span>}
                    <Button variant="outline" size="sm" className="ml-auto h-11" disabled={!!salvando}
                      onClick={() => atual === "semana" && x.faltas.length > 1 ? setEscolha({ p: x.participante, faltas: x.faltas }) : ajustar(x.participante, x.faltas)}>
                      {salvando === x.participante.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "✅"} Fez depois
                    </Button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
      <Dialog open={!!escolha} onOpenChange={(v) => { if (!v && !salvando) setEscolha(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="break-words">Fez depois · {escolha && <PerfilLink username={escolha.p.username} />}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Qual dia ela atualizou?</p>
          <div className="grid gap-2">
            {escolha?.faltas.map((r) => <Button key={r.id} variant="outline" className="h-12" disabled={!!salvando} onClick={() => ajustar(escolha.p, [r])}>✅ {DIA_LABEL[r.dia_semana]} {fmtData(r.data)}</Button>)}
            <Button className="h-12" disabled={!!salvando} onClick={() => escolha && ajustar(escolha.p, escolha.faltas)}><ListChecks className="h-4 w-4" /> Regularizar semana</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
