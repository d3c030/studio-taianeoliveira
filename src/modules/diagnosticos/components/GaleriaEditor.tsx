import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ImagePlus, Trash2, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { signedUrl } from "../lib/api";
import type { DiagItem, DiagMidia, MidiaTipo } from "../lib/editor-api";
import { SortableList } from "./SortableList";
import { ConfirmDialog } from "./ConfirmDialog";

type Props = {
  tipo: MidiaTipo;
  midias: DiagMidia[];
  itens: DiagItem[];
  uploading: boolean;
  onUpload: (files: File[]) => void;
  onChange: (id: string, patch: Partial<DiagMidia>) => void;
  onDelete: (m: DiagMidia) => void;
  onReorder: (next: DiagMidia[]) => void;
};

export function GaleriaEditor({ tipo, midias, itens, uploading, onUpload, onChange, onDelete, onReorder }: Props) {
  const [del, setDel] = useState<DiagMidia | null>(null);
  const [over, setOver] = useState(false);
  const pos = tipo === "positivo";
  const Icon = pos ? ThumbsUp : ThumbsDown;

  const pick = (list: FileList | null) => {
    const files = [...(list ?? [])].filter((f) => f.type.startsWith("image/"));
    if (files.length) onUpload(files);
  };

  return (
    <section className="space-y-3">
      <h3 className={cn("flex items-center gap-2 font-semibold", pos ? "text-primary" : "text-destructive")}>
        <Icon className="h-4 w-4" /> {pos ? "Pontos positivos" : "Pontos negativos"}
        <span className="text-xs font-normal text-muted-foreground">({midias.length})</span>
      </h3>

      <label
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files); }}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground transition-colors",
          over && "border-primary bg-accent",
        )}
      >
        <ImagePlus className="h-6 w-6" />
        {uploading ? "Enviando…" : "Toque para escolher ou arraste os prints aqui"}
        <span className="text-xs">Várias imagens de uma vez · comprimidas automaticamente</span>
        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { pick(e.target.files); e.target.value = ""; }} />
      </label>

      {!midias.length ? (
        <p className="text-xs text-muted-foreground text-center">Nenhuma imagem ainda.</p>
      ) : (
        <SortableList
          items={midias}
          onReorder={onReorder}
          className="grid gap-3 sm:grid-cols-2"
          render={(m, handle) => (
            <div className="rounded-xl border border-border bg-card p-2 space-y-2">
              <div className="relative">
                <Thumb path={m.url_arquivo} />
                <div className="absolute left-1 top-1 rounded bg-background/90">{handle}</div>
                <Button
                  variant="secondary" size="icon" aria-label="Excluir imagem"
                  className="absolute right-1 top-1 h-8 w-8"
                  onClick={() => setDel(m)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Input value={m.legenda} onChange={(e) => onChange(m.id, { legenda: e.target.value })} placeholder="Legenda" maxLength={200} />
              <select
                value={m.item_id ?? ""}
                onChange={(e) => onChange(m.id, { item_id: e.target.value || null })}
                className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">Diagnóstico geral (sem item)</option>
                {itens.map((it, i) => (
                  <option key={it.id} value={it.id}>Item {i + 1} – {it.titulo}</option>
                ))}
              </select>
            </div>
          )}
        />
      )}

      <ConfirmDialog
        open={!!del}
        title="Excluir imagem?"
        description="A imagem será apagada definitivamente."
        onCancel={() => setDel(null)}
        onConfirm={() => { if (del) onDelete(del); setDel(null); }}
      />
    </section>
  );
}

function Thumb({ path }: { path: string }) {
  const q = useQuery({ queryKey: ["diag-signed", path], queryFn: () => signedUrl(path), staleTime: 50 * 60 * 1000 });
  return (
    <div className="aspect-[4/5] w-full overflow-hidden rounded-lg bg-muted">
      {q.data && <img src={q.data} alt="" className="h-full w-full object-cover" draggable={false} />}
    </div>
  );
}
