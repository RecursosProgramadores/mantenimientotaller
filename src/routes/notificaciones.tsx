import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useMantePro, type AppNotification } from "@/context/MantePro";
import {
  AlertTriangle, AlertCircle, Clock, CheckCircle, Trash2, Bell,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/notificaciones")({
  head: () => ({
    meta: [
      { title: "Notificaciones — MantePro" },
      { name: "description", content: "Centro de notificaciones de alertas y recordatorios de mantenimiento." },
    ],
  }),
  component: NotificacionesPage,
});

type TabKey = "all" | "unread" | "alerts" | "reminders" | "completed";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "unread", label: "No leídas" },
  { key: "alerts", label: "Alertas" },
  { key: "reminders", label: "Recordatorios" },
  { key: "completed", label: "Completadas" },
];

function typeLabel(type: AppNotification["type"]): string {
  if (type === "critical") return "Crítico";
  if (type === "warning") return "Alerta";
  if (type === "reminder") return "Recordatorio";
  return "Completado";
}

function NotifIcon({ type, size = "md" }: { type: AppNotification["type"]; size?: "sm" | "md" }) {
  const cls = size === "md" ? "h-9 w-9" : "h-5 w-5";
  const wrap = size === "md" ? "flex h-10 w-10 items-center justify-center rounded-xl" : "flex";
  if (type === "critical")
    return <div className={`${wrap} bg-critical/10`}><AlertCircle className={`${cls} text-critical`} /></div>;
  if (type === "warning")
    return <div className={`${wrap} bg-warning/10`}><AlertTriangle className={`${cls} text-warning`} /></div>;
  if (type === "reminder")
    return <div className={`${wrap} bg-info/10`}><Clock className={`${cls} text-info`} /></div>;
  return <div className={`${wrap} bg-success/10`}><CheckCircle className={`${cls} text-success`} /></div>;
}

function borderColor(type: AppNotification["type"]): string {
  if (type === "critical") return "border-l-critical";
  if (type === "warning") return "border-l-warning";
  if (type === "reminder") return "border-l-info";
  return "border-l-success";
}

// Los valores de actionType son los del enum `notification_action` en la
// base de datos (crear_otm / programar_otm / ver_historial) — antes esta
// función comparaba contra otros strings ("create-urgent-otm", etc.) que
// nunca llegaban a coincidir con lo que realmente guarda la base de datos,
// así que el botón de acción nunca se mostraba en las alertas automáticas.
function actionLabel(type: AppNotification["type"], actionType?: string): string {
  if (actionType === "crear_otm") return "Crear OTM urgente";
  if (actionType === "programar_otm") return "Programar OTM";
  if (actionType === "ver_historial") return "Ver historial";
  return "";
}

