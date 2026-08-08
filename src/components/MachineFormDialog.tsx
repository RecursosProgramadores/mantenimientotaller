import { useEffect, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useMantePro, nextCode, type Machine, type MachineStatus, type Criticality, type MachineThreshold } from "@/context/MantePro";
import { toast } from "sonner";
import {
  ImagePlus, Info, IdCard, CalendarClock, MapPin, Gauge, Activity,
  Clock, CalendarDays, Settings2, Sun, Moon,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  machine?: Machine | null;
}

const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"];
const DAY_NAMES = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

// ─── Horario único del taller ──────────────────────────────────────────────
// Todo el sistema opera bajo este mismo horario partido: 7:00 a. m.–1:00 p. m.
// y 3:00 p. m.–5:00 p. m. (8 h/día). No existen otros turnos: es el horario
// real y único del taller, igual para todas las máquinas.
const WORKSHOP_SCHEDULE = {
  morningStart: "7:00 a. m.",
  morningEnd: "1:00 p. m.",
  afternoonStart: "3:00 p. m.",
  afternoonEnd: "5:00 p. m.",
  hoursPerDay: 8, // 6h (7–1) + 2h (3–5)
} as const;

const defaultThreshold = (): MachineThreshold => ({
  horasCiclo: 30,
  diasMaximos: 7,
  tiposIds: [],
  alertaPct: 80,
  turno: "Tiempo completo",
  diasOperacion: [0, 1, 2, 3, 4],
  operadoresIds: [],
});

const emptyMachine = (code: string): Omit<Machine, "id"> => ({
  code, patrimonialCode: "", name: "", brand: "", model: "", serial: "",
  purchaseDate: "", manufactureYear: undefined, acquisitionYear: undefined, cost: 0,
  area: "", department: "",
  powerKw: 0, voltageV: 220, frequencyHz: 60, weightKg: 0,
  annualHours: 0, daysPerWeek: 5,
  status: "Operativo", criticality: "Medio",
  observations: "", photo: "", hoursOfUse: 0,
  components: [], documents: [],
  location: "", acquiredAt: "",
  threshold: defaultThreshold(),
});

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" });
}

