import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMantePro, typeColorClass, type RecordStatus } from "@/context/MantePro";
import { MaintenanceFormDialog } from "@/components/MaintenanceFormDialog";
import { ArrowLeft, Printer, Pencil, Check, X, Play } from "lucide-react";
import { toast } from "sonner";
import { formatDate, formatDateLong } from "@/lib/format";

export const Route = createFileRoute("/mantenimientos/$id")({
  component: Detail,
});

const statusTones: Record<RecordStatus, string> = {
  "Completado": "bg-success/15 text-success border-success/30",
  "Programado": "bg-info/15 text-info border-info/30",
  "En Proceso": "bg-warning/15 text-warning border-warning/30",
  "Cancelado": "bg-muted text-muted-foreground border-border",
};

function Detail() {
  const { id } = useParams({ from: "/mantenimientos/$id" });
  const navigate = useNavigate();
  const { records, machines, types, updateRecord } = useMantePro();
  const r = records.find((x) => x.id === id);
  const [edit, setEdit] = useState(false);

  if (!r) return (
    <AppShell title="OTM no encontrada">
      <Card className="bg-card border-border"><CardContent className="p-10 text-center">
        <div className="font-medium">No existe esta orden</div>
        <Button className="mt-4" onClick={() => navigate({ to: "/mantenimientos" })}>Volver</Button>
      </CardContent></Card>
    </AppShell>
  );

  const m = machines.find((x) => x.id === r.machineId);
  const t = types.find((x) => x.id === r.typeId);
  const nt = types.find((x) => x.id === r.nextTypeId);
  const partsTotal = r.parts.reduce((s, p) => s + p.quantity * p.unitCost, 0);

  const changeStatus = (s: RecordStatus) => { updateRecord(r.id, { status: s }); toast.success(`Estado: ${s}`); };

  return (
    <AppShell title={`${r.otm} — ${m?.name ?? "—"}`}>
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <Button asChild variant="ghost" size="sm"><Link to="/mantenimientos"><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Link></Button>
        <Button size="sm" variant="ghost" onClick={() => setEdit(true)}><Pencil className="h-4 w-4 mr-1" /> Editar</Button>
        <Button size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Imprimir OTM</Button>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Cambiar estado:</span>
          <Select value={r.status} onValueChange={(v) => changeStatus(v as RecordStatus)}>
            <SelectTrigger className="w-[160px] bg-card"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(["Programado", "En Proceso", "Completado", "Cancelado"] as const).map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="print-area space-y-4">
        {/* Header sheet */}
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">MantePro — Orden de Trabajo de Mantenimiento</div>
                <h2 className="text-2xl font-bold font-mono text-primary">{r.otm}</h2>
                <div className="text-sm text-muted-foreground">Emitida {formatDateLong(r.date)}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {t && <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs ${typeColorClass(t.color)}`}>{t.name}</span>}
                <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs ${statusTones[r.status]}`}>{r.status}</span>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-4 text-sm">
              <Info label="Máquina" value={m?.name} />
              <Info label="Código" value={m?.code} mono />
              <Info label="Marca / Modelo" value={m ? `${m.brand} / ${m.model}` : "—"} />
              <Info label="Área" value={r.area || m?.area} />
              <Info label="Técnico responsable" value={r.technician} />
              <Info label="Supervisor" value={r.supervisor} />
              <Info label="Hora inicio" value={r.startTime} mono />
              <Info label="Hora fin" value={r.endTime} mono />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Actividades realizadas</CardTitle></CardHeader>
          <CardContent className="p-0">
            {r.activities.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">Sin actividades registradas.</div>
            ) : (
              <ul className="divide-y divide-border">
                {r.activities.map((a) => (
                  <li key={a.id} className="flex items-start gap-3 p-3">
                    {a.done ? <Check className="h-4 w-4 text-success mt-1" /> : <X className="h-4 w-4 text-muted-foreground mt-1" />}
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm ${a.done ? "" : "text-muted-foreground"}`}>{a.text}</div>
                      {a.observations && <div className="text-xs text-muted-foreground mt-0.5">↳ {a.observations}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {r.notes && <div className="border-t border-border p-4 text-sm"><span className="text-xs uppercase tracking-wider text-muted-foreground">Observaciones generales</span><p className="mt-1">{r.notes}</p></div>}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Repuestos y costos</CardTitle></CardHeader>
          <CardContent>
            {r.parts.length === 0 ? (
              <div className="text-sm text-muted-foreground">Sin repuestos.</div>
            ) : (
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr><th className="text-left p-2">Repuesto / Insumo</th><th className="text-right p-2">Cant.</th><th className="text-right p-2">C. Unit. (S/)</th><th className="text-right p-2">Subtotal</th></tr>
                  </thead>
                  <tbody>
                    {r.parts.map((p) => (
                      <tr key={p.id} className="border-t border-border">
                        <td className="p-2">{p.name}</td>
                        <td className="p-2 text-right font-mono">{p.quantity}</td>
                        <td className="p-2 text-right font-mono">{p.unitCost.toFixed(2)}</td>
                        <td className="p-2 text-right font-mono">{(p.quantity * p.unitCost).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-3 grid gap-1 text-sm sm:grid-cols-3 text-right">
              <div><span className="text-muted-foreground">Repuestos:</span> <span className="font-mono">S/ {partsTotal.toFixed(2)}</span></div>
              <div><span className="text-muted-foreground">Mano de obra:</span> <span className="font-mono">S/ {r.laborCost.toFixed(2)}</span></div>
              <div className="font-semibold text-primary">Total: <span className="font-mono">S/ {(partsTotal + r.laborCost).toFixed(2)}</span></div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Resultado y seguimiento</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
            <Info label="Estado post-mantenimiento" value={r.postState} />
            <Info label="Próximo mantenimiento" value={r.nextDate ? `${formatDate(r.nextDate)}${nt ? ` · ${nt.name}` : ""}` : "—"} />
            {r.findings && <div className="sm:col-span-2"><div className="text-xs uppercase tracking-wider text-muted-foreground">Hallazgos importantes</div><p className="mt-1">{r.findings}</p></div>}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="grid sm:grid-cols-2 gap-6 p-6">
            <Signature label="Firma técnico" value={r.technicianSignature} />
            <Signature label="Firma supervisor" value={r.supervisorSignature} />
          </CardContent>
        </Card>
      </div>

      <MaintenanceFormDialog open={edit} onOpenChange={setEdit} recordId={r.id} />

      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          body { background: white !important; }
          .print\\:hidden { display: none !important; }
          aside, header { display: none !important; }
          main { padding: 0 !important; }
          .print-area * { color: black !important; }
          .print-area .bg-card { background: white !important; border: 1px solid #ccc !important; }
          .print-area .text-primary { color: #b45309 !important; }
        }
      `}</style>
    </AppShell>
  );
}

function Info({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-0.5 ${mono ? "font-mono" : ""}`}>{value || "—"}</div>
    </div>
  );
}

function Signature({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <div className="h-16 border-b border-border" />
      <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value || "—"}</div>
    </div>
  );
}
