import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMantePro, getMachineAlertStatus, getMachineUsagePct, type UsageLog } from "@/context/MantePro";
import { Plus, Clock, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/uso-maquinas")({
  head: () => ({
    meta: [
      { title: "Uso de Máquinas — MantePro" },
      { name: "description", content: "Registro y seguimiento de horas de uso por ciclo de cada máquina." },
    ],
  }),
  component: UsoMaquinasPage,
});

// ── SVG Circular Gauge ────────────────────────────────────────────────────────
function CircularGauge({ pct }: { pct: number }) {
  const r = 40;
  const strokeW = 8;
  const circumference = 2 * Math.PI * r;
  const clampedPct = Math.min(pct, 100);
  const dashArray = (clampedPct / 100) * circumference;

  const color =
    pct >= 100 ? "#EF4444" :
    pct >= 60  ? "#F59E0B" :
                 "#22C55E";

  const textColor =
    pct >= 100 ? "#EF4444" :
    pct >= 60  ? "#F59E0B" :
                 "#22C55E";

  return (
    <svg width="96" height="96" viewBox="0 0 100 100" className="mx-auto">
      {/* Track */}
      <circle cx="50" cy="50" r={r} fill="none" stroke="#2A2D3A" strokeWidth={strokeW} />
      {/* Progress */}
      <circle
        cx="50" cy="50" r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeW}
        strokeLinecap="round"
        strokeDasharray={`${dashArray} ${circumference}`}
        strokeDashoffset="0"
        transform="rotate(-90 50 50)"
        style={{ transition: "stroke-dasharray 0.6s ease, stroke 0.3s ease" }}
      />
      {/* Center text */}
      <text
        x="50" y="46"
        textAnchor="middle"
        fill={textColor}
        fontSize="15"
        fontWeight="bold"
        fontFamily="monospace"
      >
        {pct}%
      </text>
      <text x="50" y="61" textAnchor="middle" fill="#6B7280" fontSize="9">
        uso ciclo
      </text>
    </svg>
  );
}

