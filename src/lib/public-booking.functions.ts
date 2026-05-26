import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Public endpoint: returns only date + time of booked slots within a month.
// No PII (no client name, procedure, amount, etc.).
export const getBookedSlots = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        year: z.number().int().min(2024).max(2100),
        month: z.number().int().min(1).max(12), // 1-12
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const start = new Date(Date.UTC(data.year, data.month - 1, 1));
    const end = new Date(Date.UTC(data.year, data.month, 1));
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    const { data: rows, error } = await supabaseAdmin
      .from("appointments")
      .select("date, time")
      .gte("date", fmt(start))
      .lt("date", fmt(end));

    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      date: r.date as string,
      time: (r.time as string | null) ?? null,
    }));
  });
