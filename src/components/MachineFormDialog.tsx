import { useEffect, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMantePro, nextCode, type Machine, type MachineStatus, type Criticality } from "@/context/MantePro";
import { toast } from "sonner";
import { ImagePlus } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  machine?: Machine | null;
}

const emptyMachine = (code: string): Omit<Machine, "id"> => ({
  code, name: "", brand: "", model: "", serial: "",
  purchaseDate: "", cost: 0, area: "", department: "",
  powerKw: 0, voltageV: 220, frequencyHz: 60, weightKg: 0,
  annualHours: 0, daysPerWeek: 5,
  status: "Operativo", criticality: "Medio",
  observations: "", photo: "", hoursOfUse: 0,
  components: [],
  location: "", acquiredAt: "",
});

export function MachineFormDialog({ open, onOpenChange, machine }: Props) {
  const { machines, addMachine, updateMachine } = useMantePro();
  const [form, setForm] = useState<Omit<Machine, "id">>(() => machine ?? emptyMachine(nextCode(machines)));

  useEffect(() => {
    if (open) setForm(machine ?? emptyMachine(nextCode(machines)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, machine?.id]);

  const set = <K extends keyof Omit<Machine, "id">>(k: K, v: Omit<Machine, "id">[K]) => setForm((f) => ({ ...f, [k]: v }));

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Imagen máx. 2MB"); return; }
    const r = new FileReader();
    r.onload = () => set("photo", String(r.result));
    r.readAsDataURL(file);
  };

  const submit = () => {
    if (!form.code.trim() || !form.name.trim()) { toast.error("Código y nombre son obligatorios"); return; }
    const payload = { ...form, location: form.area ?? "", acquiredAt: form.purchaseDate ?? "" };
    if (machine) { updateMachine(machine.id, payload); toast.success("Máquina actualizada"); }
    else { addMachine(payload); toast.success(`${form.code} creada`); }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{machine ? `Editar ${machine.code}` : "Nueva máquina"}</DialogTitle></DialogHeader>

        <Section title="Identificación">
          <Field label="Código de Identificación"><Input value={form.code} onChange={(e) => set("code", e.target.value)} className="font-mono" /></Field>
          <Field label="Nombre del Equipo"><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Marca"><Input value={form.brand} onChange={(e) => set("brand", e.target.value)} /></Field>
          <Field label="Modelo"><Input value={form.model} onChange={(e) => set("model", e.target.value)} /></Field>
          <Field label="Número de Serie"><Input value={form.serial ?? ""} onChange={(e) => set("serial", e.target.value)} className="font-mono" /></Field>
          <Field label="Fecha de Compra"><Input type="date" value={form.purchaseDate ?? ""} onChange={(e) => set("purchaseDate", e.target.value)} /></Field>
          <Field label="Costo del Equipo (S/)"><Input type="number" step="0.01" value={form.cost ?? 0} onChange={(e) => set("cost", Number(e.target.value))} /></Field>
        </Section>

        <Section title="Ubicación">
          <Field label="Área / Ubicación"><Input value={form.area ?? ""} onChange={(e) => set("area", e.target.value)} /></Field>
          <Field label="Facultad / Departamento"><Input value={form.department ?? ""} onChange={(e) => set("department", e.target.value)} /></Field>
        </Section>

        <Section title="Especificaciones técnicas">
          <Field label="Potencia del Motor (kW)"><Input type="number" step="0.1" value={form.powerKw ?? 0} onChange={(e) => set("powerKw", Number(e.target.value))} /></Field>
          <Field label="Voltaje de Operación (V)"><Input type="number" value={form.voltageV ?? 0} onChange={(e) => set("voltageV", Number(e.target.value))} /></Field>
          <Field label="Frecuencia (Hz)"><Input type="number" value={form.frequencyHz ?? 0} onChange={(e) => set("frequencyHz", Number(e.target.value))} /></Field>
          <Field label="Peso (kg)"><Input type="number" value={form.weightKg ?? 0} onChange={(e) => set("weightKg", Number(e.target.value))} /></Field>
          <Field label="Horas de Operación Anual"><Input type="number" value={form.annualHours ?? 0} onChange={(e) => set("annualHours", Number(e.target.value))} /></Field>
          <Field label="Días de Uso por Semana"><Input type="number" min={0} max={7} value={form.daysPerWeek ?? 0} onChange={(e) => set("daysPerWeek", Number(e.target.value))} /></Field>
        </Section>

        <Section title="Estado">
          <Field label="Estado Actual">
            <Select value={form.status} onValueChange={(v) => set("status", v as MachineStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["Operativo", "En Revisión", "En Taller", "Fuera de Servicio"] as const).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Nivel de Criticidad">
            <Select value={form.criticality} onValueChange={(v) => set("criticality", v as Criticality)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(["Alto", "Medio", "Bajo"] as const).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </Section>

        <div className="grid gap-3">
          <Label>Observaciones</Label>
          <Textarea rows={3} value={form.observations ?? ""} onChange={(e) => set("observations", e.target.value)} />
        </div>

        <div className="grid gap-2">
          <Label>Fotografía</Label>
          <div className="flex items-center gap-3">
            <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-md border border-dashed border-border bg-secondary/40 text-muted-foreground hover:border-primary/50">
              {form.photo ? <img src={form.photo} alt="" className="h-full w-full rounded-md object-cover" /> : <ImagePlus className="h-6 w-6" />}
              <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
            </label>
            {form.photo && <Button variant="ghost" size="sm" onClick={() => set("photo", "")}>Quitar</Button>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}>{machine ? "Guardar cambios" : "Crear máquina"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-border pt-4">
      <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{title}</div>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div><Label className="text-xs">{label}</Label>{children}</div>;
}
