import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Check, Copy, ImagePlus, Loader2, Plus, RefreshCw, Upload, X } from "lucide-react";
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
  addDias, cruzar, dedupe, DIA_LABEL, diaSemana, faixa, inicioSemana, norm, normUser, parseLista, textoSemana,
  type Leitura, type Participante,
} from "./lib";

const db = supabase as any;
type Grupo = { id: string; nome: string; dias_missao: string[]; criado_em: string };
type Rodada = { id: string; grupo_id: string; data: string; dia_semana: string; status: "aberta" | "fechada" };
type CheckRow = { rodada_id: string; participante_id: string; status: "ok" | "nao" };
const hoje = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const fmtData = (iso: string) => new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

/* ---------------- Grupos ---------------- */
export function GruposLista() {
  const nav = useNavigate();
  const [nome, setNome] = useState("");
  const q = useQuery({
    queryKey: ["grupos"],
    queryFn: async () => {
      const { data, error } = await db.from("grupo_engaj").select("*, grupo_participante(count)").order("criado_em");
      if (error) throw error;
      return data as (Grupo & { grupo_participante: { count: number }[] })[];
    },
  });
  const criar = async () => {
    if (!nome.trim()) return;
    const { data, error } = await db.from("grupo_engaj").insert({ nome: nome.trim() }).select("id").single();
    if (error) return toast.error(error.message);
    nav({ to: "/grupos/$grupoId", params: { grupoId: data.id } });
  };
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Check de Grupos</h1><p className="text-sm text-muted-foreground">Confira quem cumpriu a missão nos grupos de engajamento.</p></div>
      <div className="flex gap-2">
        <Input className="h-12" placeholder="Nome do novo grupo" value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === "Enter" && criar()} />
        <Button className="h-12" onClick={criar}><Plus className="h-4 w-4" /> Criar</Button>
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
    queryFn: async () => {
      const { data, error } = await db.from("grupo_participante").select("*").eq("grupo_id", grupoId).order("username");
      if (error) throw error;
      return data as Participante[];
    },
  });
}

