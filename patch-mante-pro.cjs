const fs = require('fs');

const path = 'src/context/MantePro.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Fix fetchAllData to include uso_logs and uso_ciclos
const fetchNotificationsCode = `      // Fetch Notifications
      const { data: nData } = await supabase.from('notificaciones').select('*').order('created_at', { ascending: false });
      if (nData) {
        setNotifications(nData.map((n: any) => ({
          id: n.id, type: n.tipo, machineId: n.maquina_id || '', title: n.titulo,
          message: n.mensaje, createdAt: n.created_at, read: n.leida, actionType: n.accion_tipo
        })));
      }

      // Fetch Usage Logs
      const { data: ulData } = await supabase.from('uso_logs').select('*').order('start_at', { ascending: false });
      if (ulData) {
        setUsageLogs(ulData.map((u: any) => ({
          id: u.id, machineId: u.maquina_id, startAt: u.start_at, endAt: u.end_at, hours: u.horas,
          operador: u.operador, turno: u.turno, observaciones: u.observaciones, registradoPor: u.registrado_por
        })));
      }

      // Fetch Usage Cycles
      const { data: ucData } = await supabase.from('uso_ciclos').select('*');
      if (ucData) {
        setUsageCycles(ucData.map((u: any) => ({
          id: u.id, machineId: u.maquina_id, startAt: u.start_at, horasAcumuladas: u.horas_acumuladas, resetAt: u.ultimo_reset
        })));
      }`;
code = code.replace(/      \/\/ Fetch Notifications[\s\S]*?      \}/, fetchNotificationsCode);

// 2. Fix updateMachine
const updateMachineCode = `  const updateMachine = async (id: string, m: Partial<Machine>) => {
    let finalPhotoUrl = m.photo;
    if (m.photo && m.photo.startsWith('data:image')) {
      try {
        const res = await fetch(m.photo);
        const blob = await res.blob();
        const fileName = \`\${id}-\${Date.now()}.jpg\`;
        const { data, error } = await supabase.storage.from('maquinas-fotos').upload(fileName, blob, { upsert: true });
        if (data) {
          const { data: { publicUrl } } = supabase.storage.from('maquinas-fotos').getPublicUrl(fileName);
          finalPhotoUrl = publicUrl;
        }
      } catch(e) {}
    }
    const payload: any = {};
    if (m.name !== undefined) payload.nombre = m.name;
    if (m.code !== undefined) payload.codigo = m.code;
    if (m.patrimonialCode !== undefined) payload.codigo_patrimonial = m.patrimonialCode;
    if (m.brand !== undefined) payload.marca = m.brand;
    if (m.model !== undefined) payload.modelo = m.model;
    if (m.serial !== undefined) payload.numero_serie = m.serial;
    if (m.status !== undefined) payload.estado = m.status;
    if (m.criticality !== undefined) payload.criticidad = m.criticality;
    if (m.observations !== undefined) payload.observaciones = m.observations;
    if (finalPhotoUrl !== undefined) payload.foto_url = finalPhotoUrl;
    if (m.cost !== undefined) payload.costo = m.cost;
    if (m.powerKw !== undefined) payload.potencia_kw = m.powerKw;
    if (m.voltageV !== undefined) payload.voltaje_v = m.voltageV;
    if (m.weightKg !== undefined) payload.peso_kg = m.weightKg;
    if (m.frequencyHz !== undefined) payload.frecuencia_hz = m.frequencyHz;

    await supabase.from('maquinas').update(payload).eq('id', id);
    fetchAllData();
  };`;
code = code.replace(/  const updateMachine = \(id: string, m: Partial<Machine>\) => \{ fetchAllData\(\); \};/, updateMachineCode);

// 3. Fix addUsageLog and add clearAllUsageLogs
const usageLogsCode = `  const addUsageLog = (log: Omit<UsageLog, "id">) => {
    supabase.from('uso_logs').insert({
      maquina_id: log.machineId, start_at: log.startAt, end_at: log.endAt, horas: log.hours, turno: log.turno,
      operador: log.operador, observaciones: log.observaciones, registrado_por: log.registradoPor || null
    }).then(() => fetchAllData());
  };

  const clearAllUsageLogs = async () => {
    await supabase.from('uso_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('uso_ciclos').update({ horas_acumuladas: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
    fetchAllData();
  };`;
code = code.replace(/  const addUsageLog = \(log: Omit<UsageLog, "id">\) => \{[\s\S]*?\.then\(\(\) => fetchAllData\(\)\);\n  \};/, usageLogsCode);

// 4. Add clearAllUsageLogs to Context exports
code = code.replace(/addUsageLog, resetCycle,/g, 'addUsageLog, clearAllUsageLogs, resetCycle,');
code = code.replace(/addUsageLog: \(log: Omit<UsageLog, "id">\) => void;\n  resetCycle:/, 'addUsageLog: (log: Omit<UsageLog, "id">) => void;\n  clearAllUsageLogs: () => void;\n  resetCycle:');

fs.writeFileSync(path, code);
console.log("Patched successfully!");
