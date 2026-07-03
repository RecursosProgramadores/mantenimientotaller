import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useMantePro, PROBLEM_TYPES, WORKSHOP_CONDITIONS, type ProblemType, type WorkshopCondition, type WorkshopRecordStatus } from "@/context/MantePro";
import { DocumentUploader } from "@/components/DocumentUploader";
import { formatDate } from "@/lib/format";
import { Plus, Store, Clock, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/talleres-externos")({
  head: () => ({ meta: [{ title: "Talleres Externos — MantePro" }, { name: "description", content: "Envíos a talleres externos y seguimiento." }] }),
  component: Page,
});

const todayISO = () => new Date().toISOString().slice(0, 10);

function StatusPill({ s }: { s: WorkshopRecordStatus }) {
  const cls = s === "En Taller" ? "bg-warning/15 text-warning border-warning/30"
    : s === "Devuelto" ? "bg-success/15 text-success border-success/30"
    : "bg-muted text-muted-foreground border-border";
  return <span className={`inline-flex px-2 py-0.5 rounded-md border text-[11px] font-medium ${cls}`}>{s}</span>;
}

function Page() {
  const { workshopRecords, machines, addWorkshopRecord } = useMantePro();
  const [view, setView] = useState<"cards" | "timeline">("cards");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [machineFilter, setMachineFilter] = useState<string>("all");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => workshopRecords.filter((r) =>
    (statusFilter === "all" || r.status === statusFilter) &&
    (machineFilter === "all" || r.machineId === machineFilter),
  ), [workshopRecords, statusFilter, machineFilter]);

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
            <SendDialog onClose={() => setOpen(false)} onSubmit={(r) => { addWorkshopRecord(r); toast.success("Envío registrado"); setOpen(false); }} />
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
                  <div className="mt-3 flex justify-end">
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

function SendDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (r: any) => void }) {
  const { machines, workshops } = useMantePro();
  const [machineId, setMachineId] = useState("");
  const [sentDate, setSentDate] = useState(todayISO());
  const [workshopName, setWorkshopName] = useState("");
  const [workshopAddress, setWorkshopAddress] = useState("");
  const [workshopPhone, setWorkshopPhone] = useState("");
  const [workshopContact, setWorkshopContact] = useState("");
  const [estimatedReturn, setEstimatedReturn] = useState("");
  const [problemType, setProblemType] = useState<ProblemType>("Falla mecánica");
  const [problemDescription, setProblemDescription] = useState("");
  const [affectedComponentIds, setAffectedComponentIds] = useState<string[]>([]);
  const [condition, setCondition] = useState<WorkshopCondition>("Parcialmente operativo");
  const [approvedBudget, setApprovedBudget] = useState(0);
  const [authorizedBy, setAuthorizedBy] = useState("J. Mendoza");
  const [technician, setTechnician] = useState("J. Mendoza");
  const [documents, setDocuments] = useState<any[]>([]);

  const machine = machines.find((m) => m.id === machineId);

  const submit = () => {
    if (!machineId) return toast.error("Selecciona una máquina");
    if (!workshopName) return toast.error("Indica el taller");
    if (!problemDescription) return toast.error("Describe el problema");
    onSubmit({
      machineId, sentDate, workshopName, workshopAddress, workshopPhone, workshopContact,
      estimatedReturn, problemType, problemDescription, affectedComponentIds,
      condition, approvedBudget: Number(approvedBudget) || 0, authorizedBy,
      status: "En Taller", technician, documents, logs: [
        { id: Math.random().toString(36).slice(2), at: new Date().toISOString(), note: "Equipo enviado al taller externo.", status: "En Taller" },
      ],
    });
  };

  return (
    <DialogContent className="bg-card border-border max-w-3xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Enviar máquina a taller externo</DialogTitle></DialogHeader>

      <section className="space-y-3">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground">1. Identificación</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Máquina</Label>
            <Select value={machineId} onValueChange={setMachineId}>
              <SelectTrigger className="bg-card border-border"><SelectValue placeholder="Selecciona…" /></SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.code} — {m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Fecha de envío</Label><Input type="date" value={sentDate} onChange={(e) => setSentDate(e.target.value)} /></div>
          <div>
            <Label>Nombre del taller</Label>
            <Input list="ws-list" value={workshopName} onChange={(e) => setWorkshopName(e.target.value)} />
            <datalist id="ws-list">{workshops.map((w) => <option key={w.id} value={w.name} />)}</datalist>
          </div>
          <div><Label>Dirección</Label><Input value={workshopAddress} onChange={(e) => setWorkshopAddress(e.target.value)} /></div>
          <div><Label>Teléfono</Label><Input value={workshopPhone} onChange={(e) => setWorkshopPhone(e.target.value)} /></div>
          <div><Label>Persona de contacto</Label><Input value={workshopContact} onChange={(e) => setWorkshopContact(e.target.value)} /></div>
          <div><Label>Fecha estimada de retorno</Label><Input type="date" value={estimatedReturn} onChange={(e) => setEstimatedReturn(e.target.value)} /></div>
          <div><Label>Técnico responsable</Label><Input value={technician} onChange={(e) => setTechnician(e.target.value)} /></div>
        </div>
      </section>

      <section className="space-y-3 mt-4">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground">2. Motivo y diagnóstico</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Tipo de problema</Label>
            <Select value={problemType} onValueChange={(v) => setProblemType(v as ProblemType)}>
              <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {PROBLEM_TYPES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Condición al enviar</Label>
            <Select value={condition} onValueChange={(v) => setCondition(v as WorkshopCondition)}>
              <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {WORKSHOP_CONDITIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Presupuesto aprobado (S/)</Label><Input type="number" value={approvedBudget} onChange={(e) => setApprovedBudget(Number(e.target.value))} /></div>
          <div><Label>Autorizado por</Label><Input value={authorizedBy} onChange={(e) => setAuthorizedBy(e.target.value)} /></div>
        </div>
        <div><Label>Descripción detallada del problema</Label><Textarea rows={3} value={problemDescription} onChange={(e) => setProblemDescription(e.target.value)} /></div>
        {machine && machine.components.length > 0 && (
          <div>
            <Label>Componentes afectados</Label>
            <div className="mt-2 grid sm:grid-cols-2 gap-2">
              {machine.components.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={affectedComponentIds.includes(c.id)}
                    onCheckedChange={(v) => setAffectedComponentIds((x) => v ? [...x, c.id] : x.filter((i) => i !== c.id))}
                  />
                  <span>{c.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3 mt-4">
        <h3 className="text-xs uppercase tracking-wider text-muted-foreground">3. Ficha técnica de envío</h3>
        <DocumentUploader
          documents={documents}
          onAdd={(d) => setDocuments((x) => [...x, ...d])}
          onRemove={(id) => setDocuments((x) => x.filter((d) => d.id !== id))}
        />
      </section>

      <DialogFooter className="mt-4">
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={submit}>Registrar envío</Button>
      </DialogFooter>
    </DialogContent>
  );
}
