import { formatDate, formatDateLong, formatNumber } from "@/lib/format";
import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/StatusBadge";
import { CriticalityBadge } from "@/components/CriticalityBadge";
import { MachineFormDialog } from "@/components/MachineFormDialog";
import {
  useMantePro,
  type CriticalComponent,
  type Criticality,
  type AppDocument,
} from "@/context/MantePro";
import {
  ArrowLeft, Pencil, Plus, Trash2, Wrench, Factory, Activity, Clock,
  Gauge, Percent, Printer, Upload, FileText, Image as ImageIcon, Download, DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { printMachineSheet } from "@/lib/print-machines";
import { typeColorClass } from "@/context/MantePro";

const MACHINE_DOC_CATEGORIES = ["Diagnóstico", "Manual", "Fotografía", "Certificado", "Otro"] as const;
type MachineDocCategory = (typeof MACHINE_DOC_CATEGORIES)[number];

export const Route = createFileRoute("/maquinas/$id")({
  component: MachineDetail,
});

function MachineDetail() {
  const { id } = useParams({ from: "/maquinas/$id" });
  const navigate = useNavigate();
  const {
    machines, records, types, settings,
    upsertComponent, deleteComponent,
    addMachineDocuments, removeMachineDocument,
  } = useMantePro();
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
  const totalCost = machineRecords.reduce((s, r) => s + (r.cost || 0), 0);

  const mtbf = completed.length > 1 ? Math.round((machine.annualHours ?? 300) / completed.length) : machine.annualHours ?? 0;
  const mttr = completed.length ? Math.round((completed.reduce((s, r) => s + (r.cost > 0 ? 3 : 1), 0) / completed.length) * 10) / 10 : 0;
  const availability = machine.status === "Operativo" ? 96.4 : machine.status === "En Revisión" ? 88.2 : machine.status === "En Taller" ? 72.5 : 0;
  const compliance = machineRecords.length > 0 ? Math.round((completed.length / machineRecords.length) * 100) : 0;

  const currentYear = new Date().getFullYear();
  const age = machine.acquisitionYear ? `${currentYear - machine.acquisitionYear} años` : "—";

  // Bar chart data — last 6 months
  const chart = useMemo(() => {
    const buckets: { label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const count = machineRecords.filter((r) => r.date.startsWith(key)).length;
      buckets.push({ label: d.toLocaleDateString("es-PE", { month: "short" }), count });
    }
    const max = Math.max(1, ...buckets.map((b) => b.count));
    return { buckets, max };
  }, [machineRecords]);

  return (
    <AppShell title={`${machine.code} — ${machine.name}`}>
      {/* HEADER */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/maquinas"><ArrowLeft className="h-4 w-4 mr-1" /> Volver a Máquinas</Link>
        </Button>
        <div className="flex items-center gap-2 mx-auto">
          <span className="font-semibold text-lg">{machine.name}</span>
          <span className="font-mono text-xs bg-primary/15 text-primary px-2 py-0.5 rounded border border-primary/30">{machine.code}</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button size="sm" variant="ghost" onClick={() => setEdit(true)}><Pencil className="h-4 w-4 mr-1" /> Editar</Button>
          <Button size="sm" variant="outline" onClick={() => printMachineSheet(machine, settings.institutionName)}>
            <Printer className="h-4 w-4 mr-1" /> Imprimir Ficha
          </Button>
        </div>
      </div>

      {/* HERO */}
      <Card className="bg-card border-border mb-4">
        <CardContent className="p-5 grid gap-5 lg:grid-cols-[2fr_3fr]">
          <div className="space-y-3">
            <div className="aspect-square w-full rounded-lg border border-border bg-secondary/40 overflow-hidden grid place-items-center">
              {machine.photo ? (
                <img src={machine.photo} alt={machine.name} className="h-full w-full object-cover" />
              ) : (
                <div className="text-center text-muted-foreground p-6">
                  <Factory className="mx-auto h-14 w-14 opacity-40" />
                  <div className="mt-2 font-mono text-sm">{machine.code}</div>
                  <div className="text-xs">Sin fotografía</div>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 justify-center">
              <StatusBadge status={machine.status} />
              <CriticalityBadge level={machine.criticality} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <Info label="Código de Identificación" value={machine.code} mono />
            <Info label="Código Patrimonial" value={machine.patrimonialCode} mono />
            <Info label="Marca / Modelo" value={`${machine.brand} / ${machine.model}`} />
            <Info label="N° de Serie" value={machine.serial} mono />
            <Info label="Año de Fabricación" value={machine.manufactureYear?.toString()} mono />
            <Info label="Año de Adquisición" value={machine.acquisitionYear?.toString()} mono />
            <Info label="Antigüedad" value={age} mono />
            <Info label="Área / Ubicación" value={machine.area || machine.location} />
            <Info label="Potencia del Motor" value={machine.powerKw ? `${machine.powerKw} kW` : undefined} mono />
            <Info label="Voltaje de Operación" value={machine.voltageV ? `${machine.voltageV} V` : undefined} mono />
            <Info label="Horas de Operación Anual" value={machine.annualHours?.toString()} mono />
            <Info label="Días de Uso por Semana" value={machine.daysPerWeek?.toString()} mono />
            <Info label="Costo del Equipo" value={machine.cost ? `S/ ${formatNumber(machine.cost, 2)}` : undefined} mono />
            <div className="sm:col-span-2 flex flex-wrap gap-2 pt-2">
              <div className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs flex items-center gap-2">
                <span className="text-muted-foreground">Estado Actual:</span> <StatusBadge status={machine.status} />
              </div>
              <div className="rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs flex items-center gap-2">
                <span className="text-muted-foreground">Nivel de Criticidad:</span> <CriticalityBadge level={machine.criticality} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TABS */}
      <Tabs defaultValue="comp">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="comp">Componentes / Piezas</TabsTrigger>
          <TabsTrigger value="hist">Historial de Mantenimiento</TabsTrigger>
          <TabsTrigger value="docs">Documentos</TabsTrigger>
          <TabsTrigger value="kpi">KPIs y Métricas</TabsTrigger>
        </TabsList>

        {/* COMPONENTES */}
        <TabsContent value="comp" className="mt-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Componentes / Piezas críticas</CardTitle>
              <Button size="sm" onClick={() => { setEditingC(null); setOpenC(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Agregar Componente
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {machine.components.length === 0 ? (
                <div className="p-10 text-center text-sm text-muted-foreground">
                  No hay componentes registrados. Agrega el primer componente.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="text-left p-3 w-12">N°</th>
                        <th className="text-left p-3">Componente</th>
                        <th className="text-left p-3">Función</th>
                        <th className="text-left p-3">Estado</th>
                        <th className="text-left p-3">Criticidad</th>
                        <th className="p-3 text-right">Acciones</th>
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

        {/* HISTORIAL */}
        <TabsContent value="hist" className="mt-4">
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              {machineRecords.length === 0 ? (
                <div className="text-center py-8">
                  <Wrench className="mx-auto h-10 w-10 text-muted-foreground/50" />
                  <div className="mt-3 font-medium">Sin historial de mantenimiento</div>
                  <Button asChild className="mt-4" size="sm"><Link to="/mantenimientos">Crear primer mantenimiento</Link></Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {machineRecords.map((r) => {
                    const t = types.find((x) => x.id === r.typeId);
                    return (
                      <div key={r.id} className="py-3 flex flex-wrap items-center gap-3">
                        <div className="font-mono text-xs text-primary min-w-[110px]">{r.otm}</div>
                        <div className="text-xs text-muted-foreground min-w-[150px]">{formatDateLong(r.date)}</div>
                        {t && (
                          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${typeColorClass(t.color)}`}>{t.name}</span>
                        )}
                        <div className="text-sm truncate max-w-[200px]">{r.technician}</div>
                        <RecordStatusBadge status={r.status} />
                        <div className="text-xs font-mono text-muted-foreground ml-auto">S/ {formatNumber(r.cost, 2)}</div>
                        <Button asChild size="sm" variant="ghost"><Link to="/mantenimientos/$id" params={{ id: r.id }}>Ver OTM</Link></Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOCUMENTOS */}
        <TabsContent value="docs" className="mt-4">
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <MachineDocs
                docs={machine.documents ?? []}
                onAdd={(d) => addMachineDocuments(machine.id, d)}
                onRemove={(docId) => { removeMachineDocument(machine.id, docId); toast.success("Documento eliminado"); }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* KPI */}
        <TabsContent value="kpi" className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi icon={Activity} label="MTBF" value={`${mtbf} h`} hint="Tiempo medio entre fallos" />
            <Kpi icon={Clock} label="MTTR" value={`${mttr} h`} hint="Tiempo medio de reparación" />
            <Kpi icon={Percent} label="Disponibilidad" value={`${availability}%`} hint="Últimos 30 días" />
            <Kpi icon={Gauge} label="Cumplimiento MP" value={`${compliance}%`} hint="Órdenes completadas" />
          </div>
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-base">Mantenimientos por mes (últimos 6 meses)</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 h-40">
                {chart.buckets.map((b) => (
                  <div key={b.label} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-secondary/40 rounded relative flex items-end" style={{ height: "100%" }}>
                      <div className="w-full bg-primary rounded transition-all" style={{ height: `${(b.count / chart.max) * 100}%` }} />
                    </div>
                    <div className="text-[10px] text-muted-foreground uppercase">{b.label}</div>
                    <div className="text-xs font-mono">{b.count}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-5 flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/15 text-primary"><DollarSign className="h-5 w-5" /></div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Costo total acumulado</div>
                <div className="text-2xl font-bold font-mono">S/ {formatNumber(totalCost, 2)}</div>
                <div className="text-xs text-muted-foreground">Suma de todas las OTMs</div>
              </div>
            </CardContent>
          </Card>
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

function RecordStatusBadge({ status }: { status: string }) {
  const cls =
    status === "Completado" ? "bg-success/15 text-success border-success/30" :
    status === "En Proceso" ? "bg-info/15 text-info border-info/30" :
    status === "Programado" ? "bg-warning/15 text-warning border-warning/30" :
    "bg-muted text-muted-foreground border-border";
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${cls}`}>{status}</span>;
}

function ComponentDialog({ open, onOpenChange, initial, onSave }: {
  open: boolean; onOpenChange: (b: boolean) => void;
  initial: CriticalComponent | null;
  onSave: (c: CriticalComponent) => void;
}) {
  const [f, setF] = useState<CriticalComponent>(initial ?? { id: Math.random().toString(36).slice(2, 10), name: "", function: "", state: "Bueno", criticality: "Medio" });
  if (open && initial && f.id !== initial.id) setF(initial);
  const STATES = ["Bueno", "Regular", "Deteriorado", "Requiere cambio"] as const;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader><DialogTitle>{initial ? "Editar componente" : "Nuevo componente"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Nombre del Componente</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
          <div><Label>Función principal</Label><Input value={f.function} onChange={(e) => setF({ ...f, function: e.target.value })} /></div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Estado actual</Label>
              <Select value={f.state} onValueChange={(v) => setF({ ...f, state: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nivel de criticidad</Label>
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
          <Button onClick={() => { if (!f.name.trim()) return toast.error("Nombre requerido"); onSave(f); onOpenChange(false); }}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Machine Documents (inline uploader, machine-scoped categories) ---------- */

const uid = () => Math.random().toString(36).slice(2, 10);
const MAX = 10 * 1024 * 1024;
const ACCEPT = ".pdf,.docx,.jpg,.jpeg,.png,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function MachineDocs({
  docs, onAdd, onRemove,
}: { docs: AppDocument[]; onAdd: (d: AppDocument[]) => void; onRemove: (id: string) => void }) {
  const [category, setCategory] = useState<MachineDocCategory>("Manual");
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<AppDocument | null>(null);

  const handle = async (files: FileList | File[]) => {
    const out: AppDocument[] = [];
    for (const f of Array.from(files)) {
      if (f.size > MAX) { toast.error(`${f.name} excede 10MB`); continue; }
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(f);
      });
      out.push({
        id: uid(), name: f.name, size: f.size, mime: f.type || "application/octet-stream",
        dataUrl,
        // Cast — we're reusing AppDocument.category loosely for machine docs
        category: category as unknown as AppDocument["category"],
        uploadedAt: new Date().toISOString(),
      });
    }
    if (out.length) { onAdd(out); toast.success(`${out.length} archivo(s) subido(s)`); }
  };

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-[220px_1fr] gap-3 items-end">
        <div>
          <Label>Categoría</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as MachineDocCategory)}>
            <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
            <SelectContent>{MACHINE_DOC_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handle(e.dataTransfer.files); }}
        className={`block cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
      >
        <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
        <div className="mt-2 text-sm font-medium">Arrastra archivos o haz clic para seleccionar</div>
        <div className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG, DOCX · máx 10MB</div>
        <input type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => e.target.files && handle(e.target.files)} />
      </label>

      {docs.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-4">Sin documentos aún.</div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {docs.map((d) => {
            const isImg = d.mime.startsWith("image/");
            return (
              <div key={d.id} className="rounded-md border border-border bg-secondary/30 overflow-hidden">
                <div className="h-28 bg-muted/30 grid place-items-center overflow-hidden">
                  {isImg
                    ? <img src={d.dataUrl} alt={d.name} className="h-full w-full object-cover cursor-pointer" onClick={() => setPreview(d)} />
                    : <FileText className="h-10 w-10 text-muted-foreground" />}
                </div>
                <div className="p-2 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-medium truncate">
                    {isImg ? <ImageIcon className="h-3 w-3 shrink-0" /> : <FileText className="h-3 w-3 shrink-0" />}
                    <span className="truncate" title={d.name}>{d.name}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {String(d.category)} · {formatDate(d.uploadedAt.slice(0, 10))}
                  </div>
                  <div className="flex gap-1 pt-1">
                    <a href={d.dataUrl} download={d.name}>
                      <Button size="sm" variant="ghost" className="h-7 px-2"><Download className="h-3.5 w-3.5" /></Button>
                    </a>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-critical ml-auto" onClick={() => onRemove(d.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/80 grid place-items-center p-4" onClick={() => setPreview(null)}>
          <img src={preview.dataUrl} alt={preview.name} className="max-h-full max-w-full rounded-md" />
        </div>
      )}
    </div>
  );
}
