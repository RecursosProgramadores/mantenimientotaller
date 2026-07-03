import { formatDate, formatDateLong } from "@/lib/format";
import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMantePro } from "@/context/MantePro";
import { StatusBadge } from "@/components/StatusBadge";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { Factory, Wrench, Store, CalendarClock } from "lucide-react";

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
  const { machines, records, types, allDocuments } = useMantePro();
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

  return (
    <AppShell title="Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Factory} label="Total Máquinas" value={totalMachines} hint={`${machines.filter((m) => m.status === "Operativo").length} operativas`} />
        <Kpi icon={Wrench} label="Mantenimientos Este Mes" value={thisMonth} hint="Completados + en proceso" tone="info" />
        <Kpi icon={Store} label="Máquinas en Taller" value={inWorkshop} hint="Servicio externo" tone="warning" />
        <Kpi icon={CalendarClock} label="Próximos MP (7 días)" value={upcoming7} hint="Mantenimientos programados" tone="critical" />
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

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Documentos recientes</CardTitle></CardHeader>
          <CardContent className="p-0">
            {recentDocs.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">Sin documentos subidos.</div>
            ) : (
              <ul className="divide-y divide-border">
                {recentDocs.map((d) => {
                  const m = machines.find((x) => x.id === d.machineId);
                  return (
                    <li key={d.id} className="flex items-center gap-3 p-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{d.name}</div>
                        <div className="text-xs text-muted-foreground">{d.category} · {m?.code}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">{formatDate(d.uploadedAt.slice(0,10))}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Estados</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(["Operativo", "En Revisión", "En Taller", "Fuera de Servicio"] as const).map((s) => (
                <StatusBadge key={s} status={s} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
