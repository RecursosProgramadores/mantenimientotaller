const fs = require('fs');
const path = 'src/context/MantePro.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Fix fetchAllData select query and mapping
const oldSelect = "await supabase.from('ordenes_trabajo').select('*, maquinas(nombre), actividades_otm(*), repuestos_otm(*)');";
const newSelect = "await supabase.from('ordenes_trabajo').select('*, maquinas(nombre), actividades_otm(*), repuestos_otm(*), tecnico:usuarios!tecnico_id(nombre), supervisor:usuarios!supervisor_id(nombre)');";

if (code.includes(oldSelect)) {
  code = code.replace(oldSelect, newSelect);
}

const oldMapping = `          technician: 'Supabase User', status: o.estado, notes: o.hallazgos || '',`;
const newMapping = `          technician: o.tecnico?.nombre || '', supervisor: o.supervisor?.nombre || '', status: o.estado, notes: o.hallazgos || '',`;

if (code.includes(oldMapping)) {
  code = code.replace(oldMapping, newMapping);
}

// 2. Fix addRecord logic
const oldAddRecord = /const addRecord = \(r: Omit<MaintenanceRecord, "id">\) => \{[\s\S]*?return `OTM-S-\$\{n\}`;\s*\};/;
const newAddRecord = `const addRecord = async (r: Omit<MaintenanceRecord, "id">) => {
    let tecnico_id = null;
    let supervisor_id = null;
    if (r.technician) {
       const {data} = await supabase.from('usuarios').select('id').eq('nombre', r.technician).maybeSingle();
       if (data) tecnico_id = data.id;
    }
    if (r.supervisor) {
       const {data} = await supabase.from('usuarios').select('id').eq('nombre', r.supervisor).maybeSingle();
       if (data) supervisor_id = data.id;
    }
    
    const { data: orden, error } = await supabase.from('ordenes_trabajo').insert({
      numero_otm: r.otm, 
      maquina_id: r.machineId, 
      tipo_id: r.typeId || null,
      estado: r.status, 
      fecha_programada: r.date,
      hora_inicio: r.startTime || null,
      hora_fin: r.endTime || null,
      tecnico_id,
      supervisor_id,
      hallazgos: r.notes || '',
      costo_repuestos: r.cost || 0,
      costo_mano_obra: r.laborCost || 0
    }).select().single();

    if (error || !orden) {
      console.error("Error creating record", error);
      return r.otm;
    }

    if (r.activities && r.activities.length > 0) {
      await supabase.from('actividades_otm').insert(
         r.activities.map((a, i) => ({
            orden_id: orden.id,
            descripcion: a.text,
            completada: a.done,
            observaciones: a.observations,
            orden: i
         }))
      );
    }

    if (r.parts && r.parts.length > 0) {
      await supabase.from('repuestos_otm').insert(
         r.parts.map(p => ({
            orden_id: orden.id,
            nombre: p.name,
            cantidad: p.quantity,
            costo_unitario: p.unitCost
         }))
      );
    }

    fetchAllData();
    return r.otm;
  };`;

if (code.match(oldAddRecord)) {
  code = code.replace(oldAddRecord, newAddRecord);
}

// 3. Fix updateRecord logic
const oldUpdateRecord = /const updateRecord = \(id: string, r: Partial<MaintenanceRecord>\) => \{ fetchAllData\(\); \};/;
const newUpdateRecord = `const updateRecord = async (id: string, r: Partial<MaintenanceRecord>) => {
    let payload: any = {};
    if (r.otm !== undefined) payload.numero_otm = r.otm;
    if (r.machineId !== undefined) payload.maquina_id = r.machineId;
    if (r.typeId !== undefined) payload.tipo_id = r.typeId || null;
    if (r.status !== undefined) payload.estado = r.status;
    if (r.date !== undefined) payload.fecha_programada = r.date;
    if (r.startTime !== undefined) payload.hora_inicio = r.startTime || null;
    if (r.endTime !== undefined) payload.hora_fin = r.endTime || null;
    if (r.notes !== undefined) payload.hallazgos = r.notes;
    if (r.cost !== undefined) payload.costo_repuestos = r.cost;
    if (r.laborCost !== undefined) payload.costo_mano_obra = r.laborCost;

    if (r.technician !== undefined) {
        payload.tecnico_id = null;
        if (r.technician) {
            const {data} = await supabase.from('usuarios').select('id').eq('nombre', r.technician).maybeSingle();
            if (data) payload.tecnico_id = data.id;
        }
    }
    if (r.supervisor !== undefined) {
        payload.supervisor_id = null;
        if (r.supervisor) {
            const {data} = await supabase.from('usuarios').select('id').eq('nombre', r.supervisor).maybeSingle();
            if (data) payload.supervisor_id = data.id;
        }
    }

    await supabase.from('ordenes_trabajo').update(payload).eq('id', id);

    if (r.activities !== undefined) {
        await supabase.from('actividades_otm').delete().eq('orden_id', id);
        if (r.activities.length > 0) {
            await supabase.from('actividades_otm').insert(
                r.activities.map((a, i) => ({
                    orden_id: id,
                    descripcion: a.text,
                    completada: a.done,
                    observaciones: a.observations,
                    orden: i
                }))
            );
        }
    }

    if (r.parts !== undefined) {
        await supabase.from('repuestos_otm').delete().eq('orden_id', id);
        if (r.parts.length > 0) {
            await supabase.from('repuestos_otm').insert(
                r.parts.map(p => ({
                    orden_id: id,
                    nombre: p.name,
                    cantidad: p.quantity,
                    costo_unitario: p.unitCost
                }))
            );
        }
    }

    fetchAllData();
};`;

if (code.match(oldUpdateRecord)) {
  code = code.replace(oldUpdateRecord, newUpdateRecord);
}

// Fix interface if needed
code = code.replace(/addRecord: \(r: Omit<MaintenanceRecord, "id">\) => string;/, 'addRecord: (r: Omit<MaintenanceRecord, "id">) => Promise<string>;');
code = code.replace(/updateRecord: \(id: string, r: Partial<MaintenanceRecord>\) => void;/, 'updateRecord: (id: string, r: Partial<MaintenanceRecord>) => Promise<void>;');

fs.writeFileSync(path, code);
console.log("Patched records implementation!");
