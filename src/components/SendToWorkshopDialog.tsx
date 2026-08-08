import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useMantePro, PROBLEM_TYPES, WORKSHOP_CONDITIONS, type ProblemType, type WorkshopCondition } from "@/context/MantePro";
import { DocumentUploader } from "@/components/DocumentUploader";
import { sanitizePhone } from "@/lib/format";
import { toast } from "sonner";

const todayISO = () => new Date().toISOString().slice(0, 10);

// Diálogo de "Enviar máquina a taller externo": es el único punto del
// sistema que debe crear un registro real en envios_taller (vía
// addWorkshopRecord). Se usa tanto en Talleres Externos (botón "Enviar a
// taller") como en Máquinas (botón "Taller" de cada tarjeta), para que
// ambos flujos queden siempre vinculados al mismo dato real y nunca se
// vuelva a desincronizar el badge de la máquina del módulo de Talleres.
export function SendToWorkshopDialog({
  onClose,
  onSubmit,
  defaultMachineId,
}: {
  onClose: () => void;
  onSubmit: (r: any) => void;
  defaultMachineId?: string;
}) {
  const { machines, workshops } = useMantePro();
  const [machineId, setMachineId] = useState(defaultMachineId || "");
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
  const [authorizedBy, setAuthorizedBy] = useState("ING. JOHNNY BRYNNER VILCHEZ MIRANDA");
  const [technician, setTechnician] = useState("ING. JOHNNY BRYNNER VILCHEZ MIRANDA");
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
            <Select value={machineId} onValueChange={setMachineId} disabled={!!defaultMachineId}>
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
          <div><Label>Teléfono</Label><Input inputMode="numeric" maxLength={9} value={workshopPhone} onChange={(e) => setWorkshopPhone(sanitizePhone(e.target.value))} /></div>
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
          <div><Label>Presupuesto aprobado (S/)</Label><Input type="number" step="0.01" value={approvedBudget || ''} onChange={(e) => setApprovedBudget(Number(e.target.value))} /></div>
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
