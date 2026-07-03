import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMantePro } from "@/context/MantePro";
import { formatDate } from "@/lib/format";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Printer, Download, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/reportes")({
  head: () => ({ meta: [{ title: "Reportes — MantePro" }, { name: "description", content: "KPIs, historial, próximos mantenimientos y máquinas en taller." }] }),
  component: Page,
});

const colors = ["var(--primary)", "var(--accent)", "var(--info)", "var(--success)", "var(--warning)", "var(--critical)"];

function Page() {
  return (
    <AppShell title="Reportes">
      <Tabs defaultValue="historial">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="historial">Historial por Máquina</TabsTrigger>
          <TabsTrigger value="kpi">KPI Dashboard</TabsTrigger>
          <TabsTrigger value="proximos">Próximos MP</TabsTrigger>
          <TabsTrigger value="taller">Máquinas en Taller</TabsTrigger>
        </TabsList>
        <TabsContent value="historial" className="mt-4"><HistorialReport /></TabsContent>
        <TabsContent value="kpi" className="mt-4"><KpiReport /></TabsContent>
        <TabsContent value="proximos" className="mt-4"><ProximosReport /></TabsContent>
        <TabsContent value="taller" className="mt-4"><TallerReport /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

function HistorialReport() {
  const { machines, records, types } = useMantePro();
  const [machineId, setMachineId] = useState(machines[0]?.id ?? "");
  const [year, setYear] = useState<string>("all");
  const [typeId, setTypeId] = useState<string>("all");

  const machineRecords = useMemo(() => records.filter((r) =>
    r.machineId === machineId &&
    (year === "all" || r.date.startsWith(year)) &&
    (typeId === "all" || r.typeId === typeId),
  ).sort((a, b) => b.date.localeCompare(a.date)), [records, machineId, year, typeId]);

  const years = Array.from(new Set(records.filter((r) => r.machineId === machineId).map((r) => r.date.slice(0, 4)))).sort();

  const costByYear = years.map((y) => ({
    year: y,
    cost: records.filter((r) => r.machineId === machineId && r.date.startsWith(y)).reduce((s, r) => s + r.cost, 0),
  }));

  const byType = types.map((t) => ({
    name: t.name,
    value: records.filter((r) => r.machineId === machineId && r.typeId === t.id).length,
  })).filter((x) => x.value > 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Select value={machineId} onValueChange={setMachineId}>
          <SelectTrigger className="w-72 bg-card border-border"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover border-border">
            {machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.code} — {m.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-32 bg-card border-border"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">Todos los años</SelectItem>
            {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeId} onValueChange={setTypeId}>
          <SelectTrigger className="w-56 bg-card border-border"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">Todos los tipos</SelectItem>
            {types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-1" /> Imprimir / PDF
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Costo total por año (S/)</CardTitle></CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costByYear}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="year" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Bar dataKey="cost" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Mantenimientos por tipo</CardTitle></CardHeader>
          <CardContent className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byType} dataKey="value" nameKey="name" outerRadius={90} label>
                  {byType.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} stroke="var(--card)" strokeWidth={2} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-base">Historial cronológico</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y divide-border">
            {machineRecords.map((r) => {
              const t = types.find((x) => x.id === r.typeId);
              return (
                <li key={r.id} className="p-3 flex items-center gap-3 text-sm">
                  <div className="font-mono text-xs text-muted-foreground w-28">{r.otm}</div>
                  <div className="w-24 text-xs">{formatDate(r.date)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{t?.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.notes}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{r.technician}</div>
                  <div className="text-xs font-mono">S/ {r.cost.toFixed(2)}</div>
                </li>
              );
            })}
            {machineRecords.length === 0 && <li className="p-4 text-sm text-muted-foreground">Sin registros para los filtros seleccionados.</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiReport() {
  const { machines, records, settings } = useMantePro();
  const [from, setFrom] = useState("2024-01-01");
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

  const inRange = records.filter((r) => r.date >= from && r.date <= to && r.status === "Completado");
  const correctives = inRange.filter((r) => r.typeId === "t-correctivo");
  const totalH = (machines.reduce((s, m) => s + (m.annualHours ?? 0), 0)) * ((new Date(to).getTime() - new Date(from).getTime()) / (365 * 86400000));
  const mtbf = correctives.length > 0 ? Math.round(totalH / correctives.length) : 0;
  const mttr = correctives.length > 0
    ? +(correctives.reduce((s, r) => s + 4, 0) / correctives.length).toFixed(1) : 0;
  const availability = mtbf + mttr > 0 ? +((mtbf / (mtbf + mttr)) * 100).toFixed(1) : 100;
  const preventives = inRange.filter((r) => r.typeId.includes("t-")).length;
  const cumplimiento = records.length > 0 ? Math.round((preventives / records.length) * 100) : 0;
  const totalCost = inRange.reduce((s, r) => s + r.cost, 0);

  const ranking = machines.map((m) => {
    const corr = records.filter((r) => r.machineId === m.id && r.typeId === "t-correctivo" && r.date >= from && r.date <= to).length;
    const hours = (m.annualHours ?? 0) * ((new Date(to).getTime() - new Date(from).getTime()) / (365 * 86400000));
    const mb = corr > 0 ? hours / corr : hours;
    const av = mb + 4 > 0 ? +((mb / (mb + 4)) * 100).toFixed(1) : 100;
    return { code: m.code, name: m.name, av };
  }).sort((a, b) => b.av - a.av);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div><Label>Desde</Label><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label>Hasta</Label><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Imprimir</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: "MTBF", value: `${mtbf} h`, goal: `${settings.mtbfGoalH} h` },
          { label: "MTTR", value: `${mttr} h` },
          { label: "Disponibilidad", value: `${availability}%`, goal: `${settings.availabilityGoalPct}%` },
          { label: "Cumplimiento MP", value: `${cumplimiento}%` },
          { label: "Costo total", value: `S/ ${totalCost.toFixed(0)}` },
        ].map((k) => (
          <Card key={k.label} className="bg-card border-border">
            <CardContent className="p-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{k.label}</div>
              <div className="mt-1 text-2xl font-bold">{k.value}</div>
              {k.goal && <div className="text-[11px] text-muted-foreground">Objetivo: {k.goal}</div>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-base">Ranking de disponibilidad</CardTitle></CardHeader>
        <CardContent className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ranking} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis type="number" domain={[0, 100]} stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis dataKey="code" type="category" stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
              <Bar dataKey="av" fill="var(--success)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function ProximosReport() {
  const { records, machines, types } = useMantePro();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const programados = records.filter((r) => r.status === "Programado");
  const monthRecords = programados.filter((r) => {
    const d = new Date(r.date);
    return d >= monthStart && d <= monthEnd;
  });
  const overdue = programados.filter((r) => new Date(r.date) < now);

  const days = Array.from({ length: monthEnd.getDate() }, (_, i) => i + 1);

  const exportCsv = () => {
    const rows = [["OTM", "Fecha", "Máquina", "Tipo", "Estado"], ...programados.map((r) => {
      const m = machines.find((x) => x.id === r.machineId);
      const t = types.find((x) => x.id === r.typeId);
      return [r.otm, r.date, `${m?.code} ${m?.name}`, t?.name ?? "", r.status];
    })];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "proximos-mantenimientos.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado");
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="text-sm text-muted-foreground">
          {now.toLocaleDateString("es-ES", { month: "long", year: "numeric" })} · {monthRecords.length} programados · <span className="text-critical">{overdue.length} vencidos</span>
        </div>
        <Button size="sm" variant="outline" className="ml-auto" onClick={exportCsv}><Download className="h-4 w-4 mr-1" /> Exportar CSV</Button>
      </div>

      <Card className="bg-card border-border">
        <CardHeader><CardTitle className="text-base">Calendario del mes</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-xs">
            {["L","M","X","J","V","S","D"].map((d) => <div key={d} className="text-center text-muted-foreground font-medium py-1">{d}</div>)}
            {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => <div key={`p${i}`} />)}
            {days.map((d) => {
              const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
              const items = programados.filter((r) => r.date === iso);
              return (
                <div key={d} className="min-h-[68px] rounded border border-border bg-background/40 p-1">
                  <div className="text-[10px] text-muted-foreground">{d}</div>
                  {items.slice(0, 3).map((r) => {
                    const t = types.find((x) => x.id === r.typeId);
                    return <div key={r.id} className="mt-0.5 px-1 py-0.5 text-[10px] rounded bg-primary/20 text-primary truncate">{t?.name}</div>;
                  })}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {overdue.length > 0 && (
        <Card className="bg-card border-critical/30">
          <CardHeader><CardTitle className="text-base flex items-center gap-2 text-critical"><AlertTriangle className="h-4 w-4" /> Mantenimientos vencidos</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {overdue.map((r) => {
                const m = machines.find((x) => x.id === r.machineId);
                const t = types.find((x) => x.id === r.typeId);
                return (
                  <li key={r.id} className="p-3 flex items-center gap-3 text-sm">
                    <div className="font-mono text-xs text-critical w-28">{r.otm}</div>
                    <div className="w-24 text-xs">{formatDate(r.date)}</div>
                    <div className="flex-1 truncate"><span className="font-mono text-xs text-muted-foreground mr-2">{m?.code}</span>{m?.name} — {t?.name}</div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TallerReport() {
  const { workshopRecords, machines } = useMantePro();
  const active = workshopRecords.filter((r) => r.status === "En Taller");
  const totalOpenCost = active.reduce((s, r) => s + (r.approvedBudget || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="text-sm text-muted-foreground">{active.length} máquina(s) en taller · Costo abierto: <span className="text-primary font-semibold">S/ {totalOpenCost.toFixed(2)}</span></div>
      </div>
      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground uppercase border-b border-border">
              <tr><th className="text-left p-3">Máquina</th><th className="text-left p-3">Taller</th><th className="text-left p-3">Envío</th><th className="text-left p-3">Retorno est.</th><th className="text-right p-3">Días</th><th className="text-right p-3">Presupuesto</th></tr>
            </thead>
            <tbody>
              {active.map((r) => {
                const m = machines.find((x) => x.id === r.machineId);
                const days = Math.max(0, Math.floor((Date.now() - new Date(r.sentDate).getTime()) / 86400000));
                return (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="p-3"><span className="font-mono text-xs text-muted-foreground mr-2">{m?.code}</span>{m?.name}</td>
                    <td className="p-3">{r.workshopName}</td>
                    <td className="p-3 text-xs">{formatDate(r.sentDate)}</td>
                    <td className="p-3 text-xs">{formatDate(r.estimatedReturn)}</td>
                    <td className="p-3 text-right text-warning">{days}</td>
                    <td className="p-3 text-right font-mono">S/ {r.approvedBudget.toFixed(2)}</td>
                  </tr>
                );
              })}
              {active.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Sin máquinas en taller.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
