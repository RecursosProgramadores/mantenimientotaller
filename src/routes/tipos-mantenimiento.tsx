import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useMantePro, TYPE_COLOR_OPTIONS, typeColorClass,
  type MaintenanceType, type Frequency, type TypeActivity,
} from "@/context/MantePro";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/tipos-mantenimiento")({
  head: () => ({
    meta: [
      { title: "Tipos de Mantenimiento — MantePro" },
      { name: "description", content: "Catálogo de tipos de mantenimiento con frecuencia y checklist." },
    ],
  }),
  component: Page,
});

const uid = () => Math.random().toString(36).slice(2, 10);

const freqDays: Record<Frequency, number> = {
  "Diario": 1, "Semanal": 7, "Mensual": 30, "Semestral": 180, "Anual": 365, "A condición": 0,
};

function emptyType(): Omit<MaintenanceType, "id"> {
  return {
    name: "", description: "", color: "info", frequency: "Mensual", frequencyDays: 30,
    estimatedHours: 1, activities: [], active: true, category: "Preventivo",
  };
}

function Page() {
  const { types, addType, updateType, deleteType } = useMantePro();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceType | null>(null);

  return (
    <AppShell title="Tipos de Mantenimiento">
      <div className="flex justify-end mb-4">
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1" /> Nuevo tipo</Button>
      </div>

      <Card className="bg-card border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3">Tipo</th>
                <th className="text-left p-3">Descripción</th>
                <th className="text-left p-3">Frecuencia</th>
                <th className="text-left p-3">Duración est.</th>
                <th className="text-left p-3 whitespace-nowrap">N° Procedimientos</th>
                <th className="text-left p-3">Estado</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {types.map((t) => (
                <tr key={t.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-3">
                    <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-medium ${typeColorClass(t.color)}`}>
                      {t.name}
                    </span>
                  </td>
                  <td className="p-3 text-muted-foreground max-w-md truncate">{t.description}</td>
                  <td className="p-3">{t.frequency}</td>
                  <td className="p-3 font-mono">{t.estimatedHours} h</td>
                  <td className="p-3 font-mono">{t.activities.length}</td>
                  <td className="p-3">
                    <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs ${t.active ? "bg-success/15 text-success border-success/30" : "bg-muted text-muted-foreground border-border"}`}>
                      {t.active ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(t); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-critical"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                        <AlertDialogContent className="bg-card border-border">
                          <AlertDialogHeader><AlertDialogTitle>¿Eliminar tipo?</AlertDialogTitle><AlertDialogDescription>Acción permanente.</AlertDialogDescription></AlertDialogHeader>
                          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => { deleteType(t.id); toast.success("Eliminado"); }}>Eliminar</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <TypeDialog
        open={open} onOpenChange={setOpen} initial={editing}
        onSave={(data) => {
          if (editing) { updateType(editing.id, data); toast.success("Tipo actualizado"); }
          else { addType(data); toast.success("Tipo creado"); }
        }}
      />
    </AppShell>
  );
}

function TypeDialog({ open, onOpenChange, initial, onSave }: {
  open: boolean; onOpenChange: (b: boolean) => void;
  initial: MaintenanceType | null;
  onSave: (data: Omit<MaintenanceType, "id">) => void;
}) {
  const [f, setF] = useState<Omit<MaintenanceType, "id">>(initial ?? emptyType());

  useEffect(() => { if (open) setF(initial ?? emptyType()); }, [open, initial]);

  const set = <K extends keyof Omit<MaintenanceType, "id">>(k: K, v: Omit<MaintenanceType, "id">[K]) => setF((x) => ({ ...x, [k]: v }));

  const addActivity = () => set("activities", [...f.activities, { id: uid(), text: "", durationMin: 0, role: "Técnico" }]);
  const updActivity = (id: string, patch: Partial<TypeActivity>) =>
    set("activities", f.activities.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const rmActivity = (id: string) => set("activities", f.activities.filter((a) => a.id !== id));

  const submit = () => {
    if (!f.name.trim()) { toast.error("Nombre requerido"); return; }
    onSave({ ...f, frequencyDays: freqDays[f.frequency] });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial ? "Editar tipo" : "Nuevo tipo de mantenimiento"}</DialogTitle></DialogHeader>

        <div className="grid gap-3">
          <div><Label>Nombre</Label><Input value={f.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div><Label>Descripción</Label><Textarea rows={2} value={f.description} onChange={(e) => set("description", e.target.value)} /></div>

          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>Color</Label>
              <Select value={f.color} onValueChange={(v) => set("color", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_COLOR_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs ${o.className}`}>{o.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Frecuencia</Label>
              <Select value={f.frequency} onValueChange={(v) => set("frequency", v as Frequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["Diario", "Semanal", "Mensual", "Semestral", "Anual", "A condición"] as const).map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Duración est. (h)</Label><Input type="number" step="0.5" value={f.estimatedHours} onChange={(e) => set("estimatedHours", Number(e.target.value))} /></div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <div className="text-sm font-medium">Tipo activo</div>
              <div className="text-xs text-muted-foreground">Solo los tipos activos aparecen al crear mantenimientos.</div>
            </div>
            <Switch checked={f.active} onCheckedChange={(v) => set("active", v)} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Checklist de actividades</Label>
              <Button size="sm" variant="ghost" onClick={addActivity}><Plus className="h-4 w-4 mr-1" /> Añadir</Button>
            </div>
            {f.activities.length === 0 ? (
              <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground text-center">
                Sin actividades.
              </div>
            ) : (
              <div className="space-y-2">
                {f.activities.map((a) => (
                  <div key={a.id} className="grid grid-cols-[1fr_90px_140px_36px] gap-2 items-center">
                    <Input placeholder="Actividad" value={a.text} onChange={(e) => updActivity(a.id, { text: e.target.value })} />
                    <Input type="number" placeholder="min" value={a.durationMin} onChange={(e) => updActivity(a.id, { durationMin: Number(e.target.value) })} />
                    <Input placeholder="Responsable" value={a.role} onChange={(e) => updActivity(a.id, { role: e.target.value })} />
                    <Button size="sm" variant="ghost" className="text-critical" onClick={() => rmActivity(a.id)}><X className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit}>{initial ? "Guardar cambios" : "Crear tipo"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
