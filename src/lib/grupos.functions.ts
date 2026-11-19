import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { linhasAuditoria, type Participante, type Leitura } from "@/modules/grupos/lib";

const resultado = z.object({ total_linhas_visiveis: z.number().int().nonnegative(), itens: z.array(z.object({ nome: z.string(), emoji: z.string(), cortado: z.boolean() })) });
const SCHEMA = { type: "object", additionalProperties: false, required: ["itens", "total_linhas_visiveis"], properties: { total_linhas_visiveis: { type: "integer" }, itens: { type: "array", items: { type: "object", additionalProperties: false, required: ["nome", "emoji", "cortado"], properties: { nome: { type: "string" }, emoji: { type: "string" }, cortado: { type: "boolean" } } } } } };
const PROMPT = `Leia TODAS as linhas de pessoas na lista de Reações do Instagram, de cima a baixo, sem pular nenhuma. Inclua linhas parcialmente cortadas no topo e no rodapé. Conte primeiro total_linhas_visiveis (somente pessoas, não abas nem cabeçalhos), e devolva JSON com esse total e itens: [{nome,emoji,cortado}]. Transcreva o nome exatamente como aparece, preservando _ e .; nunca invente ou complete. Emoji é a reação à direita; se não visível, use "". cortado=true se a linha estiver parcialmente cortada ou o nome truncado. Ignore barra de status, cabeçalho Reações, abas, horários e botões. Uma entrada para CADA linha visível, mesmo parcialmente.`;

export const lerPrintReacoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ imagem: z.string().startsWith("data:image/").max(8_000_000), rodadaId: z.string().uuid(), printIdx: z.number().int().positive() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: staff, error: staffError } = await context.supabase.rpc("is_staff");
    if (staffError || !staff) throw new Error("Acesso negado");
    const { data: rodada, error: rodadaError } = await context.supabase.from("grupo_rodada").select("grupo_id,data,status").eq("id", data.rodadaId).single();
    if (rodadaError || !rodada || rodada.status === "fechada") throw new Error("Reabra a rodada antes de enviar prints.");
    const { data: parts, error: partsError } = await context.supabase.from("grupo_participante").select("*").eq("grupo_id", rodada.grupo_id).eq("ativo", true).lte("entrou_em", rodada.data);
    if (partsError) throw new Error(partsError.message);
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("IA não configurada");
    let runId: string | undefined;
    const ler = async (prompt: string) => {
      const headers = new Headers({ "Content-Type": "application/json", Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" });
      if (runId) headers.set("X-Lovable-AIG-Run-ID", runId);
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", { method: "POST", headers, body: JSON.stringify({ model: "google/gemini-3.8-flash", stream: true, messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: data.imagem } }] }], response_format: { type: "json_schema", json_schema: { name: "reacoes", strict: true, schema: SCHEMA } } }) });
      runId ??= res.headers.get("X-Lovable-AIG-Run-ID") ?? undefined;
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({})) as { message?: string; error?: { message?: string } };
        // Account blocks, refusals and unavailable models are terminal: never replay or switch models.
        throw new Error(body.error?.message ?? body.message ?? `Não foi possível ler o print (${res.status}).`);
      }
      const reader = res.body.getReader(), dec = new TextDecoder();
      let buf = "", out = "";
      const linha = (l: string) => {
        if (!l.startsWith("data:")) return;
        const p = l.slice(5).trim();
        if (!p || p === "[DONE]") return;
        let ev: { error?: { message?: string }; choices?: { delta?: { content?: string; refusal?: string } }[] };
        try { ev = JSON.parse(p); } catch { return; }
        if (ev.error) throw new Error(ev.error.message ?? "Falha na IA");
        if (ev.choices?.[0]?.delta?.refusal) throw new Error(ev.choices[0].delta.refusal);
        out += ev.choices?.[0]?.delta?.content ?? "";
      };
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const l of lines) linha(l);
      }
      linha(buf);
      if (!out.trim()) throw new Error("A IA não devolveu uma leitura. Envie um print mais nítido.");
      return resultado.parse(JSON.parse(out.trim().replace(/^```(?:json)?/, "").replace(/```$/, "").trim()));
    };
    const salvar = async (itens: Leitura[], total: number) => {
      const rows = linhasAuditoria(data.rodadaId, data.printIdx, itens, total, (parts ?? []) as Participante[]);
      if (rows.length) {
        const { error } = await context.supabase.from("grupo_leitura").upsert(rows, { onConflict: "rodada_id,print_idx,ordem" });
        if (error) throw new Error(`Não foi possível guardar as leituras: ${error.message}`);
      }
    };
    const primeira = await ler(PROMPT);
    await salvar(primeira.itens, primeira.total_linhas_visiveis);
    let final = primeira;
    let aviso: string | undefined;
    if (primeira.itens.length < primeira.total_linhas_visiveis) {
      try {
        const segunda = await ler(`${PROMPT}\nA primeira leitura retornou ${primeira.itens.length} de ${primeira.total_linhas_visiveis} linhas. Revise especialmente o topo e o rodapé e devolva a lista completa.`);
        const itens = [...primeira.itens];
        for (const item of segunda.itens) if (!itens.some((x) => x.nome === item.nome && x.emoji === item.emoji)) itens.push(item);
        final = { itens, total_linhas_visiveis: Math.max(primeira.total_linhas_visiveis, segunda.total_linhas_visiveis) };
        await salvar(final.itens, final.total_linhas_visiveis);
      } catch (e) { aviso = e instanceof Error ? e.message : "A revisão falhou; a primeira leitura foi preservada."; }
    }
    return { ...final, aviso };
  });
