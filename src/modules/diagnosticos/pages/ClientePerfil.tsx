import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Instagram, Mail, MessageCircle, Pencil, Plus, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { createDiagnostico, deleteCliente, deleteDiagnostico, getCliente, listDiagnosticos } from "../lib/api";
import { ClienteAvatar } from "../components/ClienteAvatar";
import { ClienteDialog } from "../components/ClienteDialog";

const fmtDate = (s: string) => new Date(s).toLocaleDateString("pt-BR");

export function ClientePerfil({ clienteId }: { clienteId: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [edit, setEdit] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirm, setConfirm] = useState<{ type: "diag"; id: string } | { type: "cliente" } | null>(null);

  const cq = useQuery({ queryKey: ["diag-cliente", clienteId], queryFn: () => getCliente(clienteId) });
  const dq = useQuery({ queryKey: ["diag-diagnosticos", clienteId], queryFn: () => listDiagnosticos(clienteId) });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["diag-cliente", clienteId] });
    qc.invalidateQueries({ queryKey: ["diag-diagnosticos", clienteId] });
    qc.invalidateQueries({ queryKey: ["diag-clientes"] });
  };

  const novo = async () => {
    setCreating(true);
    try {
      await createDiagnostico(clienteId);
      toast.success("Diagnóstico criado com o checklist padrão");
      refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao criar diagnóstico");
    } finally {
      setCreating(false);
    }
  };

  const doDelete = async () => {
    if (!confirm) return;
    try {
      if (confirm.type === "diag") {
        await deleteDiagnostico(confirm.id);
        toast.success("Diagnóstico excluído");
        refresh();
      } else {
        await deleteCliente(clienteId);
        toast.success("Cliente excluída");
        qc.invalidateQueries({ queryKey: ["diag-clientes"] });
        navigate({ to: "/diagnosticos" });
      }
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao excluir");
    } finally {
      setConfirm(null);
    }
  };

  if (cq.isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (cq.error || !cq.data)
    return (
      <div className="space-y-3">
        <p className="text-sm text-destructive">Cliente não encontrada.</p>
        <Link to="/diagnosticos" className="text-sm text-primary">Voltar</Link>
      </div>
    );

  const c = cq.data;
  const wa = c.whatsapp?.replace(/\D/g, "");

  return (
    <div className="space-y-6">
      <Link to="/diagnosticos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Clientes
      </Link>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-4">
          <ClienteAvatar path={c.foto_perfil} nome={c.nome} className="h-16 w-16 text-base" />
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="text-xl font-semibold truncate">{c.nome}</h1>
            {c.instagram && (
              <a href={`https://instagram.com/${c.instagram}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
                <Instagram className="h-4 w-4" />@{c.instagram}
              </a>
            )}
            {c.whatsapp && (
              <a href={`https://wa.me/${wa?.length && wa.length <= 11 ? "55" + wa : wa}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
                <MessageCircle className="h-4 w-4" />{c.whatsapp}
              </a>
            )}
            {c.email && (
              <a href={`mailto:${c.email}`} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary truncate">
                <Mail className="h-4 w-4" />{c.email}
              </a>
            )}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => setEdit(true)}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" aria-label="Excluir cliente" onClick={() => setConfirm({ type: "cliente" })}><Trash2 className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Diagnósticos</h2>
          <Button onClick={novo} disabled={creating}>
            <Plus className="h-4 w-4" /> {creating ? "Criando…" : "Novo diagnóstico"}
          </Button>
        </div>

        {dq.isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : !dq.data?.length ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center">
            <FileText className="mx-auto mb-2 h-7 w-7 text-primary" />
            <p className="font-medium">Nenhum diagnóstico ainda</p>
            <p className="text-sm text-muted-foreground">Toque em "Novo diagnóstico" para começar com o checklist padrão.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {dq.data.map((d) => (
              <li key={d.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{d.titulo}</p>
                  <p className="text-xs text-muted-foreground">Criado em {fmtDate(d.criado_em)} · atualizado {fmtDate(d.atualizado_em)}</p>
                </div>
                <span className={d.status === "finalizado"
                  ? "rounded-full bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
                  : "rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground"}>
                  {d.status === "finalizado" ? "Finalizado" : "Rascunho"}
                </span>
                <Button variant="ghost" size="icon" aria-label="Excluir diagnóstico" onClick={() => setConfirm({ type: "diag", id: d.id })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ClienteDialog open={edit} onOpenChange={setEdit} cliente={c} onSaved={refresh} />

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.type === "cliente" ? "Excluir cliente?" : "Excluir diagnóstico?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.type === "cliente"
                ? "Todos os diagnósticos desta cliente também serão excluídos. Esta ação não pode ser desfeita."
                : "O diagnóstico e suas imagens serão excluídos. Esta ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
