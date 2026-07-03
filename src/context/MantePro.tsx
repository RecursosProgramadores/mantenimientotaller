import { createContext, useContext, useState, type ReactNode } from "react";

export type MachineStatus = "Operativo" | "En Revisión" | "En Taller" | "Fuera de Servicio";
export type Criticality = "Alto" | "Medio" | "Bajo";
export type Frequency = "Diario" | "Semanal" | "Mensual" | "Semestral" | "Anual" | "A condición";
export type RecordStatus = "Programado" | "En Proceso" | "Completado" | "Cancelado";

export interface CriticalComponent {
  id: string;
  name: string;
  function: string;
  state: string;
  criticality: Criticality;
}

export interface Machine {
  id: string;
  code: string;
  name: string;
  brand: string;
  model: string;
  serial?: string;
  purchaseDate?: string;
  cost?: number;
  area?: string;
  department?: string;
  powerKw?: number;
  voltageV?: number;
  frequencyHz?: number;
  weightKg?: number;
  annualHours?: number;
  daysPerWeek?: number;
  status: MachineStatus;
  criticality: Criticality;
  observations?: string;
  photo?: string;
  hoursOfUse: number;
  components: CriticalComponent[];
  sheetUpdatedAt?: string;
  location: string;
  acquiredAt: string;
}

export interface TypeActivity {
  id: string;
  text: string;
  durationMin: number;
  role: string;
}

export interface MaintenanceType {
  id: string;
  name: string;
  description: string;
  color: string;             // tailwind token color name (success, info, primary, etc.)
  frequency: Frequency;
  frequencyDays: number;
  estimatedHours: number;
  activities: TypeActivity[];
  active: boolean;
  // legacy
  category: "Preventivo" | "Correctivo" | "Predictivo";
}

export interface RecordActivity {
  id: string;
  text: string;
  done: boolean;
  observations?: string;
}

export interface RecordPart {
  id: string;
  name: string;
  quantity: number;
  unitCost: number;
}

export interface MaintenanceRecord {
  id: string;
  otm: string;                       // OTM-YYYY-NNN
  machineId: string;
  typeId: string;
  date: string;                      // YYYY-MM-DD
  startTime?: string;                // HH:MM
  endTime?: string;
  technician: string;
  supervisor?: string;
  area?: string;
  status: RecordStatus;
  notes: string;                     // legacy
  activities: RecordActivity[];
  parts: RecordPart[];
  laborCost: number;
  cost: number;                      // total general
  postState?: string;
  nextDate?: string;
  nextTypeId?: string;
  findings?: string;
  technicianSignature?: string;
  supervisorSignature?: string;
}

export interface Workshop {
  id: string; name: string; contact: string; phone: string; specialty: string; machinesInService: number;
  address?: string;
}
export interface TechSheet {
  id: string; machineId: string; title: string; updatedAt: string; pages: number;
}

export type WorkshopRecordStatus = "En Taller" | "Devuelto" | "Cancelado";
export type ProblemType = "Falla eléctrica" | "Falla mecánica" | "Desgaste de componentes" | "Calibración" | "Reparación mayor" | "Otro";
export type WorkshopCondition = "Operativo con fallas" | "No operativo" | "Parcialmente operativo";
export type DocCategory = "Diagnóstico previo" | "Presupuesto del taller" | "Fotografías del problema" | "Factura" | "Informe de reparación" | "Otros";

export const PROBLEM_TYPES: ProblemType[] = ["Falla eléctrica","Falla mecánica","Desgaste de componentes","Calibración","Reparación mayor","Otro"];
export const WORKSHOP_CONDITIONS: WorkshopCondition[] = ["Operativo con fallas","No operativo","Parcialmente operativo"];
export const DOC_CATEGORIES: DocCategory[] = ["Diagnóstico previo","Presupuesto del taller","Fotografías del problema","Factura","Informe de reparación","Otros"];

export interface AppDocument {
  id: string;
  name: string;
  size: number;
  mime: string;
  dataUrl: string;
  category: DocCategory;
  description?: string;
  uploadedAt: string;
  workshopRecordId?: string;
  machineId?: string;
}

export interface WorkshopLog { id: string; at: string; note: string; status?: WorkshopRecordStatus }