// ── Machine Usage Card ────────────────────────────────────────────────────────
function MachineUsageCard({ machineId, onRegister }: { machineId: string; onRegister: (id: string) => void }) {
  const { machines, usageCycles, records } = useMantePro();
  const machine = machines.find((m) => m.id === machineId);
  const cycle = usageCycles.find((c) => c.machineId === machineId);
  const threshold = machine?.threshold;

  if (!machine) return null;

  const pct = getMachineUsagePct(cycle, threshold);
  const alertStatus = getMachineAlertStatus(cycle, threshold);

  // Days since last completed maintenance
  const lastCompleted = records
    .filter((r) => r.machineId === machineId && r.status === "Completado")
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const daysSince = lastCompleted
    ? Math.floor((Date.now() - new Date(lastCompleted.date).getTime()) / 86400000)
    : null;

  const cardClass =
    alertStatus === "critical"
      ? "machine-card-critical"
      : alertStatus === "warning"
      ? "machine-card-warning"
      : "machine-card-normal";

  const statusLabel =
    alertStatus === "critical"
      ? <span className="flex items-center gap-1 text-[11px] font-semibold text-red-400"><AlertTriangle className="h-3 w-3" /> Límite superado</span>
      : alertStatus === "warning"
      ? <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-400"><AlertTriangle className="h-3 w-3" /> Atención</span>
      : <span className="text-[11px] font-semibold text-green-400">Normal</span>;

  // Cycle reset badge
  const wasReset = cycle?.otmRef;

  return (
    <Card className={`relative bg-card border-border min-w-[200px] flex-shrink-0 ${cardClass}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[11px] text-primary font-semibold">{machine.code}</span>
          {wasReset && (
            <span className="flex items-center gap-0.5 text-[10px] text-green-400">
              <RefreshCw className="h-2.5 w-2.5" /> Ciclo reiniciado
            </span>
          )}
        </div>
        <div className="text-xs font-medium truncate text-foreground mb-3 max-w-[160px]">{machine.name}</div>

        <CircularGauge pct={pct} />

        <div className="mt-3 space-y-1 text-center">
          <div className="text-xs text-muted-foreground">
            <span className="font-mono font-semibold text-foreground">
              {cycle?.horasAcumuladas.toFixed(1) ?? "0.0"}h
            </span>
            {" / "}{threshold?.horasCiclo ?? "—"}h
          </div>
          {daysSince !== null && threshold && (
            <div className="text-xs text-muted-foreground">
              <span className={`font-mono font-semibold ${daysSince >= threshold.diasMaximos ? "text-red-400" : daysSince >= threshold.diasMaximos * 0.9 ? "text-amber-400" : "text-foreground"}`}>
                {daysSince} días
              </span>
              {" / "}{threshold.diasMaximos} días máx
            </div>
          )}
          <div className="mt-1">{statusLabel}</div>
        </div>

        <Button
          size="sm"
          variant="outline"
          className="mt-3 w-full text-xs h-7"
          onClick={() => onRegister(machineId)}
        >
          <Clock className="h-3 w-3 mr-1" /> Registrar uso
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Register Usage Modal ──────────────────────────────────────────────────────
interface LogFormState {
  machineId: string;
  operador: string;
  startAt: string;
  endAt: string;
  hours: string;
  turno: string;
  observaciones: string;
}

function detectTurno(startAt: string): string {
  if (!startAt) return "Variable";
  const h = new Date(startAt).getHours();
  if (h >= 6 && h < 14) return "Mañana";
  if (h >= 14 && h < 22) return "Tarde";
  return "Noche";
}

function calcHours(start: string, end: string): number {
  if (!start || !end) return 0;
  const diff = (new Date(end).getTime() - new Date(start).getTime()) / 3600000;
  return Math.max(0, Math.round(diff * 10) / 10);
}

function RegisterModal({
  open,
  defaultMachineId,
  onClose,
}: {
  open: boolean;
  defaultMachineId?: string;
  onClose: () => void;
}) {
  const { machines, technicians, usageCycles: cycles, addUsageLog: addLog } = useMantePro();

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const defaultStart = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours() - 1)}:00`;
  const defaultEnd = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:00`;

  const [form, setForm] = useState<LogFormState>({
    machineId: defaultMachineId ?? "",
    operador: "",
    startAt: defaultStart,
    endAt: defaultEnd,
    hours: "1",
    turno: "Mañana",
    observaciones: "",
  });

  const setF = <K extends keyof LogFormState>(k: K, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleStartChange = (v: string) => {
    const h = calcHours(v, form.endAt);
    setForm((f) => ({ ...f, startAt: v, hours: String(h), turno: detectTurno(v) }));
  };
  const handleEndChange = (v: string) => {
    const h = calcHours(form.startAt, v);
    setForm((f) => ({ ...f, endAt: v, hours: String(h) }));
  };

  const machine = machines.find((m: any) => m.id === form.machineId);
  const currentCycle = cycles.find((c) => c.machineId === form.machineId);
  const threshold = machine?.threshold;
  const currentPct = getMachineUsagePct(currentCycle, threshold);

  const operators = form.machineId && machine?.threshold?.operadoresIds?.length
    ? technicians.filter((t: any) => machine?.threshold?.operadoresIds.includes(t.id))
    : technicians;

  const submit = () => {
    if (!form.machineId) { toast.error("Selecciona una máquina"); return; }
    if (!form.operador.trim()) { toast.error("Ingresa el operador"); return; }
    const hours = Number(form.hours);
    if (hours <= 0) { toast.error("Las horas deben ser mayores a 0"); return; }

    addLog({
      machineId: form.machineId,
      startAt: form.startAt,
      endAt: form.endAt,
      hours,
      operador: form.operador,
      turno: form.turno,
      observaciones: form.observaciones || undefined,
      registradoPor: "J. Mendoza",
    });

    const newAccum = (currentCycle?.horasAcumuladas ?? 0) + hours;
    const m = machines.find((x: any) => x.id === form.machineId);
    toast.success(`✓ ${hours}h registradas para ${m?.code ?? "—"}. Ciclo actual: ${newAccum.toFixed(1)}h / ${m?.threshold?.horasCiclo ?? "—"}h`);

    const newPct = threshold ? Math.round((newAccum / threshold.horasCiclo) * 100) : 0;
    if (newPct >= 100 && currentPct < 100) {
      toast.error(`🔴 ${m?.code} ha superado su límite (${newPct}% del umbral)`, { duration: 5000 });
    } else if (threshold && newPct >= threshold.alertaPct && currentPct < threshold.alertaPct) {
      toast.warning(`⚠ ${m?.code} ha alcanzado el ${newPct}% de su umbral de mantenimiento`, { duration: 5000 });
    }

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-warning" /> Registrar Uso de Máquina
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {/* Machine select with cycle % */}
          <div>
            <Label className="text-xs">Máquina</Label>
            <Select value={form.machineId} onValueChange={(v) => setF("machineId", v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar máquina…" /></SelectTrigger>
              <SelectContent>
                {machines.map((m: any) => {
                  const c = cycles.find((x: any) => x.machineId === m.id);
                  const p = getMachineUsagePct(c, m.threshold);
                  return (
                    <SelectItem key={m.id} value={m.id}>
                      <span className="font-mono">{m.code}</span> — {m.name}
                      <span className={`ml-2 text-xs ${p >= 100 ? "text-red-400" : p >= 60 ? "text-amber-400" : "text-green-400"}`}>
                        · {p}%
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {machine && threshold && (
              <div className="mt-1.5 h-1.5 rounded-full bg-border overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${currentPct >= 100 ? "bg-red-500" : currentPct >= 60 ? "bg-amber-500" : "bg-green-500"}`}
                  style={{ width: `${Math.min(currentPct, 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* Operator */}
          <div>
            <Label className="text-xs">Operador</Label>
            <Select value={form.operador} onValueChange={(v) => setF("operador", v)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar operador…" /></SelectTrigger>
              <SelectContent>
                {operators.map((t: any) => (
                  <SelectItem key={t.id} value={t.name}>{t.name} · {t.role}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Fecha y hora inicio</Label>
              <Input type="datetime-local" value={form.startAt} onChange={(e) => handleStartChange(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Fecha y hora fin</Label>
              <Input type="datetime-local" value={form.endAt} onChange={(e) => handleEndChange(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Horas trabajadas</Label>
              <Input
                type="number" min={0.5} step={0.5}
                value={form.hours}
                onChange={(e) => setF("hours", e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs">Turno</Label>
              <Select value={form.turno} onValueChange={(v) => setF("turno", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Mañana", "Tarde", "Noche", "Variable"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Observaciones (opcional)</Label>
            <Textarea
              rows={2}
              placeholder="Notas sobre el uso, condiciones, incidencias…"
              value={form.observaciones}
              onChange={(e) => setF("observaciones", e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} className="bg-warning text-warning-foreground hover:bg-warning/90">
            <Clock className="h-4 w-4 mr-1" /> Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
function UsoMaquinasPage() {
  const { machines, usageLogs, usageCycles } = useMantePro();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedMachineId, setSelectedMachineId] = useState<string | undefined>();

  // Filters for log table
  const [filterMachine, setFilterMachine] = useState("all");
  const [filterOperador, setFilterOperador] = useState("");
  const [filterTurno, setFilterTurno] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const openRegister = (machineId?: string) => {
    setSelectedMachineId(machineId);
    setModalOpen(true);
  };

  // Sort machines: critical first, then warning, then normal
  const sortedMachines = useMemo(() => {
    return [...machines].sort((a, b) => {
      const ca = usageCycles.find((c) => c.machineId === a.id);
      const cb = usageCycles.find((c) => c.machineId === b.id);
      const statusOrder = { critical: 0, warning: 1, normal: 2 };
      const sa = statusOrder[getMachineAlertStatus(ca, a.threshold)];
      const sb = statusOrder[getMachineAlertStatus(cb, b.threshold)];
      return sa - sb;
    });
  }, [machines, usageCycles]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return usageLogs.filter((l) => {
      if (filterMachine !== "all" && l.machineId !== filterMachine) return false;
      if (filterOperador && !l.operador.toLowerCase().includes(filterOperador.toLowerCase())) return false;
      if (filterTurno !== "all" && l.turno !== filterTurno) return false;
      if (filterFrom && l.startAt < filterFrom) return false;
      if (filterTo && l.endAt > filterTo + "T23:59") return false;
      return true;
    });
  }, [usageLogs, filterMachine, filterOperador, filterTurno, filterFrom, filterTo]);

  const fmtDT = (s: string) => {
    if (!s) return "—";
    try {
      return new Date(s).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
    } catch { return s; }
  };

  // KPI counts
  const criticalCount = sortedMachines.filter((m) => {
    const c = usageCycles.find((x) => x.machineId === m.id);
    return getMachineAlertStatus(c, m.threshold) === "critical";
  }).length;
  const warningCount = sortedMachines.filter((m) => {
    const c = usageCycles.find((x) => x.machineId === m.id);
    return getMachineAlertStatus(c, m.threshold) === "warning";
  }).length;

  return (
    <AppShell title="Uso de Máquinas">
      {/* ── KPI row ── */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="rounded-lg bg-card border border-border p-3">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Total máquinas</div>
          <div className="text-2xl font-bold mt-1">{machines.length}</div>
        </div>
        <div className={`rounded-lg bg-card border p-3 ${warningCount > 0 ? "border-amber-500/40" : "border-border"}`}>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">En alerta</div>
          <div className={`text-2xl font-bold mt-1 ${warningCount > 0 ? "text-amber-400" : "text-foreground"}`}>{warningCount}</div>
        </div>
        <div className={`rounded-lg bg-card border p-3 ${criticalCount > 0 ? "border-red-500/40" : "border-border"}`}>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Umbral superado</div>
          <div className={`text-2xl font-bold mt-1 ${criticalCount > 0 ? "text-red-400" : "text-foreground"}`}>{criticalCount}</div>
        </div>
      </div>

      {/* ── Live Usage Dashboard ── */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          Estado en tiempo real
        </h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {sortedMachines.map((m) => (
            <MachineUsageCard key={m.id} machineId={m.id} onRegister={openRegister} />
          ))}
        </div>
      </div>

      {/* ── Log Table ── */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          Log de Uso
        </h2>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-3">
          <Select value={filterMachine} onValueChange={setFilterMachine}>
            <SelectTrigger className="w-[180px] bg-card text-xs h-8"><SelectValue placeholder="Máquina" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las máquinas</SelectItem>
              {machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.code} — {m.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterTurno} onValueChange={setFilterTurno}>
            <SelectTrigger className="w-[130px] bg-card text-xs h-8"><SelectValue placeholder="Turno" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los turnos</SelectItem>
              {["Mañana", "Tarde", "Noche", "Variable"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input
            placeholder="Operador…" value={filterOperador}
            onChange={(e) => setFilterOperador(e.target.value)}
            className="w-[150px] bg-card text-xs h-8"
          />
          <Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="w-[140px] bg-card text-xs h-8" />
          <Input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="w-[140px] bg-card text-xs h-8" />
        </div>

        <div className="rounded-lg border border-border overflow-hidden bg-card">
          {filteredLogs.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground text-sm">
              <Clock className="mx-auto h-8 w-8 mb-2 opacity-40" />
              No hay registros de uso. Registra el primer uso con el botón +
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-secondary/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left p-3">Inicio</th>
                    <th className="text-left p-3">Fin</th>
                    <th className="text-left p-3">Máquina</th>
                    <th className="text-left p-3">Operador</th>
                    <th className="text-right p-3">Horas</th>
                    <th className="text-left p-3">Turno</th>
                    <th className="text-left p-3">Observaciones</th>
                    <th className="text-left p-3">Registrado por</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => {
                    const m = machines.find((x) => x.id === log.machineId);
                    return (
                      <tr key={log.id} className="border-t border-border hover:bg-secondary/30">
                        <td className="p-3 font-mono whitespace-nowrap">{fmtDT(log.startAt)}</td>
                        <td className="p-3 font-mono whitespace-nowrap">{fmtDT(log.endAt)}</td>
                        <td className="p-3">
                          <span className="font-mono text-primary">{m?.code ?? "—"}</span>
                          <div className="text-[11px] text-muted-foreground truncate max-w-[120px]">{m?.name}</div>
                        </td>
                        <td className="p-3">{log.operador}</td>
                        <td className="p-3 text-right font-mono font-semibold">{log.hours}h</td>
                        <td className="p-3">
                          <span className="rounded-full border border-border px-2 py-0.5 text-[10px]">{log.turno}</span>
                        </td>
                        <td className="p-3 text-muted-foreground max-w-[180px] truncate">{log.observaciones ?? "—"}</td>
                        <td className="p-3 text-muted-foreground">{log.registradoPor}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── FAB ── */}
      <button
        onClick={() => openRegister()}
        className="fab-amber fixed bottom-8 right-8 z-50 flex items-center gap-2 rounded-full bg-warning px-5 py-3 text-sm font-semibold text-black shadow-lg hover:bg-warning/90 transition-all hover:scale-105 active:scale-95"
      >
        <Plus className="h-5 w-5" />
        Registrar Uso
      </button>

      {/* ── Register Modal ── */}
      <RegisterModal
        open={modalOpen}
        defaultMachineId={selectedMachineId}
        onClose={() => { setModalOpen(false); setSelectedMachineId(undefined); }}
      />
    </AppShell>
  );
}
