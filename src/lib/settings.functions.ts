import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ContactSettings = {
  id: string | null;
  instagram_url: string;
  whatsapp_phone: string;
  logo_url: string;
};

// Public: anyone can read contact info (used on /agendar pages).
export const getContactSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<ContactSettings> => {
    const { data, error } = await supabaseAdmin
      .from("contact_settings")
      .select("id, instagram_url, whatsapp_phone, logo_url")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      id: (data?.id as string | undefined) ?? null,
      instagram_url: (data?.instagram_url as string | undefined) ?? "",
      whatsapp_phone: (data?.whatsapp_phone as string | undefined) ?? "",
      logo_url: (data?.logo_url as string | undefined) ?? "",
    };
  },
);

// Authenticated: upsert single contact_settings row.
export const updateContactSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        instagram_url: z
          .string()
          .trim()
          .max(255)
          .url({ message: "URL inválida" })
          .or(z.literal("")),
        whatsapp_phone: z
          .string()
          .trim()
          .max(20)
          .regex(/^[0-9]*$/, "Apenas dígitos (com DDI e DDD)"),
        logo_url: z.string().trim().max(500).url().or(z.literal("")).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: existing } = await supabase
      .from("contact_settings")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const patch: {
      instagram_url: string;
      whatsapp_phone: string;
      logo_url?: string;
    } = {
      instagram_url: data.instagram_url,
      whatsapp_phone: data.whatsapp_phone,
    };
    if (data.logo_url !== undefined) patch.logo_url = data.logo_url;

    if (existing?.id) {
      const { error } = await supabase
        .from("contact_settings")
        .update(patch)
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("contact_settings").insert(patch);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });
