import { trackSite } from "@/lib/site-track.functions";

const sent = new Set<string>();

function base() {
  const p = new URLSearchParams(window.location.search);
  const w = window.innerWidth;
  let referrer = document.referrer || null;
  try { if (referrer && new URL(referrer).host === window.location.host) referrer = null; } catch { /* ignore */ }
  return {
    referrer,
    utm_source: p.get("utm_source"),
    utm_medium: p.get("utm_medium"),
    utm_campaign: p.get("utm_campaign"),
    dispositivo: (w < 768 ? "mobile" : w < 1024 ? "tablet" : "desktop") as "mobile" | "tablet" | "desktop",
  };
}

/** Sends one event per page load per key (visita, secao:x, clique:y). */
/** Devices that ever logged into the panel (team) are never counted. */
function isStaffDevice() {
  try {
    if (localStorage.getItem("site_staff") === "1") return true;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) || "";
      if (k.startsWith("sb-") && k.endsWith("-auth-token")) {
        localStorage.setItem("site_staff", "1");
        return true;
      }
    }
  } catch { /* ignore */ }
  return false;
}

export function track(pagina: string) {
  if (typeof window === "undefined" || sent.has(pagina)) return;
  if (isStaffDevice()) return;
  sent.add(pagina);
  trackSite({ data: { pagina: pagina.slice(0, 160), ...base() } }).catch(() => {});
}

/** Wires visit, section views and button/link clicks for the landing page. */
export function startLandingTracking(root: HTMLElement) {
  track("visita");
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting && e.target.id) track(`secao:${e.target.id}`);
  }, { threshold: 0.35 });
  root.querySelectorAll("[id]").forEach((el) => io.observe(el));
  const onClick = (ev: MouseEvent) => {
    const el = (ev.target as HTMLElement)?.closest("a,button") as HTMLElement | null;
    if (!el) return;
    const href = el.getAttribute("href") || "";
    let label = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60);
    if (/wa\.me|whatsapp/i.test(href)) label = "WhatsApp";
    else if (/linktr\.ee/i.test(href)) label = "Linktree";
    else if (/instagram\.com/i.test(href)) label = "Instagram";
    if (label) track(`clique:${label}`);
  };
  root.addEventListener("click", onClick);
  return () => { io.disconnect(); root.removeEventListener("click", onClick); };
}
