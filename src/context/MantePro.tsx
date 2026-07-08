import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export type MachineStatus = "Operativo" | "En Revisión" | "En Taller" | "Fuera de Servicio";
export type Criticality = "Alto" | "Medio" | "Bajo";
export type Frequency = "Diario" | "Semanal" | "Mensual" | "Semestral" | "Anual" | "A condición";
export type RecordStatus = "Programado" | "En Proceso" | "Completado" | "Cancelado";
export type AlertStatus = "normal" | "warning" | "critical";

// ─── Usage & Threshold Types ──────────────────────────────────────────────────
export interface MachineThreshold {
  horasCiclo: number;           // hours of use per cycle before maintenance
  diasMaximos: number;          // max days between maintenances
  tiposIds: string[];           // maintenance type IDs that apply
  alertaPct: number;            // early-warning threshold % (10–90, default 80)
  turno: "Mañana" | "Tarde" | "Noche" | "Tiempo completo" | "Variable";
  diasOperacion: number[];      // 0=Mon … 6=Sun
  operadoresIds: string[];      // assigned operator / technician IDs
}

export interface UsageLog {
  id: string;
  machineId: string;
  startAt: string;              // ISO datetime string
  endAt: string;                // ISO datetime string
  hours: number;
  operador: string;
  turno: string;
  observaciones?: string;
  registradoPor: string;
}

export interface UsageCycle {
  machineId: string;
  horasAcumuladas: number;
  iniciadoEn: string;           // ISO datetime
  ultimoReset: string;          // ISO datetime of last cycle reset
  otmRef?: string;              // OTM that triggered last reset
}

export interface AppNotification {
  id: string;
  type: "warning" | "critical" | "reminder" | "reset";
  machineId: string;
  title: string;
  message: string;
  createdAt: string;            // ISO datetime
  read: boolean;
  actionType?: "schedule-otm" | "create-urgent-otm" | "view-history";
}

// ─── Existing Types ────────────────────────────────────────────────────────────
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
  patrimonialCode?: string;
  name: string;
  brand: string;
  model: string;
  serial?: string;
  purchaseDate?: string;
  manufactureYear?: number;
  acquisitionYear?: number;
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
  documents?: AppDocument[];
  sheetUpdatedAt?: string;
  location: string;
  acquiredAt: string;
  threshold?: MachineThreshold;   // ← NEW: usage threshold configuration
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
  color: string;
  frequency: Frequency;
  frequencyDays: number;
  estimatedHours: number;
  activities: TypeActivity[];
  active: boolean;
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
  otm: string;
  machineId: string;
  typeId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  technician: string;
  supervisor?: string;
  area?: string;
  status: RecordStatus;
  notes: string;
  activities: RecordActivity[];
  parts: RecordPart[];
  laborCost: number;
  cost: number;
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

export interface SparePart { id: string; name: string; reference: string; supplier: string; price: number; stock?: number }
export interface Technician { id: string; name: string; email?: string; role: string; area: string; phone?: string; }

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

export interface AppSettings {
  institutionName: string;
  institutionLogo?: string;
  notifyDaysBefore: number;
  mtbfGoalH: number;
  availabilityGoalPct: number;
}

