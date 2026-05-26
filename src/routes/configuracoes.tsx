import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Instagram, MessageCircle, Save } from "lucide-react";
import { toast } from "sonner";
import {
  getContactSettings,
  updateContactSettings,
} from "@/lib/settings.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Studio Taiane Oliveira" }] }),
  component: ConfiguracoesPage,
});

function ConfiguracoesPage() {
  const qc = useQueryClient();
  const fetchSettings = useServerFn(getContactSettings);
  const saveSettings = useServerFn(updateContactSettings);

  const q = useQuery({
    queryKey: ["contact-settings"],
    queryFn: () => fetchSettings(),
  });

  const [instagram, setInstagram] = useState("");
  const [whatsapp, setWhatsapp] = useState("");

  useEffect(() => {
    if (q.data) {
      setInstagram(q.data.instagram_url ?? "");
      setWhatsapp(q.data.whatsapp_phone ?? "");
    }
  }, [q.data]);

  const m = useMutation({
    mutationFn: () =>
      saveSettings({
        data: {
          instagram_url: instagram.trim(),
          whatsapp_phone: whatsapp.trim(),
        },
      }),
    onSuccess: () => {
      toast.success("Configurações atualizadas");
      qc.invalidateQueries({ queryKey: ["contact-settings"] });
      qc.invalidateQueries({ queryKey: ["public-contact-settings"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl sm:text-3xl">Configurações</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie o WhatsApp e a rede social usados na página pública de
          agendamento.
        </p>
      </header>

      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-5 max-w-xl">
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
          onClick={() => m.mutate()}
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
