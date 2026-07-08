const fs = require('fs');
const path = 'src/context/MantePro.tsx';
let code = fs.readFileSync(path, 'utf8');

const helpers = `
export const getMachineUsagePct = (cycle?: UsageCycle, threshold?: MachineThreshold) => {
  if (!cycle || !threshold || threshold.horasCiclo <= 0) return 0;
  return (cycle.horasAcumuladas / threshold.horasCiclo) * 100;
};

export const getMachineAlertStatus = (cycle?: UsageCycle, threshold?: MachineThreshold): AlertStatus => {
  const pct = getMachineUsagePct(cycle, threshold);
  if (pct >= 100) return "critical";
  if (pct >= (threshold?.alertaPct || 80)) return "warning";
  return "normal";
};
`;

const anchor = `  rating?: number;
}`;

if (!code.includes('getMachineUsagePct')) {
  code = code.replace(anchor, anchor + "\n" + helpers);
}

// Fix addUsageLog error (uuid error fix)
const addUsageLogBad = `const addUsageLog = (log: Omit<UsageLog, "id">) => {
    supabase.from('uso_logs').insert({
      maquina_id: log.machineId, start_at: log.startAt, end_at: log.endAt, horas: log.hours, turno: log.turno,
      operador: log.operador, observaciones: log.observaciones, registrado_por: log.registradoPor || null
    }).then(() => fetchAllData());
  };`;
const addUsageLogGood = `const addUsageLog = async (log: Omit<UsageLog, "id">) => {
    const { error } = await supabase.from('uso_logs').insert({
      maquina_id: log.machineId, start_at: log.startAt, end_at: log.endAt, horas: log.hours, turno: log.turno,
      operador: log.operador, observaciones: log.observaciones
    });
    if (error) console.error("Error inserting uso_log:", error);
    fetchAllData();
  };`;
code = code.replace(addUsageLogBad, addUsageLogGood);

const badUsageCycleMapRegex = /setUsageCycles\(ucData\.map\(\(u: any\) => \(\{\n          id: u\.id, machineId: u\.maquina_id, startAt: u\.start_at, horasAcumuladas: u\.horas_acumuladas, resetAt: u\.ultimo_reset\n        \}\)\)\);\n      \}/;
const correctUsageCycleMap = `setUsageCycles(ucData.map((u: any) => ({
          machineId: u.maquina_id, horasAcumuladas: u.horas_acumuladas, iniciadoEn: u.start_at || new Date().toISOString(), ultimoReset: u.ultimo_reset || new Date().toISOString(), otmRef: u.otm_ref
        })));
      }`;

if (code.match(badUsageCycleMapRegex)) {
  code = code.replace(badUsageCycleMapRegex, correctUsageCycleMap);
}

if (!code.includes('clearAllUsageLogs: () => void;')) {
  code = code.replace(/addUsageLog: \(log: Omit<UsageLog, "id">\) => void;\n/, 'addUsageLog: (log: Omit<UsageLog, "id">) => void;\n  clearAllUsageLogs: () => void;\n');
}

fs.writeFileSync(path, code);
console.log("Patch 2 (Safe) applied successfully!");
