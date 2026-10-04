import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Eye, EyeOff, ImagePlus, Plus, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SiteSection, SiteSeo } from "../lib/api";
import { loadDraft, saveDraft, uploadSiteImage } from "../lib/editor-api";
import { TIPOS, labelTipo, novaSecao, type SectionTipo } from "../lib/sections";
import { SectionView, contatoWhatsapp, orderSections } from "../components/SectionView";
import { CuponsManager } from "../components/CuponsManager";
import defaultLogo from "@/assets/logo.png";
import { getPublicContactSettings } from "@/lib/settings.functions";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

function ImageField({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex items-center gap-3">
      {value ? <img src={value} alt="" className="h-14 w-14 rounded object-cover" /> : <div className="h-14 w-14 rounded bg-muted" />}
      <label className="cursor-pointer">
        <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
          const f = e.target.files?.[0]; if (!f) return;
          setBusy(true);
          try { onChange(await uploadSiteImage(f)); } catch (err: any) { toast.error(err.message ?? "Erro no envio"); }
          finally { setBusy(false); e.target.value = ""; }
        }} />
        <span className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm"><ImagePlus className="h-4 w-4" />{busy ? "Enviando…" : "Foto"}</span>
      </label>
      {value && <Button variant="ghost" size="sm" onClick={() => onChange("")}>Remover</Button>}
    </div>
  );
}

