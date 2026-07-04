import { formatDate, formatDateLong, formatNumber } from "@/lib/format";
import { createFileRoute, Link, Outlet, useChildMatches } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { CriticalityBadge } from "@/components/CriticalityBadge";
import { MachineFormDialog } from "@/components/MachineFormDialog";
import { useMantePro, getMachineAlertStatus, getMachineUsagePct, type Machine } from "@/context/MantePro";
import {
  Plus, Trash2, Factory, Search, LayoutGrid, List, Eye, Wrench, Store, Printer, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { printInventory } from "@/lib/print-machines";

export const Route = createFileRoute("/maquinas")({
  head: () => ({
    meta: [
      { title: "Máquinas — MantePro" },
      { name: "description", content: "Registro y gestión de máquinas industriales." },
    ],
  }),
  component: MachinesPage,
});

type SortKey = "name" | "code" | "lastMaint" | "criticality";

function MachinesPage() {
  const { machines, records, deleteMachine, updateMachine, settings, usageCycles } = useMantePro();
  const [q, setQ] = useState("");
  const [view, setView] = useState<"grid" | "table">("grid");
  const [status, setStatus] = useState<string>("todos");
  const [area, setArea] = useState<string>("todas");
  const [sort, setSort] = useState<SortKey>("name");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Machine | null>(null);

  const areas = Array.from(new Set(machines.map((m) => m.area || m.location).filter(Boolean))) as string[];

  const lastMaint = (id: string) =>
    records.filter((r) => r.machineId === id && r.status === "Completado").sort((a, b) => b.date.localeCompare(a.date))[0];
  const nextMaint = (id: string) =>
    records.filter((r) => r.machineId === id && r.status === "Programado").sort((a, b) => a.date.localeCompare(b.date))[0];

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    const critOrder = { Alto: 0, Medio: 1, Bajo: 2 } as const;
    return machines
      .filter((m) => !s || m.code.toLowerCase().includes(s) || m.name.toLowerCase().includes(s) || m.brand.toLowerCase().includes(s))
      .filter((m) => status === "todos" || m.status === status)
      .filter((m) => area === "todas" || (m.area || m.location) === area)
      .sort((a, b) => {
        switch (sort) {
          case "code": return a.code.localeCompare(b.code);
          case "lastMaint": {
            const la = lastMaint(a.id)?.date ?? "";
            const lb = lastMaint(b.id)?.date ?? "";
            return lb.localeCompare(la);
          }
          case "criticality": return critOrder[a.criticality] - critOrder[b.criticality];
          default: return a.name.localeCompare(b.name);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machines, records, q, status, area, sort]);

  const sendToWorkshop = (m: Machine) => {
    updateMachine(m.id, { status: "En Taller" });
    toast.success(`${m.code} enviada a taller externo`);
  };

  const childMatches = useChildMatches();

  // Si hay una ruta hija activa (ej: /maquinas/$id), renderizamos sólo el Outlet
  if (childMatches.length > 0) {
    return <Outlet />;
  }

  return (
    <AppShell title="Máquinas">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por código, nombre o marca…" className="pl-8 bg-card" />
        </div>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px] bg-card"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {(["Operativo", "En Revisión", "En Taller", "Fuera de Servicio"] as const).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={area} onValueChange={setArea}>
          <SelectTrigger className="w-[180px] bg-card"><SelectValue placeholder="Área" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las áreas</SelectItem>
            {areas.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-[180px] bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="name">Ordenar: Nombre</SelectItem>
            <SelectItem value="code">Ordenar: Código</SelectItem>
            <SelectItem value="lastMaint">Ordenar: Último mant.</SelectItem>
            <SelectItem value="criticality">Ordenar: Criticidad</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex rounded-md border border-border overflow-hidden">
          <Button variant={view === "grid" ? "secondary" : "ghost"} size="sm" className="rounded-none" onClick={() => setView("grid")}><LayoutGrid className="h-4 w-4" /></Button>
          <Button variant={view === "table" ? "secondary" : "ghost"} size="sm" className="rounded-none" onClick={() => setView("table")}><List className="h-4 w-4" /></Button>
        </div>

        <Button variant="outline" className="ml-auto" onClick={() => printInventory(machines, settings.institutionName)}>
          <Printer className="h-4 w-4 mr-1" /> Imprimir inventario
        </Button>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Nueva máquina
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="bg-card border-border border-dashed"><CardContent className="p-12 text-center">
          <Factory className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <div className="mt-3 font-medium">Sin resultados</div>
          <div className="text-sm text-muted-foreground">Ajusta los filtros o registra una nueva máquina.</div>
        </CardContent></Card>
      ) : view === "grid" ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m) => {
            const lm = lastMaint(m.id);
            const nm = nextMaint(m.id);
            const cycle = usageCycles.find((c) => c.machineId === m.id);
            const alertStatus = getMachineAlertStatus(cycle, m.threshold);
            const usagePct = getMachineUsagePct(cycle, m.threshold);
            const overBy = cycle && m.threshold ? Math.max(0, cycle.horasAcumuladas - m.threshold.horasCiclo) : 0;
            const daysSince = lm ? Math.floor((Date.now() - new Date(lm.date).getTime()) / 86400000) : null;
            const cardBorder =
              alertStatus === "critical" ? "border-red-500/50 machine-card-critical" :
              alertStatus === "warning" ? "border-amber-500/40 machine-card-warning" :
              "border-border machine-card-normal hover:border-primary/40";
            return (
              <Card key={m.id} className={`bg-card transition-colors relative overflow-hidden ${cardBorder}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-primary flex items-center gap-2">
                        {m.code}
                        {/* Alert dot */}
                        <span className={`inline-block h-2 w-2 rounded-full ${
                          alertStatus === "critical" ? "bg-red-500 animate-pulse-fast" :
                          alertStatus === "warning" ? "bg-amber-500 animate-pulse-medium" :
                          "bg-green-500 animate-pulse-slow"
                        }`} />
                      </div>
                      <div className="font-semibold truncate">{m.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{m.brand} · {m.model}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={m.status} />
                      <CriticalityBadge level={m.criticality} />
                    </div>
                  </div>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div><dt className="text-muted-foreground">Área</dt><dd className="truncate">{m.area || m.location || "—"}</dd></div>
                    <div><dt className="text-muted-foreground">Horas uso</dt><dd className="font-mono">{formatNumber(m.hoursOfUse)}</dd></div>
                    <div><dt className="text-muted-foreground">Último mant.</dt><dd>{lm ? formatDate(lm.date) : "—"}</dd></div>
                    <div><dt className="text-muted-foreground">Próximo</dt><dd className={nm ? "text-primary" : ""}>{nm ? formatDate(nm.date) : "—"}</dd></div>
                  </dl>
                  {/* Usage progress mini-bar */}
                  {m.threshold && (
                    <div className="mt-2">
                      <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                        <span>Ciclo uso</span>
                        <span className={alertStatus === "critical" ? "text-red-400" : alertStatus === "warning" ? "text-amber-400" : "text-green-400"}>
                          {cycle?.horasAcumuladas.toFixed(1) ?? 0}h / {m.threshold.horasCiclo}h
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-border overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            alertStatus === "critical" ? "bg-red-500" :
                            alertStatus === "warning" ? "bg-amber-500" :
                            "bg-green-500"
                          }`}
                          style={{ width: `${Math.min(usagePct, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between gap-1 border-t border-border pt-3">
                    <Button asChild size="sm" variant="ghost"><Link to="/maquinas/$id" params={{ id: m.id }}><Eye className="h-4 w-4 mr-1" /> Ver</Link></Button>
                    <Button asChild size="sm" variant="ghost"><Link to="/mantenimientos"><Wrench className="h-4 w-4 mr-1" /> Mant.</Link></Button>
                    <Button size="sm" variant="ghost" onClick={() => sendToWorkshop(m)}><Store className="h-4 w-4 mr-1" /> Taller</Button>
                    <DeleteBtn onConfirm={() => { deleteMachine(m.id); toast.success("Eliminada"); }} code={m.code} />
                  </div>
                </CardContent>
                {/* Critical warning banner */}
                {alertStatus === "critical" && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5" style={{ background: "#EF444420" }}>
                    <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />
                    <span className="text-[11px] text-red-400">
                      Mantenimiento requerido · {overBy.toFixed(1)}h sobre límite{daysSince !== null ? ` · ${daysSince} días sin mant.` : ""}
                    </span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-card border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left p-3">Código</th>
                  <th className="text-left p-3">Nombre</th>
                  <th className="text-left p-3">Área</th>
                  <th className="text-left p-3">Estado</th>
                  <th className="text-left p-3">Criticidad</th>
                  <th className="text-left p-3">Último mant.</th>
                  <th className="text-left p-3">Próximo</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const lm = lastMaint(m.id);
                  const nm = nextMaint(m.id);
                  return (
                    <tr key={m.id} className="border-t border-border hover:bg-secondary/30">
                      <td className="p-3 font-mono text-primary">{m.code}</td>
                      <td className="p-3"><div className="font-medium">{m.name}</div><div className="text-xs text-muted-foreground">{m.brand} · {m.model}</div></td>
                      <td className="p-3">{m.area || m.location || "—"}</td>
                      <td className="p-3"><StatusBadge status={m.status} /></td>
                      <td className="p-3"><CriticalityBadge level={m.criticality} /></td>
                      <td className="p-3 whitespace-nowrap">{lm ? formatDate(lm.date) : "—"}</td>
                      <td className="p-3 whitespace-nowrap">{nm ? formatDate(nm.date) : "—"}</td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button asChild size="sm" variant="ghost"><Link to="/maquinas/$id" params={{ id: m.id }}><Eye className="h-4 w-4" /></Link></Button>
                          <DeleteBtn onConfirm={() => { deleteMachine(m.id); toast.success("Eliminada"); }} code={m.code} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <MachineFormDialog open={open} onOpenChange={setOpen} machine={editing} />
      <Outlet />
    </AppShell>
  );
}

function DeleteBtn({ onConfirm, code }: { onConfirm: () => void; code: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-critical hover:text-critical"><Trash2 className="h-4 w-4" /></Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar {code}?</AlertDialogTitle>
          <AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Eliminar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
