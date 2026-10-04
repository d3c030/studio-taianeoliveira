import { useState } from "react";
import { CheckCircle2, AlertTriangle, Plus, Trash2, Camera, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { DiagItem, DiagMidia } from "../lib/editor-api";
import { Thumb } from "./GaleriaEditor";
import { SortableList } from "./SortableList";
import { ConfirmDialog } from "./ConfirmDialog";

type Props = {
  itens: DiagItem[];
  onChange: (id: string, patch: Partial<DiagItem>) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onReorder: (next: DiagItem[]) => void;
  midias: DiagMidia[];
  uploadingItem: string | null;
  onUploadFotos: (item: DiagItem, files: File[]) => void;
  onDeleteMidia: (m: DiagMidia) => void;
};

export function ChecklistEditor({ itens, onChange, onAdd, onDelete, onReorder, midias, uploadingItem, onUploadFotos, onDeleteMidia }: Props) {
  const [del, setDel] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      {!itens.length && (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhum item no checklist — adicione o primeiro.
        </p>
      )}
      <SortableList
        items={itens}
        onReorder={onReorder}
        className="space-y-3"
        render={(it, handle) => {
          const idx = itens.findIndex((x) => x.id === it.id);
          const ideal = it.status === "ideal";
          return (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                {handle}
                <span className="text-xs font-semibold text-muted-foreground">Item {idx + 1}</span>
                <div className="ml-auto flex rounded-full border border-border p-0.5 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => onChange(it.id, { status: "ideal" })}
                    className={cn("flex items-center gap-1 rounded-full px-2.5 py-1", ideal ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ideal
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(it.id, { status: "precisa_ajustes" })}
                    className={cn("flex items-center gap-1 rounded-full px-2.5 py-1", !ideal ? "bg-destructive text-destructive-foreground" : "text-muted-foreground")}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" /> Precisa de ajustes
                  </button>
                </div>
                <Button variant="ghost" size="icon" aria-label="Excluir item" onClick={() => setDel(it.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
                <div className="space-y-1">
                  <Label className="text-xs">Seção (página)</Label>
                  <Input value={it.secao} onChange={(e) => onChange(it.id, { secao: e.target.value })} placeholder="Ex: A Vitrine" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Título</Label>
                  <Input value={it.titulo} onChange={(e) => onChange(it.id, { titulo: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">O que eu vi</Label>
                <Textarea rows={3} value={it.o_que_eu_vi} onChange={(e) => onChange(it.id, { o_que_eu_vi: e.target.value })} />
              </div>
              <div className={cn("space-y-1", ideal && "opacity-60")}>
                <Label className="text-xs">Sua tarefa {ideal && "(oculta no PDF — item aprovado)"}</Label>
                <Textarea rows={4} value={it.sua_tarefa} onChange={(e) => onChange(it.id, { sua_tarefa: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Fotos do que foi analisado</Label>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {midias.filter((m) => m.item_id === it.id).map((m) => (
                    <div key={m.id} className="relative">
                      <Thumb path={m.url_arquivo} />
                      <button
                        type="button"
                        aria-label="Remover foto"
                        onClick={() => onDeleteMidia(m)}
                        className="absolute right-1 top-1 rounded-full bg-background/90 p-1 shadow"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <label className="flex aspect-[4/5] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:bg-muted">
                    {uploadingItem === it.id ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                    {uploadingItem === it.id ? "Enviando…" : "Adicionar"}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={uploadingItem === it.id}
                      onChange={(e) => { const f = Array.from(e.target.files ?? []); e.target.value = ""; if (f.length) onUploadFotos(it, f); }}
                    />
                  </label>
                </div>
              </div>
            </div>
          );
        }}
      />
      <Button variant="outline" className="w-full" onClick={onAdd}>
        <Plus className="h-4 w-4" /> Adicionar item personalizado
      </Button>
      <ConfirmDialog
        open={!!del}
        title="Excluir item?"
        description="O item será removido deste diagnóstico."
        onCancel={() => setDel(null)}
        onConfirm={() => { if (del) onDelete(del); setDel(null); }}
      />
    </div>
  );
}
