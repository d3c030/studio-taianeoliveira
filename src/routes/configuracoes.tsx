import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Instagram, MessageCircle, Save, Image as ImageIcon, Upload, Palette, Check } from "lucide-react";
import { toast } from "sonner";
import {
  getContactSettings,
  updateContactSettings,
  THEMES,
  type ThemeName,
} from "@/lib/settings.functions";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import defaultLogo from "@/assets/logo.png";

const THEME_OPTIONS: { value: ThemeName; label: string; swatch: string; ring: string }[] = [
  { value: "rosa",   label: "Rosa",   swatch: "linear-gradient(135deg, oklch(0.88 0.04 30), oklch(0.62 0.08 20))", ring: "oklch(0.62 0.08 20)" },
  { value: "azul",   label: "Azul",   swatch: "linear-gradient(135deg, oklch(0.88 0.06 240), oklch(0.55 0.16 250))", ring: "oklch(0.55 0.16 250)" },
  { value: "preto",  label: "Preto",  swatch: "linear-gradient(135deg, #2a2a2a, #0a0a0a)", ring: "#111" },
  { value: "branco", label: "Branco", swatch: "linear-gradient(135deg, #ffffff, #ececec)", ring: "#111" },
];

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Studio Taiane Oliveira" }] }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const qc = useQueryClient();
  const fetchSettings = useServerFn(getContactSettings);
  const saveSettings = useServerFn(updateContactSettings);
  const fileRef = useRef<HTMLInputElement>(null);

  const q = useQuery({
    queryKey: ["contact-settings"],
    queryFn: () => fetchSettings(),
  });

  const [instagram, setInstagram] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [theme, setTheme] = useState<ThemeName>("rosa");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (q.data) {
      setInstagram(q.data.instagram_url ?? "");
      setWhatsapp(q.data.whatsapp_phone ?? "");
      setLogoUrl(q.data.logo_url ?? "");
      setTheme(q.data.theme ?? "rosa");
    }
  }, [q.data]);

  type SaveOverrides = { logo?: string; theme?: ThemeName };
  const m = useMutation({
    mutationFn: (over: SaveOverrides = {}) =>
      saveSettings({
        data: {
          instagram_url: instagram.trim(),
          whatsapp_phone: whatsapp.trim(),
          logo_url: (over.logo ?? logoUrl).trim(),
          theme: over.theme ?? theme,
        },
      }),
    onSuccess: () => {
      toast.success("Configurações atualizadas");
      qc.invalidateQueries({ queryKey: ["contact-settings"] });
      qc.invalidateQueries({ queryKey: ["public-contact-settings"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (máx. 5 MB)");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `logo-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("branding")
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("branding").getPublicUrl(path);
      const publicUrl = data.publicUrl;
      setLogoUrl(publicUrl);
      await m.mutateAsync({ logo: publicUrl });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const previewSrc = logoUrl || defaultLogo;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl sm:text-3xl">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie a logo, o WhatsApp e a rede social usados na página pública
          de agendamento.
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-5 max-w-xl">
        {/* Logo */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-primary" />
            Logo
          </Label>
          <div className="flex items-center gap-4">
            <div className="h-24 w-24 rounded-xl bg-secondary/40 border border-border flex items-center justify-center overflow-hidden">
              <img src={previewSrc} alt="Logo atual" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="flex-1 space-y-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full sm:w-auto"
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? "Enviando…" : "Enviar nova logo"}
              </Button>
              {logoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setLogoUrl("");
                    m.mutate("");
                  }}
                  className="text-muted-foreground"
                >
                  Restaurar logo padrão
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                PNG ou JPG, até 5 MB. Recomendado fundo transparente.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsapp" className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            WhatsApp (somente números, com DDI + DDD)
          </Label>
          <Input
            id="whatsapp"
            inputMode="numeric"
            placeholder="5511999999999"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))}
            maxLength={20}
          />
          <p className="text-xs text-muted-foreground">
            Exemplo: <code>5511964040524</code> (55 = Brasil, 11 = DDD).
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="instagram" className="flex items-center gap-2">
            <Instagram className="h-4 w-4 text-primary" />
            URL do Instagram
          </Label>
          <Input
            id="instagram"
            type="url"
            placeholder="https://www.instagram.com/seu_perfil/"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            maxLength={255}
          />
        </div>

        <Button
          onClick={() => m.mutate(undefined)}
          disabled={m.isPending || q.isLoading}
          className="w-full sm:w-auto"
        >
          <Save className="h-4 w-4 mr-2" />
          {m.isPending ? "Salvando…" : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
}
