const fs = require('fs');
const path = 'src/context/MantePro.tsx';
let code = fs.readFileSync(path, 'utf8');

const regex = /const updateMachine = async \(id: string, m: Partial<Machine>\) => \{[\s\S]*?await supabase\.from\('maquinas'\)\.update\(payload\)\.eq\('id', id\);\s*fetchAllData\(\);\s*\};/;

const newImplementation = `const updateMachine = async (id: string, m: Partial<Machine>) => {
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
    if (m.manufactureYear !== undefined) payload.anio_fabricacion = m.manufactureYear;
    if (m.acquisitionYear !== undefined) payload.anio_adquisicion = m.acquisitionYear;

    if (m.threshold) {
        if (m.threshold.horasCiclo) payload.umbral_horas_ciclo = m.threshold.horasCiclo;
        if (m.threshold.diasMaximos) payload.umbral_dias_maximos = m.threshold.diasMaximos;
        if (m.threshold.alertaPct) payload.umbral_alerta_pct = m.threshold.alertaPct;
        if (m.threshold.turno) payload.turno_operacion = m.threshold.turno;
    }

    if (m.location !== undefined || m.area !== undefined) {
        let area_id = null;
        try {
            const { data: firstMachine } = await supabase.from('maquinas').select('institucion_id').limit(1).single();
            const uiArea = m.location || m.area;
            if (uiArea && firstMachine?.institucion_id) {
                const { data: existingArea } = await supabase.from('areas').select('id').eq('nombre', uiArea).eq('institucion_id', firstMachine.institucion_id).maybeSingle();
                if (existingArea) {
                    area_id = existingArea.id;
                } else {
                    const { data: newArea } = await supabase.from('areas').insert({ nombre: uiArea, institucion_id: firstMachine.institucion_id }).select().single();
                    if (newArea) area_id = newArea.id;
                }
            }
        } catch(e) {}
        if (area_id) payload.area_id = area_id;
    }

    await supabase.from('maquinas').update(payload).eq('id', id);
    fetchAllData();
  };`;

if (code.match(regex)) {
  code = code.replace(regex, newImplementation);
  fs.writeFileSync(path, code);
  console.log("Patched updateMachine successfully");
} else {
  console.log("Could not find updateMachine regex");
}
