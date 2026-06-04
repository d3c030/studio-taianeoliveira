import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const THEMES = ["rosa", "azul", "preto", "branco"] as const;
export type ThemeName = (typeof THEMES)[number];

export type ContactSettings = {
  id: string | null;
  instagram_url: string;
  whatsapp_phone: string;
  logo_url: string;
  theme: ThemeName;
  pix_key: string;
  pix_copia_cola: string;
  pix_qr_url: string;
  whatsapp_message_template: string;
};

const isTheme = (v: unknown): v is ThemeName =>
  typeof v === "string" && (THEMES as readonly string[]).includes(v);

export type PublicContactSettings = Pick<
  ContactSettings,
  "instagram_url" | "whatsapp_phone" | "logo_url" | "theme" | "whatsapp_message_template"
>;

/**
 * Public, anonymous-safe contact info for booking pages and the global theme.
 * Excludes PIX credentials. Uses supabaseAdmin to bypass RLS (which now
 * restricts SELECT on contact_settings to authenticated users).
 */
export const getPublicContactSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicContactSettings> => {
    const { data, error } = await supabaseAdmin
      .from("contact_settings")
      .select("instagram_url, whatsapp_phone, logo_url, theme, whatsapp_message_template")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      instagram_url: (data?.instagram_url as string | undefined) ?? "",
      whatsapp_phone: (data?.whatsapp_phone as string | undefined) ?? "",
      logo_url: (data?.logo_url as string | undefined) ?? "",
      theme: isTheme(data?.theme) ? (data!.theme as ThemeName) : "rosa",
      whatsapp_message_template: (data?.whatsapp_message_template as string | undefined) ?? "",
    };
  },
);

/**
 * Full contact settings including PIX. Requires authentication.
 */
export const getContactSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ContactSettings> => {
    const { supabase } = context;
    const { data, error } = await supabase
      .from("contact_settings")
      .select("id, instagram_url, whatsapp_phone, logo_url, theme, pix_key, pix_copia_cola, pix_qr_url, whatsapp_message_template")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      id: (data?.id as string | undefined) ?? null,
      instagram_url: (data?.instagram_url as string | undefined) ?? "",
      whatsapp_phone: (data?.whatsapp_phone as string | undefined) ?? "",
      logo_url: (data?.logo_url as string | undefined) ?? "",
      theme: isTheme(data?.theme) ? (data!.theme as ThemeName) : "rosa",
      pix_key: (data?.pix_key as string | undefined) ?? "",
      pix_copia_cola: (data?.pix_copia_cola as string | undefined) ?? "",
      pix_qr_url: (data?.pix_qr_url as string | undefined) ?? "",
      whatsapp_message_template: (data?.whatsapp_message_template as string | undefined) ?? "",
    };
  });

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
        theme: z.enum(THEMES).optional(),
        pix_key: z.string().trim().max(255).optional(),
        pix_copia_cola: z.string().trim().max(2000).optional(),
        pix_qr_url: z.string().trim().max(500).url().or(z.literal("")).optional(),
        whatsapp_message_template: z.string().trim().max(1000).optional(),
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
      theme?: ThemeName;
      pix_key?: string;
      pix_copia_cola?: string;
      pix_qr_url?: string;
      whatsapp_message_template?: string;
    } = {
      instagram_url: data.instagram_url,
      whatsapp_phone: data.whatsapp_phone,
    };
    if (data.logo_url !== undefined) patch.logo_url = data.logo_url;
    if (data.theme !== undefined) patch.theme = data.theme;
    if (data.pix_key !== undefined) patch.pix_key = data.pix_key;
    if (data.pix_copia_cola !== undefined) patch.pix_copia_cola = data.pix_copia_cola;
    if (data.pix_qr_url !== undefined) patch.pix_qr_url = data.pix_qr_url;
    if (data.whatsapp_message_template !== undefined) patch.whatsapp_message_template = data.whatsapp_message_template;

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
