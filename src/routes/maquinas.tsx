import { formatDate, formatDateLong, formatNumber } from "@/lib/format";
import { createFileRoute, Link } from "@tanstack/react-router";
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
import { useMantePro, type Machine } from "@/context/MantePro";
import {
  Plus, Trash2, Factory, Search, LayoutGrid, List, Eye, Wrench, Store,
} from "lucide-react";
import { toast } from "sonner";

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
  const { machines, records, deleteMachine, updateMachine } = useMantePro();
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

        <Button className="ml-auto" onClick={() => { setEditing(null); setOpen(true); }}>
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
            return (
              <Card key={m.id} className="bg-card border-border hover:border-primary/40 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-primary">{m.code}</div>
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
                  <div className="mt-3 flex items-center justify-between gap-1 border-t border-border pt-3">
                    <Button asChild size="sm" variant="ghost"><Link to="/maquinas/$id" params={{ id: m.id }}><Eye className="h-4 w-4 mr-1" /> Ver</Link></Button>
                    <Button asChild size="sm" variant="ghost"><Link to="/mantenimientos"><Wrench className="h-4 w-4 mr-1" /> Mant.</Link></Button>
                    <Button size="sm" variant="ghost" onClick={() => sendToWorkshop(m)}><Store className="h-4 w-4 mr-1" /> Taller</Button>
                    <DeleteBtn onConfirm={() => { deleteMachine(m.id); toast.success("Eliminada"); }} code={m.code} />
                  </div>
                </CardContent>
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
