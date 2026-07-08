const fs = require('fs');
const path = 'src/context/MantePro.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Fetch from instituciones in fetchAllData
const fetchSettingsCode = `
      // Fetch Institution Settings
      const { data: instData } = await supabase.from('instituciones').select('*').limit(1).maybeSingle();
      if (instData) {
        setSettings(prev => ({
          ...prev,
          institutionName: instData.nombre || prev.institutionName,
          institutionLogo: instData.logo_url || prev.institutionLogo
        }));
      }
`;

if (!code.includes('Fetch Institution Settings')) {
  code = code.replace("// Fetch Users", fetchSettingsCode + "\n      // Fetch Users");
}

// 2. Implement updateSettings
const oldUpdateSettings = /const updateSettings = \(s: Partial<AppSettings>\) => \{\};/;
const newUpdateSettings = `const updateSettings = async (s: Partial<AppSettings>) => {
    // Optimistic update locally
    setSettings(prev => ({ ...prev, ...s }));

    try {
      // Get the existing institution to update
      let { data: inst } = await supabase.from('instituciones').select('id').limit(1).maybeSingle();
      
      let finalLogoUrl = s.institutionLogo;
      
      // If a new base64 image was passed, upload it
      if (s.institutionLogo && s.institutionLogo.startsWith('data:image')) {
        const res = await fetch(s.institutionLogo);
        const blob = await res.blob();
        const fileName = \`logo-\${Date.now()}.\${blob.type.split('/')[1] || 'png'}\`;
        
        const { data: upData, error: upErr } = await supabase.storage.from('maquinas-fotos').upload(fileName, blob, { upsert: true });
        
        if (upData) {
          const { data: { publicUrl } } = supabase.storage.from('maquinas-fotos').getPublicUrl(fileName);
          finalLogoUrl = publicUrl;
          setSettings(prev => ({ ...prev, institutionLogo: finalLogoUrl }));
        }
      }

      const payload: any = {};
      if (s.institutionName !== undefined) payload.nombre = s.institutionName;
      if (finalLogoUrl !== undefined) payload.logo_url = finalLogoUrl;

      if (inst) {
        // Update existing
        await supabase.from('instituciones').update(payload).eq('id', inst.id);
      } else {
        // Create new
        if (!payload.nombre) payload.nombre = "Mi Taller";
        await supabase.from('instituciones').insert(payload);
      }
      
      fetchAllData();
    } catch(err) {
      console.error("Error updating settings", err);
    }
  };`;

if (code.match(oldUpdateSettings)) {
  code = code.replace(oldUpdateSettings, newUpdateSettings);
} else {
  // Try to find it if it was changed
  code = code.replace(/const updateSettings = [^}]+?\{\s*\};/m, newUpdateSettings);
}

// 3. Fix Interface
code = code.replace(/updateSettings: \(s: Partial<AppSettings>\) => void;/, 'updateSettings: (s: Partial<AppSettings>) => Promise<void>;');

fs.writeFileSync(path, code);
console.log("Patched settings implementation!");