export interface WorkshopRecord {
  id: string;
  machineId: string;
  workshopName: string;
  workshopAddress?: string;
  workshopPhone?: string;
  workshopContact?: string;
  sentDate: string;
  estimatedReturn?: string;
  actualReturn?: string;
  problemType: ProblemType;
  problemDescription: string;
  affectedComponentIds: string[];
  condition: WorkshopCondition;
  approvedBudget: number;
  authorizedBy: string;
  status: WorkshopRecordStatus;
  technician: string;
  documents: AppDocument[];
  logs: WorkshopLog[];
  finalCost?: number;
  workSummary?: string;
  rating?: number;
}

export interface SparePart { id: string; name: string; reference: string; supplier: string; price: number }
export interface Technician { id: string; name: string; role: string; area: string }
export interface AppSettings {
  institutionName: string;
  institutionLogo?: string;
  notifyDaysBefore: number;
  mtbfGoalH: number;
  availabilityGoalPct: number;
}

interface State {
  machines: Machine[]; types: MaintenanceType[]; records: MaintenanceRecord[];
  workshops: Workshop[]; sheets: TechSheet[];
  workshopRecords: WorkshopRecord[];
  spareParts: SparePart[];
  technicians: Technician[];
  settings: AppSettings;
  addMachine: (m: Omit<Machine, "id">) => void;
  updateMachine: (id: string, m: Partial<Machine>) => void;
  deleteMachine: (id: string) => void;
  addRecord: (r: Omit<MaintenanceRecord, "id">) => string;
  updateRecord: (id: string, r: Partial<MaintenanceRecord>) => void;
  deleteRecord: (id: string) => void;
  addType: (t: Omit<MaintenanceType, "id">) => void;
  updateType: (id: string, t: Partial<MaintenanceType>) => void;
  deleteType: (id: string) => void;
  addWorkshop: (w: Omit<Workshop, "id">) => void;
  updateWorkshop: (id: string, w: Partial<Workshop>) => void;
  deleteWorkshop: (id: string) => void;
  upsertComponent: (machineId: string, c: CriticalComponent) => void;
  deleteComponent: (machineId: string, componentId: string) => void;
  addWorkshopRecord: (r: Omit<WorkshopRecord, "id">) => string;
  updateWorkshopRecord: (id: string, r: Partial<WorkshopRecord>) => void;
  deleteWorkshopRecord: (id: string) => void;
  addWorkshopLog: (id: string, note: string, status?: WorkshopRecordStatus) => void;
  addDocumentsToWorkshop: (id: string, docs: AppDocument[]) => void;
  removeDocumentFromWorkshop: (id: string, docId: string) => void;
  addSparePart: (p: Omit<SparePart, "id">) => void;
  updateSparePart: (id: string, p: Partial<SparePart>) => void;
  deleteSparePart: (id: string) => void;
  addTechnician: (t: Omit<Technician, "id">) => void;
  updateTechnician: (id: string, t: Partial<Technician>) => void;
  deleteTechnician: (id: string) => void;
  updateSettings: (s: Partial<AppSettings>) => void;
  allDocuments: () => AppDocument[];
}

const Ctx = createContext<State | null>(null);
// Runtime uid for new items (only used after user interaction, never during SSR initial render).
const uid = () => Math.random().toString(36).slice(2, 10);
// Deterministic uid for initial seed data — keeps SSR and CSR markup identical.
let _seedCounter = 0;
const sid = (prefix = "s") => `${prefix}-${++_seedCounter}`;

