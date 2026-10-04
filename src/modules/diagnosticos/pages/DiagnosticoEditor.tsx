import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Check, CloudOff, Loader2, Save, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  addItem, addMidia, deleteItem, deleteMidia, loadDiagnostico, updateDiag, updateItem, updateMidia,
  type DiagCompleto, type DiagItem, type DiagMidia, type MidiaTipo,
} from "../lib/editor-api";
import { useAutosave } from "../hooks/useAutosave";
import { ChecklistEditor } from "../components/ChecklistEditor";
import { GaleriaEditor } from "../components/GaleriaEditor";
import { PlanoAcaoEditor } from "../components/PlanoAcaoEditor";
import { PdfPanel } from "../components/PdfPanel";

export function DiagnosticoEditor({ diagnosticoId }: { diagnosticoId: string }) {
  const qc = useQueryClient();
  const [diag, setDiag] = useState<DiagCompleto | null>(null);
  const [itens, setItens] = useState<DiagItem[]>([]);
  const [midias, setMidias] = useState<DiagMidia[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<MidiaTipo | null>(null);
  const { schedule, flush, state } = useAutosave();

  useEffect(() => {
    loadDiagnostico(diagnosticoId)
      .then((r) => { setDiag(r.diag); setItens(r.itens); setMidias(r.midias); })
      .catch((e) => setError(e.message ?? "Erro ao carregar"));
  }, [diagnosticoId]);

  useEffect(() => {
    if (state === "error") toast.error("Não foi possível salvar algumas alterações. Verifique a conexão.");
  }, [state]);

  const invalidate = () => {
    if (!diag) return;
    qc.invalidateQueries({ queryKey: ["diag-diagnosticos", diag.cliente_id] });
    qc.invalidateQueries({ queryKey: ["diag-clientes"] });
  };

  // Diagnóstico
  const patchDiag = (patch: Partial<DiagCompleto>) => {
    setDiag((d) => (d ? { ...d, ...patch } : d));
    const { cliente: _c, ...db } = patch as any;
    for (const [k, v] of Object.entries(db)) schedule(`diag:${k}`, () => updateDiag(diagnosticoId, { [k]: v }));
  };

  // Itens
  const patchItem = (id: string, patch: Partial<DiagItem>) => {
    setItens((l) => l.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    for (const [k, v] of Object.entries(patch)) schedule(`item:${id}:${k}`, () => updateItem(id, { [k]: v }));
  };
  const reorderItens = (next: DiagItem[]) => {
    const withOrder = next.map((i, idx) => ({ ...i, ordem: idx }));
    setItens(withOrder);
    withOrder.forEach((i) => schedule(`item:${i.id}:ordem`, () => updateItem(i.id, { ordem: i.ordem })));
  };
  const onAddItem = async () => {
    try {
      const last = itens[itens.length - 1];
      const it = await addItem(diagnosticoId, itens.length, last?.secao ?? "");
      setItens((l) => [...l, it]);
    } catch (e: any) { toast.error(e.message ?? "Erro ao adicionar"); }
  };
  const onDeleteItem = async (id: string) => {
    try {
      await deleteItem(id);
      setItens((l) => l.filter((i) => i.id !== id));
      setMidias((l) => l.map((m) => (m.item_id === id ? { ...m, item_id: null } : m)));
    } catch (e: any) { toast.error(e.message ?? "Erro ao excluir"); }
  };

  // Mídias
  const patchMidia = (id: string, patch: Partial<DiagMidia>) => {
    setMidias((l) => l.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    for (const [k, v] of Object.entries(patch)) schedule(`midia:${id}:${k}`, () => updateMidia(id, { [k]: v }));
  };
  const reorderMidias = (tipo: MidiaTipo) => (next: DiagMidia[]) => {
    const ordered = next.map((m, idx) => ({ ...m, ordem: idx }));
    setMidias((l) => [...l.filter((m) => m.tipo !== tipo), ...ordered]);
    ordered.forEach((m) => schedule(`midia:${m.id}:ordem`, () => updateMidia(m.id, { ordem: m.ordem })));
  };
  const onUpload = (tipo: MidiaTipo) => async (files: File[]) => {
    setUploading(tipo);
    let base = midias.filter((m) => m.tipo === tipo).length;
    for (const f of files) {
      try {
        const m = await addMidia(diagnosticoId, tipo, f, base++);
        setMidias((l) => [...l, m]);
      } catch (e: any) { toast.error(`${f.name}: ${e.message ?? "erro no envio"}`); }
    }
    setUploading(null);
  };
  const [uploadingItem, setUploadingItem] = useState<string | null>(null);
  const onUploadItem = async (item: DiagItem, files: File[]) => {
    setUploadingItem(item.id);
    const tipo: MidiaTipo = item.status === "ideal" ? "positivo" : "negativo";
    let base = midias.filter((m) => m.tipo === tipo).length;
    for (const f of files) {
      try {
        const m = await addMidia(diagnosticoId, tipo, f, base++, item.id);
        setMidias((l) => [...l, m]);
      } catch (e: any) { toast.error(`${f.name}: ${e.message ?? "erro no envio"}`); }
    }
    setUploadingItem(null);
  };
  const onDeleteMidia = async (m: DiagMidia) => {
    try {
      await deleteMidia(m);
      setMidias((l) => l.filter((x) => x.id !== m.id));
    } catch (e: any) { toast.error(e.message ?? "Erro ao excluir"); }
  };

  const salvarRascunho = async () => {
    patchDiag({ status: "rascunho" });
    await flush();
    invalidate();
    toast.success("Rascunho salvo");
  };
  const finalizar = async () => {
    patchDiag({ status: "finalizado" });
    await flush();
    invalidate();
    toast.success("Diagnóstico finalizado");
  };

  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!diag) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  const byTipo = (t: MidiaTipo) => midias.filter((m) => m.tipo === t).sort((a, b) => a.ordem - b.ordem);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <Link
          to="/diagnosticos/clientes/$clienteId"
          params={{ clienteId: diag.cliente_id }}
          onClick={() => { void flush(); invalidate(); }}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {diag.cliente.nome}
        </Link>
        <SaveIndicator state={state} />
      </div>

      <div className="space-y-1">
        <Input
          value={diag.titulo}
          onChange={(e) => patchDiag({ titulo: e.target.value })}
          className="text-lg font-semibold"
        />
        <p className="text-xs text-muted-foreground">
          Para {diag.cliente.instagram ? `@${diag.cliente.instagram}` : diag.cliente.nome} ·{" "}
          {diag.status === "finalizado" ? "Finalizado" : "Rascunho"}
        </p>
      </div>

      <Tabs defaultValue="checklist">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="destaques">Destaques</TabsTrigger>
          <TabsTrigger value="plano">Plano</TabsTrigger>
          <TabsTrigger value="pdf">PDF</TabsTrigger>
        </TabsList>
        <TabsContent value="checklist" className="mt-4">
          <ChecklistEditor itens={itens} onChange={patchItem} onAdd={onAddItem} onDelete={onDeleteItem} onReorder={reorderItens}
            midias={midias} uploadingItem={uploadingItem} onUploadFotos={onUploadItem} onDeleteMidia={onDeleteMidia} />
        </TabsContent>
        <TabsContent value="destaques" className="mt-4 space-y-8">
          {(["positivo", "negativo"] as MidiaTipo[]).map((t) => (
            <GaleriaEditor
              key={t}
              tipo={t}
              midias={byTipo(t)}
              itens={itens}
              uploading={uploading === t}
              onUpload={onUpload(t)}
              onChange={patchMidia}
              onDelete={onDeleteMidia}
              onReorder={reorderMidias(t)}
            />
          ))}
        </TabsContent>
        <TabsContent value="plano" className="mt-4 space-y-2">
          <h3 className="font-semibold">Seus Próximos Passos</h3>
          <TarefasDoChecklist itens={itens} />
          <p className="pt-2 text-sm font-medium">Mensagem final / observações</p>
          <PlanoAcaoEditor value={diag.resumo_plano_acao} onChange={(v) => patchDiag({ resumo_plano_acao: v })} />
        </TabsContent>
        <TabsContent value="pdf" className="mt-4">
          <PdfPanel diag={diag} itens={itens} midias={midias} beforeBuild={flush} />
        </TabsContent>
      </Tabs>

      <div className="sticky bottom-20 md:bottom-4 z-20 flex gap-2 rounded-xl border border-border bg-card/95 p-3 backdrop-blur">
        <Button variant="outline" className="flex-1" onClick={salvarRascunho}><Save className="h-4 w-4" /> Salvar rascunho</Button>
        <Button className="flex-1" onClick={finalizar}><CheckCheck className="h-4 w-4" /> Finalizar</Button>
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: string }) {
  if (state === "saving") return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Salvando…</span>;
  if (state === "saved") return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Check className="h-3.5 w-3.5" /> Salvo</span>;
  if (state === "error") return <span className="flex items-center gap-1 text-xs text-destructive"><CloudOff className="h-3.5 w-3.5" /> Erro ao salvar</span>;
  return null;
}

function TarefasDoChecklist({ itens }: { itens: DiagItem[] }) {
  const ordered = [...itens].sort((a, b) => a.ordem - b.ordem);
  const tarefas = ordered
    .map((it, i) => ({ it, n: i + 1 }))
    .filter(({ it }) => it.status !== "ideal" && it.sua_tarefa.trim());
  if (!tarefas.length)
    return <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">As tarefas dos itens marcados como "Precisa de ajustes" aparecem aqui automaticamente.</p>;
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Vindas do checklist automaticamente (edite lá).</p>
      {tarefas.map(({ it, n }) => (
        <div key={it.id} className="rounded-xl border border-border bg-card p-3">
          <p className="text-sm font-semibold">{n}. {it.titulo}</p>
          {!!it.o_que_eu_vi.trim() && <p className="mt-1 text-xs text-muted-foreground"><span className="font-medium">Análise:</span> {it.o_que_eu_vi}</p>}
          <p className="mt-1 whitespace-pre-line text-sm"><span className="font-medium">Tarefa:</span> {it.sua_tarefa}</p>
        </div>
      ))}
    </div>
  );
}
