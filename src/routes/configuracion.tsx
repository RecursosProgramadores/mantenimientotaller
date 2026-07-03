import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMantePro } from "@/context/MantePro";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/configuracion")({
  head: () => ({ meta: [{ title: "Configuración — MantePro" }, { name: "description", content: "Configuración general, usuarios, talleres y repuestos." }] }),
  component: Page,
});

function Page() {
  return (
    <AppShell title="Configuración">
      <Tabs defaultValue="org">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="org">Organización</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="workshops">Talleres</TabsTrigger>
          <TabsTrigger value="parts">Repuestos</TabsTrigger>
          <TabsTrigger value="notif">Notificaciones & KPI</TabsTrigger>
        </TabsList>
        <TabsContent value="org" className="mt-4"><Org /></TabsContent>
        <TabsContent value="users" className="mt-4"><Users /></TabsContent>
        <TabsContent value="workshops" className="mt-4"><Workshops /></TabsContent>
        <TabsContent value="parts" className="mt-4"><Parts /></TabsContent>
        <TabsContent value="notif" className="mt-4"><Notif /></TabsContent>
      </Tabs>
    </AppShell>
  );
}

function Org() {
  const { settings, updateSettings } = useMantePro();
  return (
    <Card className="bg-card border-border max-w-2xl">
      <CardHeader><CardTitle className="text-base">Datos de la institución</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div><Label>Nombre</Label><Input value={settings.institutionName} onChange={(e) => updateSettings({ institutionName: e.target.value })} /></div>
        <div>
          <Label>Logo (imagen)</Label>
          <Input type="file" accept="image/*" onChange={(e) => {
            const f = e.target.files?.[0]; if (!f) return;
            const r = new FileReader();
            r.onload = () => updateSettings({ institutionLogo: r.result as string });
            r.readAsDataURL(f);
          }} />
          {settings.institutionLogo && <img src={settings.institutionLogo} alt="Logo" className="mt-2 h-16 rounded border border-border" />}
        </div>
        <Button onClick={() => toast.success("Cambios guardados")}>Guardar</Button>
      </CardContent>
    </Card>
  );
}

function Users() {
  const { technicians, addTechnician, deleteTechnician } = useMantePro();
  const [form, setForm] = useState({ name: "", role: "", area: "" });
  return (
    <Card className="bg-card border-border">
      <CardHeader><CardTitle className="text-base">Técnicos / Usuarios</CardTitle></CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-4 gap-2 mb-4">
          <Input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Rol" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          <Input placeholder="Área" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
          <Button onClick={() => { if (!form.name) return toast.error("Nombre requerido"); addTechnician(form); setForm({ name: "", role: "", area: "" }); toast.success("Agregado"); }}>
            <Plus className="h-4 w-4 mr-1" /> Agregar
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground uppercase border-b border-border">
            <tr><th className="text-left p-2">Nombre</th><th className="text-left p-2">Rol</th><th className="text-left p-2">Área</th><th /></tr>
          </thead>
          <tbody>
            {technicians.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0">
                <td className="p-2">{t.name}</td><td className="p-2">{t.role}</td><td className="p-2">{t.area}</td>
                <td className="p-2 text-right"><Button size="sm" variant="ghost" className="text-critical" onClick={() => deleteTechnician(t.id)}><Trash2 className="h-4 w-4" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function Workshops() {
  const { workshops, addWorkshop, deleteWorkshop } = useMantePro();
  const [form, setForm] = useState({ name: "", contact: "", phone: "", specialty: "", address: "", machinesInService: 0 });
  return (
    <Card className="bg-card border-border">
      <CardHeader><CardTitle className="text-base">Directorio de talleres externos</CardTitle></CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
          <Input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Contacto" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          <Input placeholder="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Input placeholder="Especialidad" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
          <Button onClick={() => { if (!form.name) return toast.error("Nombre requerido"); addWorkshop(form); setForm({ name: "", contact: "", phone: "", specialty: "", address: "", machinesInService: 0 }); toast.success("Agregado"); }}>
            <Plus className="h-4 w-4 mr-1" /> Agregar
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground uppercase border-b border-border">
            <tr><th className="text-left p-2">Nombre</th><th className="text-left p-2">Contacto</th><th className="text-left p-2">Teléfono</th><th className="text-left p-2">Especialidad</th><th /></tr>
          </thead>
          <tbody>
            {workshops.map((w) => (
              <tr key={w.id} className="border-b border-border last:border-0">
                <td className="p-2 font-medium">{w.name}</td><td className="p-2">{w.contact}</td>
                <td className="p-2 font-mono text-xs">{w.phone}</td><td className="p-2">{w.specialty}</td>
                <td className="p-2 text-right"><Button size="sm" variant="ghost" className="text-critical" onClick={() => deleteWorkshop(w.id)}><Trash2 className="h-4 w-4" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function Parts() {
  const { spareParts, addSparePart, deleteSparePart } = useMantePro();
  const [form, setForm] = useState({ name: "", reference: "", supplier: "", price: 0 });
  return (
    <Card className="bg-card border-border">
      <CardHeader><CardTitle className="text-base">Catálogo de repuestos</CardTitle></CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
          <Input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Referencia" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          <Input placeholder="Proveedor" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
          <Input type="number" placeholder="Precio" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          <Button onClick={() => { if (!form.name) return toast.error("Nombre requerido"); addSparePart(form); setForm({ name: "", reference: "", supplier: "", price: 0 }); toast.success("Agregado"); }}>
            <Plus className="h-4 w-4 mr-1" /> Agregar
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground uppercase border-b border-border">
            <tr><th className="text-left p-2">Nombre</th><th className="text-left p-2">Referencia</th><th className="text-left p-2">Proveedor</th><th className="text-right p-2">Precio</th><th /></tr>
          </thead>
          <tbody>
            {spareParts.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="p-2">{p.name}</td>
                <td className="p-2 font-mono text-xs">{p.reference}</td>
                <td className="p-2">{p.supplier}</td>
                <td className="p-2 text-right font-mono">S/ {p.price.toFixed(2)}</td>
                <td className="p-2 text-right"><Button size="sm" variant="ghost" className="text-critical" onClick={() => deleteSparePart(p.id)}><Trash2 className="h-4 w-4" /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function Notif() {
  const { settings, updateSettings } = useMantePro();
  return (
    <Card className="bg-card border-border max-w-2xl">
      <CardHeader><CardTitle className="text-base">Notificaciones y objetivos KPI</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div>
          <Label>Días antes para avisar de MP programados</Label>
          <Input type="number" value={settings.notifyDaysBefore} onChange={(e) => updateSettings({ notifyDaysBefore: Number(e.target.value) })} />
        </div>
        <div>
          <Label>Objetivo MTBF (h)</Label>
          <Input type="number" value={settings.mtbfGoalH} onChange={(e) => updateSettings({ mtbfGoalH: Number(e.target.value) })} />
        </div>
        <div>
          <Label>Objetivo Disponibilidad (%)</Label>
          <Input type="number" value={settings.availabilityGoalPct} onChange={(e) => updateSettings({ availabilityGoalPct: Number(e.target.value) })} />
        </div>
        <Button onClick={() => toast.success("Configuración guardada")}>Guardar</Button>
      </CardContent>
    </Card>
  );
}
