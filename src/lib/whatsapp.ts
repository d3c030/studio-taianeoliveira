// WhatsApp helpers — normalize Brazilian numbers and build wa.me URLs.

import type { Appointment } from "@/lib/data";
import { formatDateBR } from "@/lib/format";

const DEFAULT_TEMPLATE =
  "Olá {cliente}! Passando para confirmar seu atendimento ({procedimento}) no dia {data} às {hora}. Studio Taiane Oliveira 💖";

/** Strip non-digits and ensure Brazilian country code (55). Returns "" when invalid. */
export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return "";
  let digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  // Already with country code
  if (digits.startsWith("55") && digits.length >= 12 && digits.length <= 13) return digits;
  // DDD + número (10 or 11 dígitos) → prefix 55
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  // Already 12-13 with another country code: keep as-is
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return "";
}

export function isValidPhone(raw: string | null | undefined): boolean {
  return normalizePhone(raw).length >= 11;
}

export function renderTemplate(
  template: string | null | undefined,
  appt: Pick<Appointment, "client_name" | "date" | "time" | "procedure">,
): string {
  const tpl = (template ?? "").trim() || DEFAULT_TEMPLATE;
  const time = appt.time ? String(appt.time).slice(0, 5) : "—";
  return tpl
    .replaceAll("{cliente}", appt.client_name || "")
    .replaceAll("{data}", formatDateBR(appt.date))
    .replaceAll("{hora}", time)
    .replaceAll("{procedimento}", appt.procedure || "atendimento");
}

export function buildWhatsAppUrl(
  phone: string | null | undefined,
  message: string,
): string | null {
  const num = normalizePhone(phone);
  if (!num) return null;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

export function whatsappFor(
  appt: Pick<Appointment, "client_name" | "date" | "time" | "procedure">,
  phone: string | null | undefined,
  template: string | null | undefined,
): string | null {
  return buildWhatsAppUrl(phone, renderTemplate(template, appt));
}
