import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, CalendarDays, Receipt, LogOut, Users, Shield, CalendarCheck, Settings, Sparkles, ClipboardCheck, Globe, BarChart3, Menu as MenuIcon, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { getContactSettings } from "@/lib/settings.functions";
import defaultLogo from "@/assets/logo.png";

const navItems = [
  { to: "/", label: "Início", icon: Home },
  { to: "/agenda", label: "Agenda e Clientes", icon: CalendarCheck },
  { to: "/custos", label: "Custos", icon: Receipt },
  { to: "/diagnosticos", label: "Diagnósticos", icon: ClipboardCheck },
  { to: "/site", label: "Site", icon: Globe },
  { to: "/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  const [authState, setAuthState] = useState<"loading" | "in" | "out">("loading");

  const settingsQ = useQuery({
    queryKey: ["public-contact-settings"],
    queryFn: () => getContactSettings(),
    enabled: authState === "in",
  });
  const logo = settingsQ.data?.logo_url || defaultLogo;

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((e, session) => {
      if (!session) setAuthState("out");
      else if (e === "SIGNED_IN") {
        supabase.auth.getUser().then(({ data, error }) => setAuthState(!error && data.user ? "in" : "out"));
      }
    });
    // Valida a sessão no servidor (não confia só no que está salvo no aparelho)
    supabase.auth.getUser().then(({ data, error }) => {
      setAuthState(!error && data.user ? "in" : "out");
    });
    return () => subscription.unsubscribe();
  }, []);

  // Public pages render standalone (no admin shell, no auth required)
  const isPublic = pathname === "/login" || pathname === "/agendar" || pathname.startsWith("/agendar/") || pathname.startsWith("/pdf/");
  if (isPublic) return <Outlet />;

  if (authState === "loading") {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Carregando…</div>;
  }
  if (authState === "out") {
    if (typeof window !== "undefined") navigate({ to: "/agendar", replace: true });
    return null;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  return <Shell logo={logo} isActive={isActive} pathname={pathname} onLogout={handleLogout} />;
}

const GROUPS: { titulo: string; itens: readonly string[] }[] = [
  { titulo: "Studio", itens: ["/", "/agenda", "/custos"] },
  { titulo: "Consultoria", itens: ["/diagnosticos", "/site", "/relatorios"] },
  { titulo: "Sistema", itens: ["/configuracoes"] },
];
const BOTTOM = ["/", "/agenda", "/diagnosticos", "/site"] as const;
const item = (to: string) => navItems.find((n) => n.to === to)!;

function NavList({ isActive, collapsed, onNavigate }: { isActive: (to: string) => boolean; collapsed?: boolean; onNavigate?: () => void }) {
  return (
    <div className="space-y-5">
      {GROUPS.map((g) => (
        <div key={g.titulo}>
          {!collapsed && <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{g.titulo}</p>}
          <div className="flex flex-col gap-0.5">
            {g.itens.map((to) => {
              const { label, icon: Icon } = item(to);
              return (
                <Link key={to} to={to} onClick={onNavigate} title={collapsed ? label : undefined}
                  className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    collapsed && "justify-center px-0",
                    isActive(to) ? "bg-primary text-primary-foreground shadow-sm" : "text-sidebar-foreground hover:bg-sidebar-accent")}>
                  <Icon className="h-4 w-4 shrink-0" />{!collapsed && <span className="truncate">{label}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function Shell({ logo, isActive, pathname, onLogout }: { logo: string; isActive: (to: string) => boolean; pathname: string; onLogout: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => { setCollapsed(localStorage.getItem("menu-recolhido") === "1"); }, []);
  const toggle = () => setCollapsed((c) => { localStorage.setItem("menu-recolhido", c ? "0" : "1"); return !c; });
  const atual = navItems.find((n) => isActive(n.to))?.label ?? "";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className={cn("fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-border bg-sidebar transition-[width] duration-200 lg:flex", collapsed ? "w-[72px]" : "w-60")}>
        <div className={cn("flex h-16 shrink-0 items-center gap-3 border-b border-border", collapsed ? "justify-center px-2" : "px-4")}>
          <img src={logo} alt="Studio Taiane Oliveira" className="h-10 w-10 shrink-0 rounded-full object-cover" />
          {!collapsed && <span className="min-w-0 truncate font-display text-base">Taiane Oliveira</span>}
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4"><NavList isActive={isActive} collapsed={collapsed} /></nav>
        <div className="shrink-0 space-y-0.5 border-t border-border p-3">
          <button onClick={toggle} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent", collapsed && "justify-center px-0")} title="Recolher menu">
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <><PanelLeftClose className="h-4 w-4" />Recolher</>}
          </button>
          <button onClick={onLogout} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive hover:bg-destructive/10", collapsed && "justify-center px-0")} title="Sair">
            <LogOut className="h-4 w-4" />{!collapsed && "Sair"}
          </button>
        </div>
      </aside>

      {/* Mobile/tablet top bar */}
      <header className="sticky top-0 z-30 grid h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-background/95 px-3 backdrop-blur lg:hidden">
        <button onClick={() => setOpen(true)} aria-label="Abrir menu" className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-accent"><MenuIcon className="h-5 w-5" /></button>
        <div className="flex min-w-0 items-center gap-2">
          <img src={logo} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
          <span className="truncate font-display text-base">{atual}</span>
        </div>
        <button onClick={onLogout} aria-label="Sair" className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-accent"><LogOut className="h-4 w-4" /></button>
      </header>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex w-72 flex-col p-0">
          <SheetHeader className="flex-row items-center gap-3 border-b border-border p-4 text-left">
            <img src={logo} alt="" className="h-10 w-10 rounded-full object-cover" />
            <SheetTitle className="font-display text-base font-normal">Taiane Oliveira</SheetTitle>
          </SheetHeader>
          <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4"><NavList isActive={isActive} onNavigate={() => setOpen(false)} /></nav>
          <div className="border-t border-border p-3">
            <button onClick={onLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10"><LogOut className="h-4 w-4" />Sair da conta</button>
          </div>
        </SheetContent>
      </Sheet>

      <main className={cn("pb-24 transition-[margin] duration-200 lg:pb-10", collapsed ? "lg:ml-[72px]" : "lg:ml-60")}>
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8"><Outlet /></div>
      </main>

      {/* Mobile/tablet bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {BOTTOM.map((to) => {
            const { label, icon: Icon } = item(to);
            return (
              <Link key={to} to={to} className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium", isActive(to) ? "text-primary" : "text-muted-foreground")}>
                <Icon className="h-5 w-5" /><span className="max-w-full truncate px-1">{label}</span>
              </Link>
            );
          })}
          <button onClick={() => setOpen(true)} className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground">
            <MenuIcon className="h-5 w-5" /><span>Mais</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
