import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const s = (n: number) => z.string().trim().max(n).optional().nullable();
const schema = z.object({
  pagina: z.string().trim().min(1).max(160),
  referrer: s(300),
  utm_source: s(100),
  utm_medium: s(100),
  utm_campaign: s(100),
  dispositivo: z.enum(["mobile", "tablet", "desktop"]).optional().nullable(),
});

// Public: records an anonymous site visit/event (no personal data).
export const trackSite = createServerFn({ method: "POST" })
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("site_acessos").insert(data);
    } catch (e) {
      console.error("trackSite", e);
    }
    return { ok: true };
  });