const initialMachines: Machine[] = [
  {
    id: "m1", code: "FRS-001", name: "Fresadora/Taladro-Fresadora", brand: "Sieg", model: "ZX7032",
    serial: "ZX7032-2015-0142", purchaseDate: "2015-06-15", cost: 5800,
    area: "Taller de Mecanizado", department: "Facultad de Ingeniería Mecánica",
    powerKw: 1.5, voltageV: 220, frequencyHz: 60, weightKg: 400,
    annualHours: 300, daysPerWeek: 4,
    status: "Operativo", criticality: "Alto",
    observations: "Equipo de uso académico. Requiere lubricación periódica y revisión de correas trapezoidales.",
    hoursOfUse: 4820,
    components: [
      { id: sid(), name: "Correas trapezoidales", function: "Transmisión motor-husillo", state: "Operativo con desgaste leve", criticality: "Alto" },
      { id: sid(), name: "Guías de desplazamiento", function: "Movimiento de mesa X/Y", state: "Operativo", criticality: "Medio" },
      { id: sid(), name: "Husillo principal", function: "Sujeción y giro de herramienta", state: "Operativo", criticality: "Alto" },
      { id: sid(), name: "Rodamientos del husillo", function: "Soporte rotacional del husillo", state: "Operativo", criticality: "Medio" },
      { id: sid(), name: "Motor eléctrico", function: "Fuente de potencia", state: "Operativo", criticality: "Bajo" },
    ],
    sheetUpdatedAt: "2025-06-15",
    location: "Taller de Mecanizado", acquiredAt: "2015-06-15",
  },
  {
    id: "m2", code: "TRN-002", name: "Torno CNC TC-450", brand: "Haas", model: "TC-450",
    serial: "HAAS-TC450-9821", purchaseDate: "2019-07-22", cost: 48500,
    area: "Nave A - Línea 2", department: "Producción",
    powerKw: 11, voltageV: 380, frequencyHz: 60, weightKg: 2200,
    annualHours: 1800, daysPerWeek: 6,
    status: "En Revisión", criticality: "Alto",
    hoursOfUse: 9120, components: [],
    location: "Nave A - Línea 2", acquiredAt: "2019-07-22",
  },
  {
    id: "m3", code: "PRS-003", name: "Prensa Hidráulica P-200", brand: "Enerpac", model: "P-200",
    serial: "ENP-200-3344", purchaseDate: "2018-01-10", cost: 22000,
    area: "Nave B - Estampado", department: "Producción",
    powerKw: 7.5, voltageV: 380, frequencyHz: 60, weightKg: 1800,
    annualHours: 1500, daysPerWeek: 5,
    status: "En Taller", criticality: "Medio",
    hoursOfUse: 12450, components: [],
    location: "Nave B - Estampado", acquiredAt: "2018-01-10",
  },
  {
    id: "m4", code: "SLD-004", name: "Soldadora MIG-350", brand: "Lincoln", model: "MIG-350",
    serial: "LIN-MIG350-7711", purchaseDate: "2022-09-05", cost: 3200,
    area: "Nave B - Soldadura", department: "Producción",
    powerKw: 12, voltageV: 220, frequencyHz: 60, weightKg: 95,
    annualHours: 900, daysPerWeek: 5,
    status: "Operativo", criticality: "Bajo",
    hoursOfUse: 2100, components: [],
    location: "Nave B - Soldadura", acquiredAt: "2022-09-05",
  },
  {
    id: "m5", code: "CMP-005", name: "Compresor Industrial CI-75", brand: "Atlas Copco", model: "CI-75",
    serial: "AC-CI75-0021", purchaseDate: "2017-04-18", cost: 18900,
    area: "Sala de Máquinas", department: "Servicios",
    powerKw: 55, voltageV: 380, frequencyHz: 60, weightKg: 950,
    annualHours: 4000, daysPerWeek: 7,
    status: "Fuera de Servicio", criticality: "Alto",
    hoursOfUse: 18900, components: [],
    location: "Sala de Máquinas", acquiredAt: "2017-04-18",
  },
  {
    id: "m6", code: "RCT-006", name: "Rectificadora R-800", brand: "Okuma", model: "R-800",
    serial: "OKU-R800-5512", purchaseDate: "2020-11-30", cost: 31000,
    area: "Nave A - Acabados", department: "Producción",
    powerKw: 5.5, voltageV: 380, frequencyHz: 60, weightKg: 1100,
    annualHours: 1200, daysPerWeek: 5,
    status: "Operativo", criticality: "Medio",
    hoursOfUse: 5630, components: [],
    location: "Nave A - Acabados", acquiredAt: "2020-11-30",
  },
];

