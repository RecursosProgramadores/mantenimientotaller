const fs = require('fs');

// 1. MantePro.tsx Fixes
let manteCode = fs.readFileSync('src/context/MantePro.tsx', 'utf8');

// Fix addUsageLog
const oldAddUsageLog = `  const addUsageLog = async (log: Omit<UsageLog, "id">) => {
    const { error } = await supabase.from('uso_logs').insert({
      maquina_id: log.machineId, start_at: log.startAt, end_at: log.endAt, horas: log.hours, turno: log.turno,
      operador: log.operador, observaciones: log.observaciones
    });
    if (error) console.error("Error inserting uso_log:", error);
    fetchAllData();
  };`;

const newAddUsageLog = `  const addUsageLog = async (log: Omit<UsageLog, "id">) => {
    // 1. Insert log with registrado_por
    const { error } = await supabase.from('uso_logs').insert({
      maquina_id: log.machineId, start_at: log.startAt, end_at: log.endAt, horas: log.hours, turno: log.turno,
      operador: log.operador, observaciones: log.observaciones, registrado_por: log.registradoPor
    });
    if (error) console.error("Error inserting uso_log:", error);

    // 2. Update usage cycle accumulated hours
    const { data: cycle } = await supabase.from('uso_ciclos').select('horas_acumuladas').eq('maquina_id', log.machineId).maybeSingle();
    const currentHours = cycle ? parseFloat(cycle.horas_acumuladas || '0') : 0;
    
    await supabase.from('uso_ciclos')
      .update({ horas_acumuladas: currentHours + log.hours })
      .eq('maquina_id', log.machineId);

    fetchAllData();
  };`;

manteCode = manteCode.replace(oldAddUsageLog, newAddUsageLog);
fs.writeFileSync('src/context/MantePro.tsx', manteCode);

// 2. uso-maquinas.tsx Fixes
let usoCode = fs.readFileSync('src/routes/uso-maquinas.tsx', 'utf8');

// Fix clearing the form: the form should reset after submit.
// It is handled by initialForm state.
usoCode = usoCode.replace(
  /onClose\(\);\n  \};\n\n  return \(/,
  `setForm(initialForm); onClose();\n  };\n\n  return (`
);

// We should also clear it when the modal is closed without submitting.
usoCode = usoCode.replace(
  /<Dialog open=\{open\} onOpenChange=\{\(o\) => !o && onClose\(\)\}>/,
  `<Dialog open={open} onOpenChange={(o) => { if(!o) { setForm(initialForm); onClose(); } }}>`
);

// Fix "imprimir el historial" button
// Add a print button next to "Limpiar Historial de Uso"
usoCode = usoCode.replace(
  /<Button variant="destructive" size="sm" onClick=\{clearAllUsageLogs\}>\n\s*Limpiar Historial de Uso\n\s*<\/Button>/,
  `<Button variant="outline" size="sm" onClick={() => window.print()} className="print:hidden mr-2">\n            <Printer className="h-4 w-4 mr-2" /> Imprimir Historial\n          </Button>\n          <Button variant="destructive" size="sm" onClick={clearAllUsageLogs} className="print:hidden">\n            Limpiar Historial de Uso\n          </Button>`
);

// We need to import Printer icon from lucide-react if not present.
if (!usoCode.includes('Printer')) {
  usoCode = usoCode.replace(
    /import \{([^}]+)\} from "lucide-react";/,
    `import {$1, Printer} from "lucide-react";`
  );
}

fs.writeFileSync('src/routes/uso-maquinas.tsx', usoCode);
console.log("Patched MantePro.tsx and uso-maquinas.tsx!");
