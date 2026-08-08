import { createFileRoute, Link, Outlet, useChildMatches } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useMantePro, type WorkshopRecordStatus } from "@/context/MantePro";
import { SendToWorkshopDialog } from "@/components/SendToWorkshopDialog";
import { formatDate } from "@/lib/format";
import { Plus, Store, Clock, ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/talleres-externos")({
  head: () => ({ meta: [{ title: "Talleres Externos — MantePro" }, { name: "description", content: "Envíos a talleres externos y seguimiento." }] }),
  component: Page,
});

function DeleteRecordBtn({ onConfirm, workshopName, machineCode }: { onConfirm: () => void; workshopName: string; machineCode?: string }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-critical hover:text-critical"><Trash2 className="h-3.5 w-3.5 mr-1" /> Eliminar</Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle>¿Eliminar este envío a taller?</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará el envío de {machineCode ? `${machineCode} a ` : ""}{workshopName || "este taller"} y todo su historial de seguimiento. Si la máquina figura "En Taller", volverá a quedar "Operativo". Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Eliminar</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function StatusPill({ s }: { s: WorkshopRecordStatus }) {
  const cls = s === "En Taller" ? "bg-warning/15 text-warning border-warning/30"
    : s === "Devuelto" ? "bg-success/15 text-success border-success/30"
    : "bg-muted text-muted-foreground border-border";
  return <span className={`inline-flex px-2 py-0.5 rounded-md border text-[11px] font-medium ${cls}`}>{s}</span>;
}

function Page() {
  const { workshopRecords, machines, addWorkshopRecord, deleteWorkshopRecord } = useMantePro();
  const [view, setView] = useState<"cards" | "timeline">("cards");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [machineFilter, setMachineFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => workshopRecords.filter((r) =>
    (statusFilter === "all" || r.status === statusFilter) &&
    (machineFilter === "all" || r.machineId === machineFilter),
  ), [workshopRecords, statusFilter, machineFilter]);

  const childMatches = useChildMatches();
  if (childMatches.length > 0) return <Outlet />;

  return (
    <AppShell title="Talleres Externos">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-card border-border"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="En Taller">En Taller</SelectItem>
            <SelectItem value="Devuelto">Devuelto</SelectItem>
            <SelectItem value="Cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={machineFilter} onValueChange={setMachineFilter}>
          <SelectTrigger className="w-56 bg-card border-border"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover border-border">
            <SelectItem value="all">Todas las máquinas</SelectItem>
            {machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.code} — {m.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-2">
          <div className="rounded-md border border-border bg-card p-0.5 flex text-xs">
            <button onClick={() => setView("cards")} className={`px-2.5 py-1 rounded ${view === "cards" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>Tarjetas</button>
            <button onClick={() => setView("timeline")} className={`px-2.5 py-1 rounded ${view === "timeline" ? "bg-primary/15 text-primary" : "text-muted-foreground"}`}>Timeline</button>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> Enviar a taller</Button></DialogTrigger>
            <SendToWorkshopDialog onClose={() => setOpen(false)} onSubmit={(r) => { addWorkshopRecord(r); toast.success("Envío registrado"); setOpen(false); }} />
          </Dialog>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="bg-card border-border border-dashed"><CardContent className="p-12 text-center">
          <Store className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <div className="mt-3 font-medium">Sin envíos a taller</div>
        </CardContent></Card>
      ) : view === "cards" ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((r) => {
            const m = machines.find((x) => x.id === r.machineId);
            return (
              <Card key={r.id} className="bg-card border-border hover:border-primary/40 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-mono text-xs text-muted-foreground">{m?.code}</div>
                      <div className="font-semibold truncate">{m?.name}</div>
                    </div>
                    <StatusPill s={r.status} />
                  </div>
                  <div className="mt-3 text-sm space-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">Taller</span><span className="font-medium truncate ml-2">{r.workshopName}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Envío</span><span>{formatDate(r.sentDate)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Retorno est.</span><span>{formatDate(r.estimatedReturn)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Técnico</span><span>{r.technician}</span></div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{r.problemDescription}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <DeleteRecordBtn
                      workshopName={r.workshopName}
                      machineCode={m?.code}
                      onConfirm={() => deleteWorkshopRecord(r.id)}
                    />
                    <Link to="/talleres-externos/$id" params={{ id: r.id }}>
                      <Button size="sm" variant="ghost">Detalle <ArrowRight className="h-3.5 w-3.5 ml-1" /></Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="bg-card border-border"><CardContent className="p-0">
          <ol className="relative ml-4 border-l border-border py-4 space-y-4">
            {filtered.map((r) => {
              const m = machines.find((x) => x.id === r.machineId);
              return (
                <li key={r.id} className="pl-4 relative">
                  <span className="absolute -left-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                  <div className="text-xs text-muted-foreground">{formatDate(r.sentDate)} → {formatDate(r.estimatedReturn)}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs">{m?.code}</span>
                    <span className="font-medium">{m?.name}</span>
                    <StatusPill s={r.status} />
                  </div>
                  <div className="text-xs text-muted-foreground">{r.workshopName} · {r.technician}</div>
                </li>
              );
            })}
          </ol>
        </CardContent></Card>
      )}

      <div className="mt-6">
        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Actualmente en taller</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {workshopRecords.filter((r) => r.status === "En Taller").map((r) => {
                const m = machines.find((x) => x.id === r.machineId);
                const days = Math.max(0, Math.floor((Date.now() - new Date(r.sentDate).getTime()) / 86400000));
                return (
                  <li key={r.id} className="flex items-center gap-3 p-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate"><span className="font-mono text-xs text-muted-foreground mr-2">{m?.code}</span>{m?.name}</div>
                      <div className="text-xs text-muted-foreground">{r.workshopName}</div>
                    </div>
                    <div className="text-xs text-warning whitespace-nowrap">{days} días</div>
                    <Link to="/talleres-externos/$id" params={{ id: r.id }}>
                      <Button size="sm" variant="ghost">Ver</Button>
                    </Link>
                  </li>
                );
              })}
              {workshopRecords.filter((r) => r.status === "En Taller").length === 0 && (
                <li className="p-4 text-sm text-muted-foreground">Ninguna máquina actualmente en taller.</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