const initialTypes: MaintenanceType[] = [
  {
    id: "t-diario", name: "Preventivo Diario", color: "success", frequency: "Diario", frequencyDays: 1,
    estimatedHours: 0.5, active: true, category: "Preventivo",
    description: "Inspección visual y limpieza diaria del equipo.",
    activities: [
      { id: sid(), text: "Limpieza general de virutas y residuos", durationMin: 10, role: "Operador" },
      { id: sid(), text: "Inspección visual de fugas", durationMin: 5, role: "Operador" },
      { id: sid(), text: "Verificar niveles de lubricante", durationMin: 10, role: "Operador" },
    ],
  },
  {
    id: "t-semanal", name: "Preventivo Semanal", color: "info", frequency: "Semanal", frequencyDays: 7,
    estimatedHours: 1.5, active: true, category: "Preventivo",
    description: "Revisión semanal de elementos de transmisión y lubricación.",
    activities: [
      { id: sid(), text: "Lubricar guías de desplazamiento", durationMin: 20, role: "Técnico" },
      { id: sid(), text: "Revisar tensión de correas", durationMin: 25, role: "Técnico" },
      { id: sid(), text: "Verificar ajuste de pernos", durationMin: 20, role: "Técnico" },
    ],
  },
  {
    id: "t-mensual", name: "Preventivo Mensual", color: "primary", frequency: "Mensual", frequencyDays: 30,
    estimatedHours: 3, active: true, category: "Preventivo",
    description: "Mantenimiento mensual completo con revisión eléctrica.",
    activities: [
      { id: sid(), text: "Cambio de lubricante de husillo", durationMin: 45, role: "Técnico" },
      { id: sid(), text: "Inspección de conexiones eléctricas", durationMin: 30, role: "Electricista" },
      { id: sid(), text: "Calibración de mesa X/Y", durationMin: 60, role: "Técnico" },
    ],
  },
  {
    id: "t-semestral", name: "Preventivo Semestral", color: "warning", frequency: "Semestral", frequencyDays: 180,
    estimatedHours: 8, active: true, category: "Preventivo",
    description: "Overhaul semestral con cambio de consumibles.",
    activities: [
      { id: sid(), text: "Cambio de correas trapezoidales", durationMin: 90, role: "Técnico" },
      { id: sid(), text: "Cambio de rodamientos críticos", durationMin: 180, role: "Mecánico" },
      { id: sid(), text: "Reapriete general", durationMin: 60, role: "Técnico" },
    ],
  },
  {
    id: "t-correctivo", name: "Correctivo", color: "critical", frequency: "A condición", frequencyDays: 0,
    estimatedHours: 4, active: true, category: "Correctivo",
    description: "Reparación de falla detectada en el equipo.",
    activities: [
      { id: sid(), text: "Diagnóstico de falla", durationMin: 60, role: "Técnico" },
      { id: sid(), text: "Reparación / reemplazo", durationMin: 180, role: "Mecánico" },
      { id: sid(), text: "Pruebas de funcionamiento", durationMin: 30, role: "Técnico" },
    ],
  },
  {
    id: "t-predictivo", name: "Predictivo", color: "accent", frequency: "A condición", frequencyDays: 90,
    estimatedHours: 2, active: true, category: "Predictivo",
    description: "Análisis de condición (vibraciones, termografía, aceites).",
    activities: [
      { id: sid(), text: "Medición de vibraciones", durationMin: 45, role: "Técnico Predictivo" },
      { id: sid(), text: "Termografía", durationMin: 30, role: "Técnico Predictivo" },
      { id: sid(), text: "Análisis de aceite", durationMin: 45, role: "Técnico Predictivo" },
    ],
  },
  {
    id: "t-taller", name: "Taller Externo", color: "yellow", frequency: "A condición", frequencyDays: 0,
    estimatedHours: 0, active: true, category: "Correctivo",
    description: "Servicio realizado por taller externo.",
    activities: [
      { id: sid(), text: "Coordinar retiro de equipo", durationMin: 30, role: "Supervisor" },
      { id: sid(), text: "Seguimiento de orden de servicio", durationMin: 0, role: "Supervisor" },
    ],
  },
];

const todayISO = () => new Date().toISOString().slice(0, 10);
const dPlus = (d: number) => new Date(Date.UTC(2025, 5, 15) + d * 86400000).toISOString().slice(0, 10);