export function MachineFormDialog({ open, onOpenChange, machine }: Props) {
  const { machines, types, technicians, addMachine, updateMachine } = useMantePro();
  const [form, setForm] = useState<Omit<Machine, "id">>(() => machine ?? emptyMachine(nextCode(machines)));

  useEffect(() => {
    if (open) setForm(machine ?? emptyMachine(nextCode(machines)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, machine?.id]);

  const set = <K extends keyof Omit<Machine, "id">>(k: K, v: Omit<Machine, "id">[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const setThreshold = <K extends keyof MachineThreshold>(k: K, v: MachineThreshold[K]) =>
    setForm((f) => ({ ...f, threshold: { ...(f.threshold ?? defaultThreshold()), [k]: v } }));

  const thresh = form.threshold ?? defaultThreshold();

  // Toggle day selection (0=Mon … 6=Sun)
  const toggleDay = (d: number) => {
    const curr = thresh.diasOperacion;
    const next = curr.includes(d) ? curr.filter((x) => x !== d) : [...curr, d].sort();
    setThreshold("diasOperacion", next);
  };

  // Toggle maintenance type
  const toggleType = (id: string) => {
    const curr = thresh.tiposIds;
    const next = curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id];
    setThreshold("tiposIds", next);
  };

  // Toggle operator
  const toggleOperator = (id: string) => {
    const curr = thresh.operadoresIds;
    const next = curr.includes(id) ? curr.filter((x) => x !== id) : [...curr, id];
    setThreshold("operadoresIds", next);
  };

  // Summary calculations — el taller trabaja siempre bajo el mismo horario fijo (8h/día).
  const hoursPerDay = WORKSHOP_SCHEDULE.hoursPerDay;
  const horasSemana = thresh.diasOperacion.length * hoursPerDay;
  const alertaHoras = Math.round(thresh.horasCiclo * thresh.alertaPct / 100);
  const alertaDias = Math.round(thresh.diasMaximos * thresh.alertaPct / 100);

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

  const activeTypes = types.filter((t) => t.active);
  const operators = technicians.filter((t) =>
    ["Operadora", "Operador", "Técnico Mecánico", "Técnico Eléctrico", "Técnico Predictivo"].includes(t.role),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
              <IdCard className="h-4 w-4" />
            </span>
            {machine ? `Editar ${machine.code}` : "Nueva máquina"}
          </DialogTitle>
        </DialogHeader>

        <Section title="Identificación" icon={IdCard}>
          <Field label="Código de Identificación"><Input value={form.code} onChange={(e) => set("code", e.target.value)} className="font-mono" /></Field>
          <Field label="Código Patrimonial"><Input value={form.patrimonialCode ?? ""} onChange={(e) => set("patrimonialCode", e.target.value)} className="font-mono" /></Field>
          <Field label="Nombre del Equipo"><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field label="Marca"><Input value={form.brand} onChange={(e) => set("brand", e.target.value)} /></Field>
          <Field label="Modelo"><Input value={form.model} onChange={(e) => set("model", e.target.value)} /></Field>
          <Field label="Número de Serie"><Input value={form.serial ?? ""} onChange={(e) => set("serial", e.target.value)} className="font-mono" /></Field>
        </Section>

        <Section title="Identificación y Antigüedad" icon={CalendarClock}>
          <Field label="Año de Fabricación">
            <Input type="number" min={1900} max={new Date().getFullYear()} value={form.manufactureYear ?? ""} onChange={(e) => set("manufactureYear", e.target.value ? Number(e.target.value) : undefined)} />
          </Field>
          <Field label="Año de Adquisición">
            <Input type="number" min={1900} max={new Date().getFullYear()} value={form.acquisitionYear ?? ""} onChange={(e) => set("acquisitionYear", e.target.value ? Number(e.target.value) : undefined)} />
          </Field>
          <Field label="Fecha de Compra"><Input type="date" value={form.purchaseDate ?? ""} onChange={(e) => set("purchaseDate", e.target.value)} /></Field>
          <Field label="Costo del Equipo (S/)"><Input type="number" step="0.01" value={form.cost || ''} onChange={(e) => set("cost", Number(e.target.value))} /></Field>
          <Field label="Antigüedad (años) — Calculado automáticamente">
            <Input readOnly disabled value={form.acquisitionYear ? `${new Date().getFullYear() - form.acquisitionYear} años` : "—"} className="opacity-60" />
          </Field>
        </Section>

        <Section title="Ubicación" icon={MapPin}>
          <Field label="Área / Ubicación"><Input value={form.area ?? ""} onChange={(e) => set("area", e.target.value)} /></Field>
          <Field label="Facultad / Departamento"><Input value={form.department ?? ""} onChange={(e) => set("department", e.target.value)} /></Field>
        </Section>

        <Section title="Especificaciones técnicas" icon={Gauge}>
          <Field label="Potencia del Motor (kW)"><Input type="number" step="0.1" value={form.powerKw || ''} onChange={(e) => set("powerKw", Number(e.target.value))} /></Field>
          <Field label="Voltaje de Operación (V)"><Input type="number" value={form.voltageV || ''} onChange={(e) => set("voltageV", Number(e.target.value))} /></Field>
          <Field label="Frecuencia (Hz)"><Input type="number" value={form.frequencyHz || ''} onChange={(e) => set("frequencyHz", Number(e.target.value))} /></Field>
          <Field label="Peso (kg)"><Input type="number" value={form.weightKg || ''} onChange={(e) => set("weightKg", Number(e.target.value))} /></Field>
        </Section>

        {/* ── Usage & Maintenance Thresholds ── */}
        <div className="border-t border-border pt-4">
          <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Settings2 className="h-3.5 w-3.5" />
            Configuración de Uso y Mantenimiento
          </div>

          {/* Subsection A */}
          <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary/70">
            <Gauge className="h-3.5 w-3.5" />
            A — Límites de Uso por Ciclo
          </div>
          <div className="rounded-lg border border-border/70 bg-secondary/20 p-3.5 sm:p-4 mb-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Horas de operación por ciclo">
              <Input
                type="number" min={1} value={thresh.horasCiclo}
                onChange={(e) => setThreshold("horasCiclo", Number(e.target.value))}
              />
              <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3 shrink-0" /> Horas de uso antes de requerir mantenimiento (ej: 30h)
              </p>
            </Field>
            <Field label="Días máximos entre mantenimientos">
              <Input
                type="number" min={1} value={thresh.diasMaximos}
                onChange={(e) => setThreshold("diasMaximos", Number(e.target.value))}
              />
              <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3 shrink-0" /> Máximo días sin mantenimiento, independiente de las horas
              </p>
            </Field>

            {/* Multi-select maintenance types */}
            <div className="sm:col-span-2">
              <Label className="text-xs">Tipos de mantenimiento asociados</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {activeTypes.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">Aún no hay tipos de mantenimiento activos.</p>
                )}
                {activeTypes.map((t) => {
                  const sel = thresh.tiposIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleType(t.id)}
                      className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 ${
                        sel
                          ? "bg-primary/20 border-primary text-primary shadow-sm"
                          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3 shrink-0" /> Selecciona qué tipo(s) de mantenimiento aplican a esta máquina
              </p>
            </div>

            {/* Alert threshold slider */}
            <div className="sm:col-span-2">
              <Label className="text-xs">Alerta temprana — {thresh.alertaPct}%</Label>
              <div className="mt-3 px-1">
                <Slider
                  min={10} max={90} step={5}
                  value={[thresh.alertaPct]}
                  onValueChange={([v]) => setThreshold("alertaPct", v)}
                  className="w-full cursor-pointer"
                />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-2 rounded-full bg-border overflow-hidden">
                  <div
                    className="h-full rounded-full bg-warning transition-all duration-300"
                    style={{ width: `${thresh.alertaPct}%` }}
                  />
                </div>
                <span className="text-[11px] text-warning whitespace-nowrap font-medium">
                  Alerta a las {alertaHoras}h o al día {alertaDias}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Avisa cuando se haya consumido este % del umbral
              </p>
            </div>
          </div>
          </div>

          {/* Subsection B */}
          <div className="mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-primary/70">
            <CalendarDays className="h-3.5 w-3.5" />
            B — Programación de Uso Estimado
          </div>
          <div className="rounded-lg border border-border/70 bg-secondary/20 p-3.5 sm:p-4 mb-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Horario fijo del taller — informativo, no editable */}
            <div>
              <Label className="text-xs">Horario de operación</Label>
              <div className="mt-2 rounded-md border border-border bg-card px-3 py-2.5">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Clock className="h-4 w-4 text-primary shrink-0" />
                  Horario fijo del taller
                </div>
                <div className="mt-2 flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Sun className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                    <span className="font-mono text-foreground">{WORKSHOP_SCHEDULE.morningStart} – {WORKSHOP_SCHEDULE.morningEnd}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Moon className="h-3.5 w-3.5 text-primary/70 shrink-0" />
                    <span className="font-mono text-foreground">{WORKSHOP_SCHEDULE.afternoonStart} – {WORKSHOP_SCHEDULE.afternoonEnd}</span>
                  </div>
                </div>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3 shrink-0" /> Único horario del taller ({hoursPerDay}h/día) — aplica a todas las máquinas
              </p>
            </div>

            {/* Day of week checkboxes */}
            <div>
              <Label className="text-xs">Días de operación por semana</Label>
              <div className="mt-2 flex gap-1.5 sm:gap-2">
                {DAY_LABELS.map((lbl, i) => {
                  const sel = thresh.diasOperacion.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      aria-label={DAY_NAMES[i]}
                      aria-pressed={sel}
                      title={DAY_NAMES[i]}
                      onClick={() => toggleDay(i)}
                      className={`h-10 w-10 shrink-0 cursor-pointer rounded-md text-xs font-semibold border transition-all duration-150 ${
                        sel
                          ? "bg-primary text-primary-foreground border-primary shadow-sm scale-100"
                          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {lbl}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3 shrink-0" />
                {thresh.diasOperacion.length} día{thresh.diasOperacion.length === 1 ? "" : "s"}/semana · {horasSemana}h/semana
              </p>
            </div>

            {/* Multi-select operators */}
            <div className="sm:col-span-2">
              <Label className="text-xs">Operadores asignados</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {operators.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">Aún no hay operadores/técnicos registrados.</p>
                )}
                {operators.map((tech) => {
                  const sel = thresh.operadoresIds.includes(tech.id);
                  return (
                    <button
                      key={tech.id}
                      type="button"
                      onClick={() => toggleOperator(tech.id)}
                      className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 ${
                        sel
                          ? "bg-info/20 border-info text-info shadow-sm"
                          : "border-border text-muted-foreground hover:border-info/40 hover:text-foreground"
                      }`}
                    >
                      {tech.name} · {tech.role}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          </div>

          {/* Summary card */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3.5">
            <div className="text-xs font-semibold text-primary mb-2.5 flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5" /> Resumen estimado
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">{horasSemana}h</div>
                <div className="text-[11px] text-muted-foreground">operará / semana</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-foreground">c/{thresh.diasMaximos} días</div>
                <div className="text-[11px] text-muted-foreground">mantenimiento</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-primary">{addDays(thresh.diasMaximos)}</div>
                <div className="text-[11px] text-muted-foreground">próx. mant. sugerido</div>
              </div>
            </div>
          </div>
        </div>

        <Section title="Estado" icon={Activity}>
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
            <label className="flex h-24 w-24 cursor-pointer items-center justify-center rounded-md border border-dashed border-border bg-secondary/40 text-muted-foreground transition-colors duration-150 hover:border-primary/50 hover:text-primary/80">
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
