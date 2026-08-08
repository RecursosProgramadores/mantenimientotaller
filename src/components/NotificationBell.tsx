import { useState, useRef, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, AlertTriangle, AlertCircle, Clock, CheckCircle, X } from "lucide-react";
import { useMantePro, type AppNotification } from "@/context/MantePro";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "ahora mismo";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days}d`;
}

function NotifIcon({ type }: { type: AppNotification["type"] }) {
  if (type === "critical")
    return <AlertCircle className="h-4 w-4 text-critical shrink-0" />;
  if (type === "warning")
    return <AlertTriangle className="h-4 w-4 text-warning shrink-0" />;
  if (type === "reminder")
    return <Clock className="h-4 w-4 text-info shrink-0" />;
  return <CheckCircle className="h-4 w-4 text-success shrink-0" />;
}

function dotClass(type: AppNotification["type"]): string {
  if (type === "critical") return "bg-critical";
  if (type === "warning") return "bg-warning";
  if (type === "reminder") return "bg-info";
  return "bg-success";
}

export function NotificationBell() {
  const { notifications, markNotificationRead, markAllRead, deleteNotification, machines } = useMantePro();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.read).length;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const recent = [...notifications]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);

  const handleClick = (n: AppNotification) => {
    markNotificationRead(n.id);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-md transition-colors",
          open ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
        )}
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 z-50 w-[380px] rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-foreground">
              Notificaciones
              {unread > 0 && (
                <span className="ml-2 rounded-full bg-critical/10 px-2 py-0.5 text-[10px] font-medium text-critical">
                  {unread} sin leer
                </span>
              )}
            </span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Marcar todo leído
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto divide-y divide-border/50">
            {recent.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Bell className="mx-auto h-6 w-6 mb-2 opacity-30" />
                Sin notificaciones
              </div>
            ) : (
              recent.map((n) => {
                const machine = machines.find((m) => m.id === n.machineId);
                return (
                  <div
                    key={n.id}
                    className={cn(
                      "group flex gap-3 px-4 py-3 transition-colors hover:bg-secondary/60 cursor-pointer",
                      !n.read && "bg-primary/[0.03]",
                    )}
                    onClick={() => handleClick(n)}
                  >
                    {/* Icon */}
                    <div className="mt-0.5">
                      <NotifIcon type={n.type} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={cn("text-xs font-medium leading-tight", n.read ? "text-muted-foreground" : "text-foreground")}>
                          {n.title}
                        </p>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                      <div className="mt-1.5 flex items-center gap-2">
                        {machine && (
                          <span className="rounded border border-border/60 bg-secondary/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                            {machine.code}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/60">{timeAgo(n.createdAt)}</span>
                        {!n.read && (
                          <span className={`ml-auto h-1.5 w-1.5 rounded-full ${dotClass(n.type)}`} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border px-4 py-2.5">
            <Link
              to="/notificaciones"
              onClick={() => setOpen(false)}
              className="block text-center text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Ver todas las notificaciones →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
