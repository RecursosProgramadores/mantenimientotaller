const fs = require('fs');
const path = 'src/context/MantePro.tsx';
let code = fs.readFileSync(path, 'utf8');

// 1. Fetch logic
code = code.replace(/specialty: '', machinesInService: 0/g, "specialty: w.especialidad || '', machinesInService: 0");

// 2. addWorkshop logic
code = code.replace(/telefono: w\.phone,\s*activo: true/g, "telefono: w.phone,\n      especialidad: w.specialty,\n      activo: true");

// 3. updateWorkshop logic
code = code.replace(/if \(w\.phone !== undefined\) payload\.telefono = w\.phone;/g, "if (w.phone !== undefined) payload.telefono = w.phone;\n    if (w.specialty !== undefined) payload.especialidad = w.specialty;");

fs.writeFileSync(path, code);
console.log("Patched MantePro.tsx for talleres especialidad!");
