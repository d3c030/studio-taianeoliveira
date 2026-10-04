import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Public: resolves a share token into a short-lived download link, only while valid (24h).
export const getSharedPdf = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(20).max(100) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("diag_compartilhamentos")
      .select("arquivo, nome_arquivo, cliente_nome, expira_em")
      .eq("token", data.token)
      .maybeSingle();
    if (!row) return { status: "invalido" as const };
    if (new Date(row.expira_em).getTime() < Date.now()) return { status: "expirado" as const };
    const { data: s } = await supabaseAdmin.storage
      .from("diagnosticos")
      .createSignedUrl(row.arquivo, 600, { download: row.nome_arquivo });
    if (!s?.signedUrl) return { status: "invalido" as const };
    return {
      status: "ok" as const,
      url: s.signedUrl,
      nome: row.cliente_nome.split(" ")[0] ?? "",
      expiraEm: row.expira_em,
    };
  });
