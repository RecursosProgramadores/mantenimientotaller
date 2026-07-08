const fs = require('fs');
const path = 'src/context/MantePro.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Inject fetch for talleres
const fetchWorkshopsCode = `
      // Fetch Workshops
      const { data: wData } = await supabase.from('talleres_externos').select('*').eq('activo', true);
      if (wData) {
        setWorkshops(wData.map((w: any) => ({
          id: w.id, name: w.nombre, address: w.direccion || '', contact: w.contacto || '', phone: w.telefono || '', specialty: '', machinesInService: 0
        })));
      }
`;

if (!code.includes('Fetch Workshops')) {
  code = code.replace("// Fetch Usage Logs", fetchWorkshopsCode + "\n      // Fetch Usage Logs");
}

// 2. Implement addWorkshop
const oldAddWorkshop = /const addWorkshop = \(w: Omit<Workshop, "id">\) => \{\};/;
const newAddWorkshop = `const addWorkshop = async (w: Omit<Workshop, "id">) => {
    let institucion_id = null;
    const { data: m } = await supabase.from('maquinas').select('institucion_id').limit(1).maybeSingle();
    if (m) institucion_id = m.institucion_id;
    
    await supabase.from('talleres_externos').insert({
      institucion_id,
      nombre: w.name,
      direccion: w.address,
      contacto: w.contact,
      telefono: w.phone,
      activo: true
    });
    fetchAllData();
  };`;

if (code.match(oldAddWorkshop)) {
  code = code.replace(oldAddWorkshop, newAddWorkshop);
}

// 3. Implement updateWorkshop
const oldUpdateWorkshop = /const updateWorkshop = \(id: string, w: Partial<Workshop>\) => \{\};/;
const newUpdateWorkshop = `const updateWorkshop = async (id: string, w: Partial<Workshop>) => {
    let payload: any = {};
    if (w.name !== undefined) payload.nombre = w.name;
    if (w.address !== undefined) payload.direccion = w.address;
    if (w.contact !== undefined) payload.contacto = w.contact;
    if (w.phone !== undefined) payload.telefono = w.phone;
    
    await supabase.from('talleres_externos').update(payload).eq('id', id);
    fetchAllData();
  };`;

if (code.match(oldUpdateWorkshop)) {
  code = code.replace(oldUpdateWorkshop, newUpdateWorkshop);
}

// 4. Implement deleteWorkshop
const oldDeleteWorkshop = /const deleteWorkshop = \(id: string\) => \{\};/;
const newDeleteWorkshop = `const deleteWorkshop = async (id: string) => {
    await supabase.from('talleres_externos').update({ activo: false }).eq('id', id);
    fetchAllData();
  };`;

if (code.match(oldDeleteWorkshop)) {
  code = code.replace(oldDeleteWorkshop, newDeleteWorkshop);
}

// 5. Fix interface to Promise
code = code.replace(/addWorkshop: \(w: Omit<Workshop, "id">\) => void;/, 'addWorkshop: (w: Omit<Workshop, "id">) => Promise<void>;');
code = code.replace(/updateWorkshop: \(id: string, w: Partial<Workshop>\) => void;/, 'updateWorkshop: (id: string, w: Partial<Workshop>) => Promise<void>;');
code = code.replace(/deleteWorkshop: \(id: string\) => void;/, 'deleteWorkshop: (id: string) => Promise<void>;');

fs.writeFileSync(path, code);
console.log("Patched workshops implementation!");
