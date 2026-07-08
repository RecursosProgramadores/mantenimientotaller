const fs = require('fs');
const path = 'src/context/MantePro.tsx';
let code = fs.readFileSync(path, 'utf8');

const target1 = `  addUsageLog: (log: Omit<UsageLog, "id">) => void;
  resetCycle: (machineId: string, otmRef?: string) => void;`;

const replacement1 = `  addUsageLog: (log: Omit<UsageLog, "id">) => void;
  clearAllUsageLogs: () => void;
  resetCycle: (machineId: string, otmRef?: string) => void;`;

if (code.includes(target1)) {
  code = code.replace(target1, replacement1);
} else {
  console.log("Could not find target1");
}

fs.writeFileSync(path, code);
console.log("Patch 5 applied!");
