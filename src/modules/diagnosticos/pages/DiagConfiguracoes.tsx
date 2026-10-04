import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Upload, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TEMPLATE_PADRAO, type TemplateItem } from "../lib/template";
import { signedUrl, uploadImage } from "../lib/api";

type Cfg = { nome_exibicao: string; logo_url: string | null; cor_destaque: string; rodape: string; template: TemplateItem[] };

async function loadCfg(): Promise<Cfg> {
  const { data } = await supabase.from("diag_configuracoes").select("*").maybeSingle();
  const t = data?.template_json as TemplateItem[] | null | undefined;
  return {
    nome_exibicao: data?.nome_exibicao ?? "",
    logo_url: data?.logo_url ?? null,
    cor_destaque: data?.cor_destaque || "#B06F68",
    rodape: data?.rodape ?? "",
    template: Array.isArray(t) && t.length ? t : TEMPLATE_PADRAO,
  };
}

export function DiagConfiguracoes() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["diag-config"], queryFn: loadCfg });
  const [cfg, setCfg] = useState<Cfg | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { if (q.data && !cfg) setCfg(q.data); }, [q.data, cfg]);
  useEffect(() => {
    if (!cfg?.logo_url) return setLogoPreview(null);
    signedUrl(cfg.logo_url).then(setLogoPreview).catch(() => setLogoPreview(null));
  }, [cfg?.logo_url]);

  if (!cfg) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  const set = (p: Partial<Cfg>) => setCfg({ ...cfg, ...p });
  const setItem = (i: number, p: Partial<TemplateItem>) =>
    set({ template: cfg.template.map((t, j) => (j === i ? { ...t, ...p } : t)) });

  const onLogo = async (f?: File) => {
    if (!f) return;
    setUploading(true);
    try { set({ logo_url: await uploadImage("config", f) }); }
    catch (e: any) { toast.error(e.message ?? "Erro no envio"); }
    finally { setUploading(false); }
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Sessão expirada");
      const { error } = await supabase.from("diag_configuracoes").upsert({
        user_id: u.user.id,
        nome_exibicao: cfg.nome_exibicao.trim(),
        logo_url: cfg.logo_url,
        cor_destaque: cfg.cor_destaque,
        rodape: cfg.rodape.trim(),
        template_json: cfg.template.filter((t) => t.titulo.trim()) as never,
      }, { onConflict: "user_id" });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["diag-config"] });
      toast.success("Configurações salvas");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon"><Link to="/diagnosticos"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <div>
          <h1 className="text-2xl font-semibold">Configurações dos diagnósticos</h1>
          <p className="text-sm text-muted-foreground">Identidade do PDF e modelo de checklist</p>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-card p-4 space-y-4">
        <h2 className="font-medium">Identidade do PDF</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Nome de exibição ("Feito por")</Label>
            <Input value={cfg.nome_exibicao} onChange={(e) => set({ nome_exibicao: e.target.value })} placeholder="Taiane Oliveira" />
          </div>
          <div className="space-y-1.5">
            <Label>Rodapé (ex: @seuinstagram)</Label>
            <Input value={cfg.rodape} onChange={(e) => set({ rodape: e.target.value })} placeholder="@studiotaianeoliveira" />
          </div>
          <div className="space-y-1.5">
            <Label>Cor de destaque</Label>
            <div className="flex gap-2">
              <input type="color" value={cfg.cor_destaque} onChange={(e) => set({ cor_destaque: e.target.value })} className="h-10 w-14 rounded border border-border bg-transparent" />
              <Input value={cfg.cor_destaque} onChange={(e) => set({ cor_destaque: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Logo</Label>
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-lg border border-border bg-muted flex items-center justify-center overflow-hidden">
                {logoPreview ? <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" /> : <span className="text-xs text-muted-foreground">Padrão</span>}
              </div>
              <Button asChild variant="outline" size="sm" disabled={uploading}>
                <label className="cursor-pointer">
                  <Upload className="h-4 w-4" /> {uploading ? "Enviando…" : "Enviar"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => onLogo(e.target.files?.[0])} />
                </label>
              </Button>
              {cfg.logo_url && <Button variant="ghost" size="sm" onClick={() => set({ logo_url: null })}>Usar padrão</Button>}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-medium">Modelo de checklist</h2>
            <p className="text-xs text-muted-foreground">Usado ao criar novos diagnósticos (os já criados não mudam).</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => set({ template: TEMPLATE_PADRAO })}><RotateCcw className="h-4 w-4" /> Restaurar</Button>
        </div>
        {cfg.template.map((t, i) => (
          <div key={i} className="rounded-lg border border-border p-3 space-y-2">
            <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
              <Input value={t.secao} onChange={(e) => setItem(i, { secao: e.target.value })} placeholder="Seção" />
              <Input value={t.titulo} onChange={(e) => setItem(i, { titulo: e.target.value })} placeholder="Título do item" />
              <Button variant="ghost" size="icon" onClick={() => set({ template: cfg.template.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <Textarea rows={2} value={t.o_que_eu_vi} onChange={(e) => setItem(i, { o_que_eu_vi: e.target.value })} placeholder="O que eu vi" />
            <Textarea rows={3} value={t.sua_tarefa} onChange={(e) => setItem(i, { sua_tarefa: e.target.value })} placeholder="Sua tarefa" />
          </div>
        ))}
        <Button variant="outline" onClick={() => set({ template: [...cfg.template, { secao: cfg.template.at(-1)?.secao ?? "", titulo: "", o_que_eu_vi: "", sua_tarefa: "" }] })}>
          <Plus className="h-4 w-4" /> Adicionar item
        </Button>
      </section>

      <div className="fixed inset-x-0 bottom-16 md:bottom-4 z-20 flex justify-center px-4">
        <Button size="lg" onClick={save} disabled={saving} className="shadow-lg">
          <Save className="h-4 w-4" /> {saving ? "Salvando…" : "Salvar configurações"}
        </Button>
      </div>
    </div>
  );
}