function GaleriaField({ fotos, onChange }: { fotos: { url: string; legenda?: string }[]; onChange: (v: { url: string; legenda?: string }[]) => void }) {
  const [busy, setBusy] = useState(false);
  const move = (i: number, dir: number) => {
    const j = i + dir; if (j < 0 || j >= fotos.length) return;
    const n = [...fotos]; [n[i], n[j]] = [n[j], n[i]]; onChange(n);
  };
  return (
    <Field label="Fotos do carrossel">
      <div className="space-y-2">
        {fotos.map((f, i) => (
          <div key={f.url + i} className="flex items-center gap-2 rounded-lg border border-border p-2">
            <img src={f.url} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />
            <Input placeholder="Legenda (opcional)" value={f.legenda ?? ""} onChange={(e) => onChange(fotos.map((x, j) => j === i ? { ...x, legenda: e.target.value } : x))} />
            <Button variant="ghost" size="icon" onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" onClick={() => onChange(fotos.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm">
          <input type="file" accept="image/*" multiple className="hidden" onChange={async (e) => {
            const files = Array.from(e.target.files ?? []); if (!files.length) return;
            setBusy(true);
            try {
              const urls: { url: string }[] = [];
              for (const f of files) urls.push({ url: await uploadSiteImage(f) });
              onChange([...fotos, ...urls]);
            } catch (err: any) { toast.error(err.message ?? "Erro no envio"); }
            finally { setBusy(false); e.target.value = ""; }
          }} />
          <ImagePlus className="h-4 w-4" />{busy ? "Enviando…" : "Adicionar fotos"}
        </label>
      </div>
    </Field>
  );
}

function ListEditor({ itens, campos, onChange, novo }: {
  itens: any[]; campos: { k: string; label: string; area?: boolean }[]; onChange: (v: any[]) => void; novo: any;
}) {
  return (
    <div className="space-y-3">
      {itens.map((it, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-border p-3">
          {campos.map((c) => c.area ? (
            <Textarea key={c.k} placeholder={c.label} value={it[c.k] ?? ""} onChange={(e) => onChange(itens.map((x, j) => j === i ? { ...x, [c.k]: e.target.value } : x))} />
          ) : (
            <Input key={c.k} placeholder={c.label} value={it[c.k] ?? ""} onChange={(e) => onChange(itens.map((x, j) => j === i ? { ...x, [c.k]: e.target.value } : x))} />
          ))}
          <Button variant="ghost" size="sm" onClick={() => onChange(itens.filter((_, j) => j !== i))}><Trash2 className="mr-1 h-3.5 w-3.5" />Remover</Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...itens, { ...novo }])}><Plus className="mr-1 h-3.5 w-3.5" />Adicionar</Button>
    </div>
  );
}

function SectionForm({ s, set }: { s: SiteSection; set: (d: Record<string, any>) => void }) {
  const d = s.dados ?? {};
  const up = (k: string, v: any) => set({ ...d, [k]: v });
  const txt = (k: string, label: string, area = false, ph = "") => (
    <Field label={label}>
      {area ? <Textarea rows={5} placeholder={ph} value={d[k] ?? ""} onChange={(e) => up(k, e.target.value)} /> : <Input placeholder={ph} value={d[k] ?? ""} onChange={(e) => up(k, e.target.value)} />}
    </Field>
  );
  return (
    <div className="space-y-3">
      {s.tipo !== "hero" && txt("titulo", "Título")}
      {["cupons", "contato"].includes(s.tipo) && txt("subtitulo", "Frase")}
      {s.tipo === "hero" && <>
        {txt("eyebrow", "Frase pequena acima do título", false, DEF.eyebrow)}
        {txt("chamada", "Título principal", false, DEF.chamada)}
        {txt("descricao", "Texto abaixo do título", true, DEF.descricao)}
        {txt("botao_texto", "Botão principal", false, DEF.botao_texto)}
        {txt("botao2_texto", "Botão secundário", false, DEF.botao2_texto)}
        <Field label="Foto da capa (se vazio, usa a foto do Sobre)"><ImageField value={d.imagem} onChange={(v) => up("imagem", v)} /></Field>
      </>}
      {s.tipo === "sobre" && <>{txt("texto", "Texto (deixe uma linha em branco entre parágrafos)", true)}<Field label="Foto"><ImageField value={d.imagem} onChange={(v) => up("imagem", v)} /></Field>
        <Field label="Números em destaque"><ListEditor itens={d.numeros ?? DEF.numeros} novo={{ valor: "", rotulo: "" }} onChange={(v) => up("numeros", v)}
          campos={[{ k: "valor", label: "Número (ex: +50 mil)" }, { k: "rotulo", label: "Legenda (ex: seguidores)" }]} /></Field></>}
      {s.tipo === "servicos" && <ListEditor itens={d.itens?.length ? d.itens : DEF.servicos} novo={{ nome: "", descricao: "", preco: "", inclui: "", objetivo: "" }} onChange={(v) => up("itens", v)}
        campos={[{ k: "nome", label: "Nome do serviço" }, { k: "preco", label: "Preço (ex: a partir de R$ 300)" }, { k: "descricao", label: "Descrição curta", area: true }, { k: "inclui", label: "O que inclui (um por linha)", area: true }]} />}
      {s.tipo === "depoimentos" && <ListEditor itens={d.itens ?? []} novo={{ nome: "", instagram: "", texto: "", resultado: "", foto: "" }} onChange={(v) => up("itens", v)}
        campos={[{ k: "nome", label: "Nome" }, { k: "instagram", label: "@ da cliente" }, { k: "resultado", label: "Resultado em destaque (ex: +3 parcerias)" }, { k: "foto", label: "Link da foto (opcional)" }, { k: "texto", label: "Depoimento", area: true }]} />}
      {s.tipo === "faq" && <ListEditor itens={d.itens ?? DEF.faq} novo={{ pergunta: "", resposta: "" }} onChange={(v) => up("itens", v)}
        campos={[{ k: "pergunta", label: "Pergunta" }, { k: "resposta", label: "Resposta", area: true }]} />}
      {s.tipo === "contato" && <>{txt("whatsapp", "Seu WhatsApp (recebe os cadastros)")}{txt("instagram", "Link do Instagram")}{txt("email", "Seu e-mail (aparece no rodapé)")}<p className="text-xs text-muted-foreground">Este bloco mostra o formulário de cadastro (nome, @, WhatsApp, e-mail e objetivo). Ao enviar, abre o WhatsApp da cliente com a mensagem para você.</p></>}
      {s.tipo === "cupons" && <>{txt("link", "Link do Linktree")}{txt("link_texto", "Texto do botão (ex: Ver todos os cupons)")}</>}
      {s.tipo === "cupons" && <p className="text-xs text-muted-foreground">Cadastre os cupons na aba Cupons. As fotos da Galeria aparecem junto, na seção Parcerias.</p>}
      {s.tipo === "galeria" && <GaleriaField fotos={d.fotos ?? []} onChange={(v) => up("fotos", v)} />}
    </div>
  );
}

export function SiteEditor() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["site-rascunho"], queryFn: loadDraft });
  const st = useQuery({ queryKey: ["public-contact-settings"], queryFn: () => getPublicContactSettings() });
  const logo = st.data?.logo_url || defaultLogo;
  const [sections, setSections] = useState<SiteSection[]>([]);
  const [seo, setSeo] = useState<SiteSeo>({});
  const [aberta, setAberta] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!q.data) return;
    setSections(q.data.rascunho.sections.length ? q.data.rascunho.sections : q.data.publicado.sections);
    setSeo(q.data.seo);
  }, [q.data]);

  const change = (fn: (s: SiteSection[]) => SiteSection[]) => { setSections(fn); setDirty(true); };

  // Salva o rascunho sozinho para não perder fotos e textos
  useEffect(() => {
    if (!dirty || saving) return;
    const t = setTimeout(async () => {
      try { await saveDraft({ sections }, seo, false); setDirty(false); }
      catch (e: any) { toast.error(e.message ?? "Erro ao salvar rascunho"); }
    }, 1500);
    return () => clearTimeout(t);
  }, [sections, seo, dirty, saving]);
  const move = (i: number, dir: -1 | 1) => change((arr) => {
    const j = i + dir; if (j < 0 || j >= arr.length) return arr;
    const c = [...arr]; [c[i], c[j]] = [c[j], c[i]]; return c;
  });

  const salvar = async (publicar: boolean) => {
    setSaving(true);
    try {
      await saveDraft({ sections }, seo, publicar);
      setDirty(false);
      toast.success(publicar ? "Página publicada!" : "Rascunho salvo");
      qc.invalidateQueries({ queryKey: ["site-publicado"] });
      qc.invalidateQueries({ queryKey: ["site-rascunho"] });
    } catch (e: any) { toast.error(e.message ?? "Erro ao salvar"); }
    finally { setSaving(false); }
  };

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (q.error) return <p className="text-sm text-destructive">Erro ao carregar: {(q.error as Error).message}</p>;

  const wa = contatoWhatsapp(sections);

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Página inicial</h1>
          <p className="text-sm text-muted-foreground">Monte os blocos, salve o rascunho e publique quando estiver pronto.</p>
        </div>
        <Button asChild variant="outline" size="sm"><a href="/agendar" target="_blank" rel="noreferrer"><ExternalLink className="mr-1 h-4 w-4" />Ver página publicada</a></Button>
      </div>

      <Tabs defaultValue="blocos">
        <TabsList>
          <TabsTrigger value="blocos">Blocos</TabsTrigger>
          <TabsTrigger value="cupons">Cupons</TabsTrigger>
          <TabsTrigger value="previa">Prévia</TabsTrigger>
          <TabsTrigger value="seo">Google</TabsTrigger>
        </TabsList>

        <TabsContent value="blocos" className="space-y-3">
          {sections.length === 0 && <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nenhum bloco ainda. Adicione o primeiro abaixo.</p>}
          {sections.map((s, i) => (
            <div key={s.id} className="rounded-xl border border-border bg-card">
              <div className="flex items-center gap-2 p-3">
                <button className="flex-1 text-left" onClick={() => setAberta(aberta === s.id ? null : s.id)}>
                  <p className="text-xs text-muted-foreground">{labelTipo(s.tipo)}</p>
                  <p className={`font-medium ${s.visivel === false ? "text-muted-foreground line-through" : ""}`}>{s.dados?.titulo || "Sem título"}</p>
                </button>
                <Button variant="ghost" size="icon" aria-label="Subir" onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" aria-label="Descer" onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" aria-label="Mostrar/ocultar" onClick={() => change((arr) => arr.map((x) => x.id === s.id ? { ...x, visivel: x.visivel === false } : x))}>
                  {s.visivel === false ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => { if (confirm("Excluir este bloco?")) change((arr) => arr.filter((x) => x.id !== s.id)); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
              {aberta === s.id && (
                <div className="border-t border-border p-4">
                  <SectionForm s={s} set={(dados) => change((arr) => arr.map((x) => x.id === s.id ? { ...x, dados } : x))} />
                </div>
              )}
            </div>
          ))}
          <div className="rounded-xl border border-dashed border-border p-4">
            <p className="mb-3 text-sm font-medium">Adicionar bloco</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TIPOS.map((t) => (
                <button key={t.tipo} className="rounded-lg border border-border p-3 text-left hover:bg-accent" onClick={() => {
                  const n = novaSecao(t.tipo as SectionTipo); change((arr) => [...arr, n]); setAberta(n.id);
                }}>
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.descricao}</p>
                </button>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="previa">
          <div className="overflow-hidden rounded-xl border border-border bg-background">
            {orderSections(sections).map((s) => <SectionView key={s.id} s={s} whatsapp={wa} logo={logo} preview />)}
            {sections.length === 0 && <p className="p-10 text-center text-sm text-muted-foreground">Sem blocos.</p>}
          </div>
        </TabsContent>

        <TabsContent value="cupons"><CuponsManager /></TabsContent>

        <TabsContent value="seo" className="space-y-3">
          <p className="text-sm text-muted-foreground">Como a página aparece no Google e ao compartilhar o link.</p>
          <Field label="Título"><Input value={seo.title ?? ""} onChange={(e) => { setSeo({ ...seo, title: e.target.value }); setDirty(true); }} /></Field>
          <Field label="Descrição"><Textarea value={seo.description ?? ""} onChange={(e) => { setSeo({ ...seo, description: e.target.value }); setDirty(true); }} /></Field>
          <Field label="Foto ao compartilhar o link"><ImageField value={seo.og_image} onChange={(v) => { setSeo({ ...seo, og_image: v }); setDirty(true); }} /></Field>
        </TabsContent>
      </Tabs>

      <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-background/95 p-3 backdrop-blur md:bottom-0 md:left-64">
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-2">
          <span className="mr-auto text-xs text-muted-foreground">{dirty ? "Salvando…" : "Rascunho salvo. Toque em Publicar para aparecer no site."}</span>
          <Button variant="outline" disabled={saving} onClick={() => salvar(false)}>Salvar rascunho</Button>
          <Button disabled={saving} onClick={() => salvar(true)}>Publicar</Button>
        </div>
      </div>
    </div>
  );
}
