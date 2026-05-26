import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PAYMENT_METHODS, DEFAULT_PROCEDURES } from "@/lib/format";
import { fetchClients, type Appointment, type AppointmentInput } from "@/lib/data";
import { ClientCombobox } from "@/components/ClientCombobox";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Appointment | null;
  procedureSuggestions?: string[];
  onSubmit: (data: AppointmentInput) => Promise<void>;
  onDelete?: () => Promise<void>;
};

const today = () => new Date().toISOString().slice(0, 10);

export function AppointmentDialog({
  open, onOpenChange, initial, procedureSuggestions = [], onSubmit, onDelete,
}: Props) {
  const [date, setDate] = useState(today());
  const [time, setTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [procedure, setProcedure] = useState("");
  const [payment, setPayment] = useState<string>("Pix");
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const clientsQ = useQuery({ queryKey: ["clients"], queryFn: fetchClients });

  useEffect(() => {
    if (open) {
      setDate(initial?.date ?? today());
      setTime(initial?.time ?? "");
      setClientName(initial?.client_name ?? "");
      setClientId(initial?.client_id ?? null);
      setProcedure(initial?.procedure ?? "");
      setPayment(initial?.payment_method ?? "Pix");
      setAmount(initial ? String(initial.amount) : "");
      setNotes(initial?.notes ?? "");
    }
  }, [open, initial]);

  const handleSave = async () => {
    if (!clientName.trim() || !date) return;
    setSaving(true);
    try {
      await onSubmit({
        date,
        time: time || null,
        client_name: clientName.trim(),
        client_id: clientId,
        procedure: procedure.trim() || null,
        payment_method: payment,
        amount: parseFloat(amount.replace(",", ".")) || 0,
        notes: notes.trim() || null,
        status: initial?.status ?? "a_fazer",
      });
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const allProcs = Array.from(new Set([...DEFAULT_PROCEDURES, ...procedureSuggestions])).sort(
    (a, b) => a.localeCompare(b, "pt-BR")
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {initial ? "Editar atendimento" : "Novo atendimento"}
          </DialogTitle>
          <DialogDescription>Registe os dados do atendimento.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="time">Horário</Label>
              <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="client">Cliente</Label>
            <ClientCombobox
              clients={clientsQ.data ?? []}
              value={clientName}
              selectedId={clientId}
              onChange={(name, id) => {
                setClientName(name);
                setClientId(id);
              }}
              placeholder="Procurar ou criar novo cliente"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="proc">Procedimento</Label>
            <Input
              id="proc"
              value={procedure}
              onChange={(e) => setProcedure(e.target.value)}
              list="proc-suggestions"
              placeholder="Ex: Design, Henna, Nostril..."
              maxLength={200}
            />
            <datalist id="proc-suggestions">
              {allProcs.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Pagamento</Label>
              <Select value={payment} onValueChange={setPayment}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="amount">Valor (R$)</Label>
              <Input
                id="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Joias, estado, lembretes..."
              rows={3}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {initial && onDelete && (
            <Button
              variant="ghost"
              className="mr-auto text-destructive hover:text-destructive"
              onClick={async () => {
                if (confirm("Apagar este atendimento?")) {
                  await onDelete();
                  onOpenChange(false);
                }
              }}
            >
              Apagar
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || !clientName.trim()}>
            {saving ? "A guardar..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
