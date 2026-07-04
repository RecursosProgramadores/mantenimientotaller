import { formatDate, formatDateLong } from "@/lib/format";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMantePro, getMachineAlertStatus, getMachineUsagePct } from "@/context/MantePro";
import { StatusBadge } from "@/components/StatusBadge";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Factory, Wrench, Store, CalendarClock, AlertTriangle, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — MantePro" },
      { name: "description", content: "Vista general de KPIs, estado de máquinas y mantenimientos." },
    ],
  }),
  component: Dashboard,
});

const STATUS_COLORS: Record<string, string> = {
  "Operativo": "var(--success)",
  "En Revisión": "var(--warning)",
  "En Taller": "var(--info)",
  "Fuera de Servicio": "var(--critical)",
};

function Kpi({ icon: Icon, label, value, hint, tone = "primary" }: { icon: any; label: string; value: string | number; hint?: string; tone?: "primary" | "info" | "warning" | "critical" }) {
  const toneMap = {
    primary: "bg-primary/15 text-primary",
    info: "bg-info/15 text-info",
    warning: "bg-warning/15 text-warning",
    critical: "bg-critical/15 text-critical",
  };
  return (
    <Card className="bg-card border-border hover:border-primary/40 transition-colors">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
            {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
          </div>
          <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${toneMap[tone]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Dashboard() {
  const { machines, records, types, allDocuments, usageCycles, notifications } = useMantePro();
  const recentDocs = allDocuments().sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)).slice(0, 5);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const in7 = new Date(now.getTime() + 7 * 86400000);
  const in30 = new Date(now.getTime() + 30 * 86400000);

  const totalMachines = machines.length;
  const thisMonth = records.filter((r) => new Date(r.date) >= monthStart && new Date(r.date) <= now).length;
  const inWorkshop = machines.filter((m) => m.status === "En Taller").length;
  const upcoming7 = records.filter((r) => {
    const d = new Date(r.date);
    return r.status === "Programado" && d >= now && d <= in7;
  }).length;

  const statusCounts = (["Operativo", "En Revisión", "En Taller", "Fuera de Servicio"] as const).map((s) => ({
    name: s,
    value: machines.filter((m) => m.status === s).length,
  }));

  const upcoming30 = records
    .filter((r) => r.status === "Programado" && new Date(r.date) >= now && new Date(r.date) <= in30)
    .sort((a, b) => a.date.localeCompare(b.date));

  const recent = [...records]
    .filter((r) => r.status !== "Programado")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 5);

  // Trend (last 6 months) mock derived
  const MES_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const trend = Array.from({ length: 6 }).map((_, i) => {
    const monthIdx = ((now.getMonth() - (5 - i)) % 12 + 12) % 12;
    const label = MES_SHORT[monthIdx];
    return {
      month: label,
      MTBF: 180 + Math.round(Math.sin(i) * 20 + i * 6),
      Disponibilidad: 88 + ((i * 1.3) % 8),
    };
  });

  // Usage alert counts
  const warningMachines = machines.filter((m) => {
    const c = usageCycles.find((x) => x.machineId === m.id);
    return getMachineAlertStatus(c, m.threshold) === "warning";
  });
  const criticalMachines = machines.filter((m) => {
    const c = usageCycles.find((x) => x.machineId === m.id);
    return getMachineAlertStatus(c, m.threshold) === "critical";
  });

  // Active unread alert notifications
  const activeAlerts = notifications
    .filter((n) => !n.read && (n.type === "warning" || n.type === "critical"))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);

  // Usage bar data (sorted: critical → warning → normal)
  const usageBarData = [...machines]
    .map((m) => {
      const c = usageCycles.find((x) => x.machineId === m.id);
      const pct = getMachineUsagePct(c, m.threshold);
      const status = getMachineAlertStatus(c, m.threshold);
      return { m, pct, status };
    })
    .sort((a, b) => {
      const order = { critical: 0, warning: 1, normal: 2 };
      return order[a.status] - order[b.status];
    });

  return (
    <AppShell title="Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={Factory} label="Total Máquinas" value={totalMachines} hint={`${machines.filter((m) => m.status === "Operativo").length} operativas`} />
        <Kpi icon={Wrench} label="Mantenimientos Este Mes" value={thisMonth} hint="Completados + en proceso" tone="info" />
        <Kpi icon={Store} label="En Taller" value={inWorkshop} hint="Servicio externo" tone="warning" />
        <Kpi icon={CalendarClock} label="Próximos MP (7 días)" value={upcoming7} hint="Mantenimientos programados" tone="critical" />
        <Kpi icon={AlertTriangle} label="Máquinas en Alerta" value={warningMachines.length} hint="Umbral parcialmente alcanzado" tone="warning" />
        <Kpi icon={AlertCircle} label="Umbral Superado" value={criticalMachines.length} hint="Mantenimiento inmediato" tone="critical" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="bg-card border-border lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Actividad reciente</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {recent.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">Sin actividad reciente.</div>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((r) => {
                  const m = machines.find((x) => x.id === r.machineId);
                  const t = types.find((x) => x.id === r.typeId);
                  return (
                    <li key={r.id} className="flex items-center gap-4 p-4">
                      <div className="grid h-9 w-9 place-items-center rounded-md bg-secondary text-primary shrink-0">
                        <Wrench className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">{t?.name ?? "Mantenimiento"}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          <span className="font-mono">{m?.code}</span> · {m?.name} · {r.technician}
                        </div>
                      </div>
                      <div className="text-right text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(r.date)}
                        <div className="text-foreground font-medium">{r.status}</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Estado de máquinas</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusCounts} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {statusCounts.map((s) => (
                    <Cell key={s.name} fill={STATUS_COLORS[s.name]} stroke="var(--card)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Próximos mantenimientos (30 días)</CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming30.length === 0 ? (
              <div className="text-sm text-muted-foreground">No hay mantenimientos programados.</div>
            ) : (
              <ol className="relative ml-3 border-l border-border space-y-4">
                {upcoming30.map((r) => {
                  const m = machines.find((x) => x.id === r.machineId);
                  const t = types.find((x) => x.id === r.typeId);
                  return (
                    <li key={r.id} className="pl-4 relative">
                      <span className="absolute -left-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                      <div className="text-xs text-muted-foreground">{formatDateLong(r.date)}</div>
                      <div className="text-sm font-medium">{t?.name}</div>
                      <div className="text-xs text-muted-foreground">
                        <span className="font-mono">{m?.code}</span> · {m?.name}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">MTBF & Disponibilidad (6 meses)</CardTitle>
          </CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis yAxisId="l" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis yAxisId="r" orientation="right" stroke="var(--muted-foreground)" fontSize={11} domain={[80, 100]} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="l" type="monotone" dataKey="MTBF" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="r" type="monotone" dataKey="Disponibilidad" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ── Usage Bar Widget ── */}
      <div className="mt-6">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">Uso Actual de Máquinas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {usageBarData.map(({ m, pct, status }) => (
                <div key={m.id} className="flex items-center gap-3">
                  <span className="font-mono text-xs text-muted-foreground w-16 shrink-0">{m.code}</span>
                  <span className="text-xs text-muted-foreground truncate w-36 shrink-0 hidden md:block">{m.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        status === "critical" ? "bg-red-500" :
                        status === "warning" ? "bg-amber-500" :
                        "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <span className={`text-xs font-mono w-10 text-right shrink-0 ${
                    status === "critical" ? "text-red-400" :
                    status === "warning" ? "text-amber-400" :
                    "text-green-400"
                  }`}>{pct}%</span>
                  <span className={`text-[10px] border rounded-full px-2 py-0.5 shrink-0 ${
                    status === "critical" ? "border-red-500/40 text-red-400" :
                    status === "warning" ? "border-amber-500/40 text-amber-400" :
                    "border-green-500/40 text-green-400"
                  }`}>
                    {status === "critical" ? "Crítico" : status === "warning" ? "Alerta" : "Normal"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Active Alerts Feed ── */}
      {activeAlerts.length > 0 && (
        <div className="mt-6">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" /> Alertas activas
              </CardTitle>
              <Link to="/notificaciones" className="text-xs text-primary hover:text-primary/80">Ver todas →</Link>
            </CardHeader>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {activeAlerts.map((n) => {
                  const machine = machines.find((m) => m.id === n.machineId);
                  return (
                    <li key={n.id} className="flex items-center gap-3 p-4">
                      {n.type === "critical"
                        ? <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                        : <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {machine && (
                            <span className="font-mono text-xs text-primary border border-border/50 bg-secondary/50 rounded px-1.5 py-0.5">
                              {machine.code}
                            </span>
                          )}
                          <span className="text-sm font-medium truncate">{n.title}</span>
                        </div>
                        <div className="text-xs text-muted-foreground truncate mt-0.5">{n.message}</div>
                      </div>
                      <a
                        href={`#/mantenimientos?machineId=${n.machineId}&typeId=t-correctivo&urgent=${n.type === "critical" ? "1" : "0"}`}
                        className={`inline-flex items-center justify-center h-7 shrink-0 rounded-md border px-3 text-xs font-medium transition-colors ${
                          n.type === "critical"
                            ? "border-red-500/40 text-red-400 hover:bg-red-500/10"
                            : "border-amber-500/40 text-amber-400 hover:bg-amber-500/10"
                        }`}
                      >
                        {n.type === "critical" ? "Crear OTM" : "Programar OTM"}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

    </AppShell>
  );
}
