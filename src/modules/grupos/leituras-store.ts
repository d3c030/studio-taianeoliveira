import { carregarLeituras, type LeituraSalva } from "./lib";

type Resultado = { data?: LeituraSalva[] | null; error?: { message: string } | null };
export async function gravarAuditoria(rows: LeituraSalva[], salvar: (rows: LeituraSalva[]) => PromiseLike<Resultado>) {
  if (!rows.length) return;
  const { error } = await salvar(rows);
  if (error) throw new Error(`Não foi possível guardar as leituras: ${error.message}`);
}
export async function consultarAuditoria(buscar: () => PromiseLike<Resultado>) {
  const { data, error } = await buscar();
  if (error) throw new Error(`Não foi possível carregar as leituras: ${error.message}`);
  const rows = data ?? [];
  return { rows, leituras: carregarLeituras(rows) };
}