// Historical OTMs for FRS-001 (2020-2024)
const frsHistory: MaintenanceRecord[] = [
  {
    id: sid(), otm: "OTM-2020-001", machineId: "m1", typeId: "t-correctivo",
    date: "2020-03-12", startTime: "08:30", endTime: "13:00",
    technician: "Carlos Ruiz", supervisor: "J. Mendoza", area: "Taller de Mecanizado",
    status: "Completado",
    notes: "Falla de motor eléctrico — recalentamiento por sobrecarga.",
    activities: [
      { id: sid(), text: "Diagnóstico de falla", done: true, observations: "Bobinado del motor con cortocircuito parcial." },
      { id: sid(), text: "Reemplazo de motor eléctrico 1.5kW", done: true },
      { id: sid(), text: "Pruebas de funcionamiento", done: true },
    ],
    parts: [
      { id: sid(), name: "Motor eléctrico 1.5kW 220V", quantity: 1, unitCost: 850 },
      { id: sid(), name: "Cable de alimentación", quantity: 3, unitCost: 12 },
    ],
    laborCost: 180, cost: 1066,
    postState: "Operativo", findings: "Recomendar protector térmico adicional.",
    technicianSignature: "Carlos Ruiz", supervisorSignature: "J. Mendoza",
  },
  {
    id: sid(), otm: "OTM-2021-014", machineId: "m1", typeId: "t-semestral",
    date: "2021-09-08", startTime: "09:00", endTime: "17:30",
    technician: "Juan Pérez", supervisor: "J. Mendoza", area: "Taller de Mecanizado",
    status: "Completado",
    notes: "Mantenimiento semestral programado.",
    activities: [
      { id: sid(), text: "Cambio de correas trapezoidales", done: true },
      { id: sid(), text: "Cambio de rodamientos críticos", done: true },
      { id: sid(), text: "Reapriete general", done: true },
    ],
    parts: [
      { id: sid(), name: "Correa trapezoidal A-42", quantity: 2, unitCost: 35 },
      { id: sid(), name: "Rodamiento 6205-2RS", quantity: 4, unitCost: 28 },
    ],
    laborCost: 240, cost: 422,
    postState: "Operativo", findings: "Guías muestran desgaste — vigilar.",
    technicianSignature: "Juan Pérez", supervisorSignature: "J. Mendoza",
  },
  {
    id: sid(), otm: "OTM-2022-022", machineId: "m1", typeId: "t-correctivo",
    date: "2022-05-19", startTime: "10:00", endTime: "12:30",
    technician: "María López", supervisor: "J. Mendoza", area: "Taller de Mecanizado",
    status: "Completado",
    notes: "Ruido anormal en husillo principal.",
    activities: [
      { id: sid(), text: "Desmontaje del husillo", done: true },
      { id: sid(), text: "Cambio de rodamientos del husillo", done: true, observations: "Pista exterior con picado." },
      { id: sid(), text: "Montaje y alineación", done: true },
    ],
    parts: [
      { id: sid(), name: "Rodamiento angular 7206 BEP", quantity: 2, unitCost: 95 },
      { id: sid(), name: "Grasa SKF LGEP 2", quantity: 1, unitCost: 22 },
    ],
    laborCost: 150, cost: 362,
    postState: "Operativo", findings: "Reducir intervalo de inspección.",
    technicianSignature: "María López", supervisorSignature: "J. Mendoza",
  },
  {
    id: sid(), otm: "OTM-2023-031", machineId: "m1", typeId: "t-predictivo",
    date: "2023-11-04", startTime: "11:00", endTime: "13:00",
    technician: "Luis Fernández", supervisor: "J. Mendoza", area: "Taller de Mecanizado",
    status: "Completado",
    notes: "Análisis predictivo trimestral.",
    activities: [
      { id: sid(), text: "Medición de vibraciones", done: true, observations: "ISO 10816 — zona B." },
      { id: sid(), text: "Termografía", done: true, observations: "Motor a 62 °C, normal." },
      { id: sid(), text: "Análisis de aceite", done: true },
    ],
    parts: [],
    laborCost: 220, cost: 220,
    postState: "Operativo", findings: "Continuar con plan preventivo actual.",
    technicianSignature: "Luis Fernández", supervisorSignature: "J. Mendoza",
  },
  {
    id: sid(), otm: "OTM-2024-007", machineId: "m1", typeId: "t-mensual",
    date: "2024-04-22", startTime: "08:00", endTime: "11:30",
    technician: "Juan Pérez", supervisor: "J. Mendoza", area: "Taller de Mecanizado",
    status: "Completado",
    notes: "Mantenimiento preventivo mensual.",
    activities: [
      { id: sid(), text: "Cambio de lubricante de husillo", done: true },
      { id: sid(), text: "Inspección de conexiones eléctricas", done: true },
      { id: sid(), text: "Calibración de mesa X/Y", done: true, observations: "Tolerancia 0.02 mm." },
    ],
    parts: [
      { id: sid(), name: "Aceite ISO VG 68", quantity: 2, unitCost: 28 },
    ],
    laborCost: 140, cost: 196,
    postState: "Operativo", findings: "Sin observaciones relevantes.",
    technicianSignature: "Juan Pérez", supervisorSignature: "J. Mendoza",
  },
];

