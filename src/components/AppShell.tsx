import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Home, CalendarDays, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

const navItems = [
  { to: "/", label: "Início", icon: Home },
  { to: "/atendimentos", label: "Atendimentos", icon: CalendarDays },
  { to: "/custos", label: "Custos", icon: Receipt },
] as const;

export function AppShell() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (to: string) => (to === "/" ? pathname === "/" : pathname.startsWith(to));

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
        <div className="mt-auto text-xs text-muted-foreground">
          Gestão completa do estúdio
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-center border-b border-border bg-background/95 backdrop-blur px-4 py-3">
        <img
          src={logo}
          alt="Studio Taiane Oliveira — Sobrancelhas e Piercing"
          className="h-14 w-auto"
        />
      </header>

      {/* Main */}
      <main className="md:ml-64 pb-24 md:pb-10">
        <div className="max-w-5xl mx-auto px-4 md:px-8 py-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur">
        <div className="grid grid-cols-3">
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
