const fs = require('fs');
const path = 'src/context/MantePro.tsx';
let code = fs.readFileSync(path, 'utf8');

const regex = /const addMachine = async \(m: Omit<Machine, "id">\) => \{[\s\S]*?toast\.success\("Máquina registrada exitosamente"\);\s*fetchAllData\(\);\s*\}\s*\};/;

const newImplementation = `const addMachine = async (m: Omit<Machine, "id">) => {
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

    // Try to resolve area_id if a location/area string is provided
    let area_id = null;
    let institucion_id = null;
    try {
        // get institucion_id from any existing machine
        const { data: firstMachine } = await supabase.from('maquinas').select('institucion_id').limit(1).single();
        if (firstMachine) institucion_id = firstMachine.institucion_id;
        
        const uiArea = m.location || m.area;
        if (uiArea && institucion_id) {
            const { data: existingArea } = await supabase.from('areas').select('id').eq('nombre', uiArea).eq('institucion_id', institucion_id).maybeSingle();
            if (existingArea) {
                area_id = existingArea.id;
            } else {
                const { data: newArea } = await supabase.from('areas').insert({ nombre: uiArea, institucion_id }).select().single();
                if (newArea) area_id = newArea.id;
            }
        }
    } catch(err) {
        console.error("Error resolving area_id", err);
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
      anio_fabricacion: m.manufactureYear || null,
      anio_adquisicion: m.acquisitionYear || null,
      area_id: area_id,
      institucion_id: institucion_id,
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

if (code.match(regex)) {
  code = code.replace(regex, newImplementation);
  fs.writeFileSync(path, code);
  console.log("Patched addMachine2 successfully");
} else {
  console.log("Could not find addMachine regex");
}
