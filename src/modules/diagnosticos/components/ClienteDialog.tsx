import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveCliente, uploadImage, type DiagCliente } from "../lib/api";
import { ClienteAvatar } from "./ClienteAvatar";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  cliente?: DiagCliente | null;
  onSaved: (id: string) => void;
};

export function ClienteDialog({ open, onOpenChange, cliente, onSaved }: Props) {
  const [nome, setNome] = useState("");
  const [instagram, setInstagram] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNome(cliente?.nome ?? "");
    setInstagram(cliente?.instagram ?? "");
    setEmail(cliente?.email ?? "");
    setWhatsapp(cliente?.whatsapp ?? "");
    setFoto(cliente?.foto_perfil ?? null);
  }, [open, cliente]);

  const onFile = async (f?: File) => {
    if (!f) return;
    setUploading(true);
    try {
      setFoto(await uploadImage("clientes", f));
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao enviar foto");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return toast.error("Informe o nome");
    setSaving(true);
    try {
      const id = await saveCliente({ nome, instagram, email, whatsapp, foto_perfil: foto }, cliente?.id);
      toast.success(cliente ? "Cliente atualizada" : "Cliente cadastrada");
      onSaved(id);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{cliente ? "Editar cliente" : "Nova cliente"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="flex items-center gap-3">
            <ClienteAvatar path={foto} nome={nome} className="h-16 w-16" />
            <label className="text-sm font-medium text-primary cursor-pointer">
              {uploading ? "Enviando…" : foto ? "Trocar foto" : "Adicionar foto (opcional)"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
          </div>
          <div className="space-y-1.5">
            <Label>Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label>Instagram</Label>
            <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@perfil" maxLength={60} />
          </div>
          <div className="space-y-1.5">
            <Label>WhatsApp</Label>
            <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(11) 99999-9999" inputMode="tel" maxLength={30} />
          </div>
          <div className="space-y-1.5">
            <Label>E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={160} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving || uploading} className="w-full sm:w-auto">
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
