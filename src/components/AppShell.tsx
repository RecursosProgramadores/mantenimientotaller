import { type ReactNode, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Factory, Wrench, ClipboardList, Store,
  FileText, BarChart3, Settings, Search, Menu, User, Timer, Bell, ChevronDown, LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMantePro } from "@/context/MantePro";
import { NotificationBell } from "@/components/NotificationBell";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { toast } from "sonner";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/maquinas", label: "Máquinas", icon: Factory },
  { to: "/mantenimientos", label: "Mantenimientos", icon: Wrench },
  { to: "/uso-maquinas", label: "Uso de Máquinas", icon: Timer },
  { to: "/tipos-mantenimiento", label: "Tipos de Mantenimiento", icon: ClipboardList },
  { to: "/talleres-externos", label: "Talleres Externos", icon: Store },
  { to: "/fichas-tecnicas", label: "Fichas Técnicas", icon: FileText },
  { to: "/reportes", label: "Reportes", icon: BarChart3 },
  { to: "/notificaciones", label: "Notificaciones", icon: Bell },
  { to: "/configuracion", label: "Configuración", icon: Settings },
] as const;

export function AppShell({ children, title }: { children: ReactNode; title: string }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { machines, records, workshops, allDocuments, notifications, settings } = useMantePro();
  const { user, logout } = useAuth();
  const [q, setQ] = useState("");

  const unreadCount = notifications.filter((n) => !n.read).length;

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
    <ProtectedRoute>
      <div className="flex min-h-screen w-full bg-background text-foreground">
        {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-sidebar transition-all duration-200 print:hidden",
          collapsed ? "w-16" : "w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b border-border px-4">
          {settings?.institutionLogo ? (
            <img src={settings.institutionLogo} alt="Logo" className="h-9 w-9 shrink-0 rounded-md object-cover border border-border" />
          ) : (
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground font-bold">
              {settings?.institutionName ? settings.institutionName.charAt(0).toUpperCase() : 'M'}
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-bold tracking-tight truncate" title={settings?.institutionName || "MantePro"}>
                {settings?.institutionName || "MantePro"}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Industrial Maint.</div>
            </div>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {nav.map((item) => {
            const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(item.to));
            const Icon = item.icon;
            const isNotif = item.to === "/notificaciones";
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
                {!collapsed && (
                  <span className="flex-1 truncate">{item.label}</span>
                )}
                {/* Unread badge on Notifications sidebar item */}
                {isNotif && unreadCount > 0 && !collapsed && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[9px] font-semibold text-destructive-foreground">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
                {isNotif && unreadCount > 0 && collapsed && (
                  <span className="absolute left-8 top-1 h-2 w-2 rounded-full bg-destructive" />
                )}
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
      <div className={cn("flex flex-1 flex-col min-w-0 print:m-0 print:p-0", collapsed ? "md:pl-16" : "md:pl-64")}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur md:px-6 print:hidden">
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
          {/* Theme toggle */}
          <ThemeToggle />
          {/* Functional notification bell */}
          <NotificationBell />
          <div className="flex items-center pl-2 border-l border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 px-2 flex items-center gap-2 hover:bg-secondary outline-none">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary font-semibold text-xs shrink-0">
                    {user?.name?.substring(0, 2).toUpperCase() || "US"}
                  </div>
                  <div className="hidden sm:block text-left leading-tight">
                    <div className="text-sm font-medium">{user?.name || "Usuario"}</div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground ml-1 hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal flex items-center gap-3 py-2.5 px-2">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary font-semibold text-xs shrink-0">
                    {user?.name?.substring(0, 2).toUpperCase() || "US"}
                  </div>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none text-foreground">{user?.name}</p>
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary w-fit">
                      {user?.role}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="py-2 cursor-not-allowed">
                  <User className="mr-2 h-4 w-4" />
                  <span>Mi perfil (Próximamente)</span>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="py-2 cursor-pointer">
                  <Link to="/configuracion">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configuración</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="py-2 cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
    </ProtectedRoute>
  );
}
