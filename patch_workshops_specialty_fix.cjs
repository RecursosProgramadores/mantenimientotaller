const fs = require('fs');
const path = 'src/context/MantePro.tsx';
let code = fs.readFileSync(path, 'utf8');

// The file currently has: specialty: w.especialidad || '', machinesInService: 0
// I'll replace it with: specialty: w.direccion || '', address: w.direccion || '', machinesInService: 0
code = code.replace(/specialty: w\.especialidad \|\| '', machinesInService: 0/g, "specialty: w.direccion || '', address: w.direccion || '', machinesInService: 0");

// In addWorkshop: it currently has:
//       telefono: w.phone,
//       especialidad: w.specialty,
//       activo: true
code = code.replace(/telefono: w\.phone,\s*especialidad: w\.specialty,\s*activo: true/g, "telefono: w.phone,\n      direccion: w.specialty,\n      activo: true");

// In updateWorkshop: it currently has:
//     if (w.phone !== undefined) payload.telefono = w.phone;
//     if (w.specialty !== undefined) payload.especialidad = w.specialty;
code = code.replace(/if \(w\.specialty !== undefined\) payload\.especialidad = w\.specialty;/g, "if (w.specialty !== undefined) payload.direccion = w.specialty;");

fs.writeFileSync(path, code);
console.log("Patched specialty using direccion!");