function fmtTs(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-ES", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

function NotificacionesPage() {
  const { notifications, machines, markNotificationRead, markAllRead, deleteNotification } = useMantePro();
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = notifications
    .filter((n) => {
      if (activeTab === "unread") return !n.read;
      if (activeTab === "alerts") return n.type === "warning" || n.type === "critical";
      if (activeTab === "reminders") return n.type === "reminder";
      if (activeTab === "completed") return n.type === "reset";
      return true;
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const markSelectedRead = () => {
    selected.forEach((id) => markNotificationRead(id));
    setSelected(new Set());
    toast.success("Notificaciones marcadas como leídas");
  };

  const deleteRead = () => {
    notifications.filter((n) => n.read).forEach((n) => deleteNotification(n.id));
    toast.success("Notificaciones leídas eliminadas");
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AppShell title="Notificaciones">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold">Centro de Notificaciones</h1>
          {unreadCount > 0 && (
            <span className="rounded-full bg-critical/10 px-2.5 py-0.5 text-xs font-semibold text-critical">
              {unreadCount} sin leer
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              <CheckCircle className="h-4 w-4 mr-1" /> Marcar todo leído
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={deleteRead} className="text-muted-foreground">
            <Trash2 className="h-4 w-4 mr-1" /> Eliminar leídas
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border mb-5">
        {TABS.map((tab) => {
          const count = notifications.filter((n) => {
            if (tab.key === "unread") return !n.read;
            if (tab.key === "alerts") return n.type === "warning" || n.type === "critical";
            if (tab.key === "reminders") return n.type === "reminder";
            if (tab.key === "completed") return n.type === "reset";
            return true;
          }).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "px-4 py-2 text-sm transition-colors border-b-2 -mb-px",
                activeTab === tab.key
                  ? "border-primary text-primary font-medium"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
              {count > 0 && (
                <span className="ml-1.5 rounded-full bg-secondary px-1.5 py-0.5 text-[10px]">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-lg bg-primary/10 border border-primary/20 px-4 py-2">
          <span className="text-sm text-muted-foreground">{selected.size} seleccionadas</span>
          <Button size="sm" variant="ghost" onClick={markSelectedRead}>Marcar leídas</Button>
          <Button
            size="sm" variant="ghost"
            className="text-critical"
            onClick={() => { selected.forEach((id) => deleteNotification(id)); setSelected(new Set()); }}
          >
            Eliminar seleccionadas
          </Button>
        </div>
      )}

      {/* Notifications list */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">
          <Bell className="mx-auto h-10 w-10 mb-3 opacity-30" />
          <div className="font-medium">Sin notificaciones</div>
          <div className="text-sm mt-1">No hay notificaciones en esta categoría</div>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const machine = machines.find((m) => m.id === n.machineId);
            const isSelected = selected.has(n.id);
            const action = actionLabel(n.type, n.actionType);
            return (
              <div
                key={n.id}
                className={cn(
                  "flex gap-4 rounded-lg border border-l-4 p-4 transition-all",
                  borderColor(n.type),
                  !n.read ? "bg-primary/[0.03] border-border" : "bg-card border-border/50 opacity-70",
                  isSelected && "ring-1 ring-primary/40",
                )}
              >
                {/* Select checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(n.id)}
                  className="mt-1 h-4 w-4 rounded border-border shrink-0 cursor-pointer accent-primary"
                />

                {/* Icon */}
                <NotifIcon type={n.type} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          "text-sm font-semibold",
                          n.type === "critical" ? "text-critical"
                          : n.type === "warning" ? "text-warning"
                          : n.type === "reminder" ? "text-info"
                          : "text-success",
                        )}>
                          {n.title}
                        </span>
                        <span className="rounded border border-border/50 bg-secondary/50 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {typeLabel(n.type)}
                        </span>
                        {!n.read && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{n.message}</p>
                    </div>
                    {/* Timestamp */}
                    <span className="text-[11px] text-muted-foreground/60 whitespace-nowrap">{fmtTs(n.createdAt)}</span>
                  </div>

                  {/* Machine link + actions */}
                  <div className="mt-3 flex items-center gap-3 flex-wrap">
                    {machine && (
                      <Link
                        to="/maquinas/$id"
                        params={{ id: machine.id }}
                        onClick={() => markNotificationRead(n.id)}
                        className="flex items-center gap-1.5 rounded-md border border-border/60 bg-secondary/60 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span className="font-mono text-primary">{machine.code}</span>
                        <span className="truncate max-w-[140px]">{machine.name}</span>
                      </Link>
                    )}
                    {action && (
                      <Link
                        to="/mantenimientos"
                        search={{ machineId: n.machineId, typeId: "t-correctivo", urgent: n.type === "critical" ? "1" : "0" }}
                        className={cn(
                          "inline-flex items-center justify-center rounded-md border h-7 px-3 text-xs font-medium transition-colors",
                          n.type === "critical" && "border-critical/40 text-critical hover:bg-critical/10",
                          n.type === "warning" && "border-warning/40 text-warning hover:bg-warning/10",
                          n.type === "reminder" && "border-info/40 text-info hover:bg-info/10",
                        )}
                        onClick={() => markNotificationRead(n.id)}
                      >
                        {action}
                      </Link>
                    )}
                    <button
                      onClick={() => markNotificationRead(n.id)}
                      className="ml-auto text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Marcar leída
                    </button>
                    <button
                      onClick={() => deleteNotification(n.id)}
                      className="text-muted-foreground hover:text-critical transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
