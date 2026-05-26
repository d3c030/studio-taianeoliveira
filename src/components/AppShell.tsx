import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { Home, CalendarDays, Receipt, LogOut, Users, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

const navItems = [
  { to: "/", label: "Início", icon: Home },
  { to: "/atendimentos", label: "Atendimentos", icon: CalendarDays },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/custos", label: "Custos", icon: Receipt },
  { to: "/usuarios", label: "Usuários", icon: Shield },
] as const;

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

  const [authState, setAuthState] = useState<"loading" | "in" | "out">("loading");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthState(session ? "in" : "out");
    });
    supabase.auth.getSession().then(({ data }) => {
      setAuthState(data.session ? "in" : "out");
    });
    return () => subscription.unsubscribe();
  }, []);

  // Login page renders standalone
  if (pathname === "/login") return <Outlet />;

  if (authState === "loading") {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Carregando…</div>;
  }
  if (authState === "out") {
    if (typeof window !== "undefined") navigate({ to: "/login", replace: true });
    return null;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 flex-col border-r border-border bg-sidebar p-6">
        <div className="mb-10 flex justify-center">
          <img
            src={logo}
            alt="Studio Taiane Oliveira — Sobrancelhas e Piercing"
            className="w-44 h-auto"
          />
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive(to)
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="mt-auto flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur px-4 py-3">
        <div className="w-9" />
        <img
          src={logo}
          alt="Studio Taiane Oliveira — Sobrancelhas e Piercing"
          className="h-14 w-auto"
        />
        <button
          onClick={handleLogout}
          aria-label="Sair"
          className="h-9 w-9 flex items-center justify-center rounded-full text-muted-foreground hover:bg-accent"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </header>

      {/* Main */}
      <main className="md:ml-64 pb-24 md:pb-10">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur">
        <div className="grid grid-cols-4">
          {navItems.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center justify-center gap-1 py-3 text-xs font-medium transition-colors",
                isActive(to) ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
