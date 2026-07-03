import { formatDate, formatDateLong, formatNumber } from "@/lib/format";
import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { CriticalityBadge } from "@/components/CriticalityBadge";
import { MachineFormDialog } from "@/components/MachineFormDialog";
import { useMantePro, type CriticalComponent, type Criticality } from "@/context/MantePro";
import { ArrowLeft, Pencil, Plus, Trash2, FileText, Wrench, Factory, Activity, Clock, Gauge, Percent } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/maquinas/$id")({
  component: MachineDetail,
});

function MachineDetail() {
  const { id } = useParams({ from: "/maquinas/$id" });
  const navigate = useNavigate();
  const { machines, records, types, upsertComponent, deleteComponent } = useMantePro();
  const machine = machines.find((m) => m.id === id);
  const [edit, setEdit] = useState(false);
  const [openC, setOpenC] = useState(false);
  const [editingC, setEditingC] = useState<CriticalComponent | null>(null);

  if (!machine) {
    return (
      <AppShell title="Máquina no encontrada">
        <Card className="bg-card border-border"><CardContent className="p-10 text-center">
          <Factory className="mx-auto h-10 w-10 text-muted-foreground/50" />
          <div className="mt-3 font-medium">No existe esta máquina</div>
          <Button className="mt-4" onClick={() => navigate({ to: "/maquinas" })}>Volver a Máquinas</Button>
        </CardContent></Card>
      </AppShell>
    );
  }

  const machineRecords = records.filter((r) => r.machineId === machine.id).sort((a, b) => b.date.localeCompare(a.date));
  const completed = machineRecords.filter((r) => r.status === "Completado");
  // KPIs (mock-derived but consistent)
  const mtbf = completed.length > 1 ? Math.round((machine.annualHours ?? 300) / completed.length) : machine.annualHours ?? 0;
  const mttr = completed.length ? Math.round((completed.reduce((s, r) => s + (r.cost > 0 ? 3 : 1), 0) / completed.length) * 10) / 10 : 0;
  const availability = machine.status === "Operativo" ? 96.4 : machine.status === "En Revisión" ? 88.2 : machine.status === "En Taller" ? 72.5 : 0;

  return (
    <AppShell title={`${machine.code} — ${machine.name}`}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm"><Link to="/maquinas"><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Link></Button>
        <Button asChild size="sm" variant="ghost"><Link to="/fichas-tecnicas" search={{}}><FileText className="h-4 w-4 mr-1" /> Ficha técnica</Link></Button>
        <Button size="sm" variant="ghost" onClick={() => setEdit(true)}><Pencil className="h-4 w-4 mr-1" /> Editar</Button>
      </div>

      <Card className="bg-card border-border mb-4">
        <CardContent className="p-5 flex flex-wrap items-start gap-4">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-md bg-secondary text-primary overflow-hidden">
            {machine.photo ? <img src={machine.photo} alt="" className="h-full w-full object-cover" /> : <Factory className="h-8 w-8" />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-mono text-xs text-primary">{machine.code}</div>
            <h2 className="text-2xl font-bold truncate">{machine.name}</h2>
            <div className="text-sm text-muted-foreground">{machine.brand} · {machine.model} · S/N <span className="font-mono">{machine.serial || "—"}</span></div>
          </div>
          <div className="flex gap-2">
            <StatusBadge status={machine.status} />
            <CriticalityBadge level={machine.criticality} />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="info">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="info">Información General</TabsTrigger>
          <TabsTrigger value="comp">Componentes Críticos</TabsTrigger>
          <TabsTrigger value="hist">Historial de Mantenimiento</TabsTrigger>
          <TabsTrigger value="kpi">Métricas KPI</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <Card className="bg-card border-border"><CardContent className="p-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Info label="Marca / Modelo" value={`${machine.brand} / ${machine.model}`} />
            <Info label="N° de Serie" value={machine.serial} mono />
            <Info label="Fecha de Compra" value={machine.purchaseDate ? formatDate(machine.purchaseDate) : "—"} />
            <Info label="Costo" value={machine.cost ? `S/ ${formatNumber(machine.cost, 2)}` : "—"} />
            <Info label="Área" value={machine.area || machine.location} />
            <Info label="Departamento" value={machine.department} />
            <Info label="Potencia" value={machine.powerKw ? `${machine.powerKw} kW` : "—"} mono />
            <Info label="Voltaje" value={machine.voltageV ? `${machine.voltageV} V` : "—"} mono />
            <Info label="Frecuencia" value={machine.frequencyHz ? `${machine.frequencyHz} Hz` : "—"} mono />
            <Info label="Peso" value={machine.weightKg ? `${machine.weightKg} kg` : "—"} mono />
            <Info label="Horas anuales" value={machine.annualHours?.toString()} mono />
            <Info label="Días por semana" value={machine.daysPerWeek?.toString()} mono />
            {machine.observations && (
              <div className="sm:col-span-2 lg:col-span-3">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Observaciones</div>
                <p className="mt-1 text-sm">{machine.observations}</p>
              </div>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="comp" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Componentes críticos</CardTitle>
              <Button size="sm" onClick={() => { setEditingC(null); setOpenC(true); }}><Plus className="h-4 w-4 mr-1" /> Añadir</Button>
            </CardHeader>
            <CardContent className="p-0">
              {machine.components.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Sin componentes registrados.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="text-left p-3 w-12">N°</th>
                        <th className="text-left p-3">Componente</th>
                        <th className="text-left p-3">Función</th>
                        <th className="text-left p-3">Estado Actual</th>
                        <th className="text-left p-3">Criticidad</th>
                        <th className="p-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {machine.components.map((c, i) => (
                        <tr key={c.id} className="border-t border-border hover:bg-secondary/30">
                          <td className="p-3 font-mono text-muted-foreground">{i + 1}</td>
                          <td className="p-3 font-medium">{c.name}</td>
                          <td className="p-3 text-muted-foreground">{c.function}</td>
                          <td className="p-3">{c.state}</td>
                          <td className="p-3"><CriticalityBadge level={c.criticality} /></td>
                          <td className="p-3 text-right">
                            <div className="flex justify-end gap-1">
                              <Button size="sm" variant="ghost" onClick={() => { setEditingC(c); setOpenC(true); }}><Pencil className="h-4 w-4" /></Button>
                              <Button size="sm" variant="ghost" className="text-critical" onClick={() => { deleteComponent(machine.id, c.id); toast.success("Componente eliminado"); }}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
          <ComponentDialog open={openC} onOpenChange={setOpenC} initial={editingC} onSave={(c) => { upsertComponent(machine.id, c); toast.success("Componente guardado"); }} />
        </TabsContent>

        <TabsContent value="hist" className="mt-4">
          <Card className="bg-card border-border"><CardContent className="p-5">
            {machineRecords.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-6">Sin historial.</div>
            ) : (
              <ol className="relative ml-3 border-l border-border space-y-4">
                {machineRecords.map((r) => {
                  const t = types.find((x) => x.id === r.typeId);
                  const dot = t?.category === "Correctivo" ? "bg-critical" : t?.category === "Predictivo" ? "bg-info" : "bg-success";
                  return (
                    <li key={r.id} className="pl-4 relative">
                      <span className={`absolute -left-1.5 top-1.5 h-2.5 w-2.5 rounded-full ${dot}`} />
                      <div className="text-xs text-muted-foreground">{formatDateLong(r.date)}</div>
                      <div className="text-sm font-medium">{t?.name} <span className="ml-2 text-xs text-muted-foreground">({t?.category})</span></div>
                      <div className="text-xs text-muted-foreground">{r.technician} · {r.status} {r.cost ? `· S/ ${r.cost}` : ""}</div>
                      {r.notes && <div className="text-xs mt-1">{r.notes}</div>}
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="kpi" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icon={Activity} label="MTBF" value={`${mtbf} h`} hint="Tiempo medio entre fallos" />
            <Kpi icon={Clock} label="MTTR" value={`${mttr} h`} hint="Tiempo medio de reparación" />
            <Kpi icon={Percent} label="Disponibilidad" value={`${availability}%`} hint="Últimos 30 días" />
            <Kpi icon={Gauge} label="Horas operativas" value={formatNumber(machine.hoursOfUse)} hint="Acumuladas" />
          </div>
        </TabsContent>
      </Tabs>

      <MachineFormDialog open={edit} onOpenChange={setEdit} machine={machine} />
    </AppShell>
  );
}

function Info({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-sm ${mono ? "font-mono" : ""}`}>{value || "—"}</div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, hint }: { icon: any; label: string; value: string; hint: string }) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/15 text-primary"><Icon className="h-5 w-5" /></div>
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className="text-xl font-bold font-mono">{value}</div>
          </div>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">{hint}</div>
      </CardContent>
    </Card>
  );
}

function ComponentDialog({ open, onOpenChange, initial, onSave }: {
  open: boolean; onOpenChange: (b: boolean) => void;
  initial: CriticalComponent | null;
  onSave: (c: CriticalComponent) => void;
}) {
  const [f, setF] = useState<CriticalComponent>(initial ?? { id: Math.random().toString(36).slice(2, 10), name: "", function: "", state: "Operativo", criticality: "Medio" });
  // reset on open
  if (open && initial && f.id !== initial.id) setF(initial);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader><DialogTitle>{initial ? "Editar componente" : "Nuevo componente"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Componente</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><Label>Función</Label><Input value={f.function} onChange={(e) => setF({ ...f, function: e.target.value })} /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Estado actual</Label><Input value={f.state} onChange={(e) => setF({ ...f, state: e.target.value })} /></div>
            <div>
              <Label>Criticidad</Label>
              <Select value={f.criticality} onValueChange={(v) => setF({ ...f, criticality: v as Criticality })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["Alto", "Medio", "Bajo"] as const).map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => { if (!f.name) return toast.error("Nombre requerido"); onSave(f); onOpenChange(false); }}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
