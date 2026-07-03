import { formatDate, formatDateLong } from "@/lib/format";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CriticalityBadge } from "@/components/CriticalityBadge";
import { StatusBadge } from "@/components/StatusBadge";
import { useMantePro } from "@/context/MantePro";
import { Printer, FileText, Paperclip, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/fichas-tecnicas")({
  head: () => ({
    meta: [
      { title: "Fichas Técnicas — MantePro" },
      { name: "description", content: "Fichas técnicas detalladas de cada máquina." },
    ],
  }),
  component: Page,
});

function Page() {
  const { machines, sheets } = useMantePro();
  const [selected, setSelected] = useState<string>(machines[0]?.id ?? "");
  const machine = machines.find((m) => m.id === selected);

  if (!machine) return <AppShell title="Fichas Técnicas"><div className="text-sm text-muted-foreground">Sin máquinas.</div></AppShell>;

  const attached = sheets.filter((s) => s.machineId === machine.id);

  return (
    <AppShell title="Fichas Técnicas">
      <div className="mb-4 flex flex-wrap items-center gap-3 print:hidden">
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-[320px] bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            {machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.code} — {m.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto text-xs text-muted-foreground">
          Última actualización: <span className="text-foreground">{machine.sheetUpdatedAt || "—"}</span>
        </div>
        <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Imprimir</Button>
      </div>

      <div id="ficha-print" className="print-area space-y-4">
        <Card className="bg-card border-border">
          <CardContent className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Ficha Técnica</div>
                <h2 className="text-2xl font-bold">{machine.name}</h2>
                <div className="text-sm text-muted-foreground">
                  <span className="font-mono text-primary">{machine.code}</span> · {machine.brand} {machine.model}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge status={machine.status} />
                <CriticalityBadge level={machine.criticality} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Información general</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <Info label="Marca" value={machine.brand} />
            <Info label="Modelo" value={machine.model} />
            <Info label="N° de Serie" value={machine.serial} mono />
            <Info label="Fecha de compra" value={machine.purchaseDate ? formatDate(machine.purchaseDate) : "—"} />
            <Info label="Costo" value={machine.cost ? `S/ ${machine.cost.toFixed(2).replace(/\B(?=(\d{3})+(?!\d\.))/g, ",")}` : "—"} />
            <Info label="Área" value={machine.area || machine.location} />
            <Info label="Departamento" value={machine.department} />
            <Info label="Horas anuales" value={machine.annualHours?.toString()} mono />
            <Info label="Días por semana" value={machine.daysPerWeek?.toString()} mono />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Parámetros de operación</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <Info label="Potencia del motor" value={machine.powerKw ? `${machine.powerKw} kW` : "—"} mono />
            <Info label="Voltaje" value={machine.voltageV ? `${machine.voltageV} V` : "—"} mono />
            <Info label="Frecuencia" value={machine.frequencyHz ? `${machine.frequencyHz} Hz` : "—"} mono />
            <Info label="Peso" value={machine.weightKg ? `${machine.weightKg} kg` : "—"} mono />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Componentes críticos</CardTitle></CardHeader>
          <CardContent className="p-0">
            {machine.components.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">Sin componentes registrados.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left p-3 w-12">N°</th>
                      <th className="text-left p-3">Componente</th>
                      <th className="text-left p-3">Función</th>
                      <th className="text-left p-3">Estado actual</th>
                      <th className="text-left p-3">Criticidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {machine.components.map((c, i) => (
                      <tr key={c.id} className="border-t border-border">
                        <td className="p-3 font-mono text-muted-foreground">{i + 1}</td>
                        <td className="p-3 font-medium">{c.name}</td>
                        <td className="p-3 text-muted-foreground">{c.function}</td>
                        <td className="p-3">{c.state}</td>
                        <td className="p-3"><CriticalityBadge level={c.criticality} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="p-3 text-xs text-muted-foreground border-t border-border print:hidden">
              Edita componentes desde la pestaña <span className="text-foreground">Componentes Críticos</span> en el detalle de la máquina.
            </div>
          </CardContent>
        </Card>

        {machine.observations && (
          <Card className="bg-card border-border">
            <CardHeader><CardTitle className="text-base">Observaciones</CardTitle></CardHeader>
            <CardContent><p className="text-sm">{machine.observations}</p></CardContent>
          </Card>
        )}

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Documentos adjuntos</CardTitle></CardHeader>
          <CardContent>
            {attached.length === 0 ? (
              <div className="text-sm text-muted-foreground">Sin documentos adjuntos.</div>
            ) : (
              <ul className="divide-y divide-border">
                {attached.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{s.title}</div>
                      <div className="text-xs text-muted-foreground">{s.pages} pág. · Actualizado {s.updatedAt}</div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => toast.success("Descargando…")}><Download className="h-4 w-4" /></Button>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="ghost" size="sm" className="mt-3 print:hidden" onClick={() => toast("Subida de archivos próximamente")}>
              <Paperclip className="h-4 w-4 mr-1" /> Adjuntar documento
            </Button>
          </CardContent>
        </Card>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 14mm; }
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          aside, header { display: none !important; }
          main { padding: 0 !important; }
          .print-area .bg-card { background: white !important; border: 1px solid #ccc !important; }
          .print-area * { color: black !important; }
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
      <div className={`mt-1 ${mono ? "font-mono" : ""}`}>{value || "—"}</div>
    </div>
  );
}
