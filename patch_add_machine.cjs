const fs = require('fs');
const path = 'src/context/MantePro.tsx';
let code = fs.readFileSync(path, 'utf8');

const dummyAddMachine = '  const addMachine = async (m: Omit<Machine, "id">) => { fetchAllData(); };';

const realAddMachine = `  const addMachine = async (m: Omit<Machine, "id">) => {
    let finalPhotoUrl = m.photo;
    
    if (m.photo && m.photo.startsWith('data:image')) {
      try {
        const res = await fetch(m.photo);
        const blob = await res.blob();
        const fileName = \`\${m.code}-\${Date.now()}.jpg\`;
        const { data, error } = await supabase.storage.from('maquinas-fotos').upload(fileName, blob, {
          upsert: true
        });
        if (data) {
          const { data: { publicUrl } } = supabase.storage.from('maquinas-fotos').getPublicUrl(fileName);
          finalPhotoUrl = publicUrl;
        }
      } catch(e) { console.error("Error uploading image", e); }
    }

    const payload: any = {
      nombre: m.name,
      codigo: m.code,
      codigo_patrimonial: m.patrimonialCode,
      marca: m.brand,
      modelo: m.model,
      numero_serie: m.serial,
      estado: m.status,
      criticidad: m.criticality,
      observaciones: m.observations,
      foto_url: finalPhotoUrl,
      costo: m.cost,
      potencia_kw: m.powerKw,
      voltaje_v: m.voltageV,
      peso_kg: m.weightKg,
      frecuencia_hz: m.frequencyHz,
      umbral_horas_ciclo: m.threshold?.horasCiclo || 30,
      umbral_dias_maximos: m.threshold?.diasMaximos || 30,
      umbral_alerta_pct: m.threshold?.alertaPct || 80,
      turno_operacion: m.threshold?.turno || 'Variable'
    };

    const { error } = await supabase.from('maquinas').insert(payload);
    if (error) {
      console.error("Error inserting machine:", error);
      toast.error("Error al registrar máquina: " + error.message);
    } else {
      toast.success("Máquina registrada exitosamente");
      fetchAllData();
    }
  };`;

if (code.includes(dummyAddMachine)) {
  code = code.replace(dummyAddMachine, realAddMachine);
  fs.writeFileSync(path, code);
  console.log("Patched addMachine successfully");
} else {
  console.log("Could not find dummy addMachine. Maybe it's formatted differently?");
}
