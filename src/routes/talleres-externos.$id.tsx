import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMantePro, type WorkshopRecordStatus } from "@/context/MantePro";
import { DocumentUploader } from "@/components/DocumentUploader";
import { formatDate } from "@/lib/format";
import { ArrowLeft, Printer, Star } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/talleres-externos/$id")({
  component: Detail,
});

function Detail() {
  const { id } = useParams({ from: "/talleres-externos/$id" });
  const { workshopRecords, machines, updateWorkshopRecord, addWorkshopLog, addDocumentsToWorkshop, removeDocumentFromWorkshop, settings } = useMantePro();
  const r = workshopRecords.find((x) => x.id === id);
  const [note, setNote] = useState("");
  const [newStatus, setNewStatus] = useState<WorkshopRecordStatus | "">("");

  if (!r) return <AppShell title="Taller"><div className="text-sm text-muted-foreground">Registro no encontrado.</div></AppShell>;
  const m = machines.find((x) => x.id === r.machineId);

  return (
    <AppShell title={`Envío a Taller — ${m?.code}`}>
      <div className="flex items-center justify-between mb-4 print:hidden">
        <Link to="/talleres-externos"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Button></Link>
        <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1" /> Imprimir Ficha</Button>
      </div>

      <div id="print-area" className="space-y-4">
        <div className="hidden print:block border-b border-border pb-3 mb-3">
          <div className="text-lg font-bold">{settings.institutionName}</div>
          <div className="text-sm text-muted-foreground">Ficha de Envío a Taller Externo</div>
        </div>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Identificación</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3 text-sm">
            <Field k="Máquina" v={`${m?.code} — ${m?.name}`} />
            <Field k="Estado" v={r.status} />
            <Field k="Taller" v={r.workshopName} />
            <Field k="Contacto" v={r.workshopContact || "—"} />
            <Field k="Teléfono" v={r.workshopPhone || "—"} />
            <Field k="Dirección" v={r.workshopAddress || "—"} />
            <Field k="Fecha de envío" v={formatDate(r.sentDate)} />
            <Field k="Retorno estimado" v={formatDate(r.estimatedReturn)} />
            <Field k="Técnico responsable" v={r.technician} />
            <Field k="Autorizado por" v={r.authorizedBy} />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Motivo y diagnóstico</CardTitle></CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3 text-sm">
            <Field k="Tipo de problema" v={r.problemType} />
            <Field k="Condición al enviar" v={r.condition} />
            <Field k="Presupuesto aprobado" v={`S/ ${r.approvedBudget.toFixed(2)}`} />
            <Field k="Costo final" v={r.finalCost != null ? `S/ ${r.finalCost.toFixed(2)}` : "—"} />
            <div className="sm:col-span-2"><div className="text-xs text-muted-foreground">Descripción</div><div className="mt-1 whitespace-pre-wrap">{r.problemDescription}</div></div>
            {r.affectedComponentIds.length > 0 && (
              <div className="sm:col-span-2">
                <div className="text-xs text-muted-foreground">Componentes afectados</div>
                <ul className="mt-1 list-disc pl-5">
                  {r.affectedComponentIds.map((cid) => {
                    const c = m?.components.find((k) => k.id === cid);
                    return <li key={cid}>{c?.name ?? cid}</li>;
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Documentos</CardTitle></CardHeader>
          <CardContent>
            <DocumentUploader
              documents={r.documents}
              onAdd={(d) => addDocumentsToWorkshop(r.id, d)}
              onRemove={(did) => removeDocumentFromWorkshop(r.id, did)}
            />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle className="text-base">Seguimiento</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <div><Label>Fecha real de retorno</Label><Input type="date" value={r.actualReturn ?? ""} onChange={(e) => updateWorkshopRecord(r.id, { actualReturn: e.target.value })} /></div>
              <div><Label>Costo final (S/)</Label><Input type="number" value={r.finalCost ?? 0} onChange={(e) => updateWorkshopRecord(r.id, { finalCost: Number(e.target.value) })} /></div>
              <div>
                <Label>Calificación del servicio</Label>
                <div className="flex gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => updateWorkshopRecord(r.id, { rating: n })}>
                      <Star className={`h-5 w-5 ${(r.rating ?? 0) >= n ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <Label>Resumen de trabajos realizados</Label>
              <Textarea rows={3} value={r.workSummary ?? ""} onChange={(e) => updateWorkshopRecord(r.id, { workSummary: e.target.value })} />
            </div>
            <div className="border-t border-border pt-3 print:hidden">
              <Label>Agregar nota de seguimiento</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                <Textarea rows={2} className="flex-1 min-w-[240px]" value={note} onChange={(e) => setNote(e.target.value)} />
                <select className="bg-card border border-border rounded-md px-2 text-sm" value={newStatus} onChange={(e) => setNewStatus(e.target.value as any)}>
                  <option value="">Sin cambio de estado</option>
                  <option value="En Taller">En Taller</option>
                  <option value="Devuelto">Devuelto</option>
                  <option value="Cancelado">Cancelado</option>
                </select>
                <Button onClick={() => {
                  if (!note.trim()) return toast.error("Escribe una nota");
                  addWorkshopLog(r.id, note.trim(), newStatus || undefined);
                  if (newStatus) updateWorkshopRecord(r.id, { status: newStatus });
                  setNote(""); setNewStatus("");
                  toast.success("Actualización agregada");
                }}>Agregar</Button>
              </div>
            </div>
            <ol className="border-l border-border ml-3 space-y-3">
              {[...r.logs].reverse().map((l) => (
                <li key={l.id} className="pl-4 relative">
                  <span className="absolute -left-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-primary" />
                  <div className="text-xs text-muted-foreground">{formatDate(l.at.slice(0,10))} · {l.at.slice(11,16)}{l.status ? ` · ${l.status}` : ""}</div>
                  <div className="text-sm">{l.note}</div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

function Field({ k, v }: { k: string; v: string }) {
  return <div><div className="text-xs text-muted-foreground">{k}</div><div className="font-medium">{v}</div></div>;
}
