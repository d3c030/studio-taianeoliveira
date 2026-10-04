import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Receipt, HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatBRL, formatDateBR, PAYMENT_METHODS } from "@/lib/format";
import {
  addCobranca, addPagamento, deleteCobranca, deletePagamento, loadFinanceiro, loadPlanos, resumo, updateCobranca,
  type Cobranca,
} from "../lib/financeiro";

const num = (v: string) => Number(String(v).replace(/\./g, "").replace(",", ".")) || 0;
const hoje = () => new Date().toISOString().slice(0, 10);

function Linha({ c, onSaved }: { c: Cobranca; onSaved: () => void }) {
  const [d, setD] = useState({ descricao: c.descricao, valor: String(c.valor), desconto: String(c.desconto) });
  const save = async (patch: Partial<Cobranca>) => {
    try { await updateCobranca(c.id, patch); onSaved(); } catch { toast.error("Não foi possível salvar"); }
  };
  const liquido = Math.max(0, num(d.valor) - num(d.desconto));
  return (
    <div className="grid grid-cols-12 items-center gap-2 border-b border-border/60 py-2">
      <Input className="col-span-12 sm:col-span-5" value={d.descricao} placeholder="Descrição"
        onChange={(e) => setD({ ...d, descricao: e.target.value })} onBlur={() => save({ descricao: d.descricao })} />
      <div className="col-span-4 sm:col-span-2">
        <Input inputMode="decimal" value={d.valor} aria-label="Valor"
          onChange={(e) => setD({ ...d, valor: e.target.value })} onBlur={() => save({ valor: num(d.valor) })} />
      </div>
      <div className="col-span-4 sm:col-span-2">
        <Input inputMode="decimal" value={d.desconto} aria-label="Desconto"
          onChange={(e) => setD({ ...d, desconto: e.target.value })} onBlur={() => save({ desconto: num(d.desconto) })} />
      </div>
      <div className="col-span-3 sm:col-span-2 text-right text-sm font-medium">{formatBRL(liquido)}</div>
      <Button variant="ghost" size="icon" className="col-span-1" aria-label="Excluir"
        onClick={async () => { await deleteCobranca(c.id); onSaved(); }}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function FinanceiroEditor({ diagId }: { diagId: string }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["diag-fin", diagId], queryFn: () => loadFinanceiro(diagId) });
  const planos = useQuery({ queryKey: ["diag-planos"], queryFn: loadPlanos });
  const [pg, setPg] = useState({ valor: "", forma: "pix", data: hoje() });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["diag-fin", diagId] });
    qc.invalidateQueries({ queryKey: ["diag-fin-geral"] });
  };
  const cob = q.data?.cobrancas ?? [];
  const pag = q.data?.pagamentos ?? [];
  const r = resumo(cob, pag);

  const lancar = async (descricao: string, valor: number) => {
    try { await addCobranca(diagId, descricao, valor, cob.length); refresh(); } catch { toast.error("Erro ao lançar"); }
  };
  const pagar = async () => {
    const v = num(pg.valor);
    if (v <= 0) return toast.error("Informe o valor pago");
    try { await addPagamento(diagId, v, pg.forma, pg.data); setPg({ ...pg, valor: "" }); refresh(); toast.success("Pagamento registrado"); }
    catch { toast.error("Erro ao registrar pagamento"); }
  };

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[["Contratado", r.bruto], ["Descontos", r.desconto], ["Pago", r.pago], ["Em aberto", r.aberto]].map(([l, v]) => (
          <div key={l as string} className="rounded-xl border border-border bg-card p-3">
            <div className="text-xs text-muted-foreground">{l}</div>
            <div className={`font-display text-xl ${l === "Em aberto" && (v as number) > 0 ? "text-destructive" : ""}`}>{formatBRL(v as number)}</div>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 font-semibold"><Receipt className="h-4 w-4 text-primary" /> Plano contratado e cobranças</h3>
        {(planos.data ?? []).length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="self-center text-xs text-muted-foreground">Lançar plano:</span>
            {planos.data!.map((p) => (
              <Button key={p.nome} variant="outline" size="sm" onClick={() => lancar(p.nome, p.valor)}>
                <Plus className="h-3.5 w-3.5" /> {p.nome}{p.valor ? ` · ${formatBRL(p.valor)}` : ""}
              </Button>
            ))}
          </div>
        )}
        <div className="hidden grid-cols-12 gap-2 text-xs text-muted-foreground sm:grid">
          <span className="col-span-5">Descrição</span><span className="col-span-2">Valor (R$)</span>
          <span className="col-span-2">Desconto (R$)</span><span className="col-span-2 text-right">Total</span>
        </div>
        {cob.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma cobrança lançada ainda.</p>}
        {cob.map((c) => <Linha key={c.id} c={c} onSaved={refresh} />)}
        <Button variant="secondary" size="sm" onClick={() => lancar("Novo item", 0)}><Plus className="h-4 w-4" /> Adicionar item</Button>
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 font-semibold"><HandCoins className="h-4 w-4 text-primary" /> Pagamentos recebidos</h3>
        <div className="flex flex-wrap items-end gap-2">
          <Input className="w-32" inputMode="decimal" placeholder="Valor" value={pg.valor} onChange={(e) => setPg({ ...pg, valor: e.target.value })} />
          <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={pg.forma} onChange={(e) => setPg({ ...pg, forma: e.target.value })}>
            {PAYMENT_METHODS.map((m: any) => <option key={m.value ?? m} value={m.value ?? m}>{m.label ?? m}</option>)}
          </select>
          <Input type="date" className="w-40" value={pg.data} onChange={(e) => setPg({ ...pg, data: e.target.value })} />
          <Button onClick={pagar}><Plus className="h-4 w-4" /> Registrar</Button>
          {r.aberto > 0 && <Button variant="ghost" onClick={() => setPg({ ...pg, valor: String(r.aberto).replace(".", ",") })}>Quitar {formatBRL(r.aberto)}</Button>}
        </div>
        {pag.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum pagamento registrado.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {pag.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-24 text-muted-foreground">{formatDateBR(p.pago_em)}</span>
                <span className="flex-1 capitalize">{(PAYMENT_METHODS as any[]).find((m) => (m.value ?? m) === p.forma)?.label ?? p.forma ?? "—"}</span>
                <span className="font-medium">{formatBRL(Number(p.valor))}</span>
                <Button variant="ghost" size="icon" aria-label="Excluir" onClick={async () => { await deletePagamento(p.id); refresh(); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="text-xs text-muted-foreground">Esta tabela aparece no final do PDF, para a cliente ver o que foi contratado, pago e o que falta.</p>
    </div>
  );
}
