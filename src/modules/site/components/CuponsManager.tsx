import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { uploadSiteImage } from "../lib/editor-api";

type Row = { id: string; empresa: string; codigo: string; desconto: string; logo_url: string | null; ativo: boolean };

export function CuponsManager() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["site-cupons-admin"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_cupons").select("id, empresa, codigo, desconto, logo_url, ativo").order("ordem").order("criado_em");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });
  const [novo, setNovo] = useState({ empresa: "", codigo: "", desconto: "", logo_url: "" });
  const [busy, setBusy] = useState(false);
  const refresh = () => { qc.invalidateQueries({ queryKey: ["site-cupons-admin"] }); qc.invalidateQueries({ queryKey: ["site-cupons-ativos"] }); };

  const upload = async (f: File, done: (u: string) => void) => {
    setBusy(true);
    try { done(await uploadSiteImage(f)); } catch (e: any) { toast.error(e.message ?? "Erro no envio"); } finally { setBusy(false); }
  };

  const add = async () => {
    if (!novo.empresa.trim() || !novo.codigo.trim()) return toast.error("Informe empresa e cupom");
    const { error } = await supabase.from("site_cupons").insert({
      empresa: novo.empresa.trim(), codigo: novo.codigo.trim(), titulo: novo.empresa.trim(),
      desconto: novo.desconto.trim(), logo_url: novo.logo_url || null, ordem: q.data?.length ?? 0,
    });
    if (error) return toast.error(error.message.includes("duplicate") ? "Esse código já existe" : error.message);
    setNovo({ empresa: "", codigo: "", desconto: "", logo_url: "" });
    toast.success("Cupom cadastrado");
    refresh();
  };

  const update = async (id: string, patch: Partial<Row>) => {
    const { error } = await supabase.from("site_cupons").update(patch).eq("id", id);
    if (error) toast.error(error.message); else refresh();
  };
  const remove = async (id: string) => {
    if (!confirm("Excluir este cupom?")) return;
    const { error } = await supabase.from("site_cupons").delete().eq("id", id);
    if (error) toast.error(error.message); else refresh();
  };

  const Logo = ({ url, onPick }: { url?: string | null; onPick: (f: File) => void }) => (
    <label className="flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted">
      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }} />
      {url ? <img src={url} alt="" className="h-full w-full object-contain" /> : <ImagePlus className="h-5 w-5 text-muted-foreground" />}
    </label>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Os cupons ativos aparecem no final da página, junto ao botão do Linktree. Toque na logo para trocar a foto.</p>
      <div className="space-y-3 rounded-xl border border-border p-4">
        <p className="text-sm font-medium">Novo cupom</p>
        <div className="flex gap-3">
          <Logo url={novo.logo_url} onPick={(f) => upload(f, (u) => setNovo((n) => ({ ...n, logo_url: u })))} />
          <div className="grid flex-1 gap-2 sm:grid-cols-3">
            <Input placeholder="Empresa" value={novo.empresa} onChange={(e) => setNovo({ ...novo, empresa: e.target.value })} />
            <Input placeholder="Cupom (ex: TAIANE10)" value={novo.codigo} onChange={(e) => setNovo({ ...novo, codigo: e.target.value.toUpperCase() })} />
            <Input placeholder="Desconto (opcional)" value={novo.desconto} onChange={(e) => setNovo({ ...novo, desconto: e.target.value })} />
          </div>
        </div>
        <Button size="sm" onClick={add} disabled={busy}><Plus className="mr-1 h-4 w-4" />{busy ? "Enviando foto…" : "Cadastrar cupom"}</Button>
      </div>
      {(q.data ?? []).map((c) => (
        <div key={c.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
          <Logo url={c.logo_url} onPick={(f) => upload(f, (u) => update(c.id, { logo_url: u }))} />
          <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-3">
            <Input defaultValue={c.empresa} placeholder="Empresa" onBlur={(e) => e.target.value !== c.empresa && update(c.id, { empresa: e.target.value })} />
            <Input defaultValue={c.codigo} placeholder="Cupom" onBlur={(e) => e.target.value !== c.codigo && update(c.id, { codigo: e.target.value.toUpperCase() })} />
            <Input defaultValue={c.desconto} placeholder="Desconto" onBlur={(e) => e.target.value !== c.desconto && update(c.id, { desconto: e.target.value })} />
          </div>
          <Switch checked={c.ativo} onCheckedChange={(v) => update(c.id, { ativo: v })} aria-label="Ativo" />
          <Button variant="ghost" size="icon" onClick={() => remove(c.id)} aria-label="Excluir"><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
    </div>
  );
}
