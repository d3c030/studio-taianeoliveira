import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { cadastroEntrada, emojisDuplicados, parseLista, type Participante } from "./lib";
import { PerfilLink } from "./PerfilLink";

const db = supabase as any;

export function ImportarLista({ grupoId, participantes, onDone }: { grupoId: string; participantes: Participante[]; onDone: () => void }) {
  const [texto, setTexto] = useState("");
  const [preview, setPreview] = useState(false);
  const [novatas, setNovatas] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const porUser = new Map(participantes.map((p) => [p.username, p]));
  const lidos = preview ? parseLista(texto).map((it) => {
    const ex = porUser.get(it.username);
    const acao = !ex ? "novo" : it.emoji && it.emoji !== (ex.emoji_habitual ?? "") ? "atualizar emoji" : "sem mudança";
    const mudaLista = !!ex && it.lista != null && it.lista !== ex.lista;
    return { ...it, ex, acao, mudaLista };
  }) : [];
  const novos = lidos.filter((l) => !l.ex);
  const atualizar = lidos.filter((l) => l.ex && (l.acao === "atualizar emoji" || l.mudaLista));
  const simulado = [...participantes.map((p) => {
    const l = lidos.find((it) => it.username === p.username);
    return l ? { ...p, emoji_habitual: l.emoji || p.emoji_habitual } : p;
  }), ...novos.map((l): Participante => ({ id: `novo:${l.username}`, grupo_id: grupoId, username: l.username, nome_exibicao: null, emoji_habitual: l.emoji || null, apelidos: [], ativo: true, ...cadastroEntrada(novatas), lista: l.lista }))];
  const duplicados = new Set([...emojisDuplicados(simulado).values()].flat());

  const salvar = async () => {
    if (salvando) return;
    setSalvando(true);
    try {
      if (novos.length) {
        const { error } = await db.from("grupo_participante").insert(novos.map((l) => ({ grupo_id: grupoId, username: l.username, emoji_habitual: l.emoji || null, lista: l.lista, ...cadastroEntrada(novatas) })));
        if (error) throw error;
      }
      for (const l of atualizar) {
        if (!l.ex) continue;
        const valores = { ...(l.emoji ? { emoji_habitual: l.emoji } : {}), ...(l.lista != null ? { lista: l.lista } : {}) };
        const { error } = await db.from("grupo_participante").update(valores).eq("id", l.ex.id);
        if (error) throw error;
      }
      toast.success(`${novos.length} novas · ${atualizar.length} atualizações`);
      setPreview(false); setNovatas(false);
      onDone();
    } catch (e) {
      toast.error((e as { message?: string }).message ?? "Não foi possível importar a lista.");
      onDone();
    } finally { setSalvando(false); }
  };

  return <div className="space-y-3">
    <label htmlFor={`emojis-texto-${grupoId}`} className="block text-sm font-medium">Cole aqui as listas de @ com emoji</label>
    <Textarea id={`emojis-texto-${grupoId}`} rows={8} value={texto} disabled={salvando} onChange={(e) => { setTexto(e.target.value); setPreview(false); }} placeholder="LISTA 1 - de emojis escolhidos para fixar nos pedidos." />
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" disabled={!texto.trim() || salvando} onClick={() => setPreview(true)}>Pré-visualizar</Button>
      <label className="flex items-center gap-2 text-sm"><Switch checked={novatas} disabled={salvando} onCheckedChange={setNovatas} /> Importar como novatas</label>
    </div>
    {preview && <div className="space-y-3">
      <p className="text-sm">{lidos.length} @ · {novos.length} novos · {lidos.filter((l) => l.acao === "atualizar emoji").length} atualizar emoji · {lidos.filter((l) => l.acao === "sem mudança").length} sem mudança</p>
      {!lidos.length && <p className="text-sm text-muted-foreground">Nenhuma @ encontrada.</p>}
      <div className="max-h-64 overflow-y-auto divide-y divide-border rounded-lg border border-border">
        {lidos.map((l) => {
          const dup = duplicados.has(l.ex?.id ?? `novo:${l.username}`);
          return <div key={l.username} className={cn("flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs", dup && "bg-destructive/10 text-destructive")}>
            <span className="min-w-0 break-all"><PerfilLink username={l.username} /> <span className="text-base">{l.emoji}</span> · {l.lista == null ? "Sem lista" : `Lista ${l.lista}`}{dup && " · emoji repetido"}</span>
            <span className="font-medium">{l.acao}{l.mudaLista && " · atualizar lista"}</span>
          </div>;
        })}
      </div>
      <Button className="min-h-12 w-full whitespace-normal" disabled={salvando || (!novos.length && !atualizar.length)} onClick={salvar}>{salvando ? "Salvando…" : `Salvar ${novos.length} novas e ${atualizar.length} atualizações`}</Button>
    </div>}
  </div>;
}