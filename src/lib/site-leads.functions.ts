import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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
    const { error } = await supabaseAdmin.from("site_leads").insert({
      nome: data.nome,
      instagram: data.instagram.replace(/^@?/, "@"),
      whatsapp: data.whatsapp,
      email: data.email,
      objetivo: data.objetivo,
      mensagem: data.objetivo,
    });
    if (error) throw new Error("Não foi possível enviar agora. Tente novamente.");
    return { ok: true };
  });
