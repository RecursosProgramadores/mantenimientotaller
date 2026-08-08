import { useEffect, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useMantePro, nextOTM,
  type MaintenanceRecord, type RecordStatus, type RecordActivity, type RecordPart,
} from "@/context/MantePro";
import { Plus, X, ClipboardList, Users, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  recordId?: string | null;
  prefill?: {
    machineId?: string;
    typeId?: string;
    notes?: string;
    status?: import("@/context/MantePro").RecordStatus;
    urgent?: boolean;
  };
}

const uid = () => Math.random().toString(36).slice(2, 10);

function emptyRecord(otm: string): Omit<MaintenanceRecord, "id"> {
  return {
    otm, machineId: "", typeId: "", date: new Date().toISOString().slice(0, 10),
    startTime: "08:00", endTime: "", technician: "", supervisor: "", area: "",
    status: "Programado", notes: "",
    activities: [], parts: [], laborCost: 0, cost: 0,
    postState: "", nextDate: "", nextTypeId: "", findings: "",
    technicianSignature: "", supervisorSignature: "",
  };
}

export function MaintenanceFormDialog({ open, onOpenChange, recordId, prefill }: Props) {
  const { records, machines, types, technicians, spareParts, addRecord, updateRecord } = useMantePro();
  const existing = recordId ? records.find((r) => r.id === recordId) : null;

  const [f, setF] = useState<Omit<MaintenanceRecord, "id">>(() => {
    if (existing) return existing;
    const base = emptyRecord(nextOTM(records));
    if (prefill) {
      return {
        ...base,
        machineId: prefill.machineId ?? base.machineId,
        typeId: prefill.typeId ?? base.typeId,
        notes: prefill.notes ?? base.notes,
        status: prefill.status ?? base.status,
      };
    }
    return base;
  });

  useEffect(() => {
    if (open) {
      if (existing) { setF(existing); return; }
      const base = emptyRecord(nextOTM(records));
      setF(prefill ? {
        ...base,
        machineId: prefill.machineId ?? "",
        typeId: prefill.typeId ?? "",
        notes: prefill.notes ?? "",
        status: prefill.status ?? "En Proceso",
      } : base);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, recordId]);

  const set = <K extends keyof Omit<MaintenanceRecord, "id">>(k: K, v: Omit<MaintenanceRecord, "id">[K]) =>
    setF((x) => ({ ...x, [k]: v }));

  const machine = machines.find((m) => m.id === f.machineId);
  const type = types.find((t) => t.id === f.typeId);

  // When type changes, prefill activities from type checklist if empty
  useEffect(() => {
    if (!type) return;
    if (f.activities.length === 0) {
      set("activities", type.activities.map((a) => ({ id: uid(), text: a.text, done: false, observations: "" })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type?.id]);

  const partsTotal = f.parts.reduce((s, p) => s + p.quantity * p.unitCost, 0);
  const total = partsTotal + (f.laborCost || 0);

  const submit = async () => {
    if (!f.machineId || !f.typeId) { toast.error("Máquina y tipo requeridos"); return; }
    const payload = { ...f, cost: total, area: f.area || machine?.area || "" };
    // Antes esto no esperaba la respuesta de la base de datos: se mostraba
    // "creada"/"actualizada" y se cerraba el modal de inmediato aunque el
    // guardado hubiera fallado (por ejemplo por un número de OTM duplicado),
    // y la orden nunca aparecía en la lista. Ahora se espera el resultado
    // real; si falla, el modal permanece abierto (ya se mostró el error).
    if (existing) {
      const ok = await updateRecord(existing.id, payload);
      if (!ok) return;
    } else {
      const otm = await addRecord(payload);
      if (!otm) return;
    }
    onOpenChange(false);
  };

  const updActivity = (id: string, patch: Partial<RecordActivity>) =>
    set("activities", f.activities.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const addActivity = () => set("activities", [...f.activities, { id: uid(), text: "", done: false, observations: "" }]);
  const rmActivity = (id: string) => set("activities", f.activities.filter((a) => a.id !== id));

  const updPart = (id: string, patch: Partial<RecordPart>) =>
    set("parts", f.parts.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const addPart = () => set("parts", [...f.parts, { id: uid(), name: "", quantity: 1, unitCost: 0 }]);
  const rmPart = (id: string) => set("parts", f.parts.filter((p) => p.id !== id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {prefill?.urgent && <span className="rounded bg-critical/10 px-2 py-0.5 text-xs text-critical font-semibold">URGENTE</span>}
            {existing ? `Editar ${existing.otm}` : `Nueva orden — ${f.otm}`}
          </DialogTitle>
        </DialogHeader>

        <Section title="1. Orden de Trabajo" icon={ClipboardList}>
          <Field label="N° OTM">
            {existing ? (
              <Input value={f.otm} onChange={(e) => set("otm", e.target.value)} className="font-mono" />
            ) : (
              <>
                <Input value={f.otm} disabled className="font-mono bg-muted text-muted-foreground" />
                <p className="mt-1 text-[11px] text-muted-foreground">Se genera automáticamente al guardar (evita números duplicados).</p>
              </>
            )}
          </Field>
          <Field label="Máquina">
            <Select value={f.machineId} onValueChange={(v) => set("machineId", v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.code} — {m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Código del Equipo"><Input value={machine?.code ?? ""} readOnly className="font-mono bg-muted" /></Field>
          <Field label="Tipo de Mantenimiento">
            <Select value={f.typeId} onValueChange={(v) => set("typeId", v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>
                {types.filter((t) => t.active).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Fecha programada"><Input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
          <Field label="Estado">
            <Select value={f.status} onValueChange={(v) => set("status", v as RecordStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["Programado", "En Proceso", "Completado", "Cancelado"] as const).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Hora inicio"><Input type="time" value={f.startTime ?? ""} onChange={(e) => set("startTime", e.target.value)} /></Field>
          <Field label="Hora fin"><Input type="time" value={f.endTime ?? ""} onChange={(e) => set("endTime", e.target.value)} /></Field>
        </Section>

        <Section title="2. Técnico y Responsables" icon={Users}>
          <Field label="Técnico Responsable">
            <Input
              list="tecnicos-sugeridos"
              value={f.technician}
              onChange={(e) => set("technician", e.target.value)}
              placeholder="Nombre del técnico"
            />
          </Field>
          <Field label="Supervisor">
            <Input
              list="tecnicos-sugeridos"
              value={f.supervisor ?? ""}
              onChange={(e) => set("supervisor", e.target.value)}
              placeholder="Nombre del supervisor"
            />
          </Field>
          {/* Lista de sugerencias basada en usuarios ya registrados, pero el
              campo acepta cualquier nombre — no está restringido a esta lista.
              Técnico y Supervisor son independientes entre sí: elegir uno no
              limita ni afecta las opciones del otro. */}
          <datalist id="tecnicos-sugeridos">
            {technicians.map((t) => <option key={t.id} value={t.name} />)}
          </datalist>
          <Field label="Área"><Input value={f.area ?? ""} onChange={(e) => set("area", e.target.value)} placeholder={machine?.area} /></Field>
        </Section>

        <div className="border-t border-border pt-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">3. Actividades Realizadas</div>
            <Button size="sm" variant="ghost" onClick={addActivity}><Plus className="h-4 w-4 mr-1" /> Actividad</Button>
          </div>
          {f.activities.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground text-center">
              Selecciona un tipo para precargar el checklist.
            </div>
          ) : (
            <div className="space-y-2">
              {f.activities.map((a) => (
                <div key={a.id} className="rounded-md border border-border bg-secondary/30 p-2 space-y-2">
                  <div className="flex items-start gap-2">
                    <input type="checkbox" className="mt-2 h-4 w-4 accent-[var(--primary)]" checked={a.done} onChange={(e) => updActivity(a.id, { done: e.target.checked })} />
                    <Input value={a.text} onChange={(e) => updActivity(a.id, { text: e.target.value })} placeholder="Actividad" />
                    <Button size="sm" variant="ghost" className="text-critical" onClick={() => rmActivity(a.id)}><X className="h-4 w-4" /></Button>
                  </div>
                  <Input value={a.observations ?? ""} onChange={(e) => updActivity(a.id, { observations: e.target.value })} placeholder="Observaciones (opcional)" className="bg-card" />
                </div>
              ))}
            </div>
          )}
          <div className="mt-3">
            <Label>Notas / Observaciones</Label>
            <Textarea rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">4. Repuestos y Costos</div>
            <Button size="sm" variant="ghost" onClick={addPart}><Plus className="h-4 w-4 mr-1" /> Repuesto</Button>
          </div>
          {f.parts.length > 0 && (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr><th className="text-left p-2">Repuesto / Insumo</th><th className="text-right p-2 w-24">Cant.</th><th className="text-right p-2 w-32">C. Unit. (S/)</th><th className="text-right p-2 w-32">Subtotal</th><th className="w-10"></th></tr>
                </thead>
                <tbody>
                  {f.parts.map((p) => (
                    <tr key={p.id} className="border-t border-border">
                      <td className="p-2">
                        <Input
                          list="repuestos-catalogo"
                          value={p.name}
                          onChange={(e) => {
                            const name = e.target.value;
                            // Si el nombre escrito coincide con uno del catálogo
                            // (venga de la lista sugerida o tipeado a mano), se
                            // autocompleta el costo unitario desde el catálogo.
                            // Si no coincide con nada, se guarda igual como
                            // repuesto/insumo personalizado — no es obligatorio
                            // que exista en el catálogo.
                            const match = spareParts.find((sp) => sp.name.trim().toLowerCase() === name.trim().toLowerCase());
                            updPart(p.id, match ? { name: match.name, unitCost: match.price } : { name });
                          }}
                          placeholder="Del catálogo o escribe uno nuevo"
                        />
                      </td>
                      <td className="p-2"><Input type="number" min={0} value={p.quantity || ''} onChange={(e) => updPart(p.id, { quantity: Number(e.target.value) })} className="text-right" /></td>
                      <td className="p-2"><Input type="number" step="0.01" min={0} value={p.unitCost || ''} onChange={(e) => updPart(p.id, { unitCost: Number(e.target.value) })} className="text-right" /></td>
                      <td className="p-2 text-right font-mono">{(p.quantity * p.unitCost).toFixed(2)}</td>
                      <td className="p-2"><Button size="sm" variant="ghost" className="text-critical" onClick={() => rmPart(p.id)}><X className="h-4 w-4" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <datalist id="repuestos-catalogo">
            {spareParts.map((sp) => (
              <option key={sp.id} value={sp.name}>
                {sp.name}{sp.reference ? ` — ${sp.reference}` : ""} (S/ {sp.price.toFixed(2)})
              </option>
            ))}
          </datalist>
          {spareParts.length === 0 && (
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Aún no hay repuestos en el catálogo — puedes escribir uno manualmente, o agrégalos en Configuración → Catálogo de repuestos para que aparezcan aquí como sugerencia.
            </p>
          )}
          <div className="mt-3 grid sm:grid-cols-2 gap-3">
            <Field label="Mano de obra (S/)"><Input type="number" step="0.01" value={f.laborCost || ''} onChange={(e) => set("laborCost", Number(e.target.value))} /></Field>
            <div className="flex flex-col justify-end">
              <Label className="text-xs">Total general</Label>
              <div className="h-9 flex items-center justify-end rounded-md border border-border bg-secondary px-3 font-mono text-lg font-semibold text-primary">
                S/ {total.toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <Section title="5. Resultado y Seguimiento" icon={CheckCircle2}>
          <Field label="Estado del equipo post-mantenimiento">
            <Input value={f.postState ?? ""} onChange={(e) => set("postState", e.target.value)} placeholder="Operativo / Requiere seguimiento…" />
          </Field>
          <Field label="Próximo mantenimiento (fecha)"><Input type="date" value={f.nextDate ?? ""} onChange={(e) => set("nextDate", e.target.value)} /></Field>
          <Field label="Próximo tipo">
            <Select value={f.nextTypeId ?? ""} onValueChange={(v) => set("nextTypeId", v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                {types.filter((t) => t.active).map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Label>Hallazgos importantes</Label>
            <Textarea rows={2} value={f.findings ?? ""} onChange={(e) => set("findings", e.target.value)} />
          </div>
          <Field label="Firma técnico"><Input value={f.technicianSignature ?? ""} onChange={(e) => set("technicianSignature", e.target.value)} placeholder="Nombre y fecha" /></Field>
          <Field label="Firma supervisor"><Input value={f.supervisorSignature ?? ""} onChange={(e) => set("supervisorSignature", e.target.value)} placeholder="Nombre y fecha" /></Field>
        </Section>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={submit}
            className={prefill?.urgent && !existing ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : ""}
          >
            {existing ? "Guardar cambios" : prefill?.urgent ? "Crear OTM Urgente" : "Crear OTM"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon?: React.ComponentType<{ className?: string }>; children: ReactNode }) {
  return (
    <div className="border-t border-border pt-4">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {title}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><Label className="text-xs">{label}</Label>{children}</div>;
}