export function GrupoDetalhe({ grupoId }: { grupoId: string }) {
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
      <Tabs defaultValue="rodada">
        <TabsList className="grid h-auto w-full grid-cols-4">
          <TabsTrigger value="rodada" className="py-2">Rodada</TabsTrigger>
          <TabsTrigger value="part" className="py-2">Participantes</TabsTrigger>
          <TabsTrigger value="semana" className="py-2">Semana</TabsTrigger>
          <TabsTrigger value="hist" className="py-2">Histórico</TabsTrigger>
        </TabsList>
        <TabsContent value="rodada"><RodadaDia grupo={g.data} /></TabsContent>
        <TabsContent value="part"><ParticipantesTab grupo={g.data} /></TabsContent>
        <TabsContent value="semana"><SemanaTab grupo={g.data} /></TabsContent>
        <TabsContent value="hist"><HistoricoTab grupo={g.data} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* ---------------- Participantes ---------------- */
function ParticipantesTab({ grupo }: { grupo: Grupo }) {
  const qc = useQueryClient();
  const q = useParticipantes(grupo.id);
  const [imp, setImp] = useState(false);
  const [texto, setTexto] = useState("");
  const [busca, setBusca] = useState("");
  const [mostrarInativas, setMostrarInativas] = useState(false);
  const existentes = new Set((q.data ?? []).map((p) => p.username));
  const lidos = parseLista(texto);
  const novos = lidos.filter((u) => !existentes.has(u));
  const refresh = () => qc.invalidateQueries({ queryKey: ["grupo-part", grupo.id] });

  const salvarImport = async () => {
    if (!novos.length) return setImp(false);
    const { error } = await db.from("grupo_participante").insert(novos.map((username) => ({ grupo_id: grupo.id, username })));
    if (error) return toast.error(error.message);
    toast.success(`${novos.length} participantes cadastradas`);
    setTexto(""); setImp(false); refresh();
  };
  const patch = async (id: string, v: Partial<Participante>) => {
    const { error } = await db.from("grupo_participante").update(v).eq("id", id);
    if (error) toast.error(error.message); else refresh();
  };
  const lista = (q.data ?? []).filter((p) => (mostrarInativas || p.ativo) && (!busca || norm(p.username + (p.nome_exibicao ?? "") + p.apelidos.join("")).includes(norm(busca))));

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
      <p className="text-xs text-muted-foreground">{(q.data ?? []).filter((p) => p.ativo).length} ativas</p>
      <div className="space-y-2">
        {lista.map((p) => (
          <div key={p.id} className={cn("rounded-xl border border-border bg-card p-3", !p.ativo && "opacity-60")}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">@{p.username} {p.novata && "🆕"}</p>
              <div className="flex items-center gap-3 text-xs">
                <label className="flex items-center gap-1">Novata <Switch checked={p.novata} onCheckedChange={(v) => patch(p.id, { novata: v })} /></label>
                <label className="flex items-center gap-1">Ativa <Switch checked={p.ativo} onCheckedChange={(v) => patch(p.id, { ativo: v })} /></label>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-[1fr_4.5rem] gap-2">
              <Input defaultValue={p.nome_exibicao ?? ""} placeholder="Nome de exibição" onBlur={(e) => e.target.value !== (p.nome_exibicao ?? "") && patch(p.id, { nome_exibicao: e.target.value || null })} />
              <Input defaultValue={p.emoji_habitual ?? ""} placeholder="Emoji" className="text-center" onBlur={(e) => e.target.value !== (p.emoji_habitual ?? "") && patch(p.id, { emoji_habitual: e.target.value || null })} />
            </div>
            {p.apelidos.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {p.apelidos.map((a) => (
                  <span key={a} className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs">
                    {a}<button aria-label="Remover apelido" onClick={() => patch(p.id, { apelidos: p.apelidos.filter((x) => x !== a) })}><X className="h-3 w-3" /></button>
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
          <Textarea rows={8} placeholder="Cole aqui a lista (1. @fulana ❌ …)" value={texto} onChange={(e) => setTexto(e.target.value)} />
          {lidos.length > 0 && (
            <div className="space-y-1 text-sm">
              <p>{lidos.length} @ encontrados · <b>{novos.length} novos</b> · {lidos.length - novos.length} já cadastrados</p>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border p-2 text-xs">
                {lidos.map((u) => <div key={u} className={existentes.has(u) ? "text-muted-foreground" : "font-medium"}>@{u}{existentes.has(u) ? " (já existe)" : ""}</div>)}
              </div>
            </div>
          )}
          <Button className="h-12" disabled={!novos.length} onClick={salvarImport}>Salvar {novos.length} novas</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NovaParticipante({ grupoId, onDone }: { grupoId: string; onDone: () => void }) {
  const [u, setU] = useState("");
  const add = async () => {
    const username = normUser(u);
    if (!username) return;
    const { error } = await db.from("grupo_participante").insert({ grupo_id: grupoId, username });
    if (error) return toast.error(error.code === "23505" ? "Essa @ já está no grupo" : error.message);
    setU(""); onDone();
  };
  return (
    <div className="flex flex-1 gap-2">
      <Input className="h-11" placeholder="@nova" value={u} onChange={(e) => setU(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
      <Button variant="outline" className="h-11" onClick={add}><Plus className="h-4 w-4" /></Button>
    </div>
  );
}

/* ---------------- Rodada do dia ---------------- */
async function comprimir(file: File): Promise<string> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / img.width);
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.85);
}

type PrintEstado = { nome: string; status: "lendo" | "ok" | "erro"; erro?: string; file: File; n?: number };

function RodadaDia({ grupo }: { grupo: Grupo }) {
  const qc = useQueryClient();
  const [data, setData] = useState(hoje());
  const parts = useParticipantes(grupo.id);
  const rodadaQ = useQuery({
    queryKey: ["grupo-rodada", grupo.id, data],
    queryFn: async () => {
      let { data: r } = await db.from("grupo_rodada").select("*").eq("grupo_id", grupo.id).eq("data", data).maybeSingle();
      if (!r) {
        const ins = await db.from("grupo_rodada").upsert({ grupo_id: grupo.id, data, dia_semana: diaSemana(data) }, { onConflict: "grupo_id,data" }).select("*").single();
        if (ins.error) throw ins.error;
        r = ins.data;
      }
      const { data: checks } = await db.from("grupo_check").select("participante_id,status").eq("rodada_id", r.id);
      return { rodada: r as Rodada, checks: (checks ?? []) as CheckRow[] };
    },
  });
  const rodada = rodadaQ.data?.rodada;
  const storeKey = rodada ? `grupo-leituras-${rodada.id}` : "";
  const [leituras, setLeituras] = useState<Leitura[]>([]);
  const [prints, setPrints] = useState<PrintEstado[]>([]);
  const [manual, setManual] = useState<Record<string, "ok" | "nao">>({});
  const [confirmadas, setConfirmadas] = useState<Record<number, string>>({}); // índice da leitura -> participante escolhido
  const [salvando, setSalvando] = useState(false);
  const lerFn = lerPrintReacoes;

  useEffect(() => {
    if (!storeKey) return;
    try { setLeituras(JSON.parse(sessionStorage.getItem(storeKey) || "[]")); } catch { setLeituras([]); }
    setManual({}); setConfirmadas({}); setPrints([]);
  }, [storeKey]);
  useEffect(() => { if (storeKey) sessionStorage.setItem(storeKey, JSON.stringify(leituras)); }, [leituras, storeKey]);

  const ativas = (parts.data ?? []).filter((p) => p.ativo);
  const matches = useMemo(() => cruzar(leituras, ativas), [leituras, ativas]);

  const lerUm = async (file: File, idx: number) => {
    setPrints((ps) => ps.map((p, i) => (i === idx ? { ...p, status: "lendo", erro: undefined } : p)));
    try {
      const itens = await lerFn({ data: { imagem: await comprimir(file) } });
      setLeituras((ls) => dedupe([...ls, ...itens]));
      setPrints((ps) => ps.map((p, i) => (i === idx ? { ...p, status: "ok", n: itens.length } : p)));
    } catch (e) {
      setPrints((ps) => ps.map((p, i) => (i === idx ? { ...p, status: "erro", erro: e instanceof Error ? e.message : "Erro ao ler" } : p)));
    }
  };
  const enviar = async (files: FileList | null) => {
    if (!files?.length) return;
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
    if (norm(apel) !== norm(p.username) && !p.apelidos.some((a) => norm(a) === norm(apel))) v.apelidos = [...p.apelidos, apel];
    if (!p.emoji_habitual && l.emoji) v.emoji_habitual = l.emoji;
    if (Object.keys(v).length) { await db.from("grupo_participante").update(v).eq("id", p.id); refreshParts(); }
  };
  const vincular = async (i: number, pid: string) => {
    const p = ativas.find((x) => x.id === pid); if (!p) return;
    setConfirmadas((c) => ({ ...c, [i]: pid }));
    await aprender(p, matches[i].leitura);
    toast.success(`Vinculado a @${p.username}`);
  };
  const cadastrarNovata = async (l: Leitura) => {
    const sug = l.nome.trim().startsWith("@") ? normUser(l.nome) : norm(l.nome);
    const u = window.prompt("Qual é o @ dela?", sug);
    if (!u) return;
    const { error } = await db.from("grupo_participante").insert({
      grupo_id: grupo.id, username: normUser(u), novata: true, nome_exibicao: l.nome.trim(), emoji_habitual: l.emoji || null,
      apelidos: norm(u) === norm(l.nome) ? [] : [l.nome.trim()], entrou_em: data,
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
    if (f === "ok") auto.set(m.participante!.id, { m, idx: i });
    else if (f === "conferir") conferir.push(i);
    else naoRec.push(i);
  });
  const reconhecidas = [...auto.values()].sort((a, b) => a.m.participante!.username.localeCompare(b.m.participante!.username));
  const salvo = new Map((rodadaQ.data?.checks ?? []).map((c) => [c.participante_id, c.status]));
  const statusDe = (pid: string): "ok" | "nao" => manual[pid] ?? (auto.has(pid) ? "ok" : leituras.length ? "nao" : (salvo.get(pid) ?? "nao"));
  const totalOk = ativas.filter((p) => statusDe(p.id) === "ok").length;

  const confirmarRodada = async () => {
    if (!rodada) return;
    if (conferir.length && !window.confirm(`${conferir.length} leitura(s) em "Conferir" ainda não foram confirmadas e contarão como ❌. Continuar?`)) return;
    setSalvando(true);
    try {
      const rows = ativas.map((p) => {
        const a = auto.get(p.id);
        const st = statusDe(p.id);
        const isManual = manual[p.id] !== undefined || (!a && st === "ok");
        return {
          rodada_id: rodada.id, participante_id: p.id, status: st, origem: isManual || !a ? "manual" : "auto",
          nome_lido: a?.m.leitura.nome ?? null, emoji_lido: a?.m.leitura.emoji || null, confianca: a ? a.m.confianca : null,
        };
      });
      const { error } = await db.from("grupo_check").upsert(rows, { onConflict: "rodada_id,participante_id" });
      if (error) throw error;
      await db.from("grupo_leitura_nao_vinculada").delete().eq("rodada_id", rodada.id);
      const sobras = [...conferir, ...naoRec].map((i) => matches[i].leitura);
      if (sobras.length) await db.from("grupo_leitura_nao_vinculada").insert(sobras.map((l) => ({ rodada_id: rodada.id, nome_lido: l.nome, emoji_lido: l.emoji || null })));
      const up = await db.from("grupo_rodada").update({ status: "fechada" }).eq("id", rodada.id);
      if (up.error) throw up.error;
      sessionStorage.removeItem(storeKey);
      setLeituras([]); setPrints([]); setManual({}); setConfirmadas({});
      toast.success(`Rodada fechada: ${rows.filter((r) => r.status === "ok").length} ✅ · ${rows.filter((r) => r.status === "nao").length} ❌`);
      qc.invalidateQueries({ queryKey: ["grupo-rodada", grupo.id] });
      qc.invalidateQueries({ queryKey: ["grupo-semana", grupo.id] });
      qc.invalidateQueries({ queryKey: ["grupo-hist", grupo.id] });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Erro ao salvar"); }
    finally { setSalvando(false); }
  };
  const reabrir = async () => {
    if (!rodada) return;
    await db.from("grupo_rodada").update({ status: "aberta" }).eq("id", rodada.id);
    qc.invalidateQueries({ queryKey: ["grupo-rodada", grupo.id, data] });
  };

  const SelectPart = ({ value, onChange }: { value?: string; onChange: (v: string) => void }) => (
    <select className="h-11 w-full rounded-md border border-input bg-background px-2 text-sm" value={value ?? ""} onChange={(e) => e.target.value && onChange(e.target.value)}>
      <option value="">Vincular a…</option>
      {ativas.map((p) => <option key={p.id} value={p.id}>@{p.username}{p.nome_exibicao ? ` · ${p.nome_exibicao}` : ""}</option>)}
    </select>
  );

  return (
    <div className="space-y-4 pt-3">
      <div className="flex items-end gap-2">
        <div className="flex-1"><label className="text-xs text-muted-foreground">Data</label><Input type="date" className="h-12" value={data} onChange={(e) => e.target.value && setData(e.target.value)} /></div>
        {rodada && <span className={cn("rounded-full px-3 py-2 text-xs font-semibold", rodada.status === "fechada" ? "bg-primary text-primary-foreground" : "bg-accent")}>{DIA_LABEL[rodada.dia_semana]} · {rodada.status === "fechada" ? "Fechada" : "Aberta"}</span>}
      </div>
      {rodada && !grupo.dias_missao.includes(rodada.dia_semana) && <p className="rounded-lg bg-accent p-2 text-xs">Hoje não é dia de missão neste grupo, mas você pode registrar mesmo assim.</p>}
      {rodada?.status === "fechada" && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3 text-sm">
          <span>Rodada já confirmada. Você pode corrigir abaixo ou enviar novos prints.</span>
          <Button variant="outline" size="sm" onClick={reabrir}>Reabrir</Button>
        </div>
      )}

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
          {leituras.length > 0 && !lendo && <button className="text-xs text-muted-foreground underline" onClick={() => { setLeituras([]); setPrints([]); setConfirmadas({}); }}>Limpar leituras</button>}
        </div>
      )}

      {leituras.length > 0 && (
        <div className="space-y-3">
          <Bloco titulo={`✅ Reconhecidas (${reconhecidas.length})`}>
            {reconhecidas.map(({ m }) => (
              <Linha key={m.participante!.id} esq={<><b>@{m.participante!.username}</b><span className="text-muted-foreground"> · lido “{m.leitura.nome}” {m.leitura.emoji}</span></>} dir={<span className="text-xs text-muted-foreground">{Math.round(m.confianca * 100)}%</span>} />
            ))}
          </Bloco>
          {conferir.length > 0 && (
            <Bloco titulo={`⚠️ Conferir (${conferir.length})`}>
              {conferir.map((i) => { const m = matches[i]; return (
                <div key={i} className="space-y-2 border-b border-border py-2 last:border-0">
                  <p className="text-sm">Lido: <b>{m.leitura.nome}</b> {m.leitura.emoji} → sugestão <b>@{m.participante!.username}</b> <span className="text-xs text-muted-foreground">({Math.round(m.confianca * 100)}%)</span></p>
                  <div className="flex gap-2">
                    <Button className="h-11 shrink-0" onClick={() => vincular(i, m.participante!.id)}><Check className="h-4 w-4" /> Confirmar</Button>
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

      <Bloco titulo={`Todas as participantes ativas · ${totalOk} ✅ / ${ativas.length}`}>
        {ativas.map((p) => {
          const st = statusDe(p.id);
          return (
            <div key={p.id} className="flex items-center justify-between gap-2 border-b border-border py-1.5 last:border-0">
              <span className="truncate text-sm">@{p.username} {p.novata && "🆕"}{manual[p.id] && <span className="text-xs text-muted-foreground"> · manual</span>}</span>
              <div className="flex shrink-0 gap-1">
                <button aria-label="Cumpriu" onClick={() => setManual((m) => ({ ...m, [p.id]: "ok" }))} className={cn("h-10 w-12 rounded-lg border text-lg", st === "ok" ? "border-primary bg-primary/15" : "border-border opacity-40")}>✅</button>
                <button aria-label="Não cumpriu" onClick={() => setManual((m) => ({ ...m, [p.id]: "nao" }))} className={cn("h-10 w-12 rounded-lg border text-lg", st === "nao" ? "border-destructive bg-destructive/10" : "border-border opacity-40")}>❌</button>
              </div>
            </div>
          );
        })}
        {!ativas.length && <p className="py-3 text-sm text-muted-foreground">Cadastre as participantes na aba Participantes.</p>}
      </Bloco>

      <Button className="h-14 w-full text-base" disabled={!rodada || salvando || lendo || !ativas.length} onClick={confirmarRodada}>
        {salvando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />} Confirmar rodada
      </Button>
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
function SemanaTab({ grupo }: { grupo: Grupo }) {
  const [data, setData] = useState(hoje());
  const parts = useParticipantes(grupo.id);
  const ini = inicioSemana(data), fim = addDias(ini, 6);
  const q = useQuery({
    queryKey: ["grupo-semana", grupo.id, ini],
    queryFn: async () => {
      const { data: rs } = await db.from("grupo_rodada").select("*").eq("grupo_id", grupo.id).gte("data", ini).lte("data", fim);
      const ids = (rs ?? []).map((r: Rodada) => r.id);
      const { data: cs } = ids.length ? await db.from("grupo_check").select("rodada_id,participante_id,status").in("rodada_id", ids) : { data: [] };
      return { rodadas: (rs ?? []) as Rodada[], checks: (cs ?? []) as CheckRow[] };
    },
  });
  const rodadas = q.data?.rodadas ?? [];
  const porDia = new Map(rodadas.map((r) => [r.dia_semana, r]));
  const fechados = new Set(rodadas.filter((r) => r.status === "fechada").map((r) => r.dia_semana));
  const rodSel = rodadas.find((r) => r.data === data) ?? [...rodadas].filter((r) => r.status === "fechada").sort((a, b) => b.data.localeCompare(a.data))[0];
  const status = new Map((q.data?.checks ?? []).filter((c) => c.rodada_id === rodSel?.id).map((c) => [c.participante_id, c.status]));
  const texto = textoSemana({ dias: grupo.dias_missao, fechados, participantes: parts.data ?? [], status });
  const cel = (pid: string, dia: string) => {
    const r = porDia.get(dia); if (!r) return "–";
    const c = q.data?.checks.find((x) => x.rodada_id === r.id && x.participante_id === pid);
    return c ? (c.status === "ok" ? "✅" : "❌") : "–";
  };
  return (
    <div className="space-y-3 pt-3">
      <div><label className="text-xs text-muted-foreground">Rodada (escolha o dia)</label><Input type="date" className="h-12" value={data} onChange={(e) => e.target.value && setData(e.target.value)} /></div>
      <p className="text-xs text-muted-foreground">Semana de {fmtData(ini)} a {fmtData(fim)} · status da rodada de {rodSel ? `${DIA_LABEL[rodSel.dia_semana]} ${fmtData(rodSel.data)}` : "—"}</p>
      <Textarea readOnly rows={12} value={texto} className="font-mono text-xs" />
      <Button className="h-12 w-full" onClick={() => navigator.clipboard.writeText(texto).then(() => toast.success("Lista copiada"), () => toast.error("Não foi possível copiar"))}><Copy className="h-4 w-4" /> Copiar lista</Button>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border"><th className="p-2 text-left">Participante</th>{grupo.dias_missao.map((d) => <th key={d} className="p-2">{DIA_LABEL[d]}</th>)}</tr></thead>
          <tbody>
            {(parts.data ?? []).filter((p) => p.ativo).map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0"><td className="p-2">@{p.username}</td>{grupo.dias_missao.map((d) => <td key={d} className="p-2 text-center">{cel(p.id, d)}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
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
    queryFn: async () => {
      const { data: rs } = await db.from("grupo_rodada").select("id").eq("grupo_id", grupo.id).eq("status", "fechada").gte("data", de).lte("data", ate);
      const ids = (rs ?? []).map((r: { id: string }) => r.id);
      const { data: cs } = ids.length ? await db.from("grupo_check").select("participante_id,status").in("rodada_id", ids) : { data: [] };
      return { n: ids.length, checks: (cs ?? []) as CheckRow[] };
    },
  });
  const stats = (parts.data ?? []).map((p) => {
    const cs = (q.data?.checks ?? []).filter((c) => c.participante_id === p.id);
    const ok = cs.filter((c) => c.status === "ok").length;
    return { p, ok, faltas: cs.length - ok, total: cs.length, taxa: cs.length ? ok / cs.length : 0 };
  }).filter((s) => s.total > 0).sort((a, b) => b.faltas - a.faltas || a.taxa - b.taxa);
  const media = stats.length ? stats.reduce((s, x) => s + x.taxa, 0) / stats.length : 0;
  return (
    <div className="space-y-3 pt-3">
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
            <div className="flex justify-between text-sm"><span>{i + 1}. @{s.p.username}</span><span><b>{s.faltas}</b> falta{s.faltas === 1 ? "" : "s"} · {Math.round(s.taxa * 100)}%</span></div>
            <div className="mt-1 h-1.5 rounded-full bg-accent"><div className="h-full rounded-full bg-primary" style={{ width: `${s.taxa * 100}%` }} /></div>
          </div>
        ))}
        {!stats.length && <p className="py-3 text-sm text-muted-foreground">Nenhuma rodada fechada no período.</p>}
      </Bloco>
    </div>
  );
}
