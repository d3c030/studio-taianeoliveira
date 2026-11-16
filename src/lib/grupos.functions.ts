import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SCHEMA = {
  type: "object", additionalProperties: false, required: ["itens"],
  properties: {
    itens: {
      type: "array",
      items: {
        type: "object", additionalProperties: false, required: ["nome", "emoji", "cortado"],
        properties: { nome: { type: "string" }, emoji: { type: "string" }, cortado: { type: "boolean" } },
      },
    },
  },
};

const PROMPT = `Este é um print da tela "Reações" de uma mensagem no Instagram. Leia CADA linha da lista de pessoas que reagiram e devolva JSON: {"itens":[{"nome":"...","emoji":"...","cortado":true|false}]}.
- nome: exatamente o nome de exibição mostrado (pode ser um @ ou um nome), sem inventar nem completar.
- emoji: o emoji da reação na linha (à direita). Se não der para ver, "".
- cortado: true se o nome termina com reticências ("..." ou "…").
Ignore o cabeçalho "Reações", abas de emojis no topo, barra de status, horários e botões. Não inclua linhas repetidas.`;

export const lerPrintReacoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ imagem: z.string().startsWith("data:image/").max(8_000_000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: staff } = await context.supabase.rpc("is_staff");
    if (!staff) throw new Error("Acesso negado");
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("IA não configurada");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [{ role: "user", content: [{ type: "text", text: PROMPT }, { type: "image_url", image_url: { url: data.imagem } }] }],
        response_format: { type: "json_schema", json_schema: { name: "reacoes", strict: true, schema: SCHEMA } },
      }),
    });
    if (!res.ok || !res.body) {
      if (res.status === 429) throw new Error("Muitos pedidos agora. Espere alguns segundos e tente de novo.");
      if (res.status === 402) throw new Error("Os créditos de IA acabaram. Adicione créditos para continuar.");
      const t = await res.text().catch(() => "");
      console.error("lerPrintReacoes", res.status, t.slice(0, 300));
      throw new Error(`Não foi possível ler o print (${res.status}).`);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", out = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const l of lines) {
        if (!l.startsWith("data:")) continue;
        const p = l.slice(5).trim();
        if (!p || p === "[DONE]") continue;
        let ev: any;
        try { ev = JSON.parse(p); } catch { continue; }
        if (ev.error) throw new Error(ev.error.message ?? "Falha na IA");
        out += ev.choices?.[0]?.delta?.content ?? "";
      }
    }
    const txt = out.trim().replace(/^```(?:json)?/, "").replace(/```$/, "").trim();
    if (!txt) throw new Error("A IA não conseguiu ler este print. Tente outro print mais nítido.");
    try {
      const j = JSON.parse(txt);
      return (j.itens ?? []) as { nome: string; emoji: string; cortado: boolean }[];
    } catch {
      throw new Error("A leitura do print veio incompleta. Tente enviar de novo.");
    }
  });
