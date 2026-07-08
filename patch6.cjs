const fs = require('fs');
const path = 'src/context/MantePro.tsx';
let code = fs.readFileSync(path, 'utf8');

const regex = /addUsageLog:\s*\(log:\s*Omit<UsageLog,\s*"id">\)\s*=>\s*void;\s*resetCycle:\s*\(machineId:\s*string,\s*otmRef\?:\s*string\)\s*=>\s*void;/;
const replacement = `addUsageLog: (log: Omit<UsageLog, "id">) => void;
  clearAllUsageLogs: () => void;
  resetCycle: (machineId: string, otmRef?: string) => void;`;

if (code.match(regex)) {
  code = code.replace(regex, replacement);
  fs.writeFileSync(path, code);
  console.log("Patch 6 applied!");
} else {
  console.log("Could not find regex target");
}
