import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const str = { type: "string" } as const;
const arr = { type: "array", items: { type: "string" } } as const;
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["titulo", "slogan", "bio", "nichos", "audiencia", "servicos", "marcas", "cta"],
  properties: {
    titulo: str, slogan: str, bio: str, nichos: arr, audiencia: str,
    servicos: {
      type: "array",
      items: { type: "object", additionalProperties: false, required: ["nome", "descricao"], properties: { nome: str, descricao: str } },
    },
    marcas: str, cta: str,
  },
};

const SYSTEM = `Você é especialista em Marketing de Influência, Relações Públicas e UGC. Redija em português do Brasil o texto de um Mídia Kit moderno, limpo e direto. Tom confiante, autêntico e comercial, focado no valor e na conversão que a criadora traz para as marcas. Nunca invente números, marcas ou resultados que não foram informados; não prometa resultados garantidos.
Regras: titulo = nome artístico curto; slogan = frase de impacto curta; bio = no máximo 4 linhas, focada em UGC e conversão; nichos = 4 a 6 bullets curtos com pontos fortes; audiencia = texto curto e dinâmico para acompanhar gráficos de métricas; servicos = 4 a 7 formatos (ex.: Reels, TikToks, Fotos para e-commerce, Provador, Unboxing) com descrição de 1 frase; marcas = parágrafo valorizando o portfólio (se vazio, falar de abertura para primeiras parcerias); cta = frase final convidando para parcerias.`;

export const gerarTextosMidiaKit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ dados: z.record(z.any()) }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("IA não configurada");
    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions: SYSTEM,
        input: `Dados da criadora:\n${JSON.stringify(data.dados, null, 2)}`,
        text: { format: { type: "json_schema", name: "midia_kit", strict: true, schema: SCHEMA } },
      }),
    });
    if (!res.ok || !res.body) {
      const t = await res.text().catch(() => "");
      if (res.status === 429) throw new Error("Muitos pedidos agora. Tente de novo em alguns segundos.");
      if (res.status === 402) throw new Error("Os créditos de IA acabaram. Adicione créditos para continuar.");
      throw new Error(`Não foi possível gerar os textos (${res.status}) ${t.slice(0, 200)}`);
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
        try {
          const ev = JSON.parse(p);
          if (ev.type === "response.output_text.delta") out += ev.delta;
          if (ev.type === "error" || ev.type === "response.failed") throw new Error(ev.error?.message ?? "Falha na IA");
        } catch (e) { if (e instanceof Error && e.message !== "Unexpected end of JSON input" && !(e instanceof SyntaxError)) throw e; }
      }
    }
    if (!out.trim()) throw new Error("A IA não retornou texto.");
    return JSON.parse(out) as {
      titulo: string; slogan: string; bio: string; nichos: string[]; audiencia: string;
      servicos: { nome: string; descricao: string }[]; marcas: string; cta: string;
    };
  });

export const getMidiaKitPublico = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(20).max(100) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("mk_kits").select("dados, textos, fotos, publico").eq("token", data.token).maybeSingle();
    if (!row || !row.publico) return null;
    return { dados: row.dados as any, textos: row.textos as any, fotos: row.fotos as any };
  });
