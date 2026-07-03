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
import { MaintenanceFormDialog } from "@/components/MaintenanceFormDialog";
import { useMantePro, typeColorClass, type RecordStatus } from "@/context/MantePro";
import { Plus, Trash2, Wrench, Search, Download, Eye, Pencil } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/mantenimientos")({
  head: () => ({
    meta: [
      { title: "Mantenimientos — MantePro" },
      { name: "description", content: "Registros y programación de mantenimientos." },
    ],
  }),
  component: Page,
});

const statusTones: Record<RecordStatus, string> = {
  "Completado": "bg-success/15 text-success border-success/30",
  "Programado": "bg-info/15 text-info border-info/30",
  "En Proceso": "bg-warning/15 text-warning border-warning/30",
  "Cancelado": "bg-muted text-muted-foreground border-border",
};

function Page() {
  const { records, machines, types, deleteRecord } = useMantePro();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("todos");
  const [machine, setMachine] = useState("todas");
  const [type, setType] = useState("todos");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const editing = editingId ? records.find((r) => r.id === editingId) ?? null : null;

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return records.filter((r) => {
      if (status !== "todos" && r.status !== status) return false;
      if (machine !== "todas" && r.machineId !== machine) return false;
      if (type !== "todos" && r.typeId !== type) return false;
      if (from && r.date < from) return false;
      if (to && r.date > to) return false;
      if (s) {
        const m = machines.find((x) => x.id === r.machineId);
        const t = types.find((x) => x.id === r.typeId);
        const hay = [r.otm, r.technician, m?.code, m?.name, t?.name].join(" ").toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [records, machines, types, q, status, machine, type, from, to]);

  const exportCSV = () => {
    const headers = ["OTM", "Fecha", "Codigo", "Maquina", "Tipo", "Tecnico", "Estado", "Duracion_h", "Costo"];
    const rows = filtered.map((r) => {
      const m = machines.find((x) => x.id === r.machineId);
      const t = types.find((x) => x.id === r.typeId);
      const dur = r.startTime && r.endTime ? hoursBetween(r.startTime, r.endTime) : "";
      return [r.otm, r.date, m?.code ?? "", m?.name ?? "", t?.name ?? "", r.technician, r.status, dur, r.cost];
    });
    const csv = [headers, ...rows].map((row) => row.map((v) => `"${String(v).replaceAll(`"`, `""`)}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `mantenimientos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`Exportadas ${filtered.length} órdenes`);
  };

  return (
    <AppShell title="Mantenimientos">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar OTM, máquina, técnico…" className="pl-8 bg-card" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[150px] bg-card"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {(["Programado", "En Proceso", "Completado", "Cancelado"] as const).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={machine} onValueChange={setMachine}>
          <SelectTrigger className="w-[180px] bg-card"><SelectValue placeholder="Máquina" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas las máquinas</SelectItem>
            {machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.code} — {m.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-[170px] bg-card"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            {types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[150px] bg-card" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[150px] bg-card" />

        <Button variant="ghost" onClick={exportCSV} className="ml-auto"><Download className="h-4 w-4 mr-1" /> Exportar CSV</Button>
        <Button onClick={() => { setEditingId(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Nueva OTM</Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="bg-card border-border border-dashed"><CardContent className="p-12 text-center">
          <Wrench className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <div className="mt-3 font-medium">Sin registros</div>
          <div className="text-sm text-muted-foreground">Ajusta los filtros o crea una nueva OTM.</div>
        </CardContent></Card>
      ) : (
        <Card className="bg-card border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left p-3">N° OTM</th>
                  <th className="text-left p-3">Fecha</th>
                  <th className="text-left p-3">Máquina</th>
                  <th className="text-left p-3">Tipo</th>
                  <th className="text-left p-3">Técnico</th>
                  <th className="text-left p-3">Estado</th>
                  <th className="text-right p-3">Duración</th>
                  <th className="text-right p-3">Costo</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const m = machines.find((x) => x.id === r.machineId);
                  const t = types.find((x) => x.id === r.typeId);
                  const dur = r.startTime && r.endTime ? hoursBetween(r.startTime, r.endTime) : null;
                  return (
                    <tr key={r.id} className="border-t border-border hover:bg-secondary/30">
                      <td className="p-3 font-mono text-primary">{r.otm}</td>
                      <td className="p-3 whitespace-nowrap">{formatDate(r.date)}</td>
                      <td className="p-3"><span className="font-mono text-xs text-primary">{m?.code}</span> · {m?.name}</td>
                      <td className="p-3">
                        {t && <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs ${typeColorClass(t.color)}`}>{t.name}</span>}
                      </td>
                      <td className="p-3">{r.technician}</td>
                      <td className="p-3"><span className={`inline-flex rounded-md border px-2 py-0.5 text-xs ${statusTones[r.status]}`}>{r.status}</span></td>
                      <td className="p-3 text-right font-mono">{dur != null ? `${dur} h` : "—"}</td>
                      <td className="p-3 text-right font-mono">{r.cost ? `S/ ${r.cost.toFixed(2)}` : "—"}</td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button asChild size="sm" variant="ghost"><Link to="/mantenimientos/$id" params={{ id: r.id }}><Eye className="h-4 w-4" /></Link></Button>
                          <Button size="sm" variant="ghost" onClick={() => { setEditingId(r.id); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-critical"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                            <AlertDialogContent className="bg-card border-border">
                              <AlertDialogHeader><AlertDialogTitle>¿Eliminar {r.otm}?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { deleteRecord(r.id); toast.success("Eliminado"); }}>Eliminar</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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

      <MaintenanceFormDialog open={open} onOpenChange={setOpen} recordId={editingId} />
    </AppShell>
  );
}

function hoursBetween(a: string, b: string) {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  if ([ah, am, bh, bm].some((n) => Number.isNaN(n))) return 0;
  return +((bh + bm / 60) - (ah + am / 60)).toFixed(1);
}
