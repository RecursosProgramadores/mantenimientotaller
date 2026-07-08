const fs = require('fs');
const path = 'src/routes/configuracion.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Add Edit/Save/Cancel Icons import
if (!code.includes('Save')) {
  code = code.replace(/import { Plus, Trash2 } from "lucide-react";/, 'import { Plus, Trash2, Pencil, Save, X } from "lucide-react";');
}

// 2. Replace Users component
const oldUsers = /function Users\(\) \{[\s\S]*?\} \/\/[ ]*Users End/i; // I don't have this comment, I will just replace from function Users to function Workshops
const usersRegex = /function Users\(\) \{[\s\S]*?(?=function Workshops\(\) \{)/;
const newUsers = `function Users() {
  const { technicians, addTechnician, updateTechnician, deleteTechnician } = useMantePro();
  const [form, setForm] = useState({ name: "", email: "", role: "", area: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", role: "", area: "" });

  return (
    <Card className="bg-card border-border">
      <CardHeader><CardTitle className="text-base">Técnicos / Usuarios</CardTitle></CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-5 gap-2 mb-4">
          <Input placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input placeholder="Rol" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          <Input placeholder="Área" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} />
          <Button onClick={() => { if (!form.name || !form.email) return toast.error("Nombre y Email requeridos"); addTechnician(form); setForm({ name: "", email: "", role: "", area: "" }); toast.success("Agregado"); }}>
            <Plus className="h-4 w-4 mr-1" /> Agregar
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground uppercase border-b border-border">
            <tr><th className="text-left p-2">Nombre</th><th className="text-left p-2">Email</th><th className="text-left p-2">Rol</th><th className="text-left p-2">Área</th><th /></tr>
          </thead>
          <tbody>
            {technicians.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0">
                {editingId === t.id ? (
                  <>
                    <td className="p-2"><Input className="h-8" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} /></td>
                    <td className="p-2"><Input className="h-8" value={editForm.email} onChange={(e) => setEditForm({...editForm, email: e.target.value})} /></td>
                    <td className="p-2"><Input className="h-8" value={editForm.role} onChange={(e) => setEditForm({...editForm, role: e.target.value})} /></td>
                    <td className="p-2"><Input className="h-8" value={editForm.area} onChange={(e) => setEditForm({...editForm, area: e.target.value})} /></td>
                    <td className="p-2 text-right">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-success" onClick={() => { updateTechnician(t.id, editForm); setEditingId(null); toast.success("Guardado"); }}><Save className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-2">{t.name}</td><td className="p-2">{t.email}</td><td className="p-2">{t.role}</td><td className="p-2">{t.area}</td>
                    <td className="p-2 text-right">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => { setEditingId(t.id); setEditForm({ name: t.name, email: t.email || '', role: t.role, area: t.area }); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-critical" onClick={() => deleteTechnician(t.id)}><Trash2 className="h-4 w-4" /></Button>
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

`;
code = code.replace(usersRegex, newUsers);

// 3. Replace Workshops component
const workshopsRegex = /function Workshops\(\) \{[\s\S]*?(?=function Parts\(\) \{)/;
const newWorkshops = `function Workshops() {
  const { workshops, addWorkshop, updateWorkshop, deleteWorkshop } = useMantePro();
  const [form, setForm] = useState({ name: "", contact: "", phone: "", specialty: "", address: "", machinesInService: 0 });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", contact: "", phone: "", specialty: "" });

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
                {editingId === w.id ? (
                  <>
                    <td className="p-2"><Input className="h-8" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} /></td>
                    <td className="p-2"><Input className="h-8" value={editForm.contact} onChange={(e) => setEditForm({...editForm, contact: e.target.value})} /></td>
                    <td className="p-2"><Input className="h-8" value={editForm.phone} onChange={(e) => setEditForm({...editForm, phone: e.target.value})} /></td>
                    <td className="p-2"><Input className="h-8" value={editForm.specialty} onChange={(e) => setEditForm({...editForm, specialty: e.target.value})} /></td>
                    <td className="p-2 text-right">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-success" onClick={() => { updateWorkshop(w.id, editForm); setEditingId(null); toast.success("Guardado"); }}><Save className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setEditingId(null)}><X className="h-4 w-4" /></Button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-2 font-medium">{w.name}</td><td className="p-2">{w.contact}</td>
                    <td className="p-2 font-mono text-xs">{w.phone}</td><td className="p-2">{w.specialty}</td>
                    <td className="p-2 text-right min-w-[80px]">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => { setEditingId(w.id); setEditForm({ name: w.name, contact: w.contact, phone: w.phone, specialty: w.specialty }); }}><Pencil className="h-4 w-4" /></Button>
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

`;
code = code.replace(workshopsRegex, newWorkshops);

// 4. Replace Parts component
const partsRegex = /function Parts\(\) \{[\s\S]*/;
const newParts = `function Parts() {
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
            <tr><th className="text-left p-2">Nombre</th><th className="text-left p-2">Referencia</th><th className="text-left p-2">Proveedor</th><th className="text-right p-2">Stock Min</th><th className="text-right p-2">Precio</th><th /></tr>
          </thead>
          <tbody>
            {spareParts.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                {editingId === p.id ? (
                  <>
                    <td className="p-2"><Input className="h-8" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} /></td>
                    <td className="p-2"><Input className="h-8" value={editForm.reference} onChange={(e) => setEditForm({...editForm, reference: e.target.value})} /></td>
                    <td className="p-2"><Input className="h-8" value={editForm.supplier} onChange={(e) => setEditForm({...editForm, supplier: e.target.value})} /></td>
                    <td className="p-2 text-right"><Input type="number" className="h-8 w-20 ml-auto" value={editForm.stock} onChange={(e) => setEditForm({...editForm, stock: Number(e.target.value)})} /></td>
                    <td className="p-2 text-right"><Input type="number" className="h-8 w-24 ml-auto" value={editForm.price} onChange={(e) => setEditForm({...editForm, price: Number(e.target.value)})} /></td>
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
`;
code = code.replace(partsRegex, newParts);

fs.writeFileSync(path, code);
console.log("Patched UI configuration components!");