const initialRecords: MaintenanceRecord[] = [
  ...frsHistory,
  {
    id: sid(), otm: "OTM-2025-001", machineId: "m2", typeId: "t-correctivo",
    date: "2025-06-14", startTime: "09:00", technician: "María López", supervisor: "J. Mendoza",
    area: "Nave A", status: "En Proceso", notes: "Falla en eje principal — en diagnóstico.",
    activities: [], parts: [], laborCost: 0, cost: 850,
  },
  {
    id: sid(), otm: "OTM-2025-002", machineId: "m3", typeId: "t-semestral",
    date: "2025-06-10", startTime: "08:00", endTime: "16:00",
    technician: "Carlos Ruiz", supervisor: "J. Mendoza", area: "Nave B",
    status: "Completado", notes: "Cambio programado de aceite hidráulico.",
    activities: [], parts: [], laborCost: 200, cost: 540,
    technicianSignature: "Carlos Ruiz", supervisorSignature: "J. Mendoza",
  },
  {
    id: sid(), otm: "OTM-2025-003", machineId: "m4", typeId: "t-semanal",
    date: "2025-06-08", technician: "Ana Torres", supervisor: "J. Mendoza",
    area: "Nave B", status: "Completado", notes: "Revisión eléctrica semanal.",
    activities: [], parts: [], laborCost: 90, cost: 90,
    technicianSignature: "Ana Torres",
  },
  {
    id: sid(), otm: "OTM-2025-004", machineId: "m1", typeId: "t-semanal",
    date: dPlus(3), technician: "Juan Pérez", supervisor: "J. Mendoza",
    area: "Taller de Mecanizado", status: "Programado", notes: "Inspección semanal programada.",
    activities: [], parts: [], laborCost: 0, cost: 0,
  },
  {
    id: sid(), otm: "OTM-2025-005", machineId: "m6", typeId: "t-semestral",
    date: dPlus(12), technician: "Carlos Ruiz", supervisor: "J. Mendoza",
    area: "Nave A", status: "Programado", notes: "Cambio semestral.",
    activities: [], parts: [], laborCost: 0, cost: 0,
  },
];

const initialWorkshops: Workshop[] = [
  { id: "w1", name: "Talleres Mecánicos Andina", contact: "Roberto Silva", phone: "+34 911 234 567", specialty: "Mecánica de precisión", machinesInService: 1 },
  { id: "w2", name: "ElectroMotor S.L.", contact: "Patricia Núñez", phone: "+34 912 987 654", specialty: "Bobinado de motores", machinesInService: 0 },
  { id: "w3", name: "HidroServ Industrial", contact: "Miguel Ángel", phone: "+34 913 555 111", specialty: "Sistemas hidráulicos", machinesInService: 0 },
];

const initialSheets: TechSheet[] = [
  { id: "s1", machineId: "m1", title: "Manual Fresadora ZX7032", updatedAt: "2024-08-12", pages: 84 },
  { id: "s2", machineId: "m2", title: "Especificaciones Torno TC-450", updatedAt: "2024-05-03", pages: 120 },
  { id: "s3", machineId: "m3", title: "Plan de mantenimiento Prensa P-200", updatedAt: "2024-09-21", pages: 42 },
  { id: "s4", machineId: "m4", title: "Manual Soldadora MIG-350", updatedAt: "2025-01-10", pages: 56 },
];

const initialWorkshopRecords: WorkshopRecord[] = [
  {
    id: "wr1", machineId: "m3", workshopName: "HidroServ Industrial",
    workshopAddress: "Av. Industrial 1245, Madrid", workshopPhone: "+34 913 555 111", workshopContact: "Miguel Ángel",
    sentDate: "2025-06-05", estimatedReturn: "2025-06-25",
    problemType: "Falla mecánica",
    problemDescription: "Pérdida de presión en cilindro principal; fugas internas detectadas tras prueba de carga.",
    affectedComponentIds: [],
    condition: "No operativo", approvedBudget: 1850, authorizedBy: "J. Mendoza",
    status: "En Taller", technician: "Carlos Ruiz",
    documents: [],
    logs: [
      { id: sid(), at: "2025-06-05T09:00", note: "Equipo retirado por el taller. Acta firmada.", status: "En Taller" },
      { id: sid(), at: "2025-06-10T11:30", note: "Taller confirma necesidad de cambio de sellos y revisión de bomba." },
    ],
  },
];

