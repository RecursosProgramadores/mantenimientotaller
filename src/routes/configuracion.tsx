import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMantePro } from "@/context/MantePro";
import { Plus, Trash2, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { sanitizePhone } from "@/lib/format";

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
          
          <TabsTrigger value="workshops">Talleres</TabsTrigger>
          <TabsTrigger value="parts">Repuestos</TabsTrigger>
          <TabsTrigger value="notif">Notificaciones & KPI</TabsTrigger>
        </TabsList>
        <TabsContent value="org" className="mt-4"><Org /></TabsContent>
        
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
    <div className="max-w-3xl space-y-6">
      <div>
        <h3 className="text-lg font-medium">Perfil de Organización</h3>
        <p className="text-sm text-muted-foreground">Administra la información de tu empresa y personaliza la identidad visual en el sistema.</p>
      </div>
      
      <div className="grid sm:grid-cols-2 gap-6">
        <Card className="bg-card border-border shadow-sm">
          <CardHeader><CardTitle className="text-base font-medium">Detalles Principales</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nombre de la Empresa / Taller</Label>
              <Input 
                value={settings.institutionName} 
                onChange={(e) => updateSettings({ institutionName: e.target.value })} 
                placeholder="Ej. Taller Metalmecánico del Norte"
              />
            </div>
            <div className="space-y-2">
              <Label>Técnico Responsable / Administrador</Label>
              <Input 
                value="ING. JOHNNY BRYNNER VILCHEZ MIRANDA"
                disabled
                className="bg-muted text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">El usuario administrador fue configurado globalmente.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border shadow-sm">
          <CardHeader><CardTitle className="text-base font-medium">Identidad Visual</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Logo del Sistema</Label>
              <div className="flex items-center gap-4 mt-2">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted flex items-center justify-center">
                  {settings.institutionLogo ? (
                    <img src={settings.institutionLogo} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs text-muted-foreground text-center px-2">Sin logo</span>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Input type="file" accept="image/*" className="w-full text-xs" onChange={(e) => {
                    const f = e.target.files?.[0]; if (!f) return;
                    const r = new FileReader();
                    r.onload = () => updateSettings({ institutionLogo: r.result as string });
                    r.readAsDataURL(f);
                  }} />
                  <p className="text-[10px] text-muted-foreground">Se recomienda una imagen cuadrada (PNG, JPG) de al menos 256x256 px.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => toast.success("Preferencias guardadas correctamente")}>
          <Save className="h-4 w-4 mr-2" />
          Guardar Cambios
        </Button>
      </div>
    </div>
  );
}

function Workshops() {
  const { workshops, addWorkshop, updateWorkshop, deleteWorkshop } = useMantePro();
  const [form, setForm] = useState({ name: "", contact: "", phone: "", specialty: "", address: "", machinesInService: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  // "address" faltaba aquí: el formulario de edición nunca la incluía, así
  // que aunque la base de datos y addWorkshop/updateWorkshop sí la soportan,
  // no había forma de escribirla ni verla desde este directorio — solo se
  // podía guardar (a veces) desde el diálogo de "Enviar a taller".
  const [editForm, setEditForm] = useState({ name: "", contact: "", phone: "", specialty: "", address: "" });

  return (
    <Card className="bg-card border-border">
      <CardHeader><CardTitle className="text-base">Directorio de talleres externos</CardTitle></CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-2 mb-4">
          <Input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Contacto" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          <Input placeholder="Teléfono" inputMode="numeric" maxLength={9} value={form.phone} onChange={(e) => setForm({ ...form, phone: sanitizePhone(e.target.value) })} />
          <Input placeholder="Especialidad" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} />
          <Input placeholder="Dirección" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          <Button onClick={() => { if (!form.name) return toast.error("Nombre requerido"); addWorkshop(form); setForm({ name: "", contact: "", phone: "", specialty: "", address: "", machinesInService: 0 }); toast.success("Agregado"); }}>
            <Plus className="h-4 w-4 mr-1" /> Agregar
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground uppercase border-b border-border">
            <tr><th className="text-left p-2">Nombre</th><th className="text-left p-2">Contacto</th><th className="text-left p-2">Teléfono</th><th className="text-left p-2">Especialidad</th><th className="text-left p-2">Dirección</th><th /></tr>
          </thead>
          <tbody>
            {workshops.map((w) => (
              <tr key={w.id} className="border-b border-border last:border-0">
                {editingId === w.id ? (
                  <>
                    <td className="p-2"><Input className="h-8" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} /></td>
                    <td className="p-2"><Input className="h-8" value={editForm.contact} onChange={(e) => setEditForm({...editForm, contact: e.target.value})} /></td>
                    <td className="p-2"><Input className="h-8" inputMode="numeric" maxLength={9} value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: sanitizePhone(e.target.value)})} /></td>
                    <td className="p-2"><Input className="h-8" value={editForm.specialty} onChange={(e) => setEditForm({...editForm, specialty: e.target.value})} /></td>
                    <td className="p-2"><Input className="h-8" value={editForm.address} onChange={(e) => setEditForm({...editForm, address: e.target.value})} /></td>
                    <td className="p-2 text-right">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-success" onClick={() => { updateWorkshop(w.id, editForm); setEditingId(null); toast.success("Guardado"); }}><Save className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-2 font-medium">{w.name}</td><td className="p-2">{w.contact}</td>
                    <td className="p-2 font-mono text-xs">{w.phone}</td><td className="p-2">{w.specialty}</td>
                    <td className="p-2 text-muted-foreground">{w.address || "—"}</td>
                    <td className="p-2 text-right min-w-[80px]">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => { setEditingId(w.id); setEditForm({ name: w.name, contact: w.contact, phone: w.phone, specialty: w.specialty, address: w.address || "" }); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-critical" onClick={() => deleteWorkshop(w.id)}><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function Parts() {
  const { spareParts, addSparePart, updateSparePart, deleteSparePart } = useMantePro();
  const [form, setForm] = useState({ name: "", reference: "", supplier: "", price: 0, stock: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", reference: "", supplier: "", price: 0, stock: 0 });

  return (
    <Card className="bg-card border-border">
      <CardHeader><CardTitle className="text-base">Catálogo de repuestos</CardTitle></CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-2 mb-4">
          <Input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Referencia" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
          <Input placeholder="Proveedor" value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
          <Input type="number" placeholder="Stock" value={form.stock || ''} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
          <Input type="number" placeholder="Precio" value={form.price || ''} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          <Button onClick={() => { if (!form.name) return toast.error("Nombre requerido"); addSparePart(form); setForm({ name: "", reference: "", supplier: "", price: 0, stock: 0 }); toast.success("Agregado"); }}>
            <Plus className="h-4 w-4 mr-1" /> Agregar
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground uppercase border-b border-border">
            <tr><th className="text-left p-2">Nombre</th><th className="text-left p-2">Referencia</th><th className="text-left p-2">Proveedor</th><th className="text-right p-2">Stock</th><th className="text-right p-2">Precio</th><th /></tr>
          </thead>
          <tbody>
            {spareParts.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                {editingId === p.id ? (
                  <>
                    <td className="p-2"><Input className="h-8" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} /></td>
                    <td className="p-2"><Input className="h-8" value={editForm.reference} onChange={(e) => setEditForm({...editForm, reference: e.target.value})} /></td>
                    <td className="p-2"><Input className="h-8" value={editForm.supplier} onChange={(e) => setEditForm({...editForm, supplier: e.target.value})} /></td>
                    <td className="p-2 text-right"><Input type="number" className="h-8 w-20 ml-auto" value={editForm.stock || ''} onChange={(e) => setEditForm({...editForm, stock: Number(e.target.value)})} /></td>
                    <td className="p-2 text-right"><Input type="number" className="h-8 w-24 ml-auto" value={editForm.price || ''} onChange={(e) => setEditForm({...editForm, price: Number(e.target.value)})} /></td>
                    <td className="p-2 text-right min-w-[80px]">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-success" onClick={() => { updateSparePart(p.id, editForm); setEditingId(null); toast.success("Guardado"); }}><Save className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-2">{p.name}</td>
                    <td className="p-2 font-mono text-xs">{p.reference}</td>
                    <td className="p-2">{p.supplier}</td>
                    <td className="p-2 text-right font-mono">{p.stock ?? 0}</td>
                    <td className="p-2 text-right font-mono">S/ {p.price.toFixed(2)}</td>
                    <td className="p-2 text-right min-w-[80px]">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => { setEditingId(p.id); setEditForm({ name: p.name, reference: p.reference, supplier: p.supplier, price: p.price, stock: p.stock || 0 }); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-critical" onClick={() => deleteSparePart(p.id)}><Trash2 className="h-4 w-4" /></Button>
                    </td>
                  </>
                )}
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
      <CardHeader><CardTitle className="text-base">Notificaciones</CardTitle></CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex items-center justify-between p-3 border border-border rounded-lg">
          <div><div className="font-medium">Alertas de uso de ciclo</div><div className="text-muted-foreground">Notificar cuando la máquina llegue al límite de horas</div></div>
          <Input type="checkbox" className="w-5 h-5" defaultChecked />
        </div>
        <div className="flex items-center justify-between p-3 border border-border rounded-lg">
          <div><div className="font-medium">Órdenes pendientes</div><div className="text-muted-foreground">Recordatorio de mantenimientos próximos</div></div>
          <Input type="checkbox" className="w-5 h-5" defaultChecked />
        </div>
      </CardContent>
    </Card>
  );
}
