import { type ReactNode, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Factory, Wrench, ClipboardList, Store,
  FileText, BarChart3, Settings, Bell, Search, Menu, User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useMantePro } from "@/context/MantePro";
import { toast } from "sonner";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/maquinas", label: "Máquinas", icon: Factory },
  { to: "/mantenimientos", label: "Mantenimientos", icon: Wrench },
  { to: "/tipos-mantenimiento", label: "Tipos de Mantenimiento", icon: ClipboardList },
  { to: "/talleres-externos", label: "Talleres Externos", icon: Store },
  { to: "/fichas-tecnicas", label: "Fichas Técnicas", icon: FileText },
  { to: "/reportes", label: "Reportes", icon: BarChart3 },
  { to: "/configuracion", label: "Configuración", icon: Settings },
] as const;

export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { machines, records, workshops, allDocuments } = useMantePro();
  const [q, setQ] = useState("");

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim()) return;
    const lc = q.toLowerCase();
    const mc = machines.filter((m) => m.code.toLowerCase().includes(lc) || m.name.toLowerCase().includes(lc)).length;
    const rc = records.filter((r) => r.notes.toLowerCase().includes(lc) || r.technician.toLowerCase().includes(lc)).length;
    const wc = workshops.filter((w) => w.name.toLowerCase().includes(lc)).length;
    const dc = allDocuments().filter((d) => d.name.toLowerCase().includes(lc)).length;
    toast(`Resultados: ${mc} máquinas · ${rc} mantenimientos · ${wc} talleres · ${dc} documentos`);
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-sidebar transition-all duration-200",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-border px-4">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground font-bold">
            M
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-bold tracking-tight">MantePro</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Industrial Maint.</div>
            </div>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {nav.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors mb-0.5",
                  active
                    ? "bg-primary/15 text-primary border-l-2 border-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={() => setCollapsed((c) => !c)}
          >
            <Menu className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Colapsar</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main */}
      <div className={cn("flex flex-1 flex-col min-w-0", collapsed ? "md:pl-16" : "md:pl-64")}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-semibold tracking-tight truncate">{title}</h1>
          <form onSubmit={onSearch} className="ml-auto hidden md:flex relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar máquinas, registros, talleres…"
              className="w-80 pl-8 bg-card border-border"
            />
          </form>
          <Button variant="ghost" size="icon" className="relative" onClick={() => toast("3 notificaciones nuevas")}>
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
          </Button>
          <div className="flex items-center gap-2 pl-2 border-l border-border">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-foreground">
              <User className="h-4 w-4" />
            </div>
            <div className="hidden sm:block leading-tight">
              <div className="text-sm font-medium">J. Mendoza</div>
              <div className="text-[11px] text-muted-foreground">Jefe de Mantenimiento</div>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