const initialSpareParts: SparePart[] = [
  { id: "sp1", name: "Correa trapezoidal A-42", reference: "A-42", supplier: "Optibelt", price: 35 },
  { id: "sp2", name: "Rodamiento 6205-2RS", reference: "6205-2RS", supplier: "SKF", price: 28 },
  { id: "sp3", name: "Aceite ISO VG 68", reference: "VG68-5L", supplier: "Shell", price: 28 },
  { id: "sp4", name: "Rodamiento angular 7206 BEP", reference: "7206-BEP", supplier: "SKF", price: 95 },
];

const initialTechnicians: Technician[] = [
  { id: "u1", name: "J. Mendoza", role: "Jefe de Mantenimiento", area: "General" },
  { id: "u2", name: "Carlos Ruiz", role: "Técnico Mecánico", area: "Taller de Mecanizado" },
  { id: "u3", name: "Juan Pérez", role: "Técnico Mecánico", area: "Taller de Mecanizado" },
  { id: "u4", name: "María López", role: "Técnico Eléctrico", area: "Nave A" },
  { id: "u5", name: "Luis Fernández", role: "Técnico Predictivo", area: "General" },
  { id: "u6", name: "Ana Torres", role: "Operadora", area: "Nave B" },
];

const initialSettings: AppSettings = {
  institutionName: "Planta Industrial Norte",
  notifyDaysBefore: 7,
  mtbfGoalH: 220,
  availabilityGoalPct: 95,
};

