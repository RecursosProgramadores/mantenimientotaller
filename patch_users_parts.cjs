const fs = require('fs');
const path = 'src/context/MantePro.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Fetch data
const fetchUsersCode = `
      // Fetch Users
      const { data: uData } = await supabase.from('usuarios').select('*').eq('activo', true);
      if (uData) {
        setTechnicians(uData.map((u: any) => ({
          id: u.id, name: u.nombre, email: u.email, role: u.rol, area: u.area || ''
        })));
      }
      
      // Fetch Parts
      const { data: pData } = await supabase.from('repuestos_catalogo').select('*');
      if (pData) {
        setSpareParts(pData.map((p: any) => ({
          id: p.id, name: p.nombre, reference: p.referencia || '', supplier: p.proveedor || '', price: p.precio || 0, stock: p.stock_minimo || 0
        })));
      }
`;

if (!code.includes('Fetch Users')) {
  code = code.replace("// Fetch Workshops", fetchUsersCode + "\n      // Fetch Workshops");
}

// 2. Implement Technicians CRUD
const oldAddTech = /const addTechnician = \(t: Omit<Technician, "id">\) => \{\};/;
const newAddTech = `const addTechnician = async (t: Omit<Technician, "id">) => {
    let institucion_id = null;
    const { data: m } = await supabase.from('maquinas').select('institucion_id').limit(1).maybeSingle();
    if (m) institucion_id = m.institucion_id;
    
    await supabase.from('usuarios').insert({
      institucion_id,
      nombre: t.name,
      email: t.email || \`\${Date.now()}@mantenimiento.com\`,
      rol: t.role || 'Tecnico',
      area: t.area,
      activo: true
    });
    fetchAllData();
  };`;

const oldUpdateTech = /const updateTechnician = \(id: string, t: Partial<Technician>\) => \{\};/;
const newUpdateTech = `const updateTechnician = async (id: string, t: Partial<Technician>) => {
    let payload: any = {};
    if (t.name !== undefined) payload.nombre = t.name;
    if (t.email !== undefined) payload.email = t.email;
    if (t.role !== undefined) payload.rol = t.role;
    if (t.area !== undefined) payload.area = t.area;
    await supabase.from('usuarios').update(payload).eq('id', id);
    fetchAllData();
  };`;

const oldDelTech = /const deleteTechnician = \(id: string\) => \{\};/;
const newDelTech = `const deleteTechnician = async (id: string) => {
    await supabase.from('usuarios').update({ activo: false }).eq('id', id);
    fetchAllData();
  };`;

code = code.replace(oldAddTech, newAddTech);
code = code.replace(oldUpdateTech, newUpdateTech);
code = code.replace(oldDelTech, newDelTech);

// 3. Implement SpareParts CRUD
const oldAddPart = /const addSparePart = \(p: Omit<SparePart, "id">\) => \{\};/;
const newAddPart = `const addSparePart = async (p: Omit<SparePart, "id">) => {
    let institucion_id = null;
    const { data: m } = await supabase.from('maquinas').select('institucion_id').limit(1).maybeSingle();
    if (m) institucion_id = m.institucion_id;
    
    await supabase.from('repuestos_catalogo').insert({
      institucion_id,
      nombre: p.name,
      referencia: p.reference,
      proveedor: p.supplier,
      precio: p.price,
      stock_minimo: p.stock
    });
    fetchAllData();
  };`;

const oldUpdatePart = /const updateSparePart = \(id: string, p: Partial<SparePart>\) => \{\};/;
const newUpdatePart = `const updateSparePart = async (id: string, p: Partial<SparePart>) => {
    let payload: any = {};
    if (p.name !== undefined) payload.nombre = p.name;
    if (p.reference !== undefined) payload.referencia = p.reference;
    if (p.supplier !== undefined) payload.proveedor = p.supplier;
    if (p.price !== undefined) payload.precio = p.price;
    if (p.stock !== undefined) payload.stock_minimo = p.stock;
    await supabase.from('repuestos_catalogo').update(payload).eq('id', id);
    fetchAllData();
  };`;

const oldDelPart = /const deleteSparePart = \(id: string\) => \{\};/;
const newDelPart = `const deleteSparePart = async (id: string) => {
    await supabase.from('repuestos_catalogo').delete().eq('id', id);
    fetchAllData();
  };`;

code = code.replace(oldAddPart, newAddPart);
code = code.replace(oldUpdatePart, newUpdatePart);
code = code.replace(oldDelPart, newDelPart);

// 4. Update Interface
code = code.replace(/export interface Technician \{[\s\S]*?\}/, 'export interface Technician { id: string; name: string; email?: string; role: string; area: string; phone?: string; }');
code = code.replace(/addTechnician: \(t: Omit<Technician, "id">\) => void;/, 'addTechnician: (t: Omit<Technician, "id">) => Promise<void>;');
code = code.replace(/updateTechnician: \(id: string, t: Partial<Technician>\) => void;/, 'updateTechnician: (id: string, t: Partial<Technician>) => Promise<void>;');
code = code.replace(/deleteTechnician: \(id: string\) => void;/, 'deleteTechnician: (id: string) => Promise<void>;');

code = code.replace(/addSparePart: \(p: Omit<SparePart, "id">\) => void;/, 'addSparePart: (p: Omit<SparePart, "id">) => Promise<void>;');
code = code.replace(/updateSparePart: \(id: string, p: Partial<SparePart>\) => void;/, 'updateSparePart: (id: string, p: Partial<SparePart>) => Promise<void>;');
code = code.replace(/deleteSparePart: \(id: string\) => void;/, 'deleteSparePart: (id: string) => Promise<void>;');

fs.writeFileSync(path, code);
console.log("Patched users & parts in MantePro.tsx!");
