import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { TEMPLATE_PADRAO, type TemplateItem } from "@/modules/diagnosticos/lib/template";

const leadSchema = z.object({
  nome: z.string().trim().min(2).max(100),
  instagram: z.string().trim().min(2).max(60),
  whatsapp: z.string().trim().min(8).max(20),
  email: z.string().trim().email().max(255),
  objetivo: z.string().trim().min(3).max(1000),
});

export const submitSiteLead = createServerFn({ method: "POST" })
  .inputValidator((d) => leadSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ig = data.instagram.trim().replace(/^@+/, "");

    // Owner of the site = owner of the diagnostics module
    const { data: page } = await supabaseAdmin.from("site_paginas").select("user_id").limit(1).maybeSingle();
    const ownerId = page?.user_id ?? null;

    let clienteId: string | null = null;
    if (ownerId) {
      try {
        const { data: existing } = await supabaseAdmin
          .from("diag_clientes").select("id")
          .eq("user_id", ownerId).ilike("instagram", ig).limit(1).maybeSingle();
        const row = { nome: data.nome, instagram: ig, whatsapp: data.whatsapp, email: data.email, objetivo: data.objetivo };
        if (existing?.id) {
          clienteId = existing.id;
          await supabaseAdmin.from("diag_clientes").update(row).eq("id", clienteId);
        } else {
          const { data: c } = await supabaseAdmin.from("diag_clientes")
            .insert({ ...row, user_id: ownerId }).select("id").single();
          clienteId = c?.id ?? null;
        }
        if (clienteId) {
          const { data: d } = await supabaseAdmin.from("diag_diagnosticos")
            .insert({ cliente_id: clienteId, user_id: ownerId }).select("id").single();
          if (d?.id) {
            const { data: cfg } = await supabaseAdmin.from("diag_configuracoes")
              .select("template_json").eq("user_id", ownerId).maybeSingle();
            const t = cfg?.template_json as TemplateItem[] | null;
            const tpl = Array.isArray(t) && t.length ? t : TEMPLATE_PADRAO;
            await supabaseAdmin.from("diag_itens").insert(
              tpl.map((x, i) => ({ ...x, diagnostico_id: d.id, ordem: i, status: "precisa_ajustes" })),
            );
          }
        }
      } catch (e) {
        console.error("lead -> diagnóstico falhou", e);
      }
    }

    const { error } = await supabaseAdmin.from("site_leads").insert({
      nome: data.nome,
      instagram: "@" + ig,
      whatsapp: data.whatsapp,
      email: data.email,
      objetivo: data.objetivo,
      mensagem: data.objetivo,
      cliente_id: clienteId,
    });
    if (error) throw new Error("Não foi possível enviar agora. Tente novamente.");
    return { ok: true };
  });
