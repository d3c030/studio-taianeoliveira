import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Copy, Download, ImagePlus, Loader2, Plus, Sparkles, Trash2, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { gerarTextosMidiaKit } from "@/lib/midiakit.functions";
import { MidiaKitView } from "../MidiaKitView";
import { fmtNum, totalSeguidores, type MkDados, type MkFoto, type MkKit, type MkTextos } from "../types";

const db = supabase as any;
const SITE = "https://studio-taianeoliveira.lovable.app";

export function MidiaKitLista() {
  const nav = useNavigate();
  const q = useQuery({
    queryKey: ["mk-kits"],
    queryFn: async () => {
      const { data, error } = await db.from("mk_kits").select("*").order("atualizado_em", { ascending: false });
      if (error) throw error;
      return data as MkKit[];
    },
  });
  const novo = async () => {
    const { data, error } = await db.from("mk_kits").insert({}).select("id").single();
    if (error) return toast.error(error.message);
    nav({ to: "/midiakit/$kitId", params: { kitId: data.id } });
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div><h1 className="text-2xl font-bold">Mídia Kit</h1><p className="text-sm text-muted-foreground">Monte kits profissionais para atrair marcas.</p></div>
        <Button onClick={novo}><Plus className="h-4 w-4" /> Novo kit</Button>
      </div>
      {q.isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : !q.data?.length ? (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Nenhum kit ainda. Toque em “Novo kit”.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {q.data.map((k) => (
            <Link key={k.id} to="/midiakit/$kitId" params={{ kitId: k.id }} className="overflow-hidden rounded-xl border border-border bg-card hover:border-primary">
              {k.dados.capa ? <img src={k.dados.capa} alt="" className="h-36 w-full object-cover object-top" /> : <div className="h-36 bg-accent" />}
              <div className="p-3">
                <p className="font-semibold">{k.dados.nome || "Sem nome"}</p>
                <p className="text-xs text-muted-foreground">{k.dados.arroba ? `@${k.dados.arroba.replace(/^@/, "")} · ` : ""}{fmtNum(totalSeguidores(k.dados))} seguidores{k.publico ? " · Link ativo" : ""}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

async function upload(kitId: string, f: File) {
  const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${kitId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("midiakit").upload(path, f, { contentType: f.type });
  if (error) throw error;
  return supabase.storage.from("midiakit").getPublicUrl(path).data.publicUrl;
}

export function MidiaKitEditor({ kitId }: { kitId: string }) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const [kit, setKit] = useState<MkKit | null>(null);
  const [gerando, setGerando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [salvo, setSalvo] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    db.from("mk_kits").select("*").eq("id", kitId).single().then(({ data, error }: any) => {
      if (error) toast.error(error.message); else setKit(data);
    });
  }, [kitId]);

  const save = (next: MkKit) => {
    setKit(next); setSalvo(false);
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const { error } = await db.from("mk_kits").update({ dados: next.dados, textos: next.textos, fotos: next.fotos, publico: next.publico, atualizado_em: new Date().toISOString() }).eq("id", kitId);
      if (error) toast.error("Não foi possível salvar"); else { setSalvo(true); qc.invalidateQueries({ queryKey: ["mk-kits"] }); }
    }, 700);
  };

  if (!kit) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  const d = kit.dados, t = kit.textos;
  const setD = (p: Partial<MkDados>) => save({ ...kit, dados: { ...d, ...p } });
  const setT = (p: Partial<MkTextos>) => save({ ...kit, textos: { ...t, ...p } });
  const link = `${SITE}/kit/${kit.token}`;

  const gerar = async () => {
    if (!d.nome && !d.arroba) return toast.error("Preencha pelo menos o nome ou o @.");
    setGerando(true);
    try {
      const r = await gerarTextosMidiaKit({ data: { dados: d } });
      save({ ...kit, textos: r });
      toast.success("Textos criados! Revise na aba Textos.");
    } catch (e: any) { toast.error(e.message ?? "Erro ao gerar"); }
    setGerando(false);
  };
  const addFotos = async (files: FileList | null, capa = false) => {
    const list = [...(files ?? [])].filter((f) => f.type.startsWith("image/"));
    if (!list.length) return;
    setEnviando(true);
    try {
      if (capa) { setD({ capa: await upload(kitId, list[0]) }); }
      else {
        const urls: MkFoto[] = [];
        for (const f of list) urls.push({ url: await upload(kitId, f) });
        save({ ...kit, fotos: [...kit.fotos, ...urls] });
      }
    } catch (e: any) { toast.error(e.message ?? "Erro no envio"); }
    setEnviando(false);
  };
  const excluir = async () => {
    if (!confirm("Excluir este Mídia Kit?")) return;
    await db.from("mk_kits").delete().eq("id", kitId);
    qc.invalidateQueries({ queryKey: ["mk-kits"] });
    nav({ to: "/midiakit" });
  };

  const num = (k: keyof MkDados, label: string, ph = "") => (
    <div className="space-y-1"><Label>{label}</Label><NumInput key={k} value={d[k] as number | undefined} placeholder={ph} decimal={k === "engajamento" || k === "publico_feminino" || String(k).startsWith("faixa_")} onChange={(v) => setD({ [k]: v } as any)} /></div>
  );
  const txt = (k: keyof MkDados, label: string, ph = "") => (
    <div className="space-y-1"><Label>{label}</Label><Input value={(d[k] as any) ?? ""} placeholder={ph} onChange={(e) => setD({ [k]: e.target.value } as any)} /></div>
  );

  return (
    <div className="space-y-5">
      <style>{`@media print{body *{visibility:hidden!important}#mk-print,#mk-print *{visibility:visible!important}#mk-print{position:absolute;left:0;top:0;width:100%}@page{margin:0}}`}</style>
      <div className="flex items-center justify-between gap-2">
        <Link to="/midiakit" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Mídia Kits</Link>
        <span className="text-xs text-muted-foreground">{salvo ? "Salvo" : "Salvando…"}</span>
      </div>

      <Tabs defaultValue="dados">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dados">Dados</TabsTrigger>
          <TabsTrigger value="fotos">Fotos</TabsTrigger>
          <TabsTrigger value="textos">Textos</TabsTrigger>
          <TabsTrigger value="previa">Prévia</TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="mt-4 space-y-6">
          <Bloco titulo="Quem é">
            {txt("nome", "Nome", "Ex.: Ana Souza")}{txt("arroba", "@ do Instagram", "anasouza")}
            {txt("nichos", "Nichos (separe por vírgula)", "Moda, Beleza, Lifestyle")}{txt("cidade", "Cidade", "Belo Horizonte - MG")}
            <div className="space-y-1 sm:col-span-2"><Label>Diferencial visual / estilo</Label><Textarea value={d.estilo ?? ""} placeholder="Ex.: cabelo ruivo, gravação com luz natural, edição dinâmica, 4K" onChange={(e) => setD({ estilo: e.target.value })} /></div>
            <div className="space-y-1 sm:col-span-2"><Label>Marcas com quem já trabalhou (separe por vírgula)</Label><Input value={d.marcas ?? ""} placeholder="Natura, Renner, Boticário" onChange={(e) => setD({ marcas: e.target.value })} /></div>
          </Bloco>
          <Bloco titulo="Números">
            {num("seguidores_ig", "Seguidores Instagram")}{num("seguidores_tt", "Seguidores TikTok")}{num("seguidores_yt", "Inscritos YouTube")}
            {num("engajamento", "Engajamento (%)", "4,5")}{num("alcance", "Alcance mensal")}{num("visualizacoes", "Visualizações mensais")}
          </Bloco>
          <Bloco titulo="Público">
            {num("publico_feminino", "% de mulheres", "78")}{num("faixa_18_24", "% 18-24 anos")}{num("faixa_25_34", "% 25-34 anos")}
            {num("faixa_35_44", "% 35-44 anos")}{num("faixa_45", "% 45+ anos")}
            <div className="space-y-1 sm:col-span-2"><Label>Interesses do público</Label><Input value={d.interesses ?? ""} placeholder="Moda acessível, skincare, viagens" onChange={(e) => setD({ interesses: e.target.value })} /></div>
          </Bloco>
          <Bloco titulo="Contato">
            {txt("email", "E-mail comercial")}{txt("whatsapp", "WhatsApp", "(31) 99999-9999")}
          </Bloco>
          <Button className="w-full" size="lg" onClick={gerar} disabled={gerando}>
            {gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} {gerando ? "Escrevendo textos…" : "Criar textos com IA"}
          </Button>
        </TabsContent>

        <TabsContent value="fotos" className="mt-4 space-y-6">
          <div className="space-y-2">
            <Label>Foto de capa</Label>
            {d.capa && <img src={d.capa} alt="" className="h-56 w-full rounded-xl object-cover object-top" />}
            <Escolher texto={enviando ? "Enviando…" : d.capa ? "Trocar capa" : "Escolher foto de capa"} onFiles={(f) => addFotos(f, true)} />
          </div>
          <div className="space-y-2">
            <Label>Portfólio (fotos de trabalhos, prints de resultados)</Label>
            <Escolher multiple texto={enviando ? "Enviando…" : "Adicionar fotos"} onFiles={(f) => addFotos(f)} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {kit.fotos.map((f, i) => (
                <div key={f.url} className="space-y-1">
                  <div className="relative"><img src={f.url} alt="" className="aspect-[4/5] w-full rounded-lg object-cover" />
                    <Button size="icon" variant="secondary" className="absolute right-1 top-1 h-8 w-8" aria-label="Remover foto" onClick={() => save({ ...kit, fotos: kit.fotos.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button></div>
                  <Input value={f.legenda ?? ""} placeholder="Legenda" onChange={(e) => save({ ...kit, fotos: kit.fotos.map((x, j) => (j === i ? { ...x, legenda: e.target.value } : x)) })} />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="textos" className="mt-4 space-y-4">
          {!t.bio && <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">Preencha os Dados e toque em “Criar textos com IA”. Depois você pode editar tudo aqui.</p>}
          <Button variant="outline" onClick={gerar} disabled={gerando}>{gerando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Reescrever com IA</Button>
          <div className="space-y-1"><Label>Título</Label><Input value={t.titulo ?? ""} onChange={(e) => setT({ titulo: e.target.value })} /></div>
          <div className="space-y-1"><Label>Slogan</Label><Input value={t.slogan ?? ""} onChange={(e) => setT({ slogan: e.target.value })} /></div>
          <div className="space-y-1"><Label>Sobre mim</Label><Textarea rows={5} value={t.bio ?? ""} onChange={(e) => setT({ bio: e.target.value })} /></div>
          <div className="space-y-1"><Label>Nichos e especialidades (um por linha)</Label><Textarea rows={5} value={(t.nichos ?? []).join("\n")} onChange={(e) => setT({ nichos: e.target.value.split("\n") })} /></div>
          <div className="space-y-1"><Label>Audiência e alcance</Label><Textarea rows={3} value={t.audiencia ?? ""} onChange={(e) => setT({ audiencia: e.target.value })} /></div>
          <div className="space-y-2">
            <Label>Serviços oferecidos</Label>
            {(t.servicos ?? []).map((s, i) => (
              <div key={i} className="space-y-1 rounded-xl border border-border p-3">
                <div className="flex gap-2"><Input value={s.nome} placeholder="Formato" onChange={(e) => setT({ servicos: t.servicos!.map((x, j) => (j === i ? { ...x, nome: e.target.value } : x)) })} />
                  <Button size="icon" variant="ghost" aria-label="Remover serviço" onClick={() => setT({ servicos: t.servicos!.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button></div>
                <Textarea rows={2} value={s.descricao} placeholder="Descrição" onChange={(e) => setT({ servicos: t.servicos!.map((x, j) => (j === i ? { ...x, descricao: e.target.value } : x)) })} />
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setT({ servicos: [...(t.servicos ?? []), { nome: "", descricao: "" }] })}><Plus className="h-4 w-4" /> Serviço</Button>
          </div>
          <div className="space-y-1"><Label>Marcas parceiras</Label><Textarea rows={3} value={t.marcas ?? ""} onChange={(e) => setT({ marcas: e.target.value })} /></div>
          <div className="space-y-1"><Label>Chamada final</Label><Input value={t.cta ?? ""} onChange={(e) => setT({ cta: e.target.value })} /></div>
        </TabsContent>

        <TabsContent value="previa" className="mt-4 space-y-4">
          <div className="space-y-3 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <div><p className="font-medium">Link público</p><p className="text-xs text-muted-foreground">Marcas abrem o kit pelo link.</p></div>
              <Switch checked={kit.publico} onCheckedChange={(v) => save({ ...kit, publico: v })} />
            </div>
            {kit.publico && <div className="flex gap-2"><Input readOnly value={link} /><Button variant="outline" size="icon" aria-label="Copiar link" onClick={() => { navigator.clipboard.writeText(link); toast.success("Link copiado"); }}><Copy className="h-4 w-4" /></Button></div>}
            <Button className="w-full" onClick={() => window.print()}><Download className="h-4 w-4" /> Baixar PDF</Button>
            <p className="text-xs text-muted-foreground">Na janela que abrir, escolha “Salvar como PDF”.</p>
          </div>
          <div id="mk-print"><MidiaKitView dados={d} textos={t} fotos={kit.fotos} /></div>
          <Button variant="ghost" className="w-full text-destructive" onClick={excluir}><Trash2 className="h-4 w-4" /> Excluir kit</Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return <section className="space-y-3"><h3 className="font-semibold">{titulo}</h3><div className="grid gap-3 sm:grid-cols-2">{children}</div></section>;
}
function Escolher({ texto, multiple, onFiles }: { texto: string; multiple?: boolean; onFiles: (f: FileList | null) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border p-5 text-sm text-muted-foreground hover:border-primary">
      <ImagePlus className="h-5 w-5" />{texto}
      <input type="file" accept="image/*" multiple={multiple} className="hidden" onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
    </label>
  );
}

/** Lê números no formato brasileiro: "12.500", "12,5 mil", "12,5k", "1,2M". */
export function parseNumBR(raw: string, decimal = false): number | undefined {
  let s = raw.trim().toLowerCase().replace(/\s|%/g, "");
  if (!s) return undefined;
  let mult = 1;
  if (/(mi|m)$/.test(s) && !/mil$/.test(s)) { mult = 1_000_000; s = s.replace(/(mi|m)$/, ""); }
  else if (/(mil|k)$/.test(s)) { mult = 1_000; s = s.replace(/(mil|k)$/, ""); }
  if (mult > 1 || decimal) { if (s.includes(",")) s = s.replace(/\./g, ""); s = s.replace(",", "."); }
  else s = s.replace(/[.,](?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * mult * 100) / 100 : undefined;
}

function NumInput({ value, onChange, placeholder, decimal }: { value?: number; onChange: (v?: number) => void; placeholder?: string; decimal?: boolean }) {
  const [txt, setTxt] = useState(value == null ? "" : String(value).replace(".", ","));
  return <Input inputMode="decimal" value={txt} placeholder={placeholder}
    onChange={(e) => { setTxt(e.target.value); onChange(parseNumBR(e.target.value, decimal)); }} />;
}