// ─── State Interface ──────────────────────────────────────────────────────────
interface State {
  machines: Machine[];
  types: MaintenanceType[];
  records: MaintenanceRecord[];
  workshops: Workshop[];
  sheets: TechSheet[];
  workshopRecords: WorkshopRecord[];
  spareParts: SparePart[];
  technicians: Technician[];
  settings: AppSettings;
  // ── Usage Tracking ──
  usageLogs: UsageLog[];
  usageCycles: UsageCycle[];
  notifications: AppNotification[];
  // ── Machine CRUD ──
  addMachine: (m: Omit<Machine, "id">) => void;
  updateMachine: (id: string, m: Partial<Machine>) => void;
  deleteMachine: (id: string) => void;
  // ── Record CRUD ──
  addRecord: (r: Omit<MaintenanceRecord, "id">) => Promise<string>;
  updateRecord: (id: string, r: Partial<MaintenanceRecord>) => Promise<void>;
  deleteRecord: (id: string) => void;
  // ── Type CRUD ──
  addType: (t: Omit<MaintenanceType, "id">) => void;
  updateType: (id: string, t: Partial<MaintenanceType>) => void;
  deleteType: (id: string) => void;
  // ── Workshop CRUD ──
  addWorkshop: (w: Omit<Workshop, "id">) => Promise<void>;
  updateWorkshop: (id: string, w: Partial<Workshop>) => Promise<void>;
  deleteWorkshop: (id: string) => Promise<void>;
  // ── Component CRUD ──
  upsertComponent: (machineId: string, c: CriticalComponent) => void;
  deleteComponent: (machineId: string, componentId: string) => void;
  // ── Machine Documents ──
  addMachineDocuments: (machineId: string, docs: AppDocument[]) => void;
  removeMachineDocument: (machineId: string, docId: string) => void;
  // ── Workshop Records ──
  addWorkshopRecord: (r: Omit<WorkshopRecord, "id">) => string;
  updateWorkshopRecord: (id: string, r: Partial<WorkshopRecord>) => void;
  deleteWorkshopRecord: (id: string) => void;
  addWorkshopLog: (id: string, note: string, status?: WorkshopRecordStatus) => void;
  addDocumentsToWorkshop: (id: string, docs: AppDocument[]) => void;
  removeDocumentFromWorkshop: (id: string, docId: string) => void;
  // ── Spare Parts & Technicians ──
  addSparePart: (p: Omit<SparePart, "id">) => Promise<void>;
  updateSparePart: (id: string, p: Partial<SparePart>) => Promise<void>;
  deleteSparePart: (id: string) => Promise<void>;
  addTechnician: (t: Omit<Technician, "id">) => Promise<void>;
  updateTechnician: (id: string, t: Partial<Technician>) => Promise<void>;
  deleteTechnician: (id: string) => Promise<void>;
  updateSettings: (s: Partial<AppSettings>) => Promise<void>;
  allDocuments: () => AppDocument[];
  // ── Usage Tracking ──
  addUsageLog: (log: Omit<UsageLog, "id">) => void;
  clearAllUsageLogs: () => void;
  resetCycle: (machineId: string, otmRef?: string) => void;
  // ── Notifications ──
  markNotificationRead: (id: string) => void;
  markAllRead: () => void;
  deleteNotification: (id: string) => void;
}

const Ctx = createContext<State | null>(null);
const uid = () => Math.random().toString(36).slice(2, 10);
let _seedCounter = 0;
const sid = (prefix = "s") => `${prefix}-${++_seedCounter}`;

// ─── Seed Data ────────────────────────────────────────────────────────────────

const initialMachines: Machine[] = [];
const initialTypes: MaintenanceType[] = [];
const initialRecords: MaintenanceRecord[] = [];
const initialWorkshops: Workshop[] = [];
const initialSheets: TechSheet[] = [];
const initialWorkshopRecords: WorkshopRecord[] = [];
const initialSpareParts: SparePart[] = [];
const initialTechnicians: Technician[] = [];
const initialSettings: AppSettings = {
  institutionName: "Institución de Mantenimiento Industrial",
  notifyDaysBefore: 7,
  mtbfGoalH: 500,
  availabilityGoalPct: 95
};
const initialUsageLogs: UsageLog[] = [];
const initialUsageCycles: UsageCycle[] = [];
const initialNotifications: AppNotification[] = [];