export function MantePoProvider({ children }: { children: ReactNode }) {
  const [machines, setMachines] = useState(initialMachines);
  const [types, setTypes] = useState(initialTypes);
  const [records, setRecords] = useState(initialRecords);
  const [workshops, setWorkshops] = useState(initialWorkshops);
  const [sheets] = useState(initialSheets);
  const [workshopRecords, setWorkshopRecords] = useState(initialWorkshopRecords);
  const [spareParts, setSpareParts] = useState(initialSpareParts);
  const [technicians, setTechnicians] = useState(initialTechnicians);
  const [settings, setSettings] = useState(initialSettings);

  const value: State = {
    machines, types, records, workshops, sheets,
    workshopRecords, spareParts, technicians, settings,
    addMachine: (m) => setMachines((x) => [...x, { ...m, id: sid() }]),
    updateMachine: (id, patch) => setMachines((x) => x.map((m) => (m.id === id ? { ...m, ...patch } : m))),
    deleteMachine: (id) => setMachines((x) => x.filter((m) => m.id !== id)),
    addRecord: (r) => { const id = uid(); setRecords((x) => [{ ...r, id }, ...x]); return id; },
    updateRecord: (id, patch) => setRecords((x) => x.map((r) => (r.id === id ? { ...r, ...patch } : r))),
    deleteRecord: (id) => setRecords((x) => x.filter((r) => r.id !== id)),
    addType: (t) => setTypes((x) => [...x, { ...t, id: sid() }]),
    updateType: (id, patch) => setTypes((x) => x.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    deleteType: (id) => setTypes((x) => x.filter((t) => t.id !== id)),
    addWorkshop: (w) => setWorkshops((x) => [...x, { ...w, id: sid() }]),
    updateWorkshop: (id, patch) => setWorkshops((x) => x.map((w) => (w.id === id ? { ...w, ...patch } : w))),
    deleteWorkshop: (id) => setWorkshops((x) => x.filter((w) => w.id !== id)),
    upsertComponent: (machineId, c) => setMachines((x) => x.map((m) => {
      if (m.id !== machineId) return m;
      const exists = m.components.some((k) => k.id === c.id);
      const components = exists ? m.components.map((k) => (k.id === c.id ? c : k)) : [...m.components, c];
      return { ...m, components, sheetUpdatedAt: todayISO() };
    })),
    deleteComponent: (machineId, componentId) => setMachines((x) => x.map((m) =>
      m.id === machineId ? { ...m, components: m.components.filter((c) => c.id !== componentId), sheetUpdatedAt: todayISO() } : m,
    )),
    addWorkshopRecord: (r) => {
      const id = uid();
      setWorkshopRecords((x) => [{ ...r, id }, ...x]);
      setMachines((x) => x.map((m) => (m.id === r.machineId ? { ...m, status: "En Taller" } : m)));
      return id;
    },
    updateWorkshopRecord: (id, patch) => setWorkshopRecords((x) => x.map((r) => {
      if (r.id !== id) return r;
      const next = { ...r, ...patch };
      if (patch.status && patch.status !== r.status) {
        setMachines((ms) => ms.map((m) => {
          if (m.id !== r.machineId) return m;
          if (patch.status === "Devuelto") return { ...m, status: "Operativo" };
          if (patch.status === "Cancelado") return { ...m, status: "Operativo" };
          if (patch.status === "En Taller") return { ...m, status: "En Taller" };
          return m;
        }));
      }
      return next;
    })),
    deleteWorkshopRecord: (id) => setWorkshopRecords((x) => x.filter((r) => r.id !== id)),
    addWorkshopLog: (id, note, status) => setWorkshopRecords((x) => x.map((r) =>
      r.id === id ? { ...r, status: status ?? r.status, logs: [...r.logs, { id: sid(), at: new Date().toISOString(), note, status }] } : r,
    )),
    addDocumentsToWorkshop: (id, docs) => setWorkshopRecords((x) => x.map((r) =>
      r.id === id ? { ...r, documents: [...r.documents, ...docs] } : r,
    )),
    removeDocumentFromWorkshop: (id, docId) => setWorkshopRecords((x) => x.map((r) =>
      r.id === id ? { ...r, documents: r.documents.filter((d) => d.id !== docId) } : r,
    )),
    addSparePart: (p) => setSpareParts((x) => [...x, { ...p, id: sid() }]),
    updateSparePart: (id, patch) => setSpareParts((x) => x.map((p) => (p.id === id ? { ...p, ...patch } : p))),
    deleteSparePart: (id) => setSpareParts((x) => x.filter((p) => p.id !== id)),
    addTechnician: (t) => setTechnicians((x) => [...x, { ...t, id: sid() }]),
    updateTechnician: (id, patch) => setTechnicians((x) => x.map((t) => (t.id === id ? { ...t, ...patch } : t))),
    deleteTechnician: (id) => setTechnicians((x) => x.filter((t) => t.id !== id)),
    updateSettings: (s) => setSettings((x) => ({ ...x, ...s })),
    allDocuments: () => workshopRecords.flatMap((r) => r.documents.map((d) => ({ ...d, workshopRecordId: r.id, machineId: r.machineId }))),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMantePro() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useMantePro must be used inside MantePoProvider");
  return ctx;
}

export const nextCode = (machines: Machine[], prefix = "MAQ") => {
  const nums = machines.map((m) => Number(m.code.split("-")[1])).filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
};

export const nextOTM = (records: MaintenanceRecord[]) => {
  const y = new Date().getUTCFullYear();
  const nums = records.map((r) => {
    const m = r.otm?.match(/OTM-(\d{4})-(\d+)/);
    return m && Number(m[1]) === y ? Number(m[2]) : 0;
  });
  const next = (nums.length ? Math.max(...nums, 0) : 0) + 1;
  return `OTM-${y}-${String(next).padStart(3, "0")}`;
};

export const TYPE_COLOR_OPTIONS: { value: string; label: string; className: string }[] = [
  { value: "success", label: "Verde", className: "bg-success/15 text-success border-success/30" },
  { value: "info",    label: "Azul",  className: "bg-info/15 text-info border-info/30" },
  { value: "primary", label: "Ámbar", className: "bg-primary/15 text-primary border-primary/30" },
  { value: "warning", label: "Naranja", className: "bg-warning/15 text-warning border-warning/30" },
  { value: "critical", label: "Rojo", className: "bg-critical/15 text-critical border-critical/30" },
  { value: "accent",  label: "Cian",  className: "bg-accent/15 text-accent border-accent/30" },
  { value: "yellow",  label: "Amarillo", className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
];

export const typeColorClass = (color: string) =>
  TYPE_COLOR_OPTIONS.find((o) => o.value === color)?.className ?? "bg-muted text-muted-foreground border-border";