export function MantePoProvider({ children }: { children: ReactNode }) {
  const [machines, setMachines] = useState<Machine[]>(initialMachines);
  const [types, setTypes] = useState<MaintenanceType[]>(initialTypes);
  const [records, setRecords] = useState<MaintenanceRecord[]>(initialRecords);
  const [workshops, setWorkshops] = useState<Workshop[]>(initialWorkshops);
  const [sheets, setSheets] = useState<TechSheet[]>(initialSheets);
  const [workshopRecords, setWorkshopRecords] = useState<WorkshopRecord[]>(initialWorkshopRecords);
  const [spareParts, setSpareParts] = useState<SparePart[]>(initialSpareParts);
  const [technicians, setTechnicians] = useState<Technician[]>(initialTechnicians);
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>(initialUsageLogs);
  const [usageCycles, setUsageCycles] = useState<UsageCycle[]>(initialUsageCycles);
  const [notifications, setNotifications] = useState<AppNotification[]>(initialNotifications);
  
  const [loading, setLoading] = useState(true);

  // FETCH DATA FROM SUPABASE
  const fetchAllData = async () => {
    try {
      setLoading(true);
      // Fetch Machines
      const { data: mData } = await supabase.from('maquinas').select('*, areas(nombre), uso_ciclos(*), componentes_criticos(*), documentos(*)');
      if (mData) {
        setMachines(mData.map((m: any) => ({
          id: m.id, code: m.codigo, patrimonialCode: m.codigo_patrimonial, name: m.nombre,
          brand: m.marca || '', model: m.modelo || '', serial: m.numero_serie,
          purchaseDate: m.created_at, manufactureYear: m.anio_fabricacion, acquisitionYear: m.anio_adquisicion,
          cost: m.costo, area: m.areas?.nombre, department: '', powerKw: m.potencia_kw, voltageV: m.voltaje_v,
          frequencyHz: m.frecuencia_hz, weightKg: m.peso_kg, status: m.estado, criticality: m.criticidad,
          observations: m.observaciones, photo: m.foto_url, location: '', acquiredAt: m.created_at,
          hoursOfUse: m.uso_ciclos?.length > 0 ? m.uso_ciclos[0].horas_acumuladas : 0,
          components: m.componentes_criticos?.map((c: any) => ({
            id: c.id, name: c.nombre, function: c.funcion || '', state: c.estado, criticality: c.criticidad
          })) || [],
          documents: m.documentos?.map((d: any) => ({
            id: d.id, name: d.nombre_archivo, size: d.tamanio_bytes, mime: d.tipo_mime, dataUrl: d.url,
            category: d.categoria, description: d.descripcion, uploadedAt: d.uploaded_at, machineId: d.maquina_id
          })) || [],
          threshold: {
            horasCiclo: m.umbral_horas_ciclo,
            diasMaximos: m.umbral_dias_maximos,
            alertaPct: m.umbral_alerta_pct,
            turno: m.turno_operacion,
            diasOperacion: [], tiposIds: [], operadoresIds: []
          }
        })));
      }

      // Fetch Types
      const { data: tData } = await supabase.from('tipos_mantenimiento').select('*, actividades_tipo(*)');
      if (tData) {
        setTypes(tData.map((t: any) => ({
          id: t.id, name: t.nombre, description: t.descripcion || '', color: t.color || '#ccc',
          frequency: t.frecuencia, frequencyDays: 0, estimatedHours: t.duracion_min / 60,
          active: t.activo, category: 'Preventivo',
          activities: t.actividades_tipo?.map((a: any) => ({
            id: a.id, text: a.descripcion, durationMin: a.duracion_min, role: a.responsable || 'Técnico'
          })) || []
        })));
      }

      // Fetch OTMs
      const { data: oData } = await supabase.from('ordenes_trabajo').select('*, maquinas(nombre), actividades_otm(*), repuestos_otm(*), tecnico:usuarios!tecnico_id(nombre), supervisor:usuarios!supervisor_id(nombre)');
      if (oData) {
        setRecords(oData.map((o: any) => ({
          id: o.id, otm: o.numero_otm, machineId: o.maquina_id, typeId: o.tipo_id || '',
          date: o.fecha_programada || o.created_at, startTime: o.hora_inicio, endTime: o.hora_fin,
          technician: o.tecnico?.nombre || '', supervisor: o.supervisor?.nombre || '', status: o.estado, notes: o.hallazgos || '',
          activities: o.actividades_otm?.map((a: any) => ({ id: a.id, text: a.descripcion, done: a.completada, observations: a.observaciones })) || [],
          parts: o.repuestos_otm?.map((p: any) => ({ id: p.id, name: p.nombre, quantity: p.cantidad, unitCost: p.costo_unitario })) || [],
          laborCost: o.costo_mano_obra || 0, cost: o.costo_repuestos || 0,
          postState: o.estado_post_maquina, nextDate: o.proximo_mantenimiento
        })));
      }

      // Fetch Notifications
      const { data: nData } = await supabase.from('notificaciones').select('*').order('created_at', { ascending: false });
      if (nData) {
        setNotifications(nData.map((n: any) => ({
          id: n.id, type: n.tipo, machineId: n.maquina_id || '', title: n.titulo,
          message: n.mensaje, createdAt: n.created_at, read: n.leida, actionType: n.accion_tipo
        })));
      }

      
      
      
      // Fetch Institution Settings
      const { data: instData } = await supabase.from('instituciones').select('*').limit(1).maybeSingle();
      if (instData) {
        setSettings(prev => ({
          ...prev,
          institutionName: instData.nombre || prev.institutionName,
          institutionLogo: instData.logo_url || prev.institutionLogo
        }));
      }

      // Fetch Users
      const { data: uData } = await supabase.from('usuarios').select('*').eq('activo', true);
      if (uData) {
        setTechnicians(uData.map((u: any) => ({
          id: u.id, name: u.nombre, email: u.email, role: u.rol, area: u.area || ''
        })));
      }
      
      // Fetch Parts
      const { data: pData } = await supabase.from('repuestos_catalogo').select('*');
      if (pData) {
        setSpareParts(pData.map((p: any) => ({
          id: p.id, name: p.nombre, reference: p.referencia || '', supplier: p.proveedor || '', price: p.precio || 0, stock: p.stock_minimo || 0
        })));
      }

      // Fetch Workshops
      const { data: wData } = await supabase.from('talleres_externos').select('*').eq('activo', true);
      if (wData) {
        setWorkshops(wData.map((w: any) => ({
          id: w.id, name: w.nombre, address: w.direccion || '', contact: w.contacto || '', phone: w.telefono || '', specialty: w.direccion || '', machinesInService: 0
        })));
      }

      // Fetch Usage Logs
      const { data: ulData } = await supabase.from('uso_logs').select('*').order('start_at', { ascending: false });
      if (ulData) {
        setUsageLogs(ulData.map((u: any) => ({
          id: u.id, machineId: u.maquina_id, startAt: u.start_at, endAt: u.end_at, hours: u.horas,
          operador: u.operador, turno: u.turno, observaciones: u.observaciones, registradoPor: "ING. JOHNNY BRYNNER VILCHEZ MIRANDA"
        })));
      }

      // Fetch Usage Cycles
      const { data: ucData } = await supabase.from('uso_ciclos').select('*');
      if (ucData) {
        setUsageCycles(ucData.map((u: any) => ({
          machineId: u.maquina_id, horasAcumuladas: u.horas_acumuladas, iniciadoEn: u.start_at || new Date().toISOString(), ultimoReset: u.ultimo_reset || new Date().toISOString(), otmRef: u.otm_ref
        })));
      }

    } catch(err) {
      console.error(err);
      toast.error("Error al cargar datos. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();

    // REAL-TIME SUBSCRIPTIONS (STEP 9)
    const channel = supabase.channel('public_schema')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'uso_ciclos' }, (payload) => {
         fetchAllData();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notificaciones' }, (payload) => {
         fetchAllData();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ordenes_trabajo' }, (payload) => {
         if(payload.new.estado === 'Completado') {
           fetchAllData();
         }
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addMachine = async (m: Omit<Machine, "id">) => {
    let finalPhotoUrl = m.photo;
    
    if (m.photo && m.photo.startsWith('data:image')) {
      try {
        const res = await fetch(m.photo);
        const blob = await res.blob();
        const fileName = `${m.code}-${Date.now()}.jpg`;
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
  };
  const updateMachine = async (id: string, m: Partial<Machine>) => {
    let finalPhotoUrl = m.photo;
    if (m.photo && m.photo.startsWith('data:image')) {
      try {
        const res = await fetch(m.photo);
        const blob = await res.blob();
        const fileName = `${id}-${Date.now()}.jpg`;
        const { data, error } = await supabase.storage.from('maquinas-fotos').upload(fileName, blob, { upsert: true });
        if (data) {
          const { data: { publicUrl } } = supabase.storage.from('maquinas-fotos').getPublicUrl(fileName);
          finalPhotoUrl = publicUrl;
        }
      } catch(e) {}
    }
    const payload: any = {};
    if (m.name !== undefined) payload.nombre = m.name;
    if (m.code !== undefined) payload.codigo = m.code;
    if (m.patrimonialCode !== undefined) payload.codigo_patrimonial = m.patrimonialCode;
    if (m.brand !== undefined) payload.marca = m.brand;
    if (m.model !== undefined) payload.modelo = m.model;
    if (m.serial !== undefined) payload.numero_serie = m.serial;
    if (m.status !== undefined) payload.estado = m.status;
    if (m.criticality !== undefined) payload.criticidad = m.criticality;
    if (m.observations !== undefined) payload.observaciones = m.observations;
    if (finalPhotoUrl !== undefined) payload.foto_url = finalPhotoUrl;
    if (m.cost !== undefined) payload.costo = m.cost;
    if (m.powerKw !== undefined) payload.potencia_kw = m.powerKw;
    if (m.voltageV !== undefined) payload.voltaje_v = m.voltageV;
    if (m.weightKg !== undefined) payload.peso_kg = m.weightKg;
    if (m.frequencyHz !== undefined) payload.frecuencia_hz = m.frequencyHz;
    if (m.manufactureYear !== undefined) payload.anio_fabricacion = m.manufactureYear;
    if (m.acquisitionYear !== undefined) payload.anio_adquisicion = m.acquisitionYear;

    if (m.threshold) {
        if (m.threshold.horasCiclo) payload.umbral_horas_ciclo = m.threshold.horasCiclo;
        if (m.threshold.diasMaximos) payload.umbral_dias_maximos = m.threshold.diasMaximos;
        if (m.threshold.alertaPct) payload.umbral_alerta_pct = m.threshold.alertaPct;
        if (m.threshold.turno) payload.turno_operacion = m.threshold.turno;
    }

    if (m.location !== undefined || m.area !== undefined) {
        let area_id = null;
        try {
            const { data: firstMachine } = await supabase.from('maquinas').select('institucion_id').limit(1).single();
            const uiArea = m.location || m.area;
            if (uiArea && firstMachine?.institucion_id) {
                const { data: existingArea } = await supabase.from('areas').select('id').eq('nombre', uiArea).eq('institucion_id', firstMachine.institucion_id).maybeSingle();
                if (existingArea) {
                    area_id = existingArea.id;
                } else {
                    const { data: newArea } = await supabase.from('areas').insert({ nombre: uiArea, institucion_id: firstMachine.institucion_id }).select().single();
                    if (newArea) area_id = newArea.id;
                }
            }
        } catch(e) {}
        if (area_id) payload.area_id = area_id;
    }

    await supabase.from('maquinas').update(payload).eq('id', id);
    fetchAllData();
  };
  const deleteMachine = (id: string) => { fetchAllData(); };

  const addRecord = async (r: Omit<MaintenanceRecord, "id">) => {
    let tecnico_id = null;
    let supervisor_id = null;
    if (r.technician) {
       const {data} = await supabase.from('usuarios').select('id').eq('nombre', r.technician).maybeSingle();
       if (data) tecnico_id = data.id;
    }
    if (r.supervisor) {
       const {data} = await supabase.from('usuarios').select('id').eq('nombre', r.supervisor).maybeSingle();
       if (data) supervisor_id = data.id;
    }
    
    const { data: orden, error } = await supabase.from('ordenes_trabajo').insert({
      numero_otm: r.otm, 
      maquina_id: r.machineId, 
      tipo_id: r.typeId || null,
      estado: r.status, 
      fecha_programada: r.date,
      hora_inicio: r.startTime || null,
      hora_fin: r.endTime || null,
      tecnico_id,
      supervisor_id,
      hallazgos: r.notes || '',
      costo_repuestos: r.cost || 0,
      costo_mano_obra: r.laborCost || 0
    }).select().single();

    if (error || !orden) {
      console.error("Error creating record", error);
      return r.otm;
    }

    if (r.activities && r.activities.length > 0) {
      await supabase.from('actividades_otm').insert(
         r.activities.map((a, i) => ({
            orden_id: orden.id,
            descripcion: a.text,
            completada: a.done,
            observaciones: a.observations,
            orden: i
         }))
      );
    }

    if (r.parts && r.parts.length > 0) {
      await supabase.from('repuestos_otm').insert(
         r.parts.map(p => ({
            orden_id: orden.id,
            nombre: p.name,
            cantidad: p.quantity,
            costo_unitario: p.unitCost
         }))
      );
    }

    fetchAllData();
    return r.otm;
  };
  const updateRecord = async (id: string, r: Partial<MaintenanceRecord>) => {
    let payload: any = {};
    if (r.otm !== undefined) payload.numero_otm = r.otm;
    if (r.machineId !== undefined) payload.maquina_id = r.machineId;
    if (r.typeId !== undefined) payload.tipo_id = r.typeId || null;
    if (r.status !== undefined) payload.estado = r.status;
    if (r.date !== undefined) payload.fecha_programada = r.date;
    if (r.startTime !== undefined) payload.hora_inicio = r.startTime || null;
    if (r.endTime !== undefined) payload.hora_fin = r.endTime || null;
    if (r.notes !== undefined) payload.hallazgos = r.notes;
    if (r.cost !== undefined) payload.costo_repuestos = r.cost;
    if (r.laborCost !== undefined) payload.costo_mano_obra = r.laborCost;

    if (r.technician !== undefined) {
        payload.tecnico_id = null;
        if (r.technician) {
            const {data} = await supabase.from('usuarios').select('id').eq('nombre', r.technician).maybeSingle();
            if (data) payload.tecnico_id = data.id;
        }
    }
    if (r.supervisor !== undefined) {
        payload.supervisor_id = null;
        if (r.supervisor) {
            const {data} = await supabase.from('usuarios').select('id').eq('nombre', r.supervisor).maybeSingle();
            if (data) payload.supervisor_id = data.id;
        }
    }

    await supabase.from('ordenes_trabajo').update(payload).eq('id', id);

    if (r.activities !== undefined) {
        await supabase.from('actividades_otm').delete().eq('orden_id', id);
        if (r.activities.length > 0) {
            await supabase.from('actividades_otm').insert(
                r.activities.map((a, i) => ({
                    orden_id: id,
                    descripcion: a.text,
                    completada: a.done,
                    observaciones: a.observations,
                    orden: i
                }))
            );
        }
    }

    if (r.parts !== undefined) {
        await supabase.from('repuestos_otm').delete().eq('orden_id', id);
        if (r.parts.length > 0) {
            await supabase.from('repuestos_otm').insert(
                r.parts.map(p => ({
                    orden_id: id,
                    nombre: p.name,
                    cantidad: p.quantity,
                    costo_unitario: p.unitCost
                }))
            );
        }
    }

    fetchAllData();
};
  const deleteRecord = (id: string) => { fetchAllData(); };

  const addType = (t: Omit<MaintenanceType, "id">) => {};
  const updateType = (id: string, t: Partial<MaintenanceType>) => {};
  const deleteType = (id: string) => {};

  const addWorkshop = async (w: Omit<Workshop, "id">) => {
    let institucion_id = null;
    const { data: m } = await supabase.from('maquinas').select('institucion_id').limit(1).maybeSingle();
    if (m) institucion_id = m.institucion_id;
    
    await supabase.from('talleres_externos').insert({
      institucion_id,
      nombre: w.name,
      contacto: w.contact,
      telefono: w.phone,
      direccion: w.specialty,
      activo: true
    });
    fetchAllData();
  };
  const updateWorkshop = async (id: string, w: Partial<Workshop>) => {
    let payload: any = {};
    if (w.name !== undefined) payload.nombre = w.name;
    if (w.address !== undefined) payload.direccion = w.address;
    if (w.contact !== undefined) payload.contacto = w.contact;
    if (w.phone !== undefined) payload.telefono = w.phone;
    if (w.specialty !== undefined) payload.direccion = w.specialty;
    
    await supabase.from('talleres_externos').update(payload).eq('id', id);
    fetchAllData();
  };
  const deleteWorkshop = async (id: string) => {
    await supabase.from('talleres_externos').update({ activo: false }).eq('id', id);
    fetchAllData();
  };

  const upsertComponent = (mId: string, c: CriticalComponent) => {};
  const deleteComponent = (mId: string, cId: string) => {};

  const addMachineDocuments = async (mId: string, docs: AppDocument[]) => {
    for (const doc of docs) {
      let finalUrl = doc.dataUrl;
      // Upload to Storage if it is a new base64 document
      if (doc.dataUrl.startsWith('data:')) {
        try {
          const res = await fetch(doc.dataUrl);
          const blob = await res.blob();
          // generate safe filename
          const ext = doc.name.split('.').pop() || 'bin';
          const safeName = doc.name.replace(/[^a-zA-Z0-9]/g, '_');
          const fileName = `maquina-${mId}-${Date.now()}-${safeName}.${ext}`;
          
          const { data: upData, error: upErr } = await supabase.storage.from('documentos-otm').upload(fileName, blob, { upsert: true });
          if (upData) {
            const { data: { publicUrl } } = supabase.storage.from('documentos-otm').getPublicUrl(fileName);
            finalUrl = publicUrl;
          } else {
            console.error("Storage upload error", upErr);
          }
        } catch(e) {
          console.error("Error uploading document to storage", e);
        }
      }

      // Map category to match DB constraint ('Diagnostico', 'Manual', 'Presupuesto', 'Fotografia', 'Certificado', 'Factura', 'Informe', 'Otro')
      let cat = doc.category as string;
      if (cat === "Diagnóstico" || cat === "Diagnóstico previo") cat = "Diagnostico";
      if (cat === "Fotografía" || cat === "Fotografías del problema") cat = "Fotografia";
      const validCategories = ["Diagnostico", "Manual", "Presupuesto", "Fotografia", "Certificado", "Factura", "Informe", "Otro"];
      if (!validCategories.includes(cat)) cat = "Otro";

      const payload = {
        maquina_id: mId,
        nombre_archivo: doc.name,
        url: finalUrl,
        categoria: cat,
        tipo_mime: doc.mime,
        tamanio_bytes: doc.size,
        descripcion: doc.description || null
      };

      const { error } = await supabase.from('documentos').insert(payload);
      if (error) console.error("Error inserting document to DB", error);
    }
    fetchAllData();
  };
  const removeMachineDocument = async (mId: string, dId: string) => {
    await supabase.from('documentos').delete().eq('id', dId);
    fetchAllData();
  };

  const addWorkshopRecord = (r: Omit<WorkshopRecord, "id">) => "wr1";
  const updateWorkshopRecord = (id: string, r: Partial<WorkshopRecord>) => {};
  const deleteWorkshopRecord = (id: string) => {};
  const addWorkshopLog = (id: string, note: string, s?: WorkshopRecordStatus) => {};
  const addDocumentsToWorkshop = (id: string, docs: AppDocument[]) => {};
  const removeDocumentFromWorkshop = (id: string, docId: string) => {};

  const addSparePart = async (p: Omit<SparePart, "id">) => {
    let institucion_id = null;
    const { data: m } = await supabase.from('maquinas').select('institucion_id').limit(1).maybeSingle();
    if (m) institucion_id = m.institucion_id;
    
    await supabase.from('repuestos_catalogo').insert({
      institucion_id,
      nombre: p.name,
      referencia: p.reference,
      proveedor: p.supplier,
      precio: p.price,
      stock_minimo: p.stock
    });
    fetchAllData();
  };
  const updateSparePart = async (id: string, p: Partial<SparePart>) => {
    let payload: any = {};
    if (p.name !== undefined) payload.nombre = p.name;
    if (p.reference !== undefined) payload.referencia = p.reference;
    if (p.supplier !== undefined) payload.proveedor = p.supplier;
    if (p.price !== undefined) payload.precio = p.price;
    if (p.stock !== undefined) payload.stock_minimo = p.stock;
    await supabase.from('repuestos_catalogo').update(payload).eq('id', id);
    fetchAllData();
  };
  const deleteSparePart = async (id: string) => {
    await supabase.from('repuestos_catalogo').delete().eq('id', id);
    fetchAllData();
  };
  const addTechnician = async (t: Omit<Technician, "id">) => {
    let institucion_id = null;
    const { data: m } = await supabase.from('maquinas').select('institucion_id').limit(1).maybeSingle();
    if (m) institucion_id = m.institucion_id;
    
    await supabase.from('usuarios').insert({
      institucion_id,
      nombre: t.name,
      email: t.email || `${Date.now()}@mantenimiento.com`,
      rol: t.role || 'Tecnico',
      area: t.area,
      activo: true
    });
    fetchAllData();
  };
  const updateTechnician = async (id: string, t: Partial<Technician>) => {
    let payload: any = {};
    if (t.name !== undefined) payload.nombre = t.name;
    if (t.email !== undefined) payload.email = t.email;
    if (t.role !== undefined) payload.rol = t.role;
    if (t.area !== undefined) payload.area = t.area;
    await supabase.from('usuarios').update(payload).eq('id', id);
    fetchAllData();
  };
  const deleteTechnician = async (id: string) => {
    await supabase.from('usuarios').update({ activo: false }).eq('id', id);
    fetchAllData();
  };
  const updateSettings = async (s: Partial<AppSettings>) => {
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
        const fileName = `logo-${Date.now()}.${blob.type.split('/')[1] || 'png'}`;
        
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
  };
  const allDocuments = () => [];

  const addUsageLog = async (log: Omit<UsageLog, "id">) => {
    // 1. Ensure cycle exists so the DB trigger can update it
    const { data: cycle } = await supabase.from('uso_ciclos').select('id').eq('maquina_id', log.machineId).maybeSingle();
    if (!cycle) {
      await supabase.from('uso_ciclos').insert({ maquina_id: log.machineId, horas_acumuladas: 0 });
    }

    // 2. Insert log (trigger will automatically add the hours)
    const { error } = await supabase.from('uso_logs').insert({
      maquina_id: log.machineId, 
      start_at: new Date(log.startAt).toISOString(), 
      end_at: new Date(log.endAt).toISOString(), 
      horas: log.hours, 
      turno: log.turno,
      operador: log.operador, 
      observaciones: log.observaciones
    });
    if (error) {
      console.error("Error inserting uso_log:", error);
      return;
    }

    // 3. Fetch updated cycle to check thresholds
    const { data: updatedCycle } = await supabase.from('uso_ciclos').select('horas_acumuladas').eq('maquina_id', log.machineId).single();
    const machine = machines.find((m) => m.id === log.machineId);

    if (machine && machine.threshold && updatedCycle) {
      const pct = (updatedCycle.horas_acumuladas / machine.threshold.horasCiclo) * 100;
      
      let alertType: "critical" | "warning" | null = null;
      if (pct >= 100) alertType = "critical";
      else if (pct >= machine.threshold.alertaPct) alertType = "warning";

      if (alertType) {
        // Check if there is already an unread notification of this type for this machine
        const existing = notifications.find(n => n.machineId === machine.id && !n.read && n.type === alertType);
        if (!existing) {
          const isCrit = alertType === "critical";
          await supabase.from('notificaciones').insert({
            maquina_id: machine.id,
            tipo: alertType,
            titulo: isCrit ? `Mantenimiento requerido - ${machine.code}` : `Mantenimiento próximo - ${machine.code}`,
            mensaje: isCrit 
              ? `La máquina ${machine.name} ha superado su ciclo de uso (${Number(updatedCycle.horas_acumuladas).toFixed(2)}h / ${machine.threshold.horasCiclo}h). Programar mantenimiento correctivo o preventivo urgente.`
              : `La máquina ${machine.name} ha alcanzado el ${pct.toFixed(1)}% de su ciclo de uso (${Number(updatedCycle.horas_acumuladas).toFixed(2)}h / ${machine.threshold.horasCiclo}h).`,
            accion_tipo: 'programar_otm'
          });
        }
      }
    }

    fetchAllData();
  };

  const clearAllUsageLogs = async () => {
    await supabase.from('uso_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('uso_ciclos').update({ horas_acumuladas: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
    fetchAllData();
  };
  const resetCycle = (mId: string, otmRef?: string) => {
    supabase.from('uso_ciclos').update({ horas_acumuladas: 0, ultimo_reset: new Date().toISOString() }).eq('maquina_id', mId)
    .then(() => fetchAllData());
  };

  const markNotificationRead = (id: string) => {
    supabase.from('notificaciones').update({ leida: true }).eq('id', id).then(() => fetchAllData());
  };
  const markAllRead = () => {
    supabase.from('notificaciones').update({ leida: true }).eq('leida', false).then(() => fetchAllData());
  };
  const deleteNotification = (id: string) => {
    supabase.from('notificaciones').delete().eq('id', id).then(() => fetchAllData());
  };

  const value: State = {
    machines, types, records, workshops, sheets, workshopRecords, spareParts, technicians, settings, usageLogs, usageCycles, notifications,
    addMachine, updateMachine, deleteMachine, addRecord, updateRecord, deleteRecord, addType, updateType, deleteType, addWorkshop, updateWorkshop, deleteWorkshop, upsertComponent, deleteComponent,
    addMachineDocuments, removeMachineDocument, addWorkshopRecord, updateWorkshopRecord, deleteWorkshopRecord, addWorkshopLog, addDocumentsToWorkshop, removeDocumentFromWorkshop,
    addSparePart, updateSparePart, deleteSparePart, addTechnician, updateTechnician, deleteTechnician, updateSettings, allDocuments,
    addUsageLog, clearAllUsageLogs, resetCycle, markNotificationRead, markAllRead, deleteNotification
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
