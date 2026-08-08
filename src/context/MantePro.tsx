import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";

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
  // Estos tres valores son exactamente los del enum `notification_action` en
  // la base de datos (ver migración 002/012) — deben coincidir literalmente,
  // porque este campo llega tal cual desde `notificaciones.accion_tipo`.
  actionType?: "crear_otm" | "programar_otm" | "ver_historial";
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
  // true desde que arranca la app hasta que termina la PRIMERA carga de datos
  // ya autenticado. Se usa para mostrar la pantalla de carga inicial (una
  // sola vez); las recargas posteriores (después de guardar algo, etc.) no
  // la vuelven a activar.
  initializing: boolean;
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
  addRecord: (r: Omit<MaintenanceRecord, "id">) => Promise<string | null>;
  updateRecord: (id: string, r: Partial<MaintenanceRecord>) => Promise<boolean>;
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
  addWorkshopRecord: (r: Omit<WorkshopRecord, "id">) => Promise<void>;
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

// Normaliza cualquier categoría de documento (con o sin tilde, con o sin sufijo largo)
// al valor exacto que acepta la columna documentos.categoria en la base de datos.
const mapDocCategory = (cat: string): string => {
  const c = (cat || '').trim();
  if (c === 'Diagnóstico' || c === 'Diagnóstico previo') return 'Diagnostico';
  if (c === 'Fotografía' || c === 'Fotografías del problema') return 'Fotografia';
  if (c === 'Presupuesto' || c === 'Presupuesto del taller') return 'Presupuesto';
  if (c === 'Informe' || c === 'Informe de reparación') return 'Informe';
  const validCategories = ['Diagnostico', 'Manual', 'Presupuesto', 'Fotografia', 'Certificado', 'Factura', 'Informe', 'Otro'];
  return validCategories.includes(c) ? c : 'Otro';
};

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
  const [initializing, setInitializing] = useState(true);
  const { isAuthenticated } = useAuth();

  // FETCH DATA FROM SUPABASE
  const fetchAllData = async () => {
    try {
      setLoading(true);
      // Fetch Machines
      const { data: mData } = await supabase.from('maquinas').select('*, areas(nombre), uso_ciclos(*), componentes_criticos(*), documentos(*), maquina_tipos_mantenimiento(tipo_id), maquina_operadores(usuario_id)').eq('activo', true);
      if (mData) {
        setMachines(mData.map((m: any) => ({
          id: m.id, code: m.codigo, patrimonialCode: m.codigo_patrimonial, name: m.nombre,
          brand: m.marca || '', model: m.modelo || '', serial: m.numero_serie,
          purchaseDate: m.created_at, manufactureYear: m.anio_fabricacion, acquisitionYear: m.anio_adquisicion,
          cost: m.costo, area: m.areas?.nombre || '', department: m.departamento || '', powerKw: m.potencia_kw, voltageV: m.voltaje_v,
          frequencyHz: m.frecuencia_hz, weightKg: m.peso_kg, status: m.estado, criticality: m.criticidad,
          observations: m.observaciones, photo: m.foto_url, location: m.areas?.nombre || '', acquiredAt: m.created_at,
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
            diasOperacion: (m.dias_operacion || []).map((d: string) => Number(d)),
            tiposIds: m.maquina_tipos_mantenimiento?.map((x: any) => x.tipo_id) || [],
            operadoresIds: m.maquina_operadores?.map((x: any) => x.usuario_id) || [],
          }
        })));
      }

      // Fetch Types
      const { data: tData } = await supabase.from('tipos_mantenimiento').select('*, actividades_tipo(*)');
      if (tData) {
        setTypes(tData.map((t: any) => ({
          id: t.id, name: t.nombre, description: t.descripcion || '', color: t.color || '#ccc',
          frequency: t.frecuencia, frequencyDays: 0, estimatedHours: t.duracion_min / 60,
          active: t.activo, category: t.categoria || 'Preventivo',
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
          technician: o.tecnico_nombre || o.tecnico?.nombre || '', supervisor: o.supervisor_nombre || o.supervisor?.nombre || '', status: o.estado,
          area: o.area || '',
          notes: o.observaciones || '', findings: o.hallazgos || '',
          activities: o.actividades_otm?.map((a: any) => ({ id: a.id, text: a.descripcion, done: a.completada, observations: a.observaciones })) || [],
          parts: o.repuestos_otm?.map((p: any) => ({ id: p.id, name: p.nombre, quantity: p.cantidad, unitCost: p.costo_unitario })) || [],
          laborCost: o.costo_mano_obra || 0, cost: o.costo_repuestos || 0,
          postState: o.estado_post_maquina || '', nextDate: o.proximo_mantenimiento || '', nextTypeId: o.proximo_tipo_id || '',
          technicianSignature: o.firma_tecnico || '', supervisorSignature: o.firma_supervisor || ''
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

      
      
      
      // Fetch Institution Settings — ordered so it deterministically resolves
      // to the same (original) row even if duplicate rows exist in the DB.
      const { data: instData } = await supabase.from('instituciones').select('*').order('created_at', { ascending: true }).limit(1).maybeSingle();
      if (instData) {
        setSettings(prev => ({
          ...prev,
          institutionName: instData.nombre || prev.institutionName,
          institutionLogo: instData.logo_url || prev.institutionLogo,
          notifyDaysBefore: instData.notify_days_before ?? prev.notifyDaysBefore,
          mtbfGoalH: instData.mtbf_goal_h ?? prev.mtbfGoalH,
          availabilityGoalPct: instData.availability_goal_pct ?? prev.availabilityGoalPct
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
          id: w.id, name: w.nombre, address: w.direccion || '', contact: w.contacto || '', phone: w.telefono || '', specialty: w.especialidad || '', machinesInService: 0
        })));
      }

      // Fetch Workshop Records (envíos a taller externo)
      const { data: eData, error: eError } = await supabase.from('envios_taller')
        .select('*, taller:talleres_externos(nombre, direccion, telefono, contacto), autorizado:usuarios!autorizado_por(nombre), componentes_afectados(componente_id), seguimiento_taller(*), documentos(*)')
        .order('fecha_envio', { ascending: false });
      if (eError) {
        // Antes este error se descartaba en silencio: si esta consulta fallaba
        // (por ejemplo por caché de esquema desactualizada en PostgREST), los
        // envíos a taller quedaban invisibles en la pantalla sin ningún aviso.
        console.error("Error cargando envíos a taller:", eError);
        toast.error("No se pudieron cargar los envíos a taller: " + eError.message);
      }
      if (eData) {
        setWorkshopRecords(eData.map((e: any) => ({
          id: e.id, machineId: e.maquina_id,
          workshopName: e.taller?.nombre || '', workshopAddress: e.taller?.direccion || '', workshopPhone: e.taller?.telefono || '', workshopContact: e.taller?.contacto || '',
          sentDate: e.fecha_envio, estimatedReturn: e.fecha_retorno_est || undefined, actualReturn: e.fecha_retorno_real || undefined,
          problemType: e.tipo_problema, problemDescription: e.descripcion_problema || '',
          affectedComponentIds: e.componentes_afectados?.map((c: any) => c.componente_id) || [],
          condition: e.condicion_envio, approvedBudget: e.presupuesto || 0,
          authorizedBy: e.autorizado?.nombre || '', technician: e.autorizado?.nombre || '',
          status: e.estado, finalCost: e.costo_final ?? undefined, workSummary: e.resumen_trabajos || '', rating: e.rating ?? undefined,
          documents: e.documentos?.map((d: any) => ({
            id: d.id, name: d.nombre_archivo, size: d.tamanio_bytes, mime: d.tipo_mime, dataUrl: d.url,
            category: d.categoria, description: d.descripcion, uploadedAt: d.uploaded_at, workshopRecordId: e.id
          })) || [],
          logs: (e.seguimiento_taller || []).map((s: any) => ({ id: s.id, at: s.fecha, note: s.nota, status: s.estado_nuevo || undefined }))
            .sort((a: any, b: any) => a.at.localeCompare(b.at)),
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
      setInitializing(false);
    }
  };

  // Antes este efecto corría UNA sola vez al montar el provider (que envuelve
  // toda la app, incluida /login), sin depender de si había sesión iniciada.
  // Como el provider nunca se vuelve a montar tras el login (el router solo
  // navega, no recarga la página), la primera carga ocurría sin usuario
  // autenticado — Supabase devolvía todo vacío por RLS — y esos datos vacíos
  // se quedaban así hasta que el usuario refrescaba manualmente la página
  // (eso sí remonta todo, ya con la sesión ya guardada). Ahora el efecto
  // depende de isAuthenticated: en cuanto el login se confirma, se dispara
  // la carga real inmediatamente, sin necesitar un refresh manual.
  useEffect(() => {
    if (!isAuthenticated) {
      // Sin sesión (o recién cerrada): no hay nada que cargar todavía —
      // se deja "initializing" en true para que la pantalla de carga
      // vuelva a aparecer la próxima vez que se inicie sesión.
      setInitializing(true);
      return;
    }

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
  }, [isAuthenticated]);

  // Resuelve el institucion_id "activo" (la app es single-tenant: se asume una sola institución).
  const resolveInstitucionId = async (): Promise<string | null> => {
    const { data: m } = await supabase.from('maquinas').select('institucion_id').limit(1).maybeSingle();
    if (m?.institucion_id) return m.institucion_id;
    const { data: inst } = await supabase.from('instituciones').select('id').order('created_at', { ascending: true }).limit(1).maybeSingle();
    return inst?.id || null;
  };

  // Ajusta el stock del catálogo de repuestos cuando una OTM consume (sign=-1)
  // o libera (sign=+1, por ejemplo al editar/eliminar una orden) repuestos.
  // Empareja por nombre exacto (sin distinguir mayúsculas/espacios) contra
  // `repuestos_catalogo`; si un repuesto de la orden no existe en el catálogo
  // (uno escrito a mano, ad-hoc), simplemente no afecta ningún stock.
  const adjustCatalogStock = async (parts: { name: string; quantity: number }[], sign: 1 | -1) => {
    for (const part of parts) {
      const name = part.name?.trim();
      const qty = Number(part.quantity) || 0;
      if (!name || qty <= 0) continue;
      const { data: catalogItem } = await supabase.from('repuestos_catalogo')
        .select('id, stock_minimo').ilike('nombre', name).maybeSingle();
      if (!catalogItem) continue;
      const nuevoStock = Math.max(0, (catalogItem.stock_minimo || 0) + sign * qty);
      const { error } = await supabase.from('repuestos_catalogo').update({ stock_minimo: nuevoStock }).eq('id', catalogItem.id);
      if (error) console.error(`Error ajustando stock de "${name}":`, error);
    }
  };

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

    // Resuelve la institución (single-tenant, siempre la misma fila — usa el
    // mismo helper robusto que el resto del sistema) y, si se indicó un
    // área/ubicación, su area_id (creándola si todavía no existe).
    // Antes esto se resolvía con `.single()` sobre `maquinas`, que LANZA un
    // error si la tabla está vacía (la primera máquina que se registra) y
    // dejaba institucion_id/area_id en null para siempre — porque cada
    // máquina nueva volvía a copiar el institucion_id (null) de la anterior.
    // Por eso "Área/Ubicación" nunca se guardaba ni se mostraba.
    let area_id = null;
    const institucion_id = await resolveInstitucionId();
    try {
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
      departamento: m.department || null,
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
      turno_operacion: m.threshold?.turno || 'Variable',
      dias_operacion: (m.threshold?.diasOperacion || []).map(String),
    };

    // `.select().single()` para recuperar el id recién creado: lo necesitamos
    // para poblar las tablas puente de tipos de mantenimiento y operadores
    // asignados (antes esos dos campos del formulario se descartaban por
    // completo: nunca se guardaban en ninguna tabla).
    const { data: nuevaMaquina, error } = await supabase.from('maquinas').insert(payload).select().single();
    if (error || !nuevaMaquina) {
      console.error("Error inserting machine:", error);
      toast.error("Error al registrar máquina: " + (error?.message || ''));
      return;
    }

    const tiposIds = m.threshold?.tiposIds || [];
    if (tiposIds.length > 0) {
      const { error: tiposErr } = await supabase.from('maquina_tipos_mantenimiento').insert(
        tiposIds.map((tipo_id) => ({ maquina_id: nuevaMaquina.id, tipo_id }))
      );
      if (tiposErr) console.error("Error asociando tipos de mantenimiento:", tiposErr);
    }

    const operadoresIds = m.threshold?.operadoresIds || [];
    if (operadoresIds.length > 0) {
      const { error: opsErr } = await supabase.from('maquina_operadores').insert(
        operadoresIds.map((usuario_id) => ({ maquina_id: nuevaMaquina.id, usuario_id }))
      );
      if (opsErr) console.error("Error asociando operadores:", opsErr);
    }

    toast.success("Máquina registrada exitosamente");
    fetchAllData();
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
    // Si intentan poner "En Taller" a mano desde el formulario de la máquina
    // (en vez de usar "Enviar a taller" en Talleres Externos), y no existe
    // ningún envío real registrado para esta máquina, lo bloqueamos: eso es
    // justo lo que dejaba máquinas atascadas en "En Taller" sin ningún envío
    // detrás (ver bug de MAQ-002). El botón "Enviar a taller" sí sincroniza
    // todo correctamente.
    let statusToApply = m.status;
    if (m.status === 'En Taller') {
      const { data: activos } = await supabase.from('envios_taller')
        .select('id').eq('maquina_id', id).eq('estado', 'En Taller');
      if (!activos || activos.length === 0) {
        toast.error('Para enviar una máquina a taller usa el botón "Enviar a taller" en Talleres Externos — así queda registrado el envío real y todo se mantiene sincronizado.');
        statusToApply = undefined;
      }
    }

    const payload: any = {};
    if (m.name !== undefined) payload.nombre = m.name;
    if (m.code !== undefined) payload.codigo = m.code;
    if (m.patrimonialCode !== undefined) payload.codigo_patrimonial = m.patrimonialCode;
    if (m.brand !== undefined) payload.marca = m.brand;
    if (m.model !== undefined) payload.modelo = m.model;
    if (m.serial !== undefined) payload.numero_serie = m.serial;
    if (statusToApply !== undefined) payload.estado = statusToApply;
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
    if (m.department !== undefined) payload.departamento = m.department || null;

    if (m.threshold) {
        if (m.threshold.horasCiclo) payload.umbral_horas_ciclo = m.threshold.horasCiclo;
        if (m.threshold.diasMaximos) payload.umbral_dias_maximos = m.threshold.diasMaximos;
        if (m.threshold.alertaPct) payload.umbral_alerta_pct = m.threshold.alertaPct;
        if (m.threshold.turno) payload.turno_operacion = m.threshold.turno;
        if (m.threshold.diasOperacion !== undefined) payload.dias_operacion = m.threshold.diasOperacion.map(String);
    }

    // Misma corrección que en addMachine: usar resolveInstitucionId() en vez
    // de `.single()` sobre `maquinas` (que fallaba y dejaba el área sin
    // guardar cuando esa consulta no devolvía exactamente una fila).
    if (m.location !== undefined || m.area !== undefined) {
        let area_id = null;
        try {
            const institucion_id = await resolveInstitucionId();
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
        } catch(e) { console.error("Error resolving area_id", e); }
        if (area_id) payload.area_id = area_id;
    }

    const { error: updateErr } = await supabase.from('maquinas').update(payload).eq('id', id);
    if (updateErr) {
      console.error("Error updating machine:", updateErr);
      toast.error("Error al actualizar máquina: " + updateErr.message);
    }

    // Si el estado se cambió a cualquier cosa que NO sea "En Taller" (por
    // ejemplo, corregir manualmente a "Operativo"), cierra también cualquier
    // envío a taller que siguiera activo para esta máquina. Sin esto, el
    // envío quedaba huérfano y la máquina seguía apareciendo como "En
    // Taller" en el módulo de Talleres Externos aunque ya se hubiera
    // marcado como disponible desde Máquinas.
    if (!updateErr && statusToApply !== undefined && statusToApply !== 'En Taller') {
      const { data: activos } = await supabase.from('envios_taller')
        .select('id').eq('maquina_id', id).eq('estado', 'En Taller');
      if (activos && activos.length > 0) {
        const hoy = new Date().toISOString().slice(0, 10);
        const idsActivos = activos.map((a: any) => a.id);
        const { error: cierreErr } = await supabase.from('envios_taller')
          .update({ estado: 'Devuelto', fecha_retorno_real: hoy })
          .in('id', idsActivos);
        if (cierreErr) {
          console.error("Error cerrando envío a taller tras cambiar estado de la máquina:", cierreErr);
        } else {
          await supabase.from('seguimiento_taller').insert(
            idsActivos.map((envio_id: string) => ({
              envio_id,
              nota: `Cerrado automáticamente: el estado de la máquina se cambió a "${statusToApply}" desde el módulo de Máquinas.`,
              estado_nuevo: 'Devuelto',
            }))
          );
        }
      }
    }

    // Resincroniza tipos de mantenimiento asociados y operadores asignados
    // (tablas puente): antes estos dos campos del formulario de edición se
    // descartaban silenciosamente y nunca llegaban a guardarse.
    if (m.threshold?.tiposIds !== undefined) {
      await supabase.from('maquina_tipos_mantenimiento').delete().eq('maquina_id', id);
      if (m.threshold.tiposIds.length > 0) {
        const { error: tiposErr } = await supabase.from('maquina_tipos_mantenimiento').insert(
          m.threshold.tiposIds.map((tipo_id) => ({ maquina_id: id, tipo_id }))
        );
        if (tiposErr) console.error("Error asociando tipos de mantenimiento:", tiposErr);
      }
    }
    if (m.threshold?.operadoresIds !== undefined) {
      await supabase.from('maquina_operadores').delete().eq('maquina_id', id);
      if (m.threshold.operadoresIds.length > 0) {
        const { error: opsErr } = await supabase.from('maquina_operadores').insert(
          m.threshold.operadoresIds.map((usuario_id) => ({ maquina_id: id, usuario_id }))
        );
        if (opsErr) console.error("Error asociando operadores:", opsErr);
      }
    }

    fetchAllData();
  };
  const deleteMachine = async (id: string) => {
    // Baja lógica (activo = false): conserva el historial de OTMs/documentos ligado a la máquina.
    const { error } = await supabase.from('maquinas').update({ activo: false }).eq('id', id);
    if (error) {
      console.error("Error eliminando máquina:", error);
      toast.error("Error al eliminar máquina: " + error.message);
      return;
    }
    fetchAllData();
  };

  const addRecord = async (r: Omit<MaintenanceRecord, "id">) => {
    // "Técnico Responsable" y "Supervisor" son texto libre: el nombre que se
    // escriba se guarda SIEMPRE tal cual en tecnico_nombre/supervisor_nombre
    // (columnas de texto), sin depender de que exista un usuario con ese
    // nombre exacto. Antes esto se resolvía solo contra `usuarios.nombre`:
    // si el nombre no coincidía exacto con un usuario registrado (y en un
    // sistema con un solo usuario Admin, casi nunca coincidía con el nombre
    // real del técnico de campo), el campo se guardaba vacío sin avisar.
    // Se intenta igual enlazar a un usuario real (tecnico_id/supervisor_id)
    // por si coincide — es un enlace opcional, no bloquea ni condiciona que
    // el nombre se guarde y se muestre.
    let tecnico_id = null;
    let supervisor_id = null;
    if (r.technician?.trim()) {
       const {data} = await supabase.from('usuarios').select('id').ilike('nombre', r.technician.trim()).maybeSingle();
       if (data) tecnico_id = data.id;
    }
    if (r.supervisor?.trim()) {
       const {data} = await supabase.from('usuarios').select('id').ilike('nombre', r.supervisor.trim()).maybeSingle();
       if (data) supervisor_id = data.id;
    }

    // OJO: `numero_otm` NO se envía desde el cliente. La tabla tiene un
    // trigger (`generar_numero_otm`) que lo genera del lado del servidor a
    // partir del conteo real en la base de datos, y la columna es `unique`.
    // Antes el cliente calculaba su propio número ("OTM-2026-001") a partir
    // de los registros que tenía cargados en memoria — si esa lista estaba
    // incompleta o desactualizada (por ejemplo tras un intento anterior que
    // falló mostrando igual un toast de "creada" por el mismo tipo de bug),
    // el cliente repetía un número que YA existía en la base de datos, el
    // insert fallaba por la restricción `unique`, y como nadie revisaba el
    // resultado, la UI decía "creada" pero la orden nunca se guardó.
    const { data: orden, error } = await supabase.from('ordenes_trabajo').insert({
      maquina_id: r.machineId,
      tipo_id: r.typeId || null,
      estado: r.status,
      fecha_programada: r.date,
      hora_inicio: r.startTime || null,
      hora_fin: r.endTime || null,
      area: r.area || null,
      tecnico_id,
      supervisor_id,
      tecnico_nombre: r.technician || null,
      supervisor_nombre: r.supervisor || null,
      observaciones: r.notes || '',
      hallazgos: r.findings || '',
      estado_post_maquina: r.postState || null,
      proximo_mantenimiento: r.nextDate || null,
      proximo_tipo_id: r.nextTypeId || null,
      firma_tecnico: r.technicianSignature || null,
      firma_supervisor: r.supervisorSignature || null,
      costo_repuestos: r.cost || 0,
      costo_mano_obra: r.laborCost || 0
    }).select().single();

    if (error || !orden) {
      console.error("Error creating record", error);
      toast.error("No se pudo crear la orden de trabajo: " + (error?.message || 'error desconocido'));
      return null;
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
      // Descuenta del catálogo lo que se acaba de usar en esta OTM.
      await adjustCatalogStock(r.parts.map(p => ({ name: p.name, quantity: p.quantity })), -1);
    }

    toast.success(`${orden.numero_otm} creada`);
    fetchAllData();
    return orden.numero_otm as string;
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
    if (r.notes !== undefined) payload.observaciones = r.notes;
    if (r.findings !== undefined) payload.hallazgos = r.findings;
    if (r.postState !== undefined) payload.estado_post_maquina = r.postState || null;
    if (r.nextDate !== undefined) payload.proximo_mantenimiento = r.nextDate || null;
    if (r.nextTypeId !== undefined) payload.proximo_tipo_id = r.nextTypeId || null;
    if (r.technicianSignature !== undefined) payload.firma_tecnico = r.technicianSignature || null;
    if (r.supervisorSignature !== undefined) payload.firma_supervisor = r.supervisorSignature || null;
    if (r.cost !== undefined) payload.costo_repuestos = r.cost;
    if (r.laborCost !== undefined) payload.costo_mano_obra = r.laborCost;
    if (r.area !== undefined) payload.area = r.area || null;

    // "Técnico Responsable"/"Supervisor" son texto libre: el nombre escrito
    // se guarda siempre en tecnico_nombre/supervisor_nombre (fuente de verdad
    // para mostrar). El enlace a un usuario real (tecnico_id/supervisor_id)
    // es un bonus opcional, no condiciona que el nombre se guarde.
    if (r.technician !== undefined) {
        payload.tecnico_nombre = r.technician || null;
        payload.tecnico_id = null;
        if (r.technician?.trim()) {
            const {data} = await supabase.from('usuarios').select('id').ilike('nombre', r.technician.trim()).maybeSingle();
            if (data) payload.tecnico_id = data.id;
        }
    }
    if (r.supervisor !== undefined) {
        payload.supervisor_nombre = r.supervisor || null;
        payload.supervisor_id = null;
        if (r.supervisor?.trim()) {
            const {data} = await supabase.from('usuarios').select('id').ilike('nombre', r.supervisor.trim()).maybeSingle();
            if (data) payload.supervisor_id = data.id;
        }
    }

    const { error: recErr } = await supabase.from('ordenes_trabajo').update(payload).eq('id', id);
    if (recErr) {
      console.error("Error actualizando orden:", recErr);
      toast.error("Error al actualizar la orden: " + recErr.message);
      return false;
    }

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
        // Antes de reemplazar los repuestos de esta orden, devuelve al
        // catálogo las cantidades que tenía registradas previamente — si no
        // se hace esto, cada vez que se edita la orden se volvería a
        // descontar el mismo repuesto, restando de más del stock real.
        const { data: oldParts } = await supabase.from('repuestos_otm').select('nombre, cantidad').eq('orden_id', id);
        if (oldParts && oldParts.length > 0) {
            await adjustCatalogStock(oldParts.map((p: any) => ({ name: p.nombre, quantity: p.cantidad })), 1);
        }

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
            await adjustCatalogStock(r.parts.map(p => ({ name: p.name, quantity: p.quantity })), -1);
        }
    }

    toast.success(`${payload.numero_otm || r.otm || 'Orden'} actualizada`);
    fetchAllData();
    return true;
};
  const deleteRecord = async (id: string) => {
    // Si la orden tenía repuestos registrados, devuelve esa cantidad al
    // catálogo antes de borrarla — al eliminar la OTM, esos repuestos dejan
    // de estar "usados" (repuestos_otm se borra en cascada junto con la orden).
    const { data: partsToRestock } = await supabase.from('repuestos_otm').select('nombre, cantidad').eq('orden_id', id);
    if (partsToRestock && partsToRestock.length > 0) {
      await adjustCatalogStock(partsToRestock.map((p: any) => ({ name: p.nombre, quantity: p.cantidad })), 1);
    }

    const { error } = await supabase.from('ordenes_trabajo').delete().eq('id', id);
    if (error) {
      console.error("Error eliminando orden:", error);
      toast.error("Error al eliminar la orden: " + error.message);
      return;
    }
    fetchAllData();
  };

  const addType = async (t: Omit<MaintenanceType, "id">) => {
    const institucion_id = await resolveInstitucionId();
    const { data: tipo, error } = await supabase.from('tipos_mantenimiento').insert({
      institucion_id,
      nombre: t.name,
      descripcion: t.description,
      color: t.color,
      categoria: t.category,
      frecuencia: t.frequency,
      duracion_min: Math.round((t.estimatedHours || 0) * 60),
      activo: t.active,
    }).select().single();

    if (error || !tipo) {
      console.error("Error creando tipo de mantenimiento:", error);
      toast.error("Error al crear el tipo: " + (error?.message || ''));
      return;
    }

    if (t.activities && t.activities.length > 0) {
      await supabase.from('actividades_tipo').insert(
        t.activities.map((a, i) => ({
          tipo_id: tipo.id, descripcion: a.text, duracion_min: a.durationMin, responsable: a.role, orden: i,
        }))
      );
    }
    fetchAllData();
  };

  const updateType = async (id: string, t: Partial<MaintenanceType>) => {
    const payload: any = {};
    if (t.name !== undefined) payload.nombre = t.name;
    if (t.description !== undefined) payload.descripcion = t.description;
    if (t.color !== undefined) payload.color = t.color;
    if (t.category !== undefined) payload.categoria = t.category;
    if (t.frequency !== undefined) payload.frecuencia = t.frequency;
    if (t.estimatedHours !== undefined) payload.duracion_min = Math.round(t.estimatedHours * 60);
    if (t.active !== undefined) payload.activo = t.active;

    if (Object.keys(payload).length > 0) {
      const { error } = await supabase.from('tipos_mantenimiento').update(payload).eq('id', id);
      if (error) {
        console.error("Error actualizando tipo de mantenimiento:", error);
        toast.error("Error al actualizar el tipo: " + error.message);
        return;
      }
    }

    if (t.activities !== undefined) {
      await supabase.from('actividades_tipo').delete().eq('tipo_id', id);
      if (t.activities.length > 0) {
        await supabase.from('actividades_tipo').insert(
          t.activities.map((a, i) => ({
            tipo_id: id, descripcion: a.text, duracion_min: a.durationMin, responsable: a.role, orden: i,
          }))
        );
      }
    }
    fetchAllData();
  };

  const deleteType = async (id: string) => {
    // Baja lógica: hay OTMs que referencian tipo_id, así que no se borra físicamente.
    const { error } = await supabase.from('tipos_mantenimiento').update({ activo: false }).eq('id', id);
    if (error) {
      console.error("Error eliminando tipo de mantenimiento:", error);
      toast.error("Error al eliminar el tipo: " + error.message);
      return;
    }
    fetchAllData();
  };

  const addWorkshop = async (w: Omit<Workshop, "id">) => {
    const institucion_id = await resolveInstitucionId();
    const { error } = await supabase.from('talleres_externos').insert({
      institucion_id,
      nombre: w.name,
      contacto: w.contact,
      telefono: w.phone,
      direccion: w.address || null,
      especialidad: w.specialty || null,
      activo: true
    });
    if (error) {
      console.error("Error creando taller:", error);
      toast.error("Error al crear el taller: " + error.message);
      return;
    }
    fetchAllData();
  };
  const updateWorkshop = async (id: string, w: Partial<Workshop>) => {
    let payload: any = {};
    if (w.name !== undefined) payload.nombre = w.name;
    if (w.address !== undefined) payload.direccion = w.address;
    if (w.contact !== undefined) payload.contacto = w.contact;
    if (w.phone !== undefined) payload.telefono = w.phone;
    if (w.specialty !== undefined) payload.especialidad = w.specialty;

    const { error } = await supabase.from('talleres_externos').update(payload).eq('id', id);
    if (error) {
      console.error("Error actualizando taller:", error);
      toast.error("Error al actualizar el taller: " + error.message);
      return;
    }
    fetchAllData();
  };
  const deleteWorkshop = async (id: string) => {
    const { error } = await supabase.from('talleres_externos').update({ activo: false }).eq('id', id);
    if (error) {
      console.error("Error eliminando taller:", error);
      toast.error("Error al eliminar el taller: " + error.message);
      return;
    }
    fetchAllData();
  };

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const upsertComponent = async (mId: string, c: CriticalComponent) => {
    const payload = {
      maquina_id: mId,
      nombre: c.name,
      funcion: c.function,
      estado: c.state,
      criticidad: c.criticality,
    };
    // Si el id no es un UUID real (viene de un id temporal generado en el formulario), es un componente nuevo.
    const { error } = UUID_RE.test(c.id)
      ? await supabase.from('componentes_criticos').update(payload).eq('id', c.id)
      : await supabase.from('componentes_criticos').insert(payload);
    if (error) {
      console.error("Error guardando componente:", error);
      toast.error("Error al guardar el componente: " + error.message);
      return;
    }
    fetchAllData();
  };
  const deleteComponent = async (mId: string, cId: string) => {
    const { error } = await supabase.from('componentes_criticos').delete().eq('id', cId);
    if (error) {
      console.error("Error eliminando componente:", error);
      toast.error("Error al eliminar el componente: " + error.message);
      return;
    }
    fetchAllData();
  };

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

      const payload = {
        maquina_id: mId,
        nombre_archivo: doc.name,
        url: finalUrl,
        categoria: mapDocCategory(doc.category),
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
    const { error } = await supabase.from('documentos').delete().eq('id', dId);
    if (error) {
      console.error("Error eliminando documento:", error);
      toast.error("Error al eliminar el documento: " + error.message);
      return;
    }
    fetchAllData();
  };

  const addWorkshopRecord = async (r: Omit<WorkshopRecord, "id">) => {
    const institucion_id = await resolveInstitucionId();

    // Resolver o crear el taller por nombre (mismo patrón que addWorkshop).
    let taller_id: string | null = null;
    if (r.workshopName) {
      const { data: existing } = await supabase.from('talleres_externos').select('id, direccion, telefono, contacto')
        .eq('nombre', r.workshopName).eq('institucion_id', institucion_id).maybeSingle();
      if (existing) {
        taller_id = existing.id;
        // Antes, si el taller ya existía (mismo nombre de un envío anterior),
        // se reusaba tal cual sin actualizar nunca su dirección/teléfono/
        // contacto — así que si volvías a escribir la dirección en un envío
        // nuevo, se guardaba el envío pero el dato del taller se quedaba
        // congelado en lo que tenía la primera vez (o vacío, si esa primera
        // vez no se llenó). Ahora, si este envío trae datos nuevos, se
        // actualiza también el directorio del taller.
        const tallerUpdate: Record<string, string> = {};
        if (r.workshopAddress && r.workshopAddress !== existing.direccion) tallerUpdate.direccion = r.workshopAddress;
        if (r.workshopPhone && r.workshopPhone !== existing.telefono) tallerUpdate.telefono = r.workshopPhone;
        if (r.workshopContact && r.workshopContact !== existing.contacto) tallerUpdate.contacto = r.workshopContact;
        if (Object.keys(tallerUpdate).length > 0) {
          const { error: tallerUpdErr } = await supabase.from('talleres_externos').update(tallerUpdate).eq('id', existing.id);
          if (tallerUpdErr) console.error("Error actualizando datos del taller:", tallerUpdErr);
        }
      } else {
        const { data: nuevo } = await supabase.from('talleres_externos').insert({
          institucion_id, nombre: r.workshopName, direccion: r.workshopAddress || null,
          telefono: r.workshopPhone || null, contacto: r.workshopContact || null, activo: true,
        }).select().single();
        if (nuevo) taller_id = nuevo.id;
      }
    }

    // Resolver "autorizado por" (mismo patrón name-lookup usado para técnico/supervisor en addRecord).
    let autorizado_por: string | null = null;
    if (r.authorizedBy) {
      const { data } = await supabase.from('usuarios').select('id').eq('nombre', r.authorizedBy).maybeSingle();
      if (data) autorizado_por = data.id;
    }

    const { data: envio, error } = await supabase.from('envios_taller').insert({
      maquina_id: r.machineId,
      taller_id,
      autorizado_por,
      fecha_envio: r.sentDate,
      fecha_retorno_est: r.estimatedReturn || null,
      tipo_problema: r.problemType,
      descripcion_problema: r.problemDescription,
      condicion_envio: r.condition,
      estado: r.status || 'En Taller',
      presupuesto: r.approvedBudget || 0,
    }).select().single();

    if (error || !envio) {
      console.error("Error registrando envío a taller:", error);
      toast.error("Error al registrar el envío: " + (error?.message || ''));
      return;
    }

    if (r.affectedComponentIds && r.affectedComponentIds.length > 0) {
      await supabase.from('componentes_afectados').insert(
        r.affectedComponentIds.map((componente_id) => ({ envio_id: envio.id, componente_id }))
      );
    }

    if (r.logs && r.logs.length > 0) {
      await supabase.from('seguimiento_taller').insert(
        r.logs.map((l) => ({ envio_id: envio.id, nota: l.note, estado_nuevo: l.status || null, fecha: l.at }))
      );
    }

    if (r.documents && r.documents.length > 0) {
      await addDocumentsToWorkshop(envio.id, r.documents);
    }

    // La máquina queda "En Taller" mientras dure el envío: sin esto, el
    // módulo de Uso de Máquinas no tiene forma de saber que la máquina no
    // está disponible y el badge de Máquinas quedaba desincronizado del
    // envío real.
    const { error: statusErr } = await supabase.from('maquinas').update({ estado: 'En Taller' }).eq('id', r.machineId);
    if (statusErr) console.error("Error actualizando estado de máquina a 'En Taller':", statusErr);

    fetchAllData();
  };

  const updateWorkshopRecord = async (id: string, r: Partial<WorkshopRecord>) => {
    const payload: any = {};
    if (r.actualReturn !== undefined) payload.fecha_retorno_real = r.actualReturn || null;
    if (r.estimatedReturn !== undefined) payload.fecha_retorno_est = r.estimatedReturn || null;
    if (r.finalCost !== undefined) payload.costo_final = r.finalCost;
    if (r.rating !== undefined) payload.rating = r.rating;
    if (r.workSummary !== undefined) payload.resumen_trabajos = r.workSummary;
    if (r.status !== undefined) payload.estado = r.status;
    if (r.approvedBudget !== undefined) payload.presupuesto = r.approvedBudget;
    if (r.problemDescription !== undefined) payload.descripcion_problema = r.problemDescription;

    if (Object.keys(payload).length > 0) {
      const { error } = await supabase.from('envios_taller').update(payload).eq('id', id);
      if (error) {
        console.error("Error actualizando envío a taller:", error);
        toast.error("Error al actualizar el envío: " + error.message);
        return;
      }
    }

    // Si el envío cambia de estado, sincroniza el estado de la máquina:
    // Devuelto/Cancelado -> vuelve a estar disponible (Operativo); si se
    // reabre a "En Taller" -> vuelve a marcarse como en taller.
    if (r.status !== undefined) {
      const existing = workshopRecords.find((w) => w.id === id);
      const machineId = existing?.machineId;
      if (machineId) {
        const nuevoEstadoMaquina = r.status === 'En Taller' ? 'En Taller' : 'Operativo';
        const { error: statusErr } = await supabase.from('maquinas').update({ estado: nuevoEstadoMaquina }).eq('id', machineId);
        if (statusErr) console.error("Error sincronizando estado de máquina tras cambio de envío:", statusErr);
      }
    }

    fetchAllData();
  };

  const deleteWorkshopRecord = async (id: string) => {
    // Si el envío que se elimina es el que tiene la máquina marcada "En
    // Taller", hay que liberarla de vuelta a "Operativo" — si no, quedaría
    // atascada sin ningún envío real detrás (el mismo bug de MAQ-002).
    const existing = workshopRecords.find((w) => w.id === id);

    const { error } = await supabase.from('envios_taller').delete().eq('id', id);
    if (error) {
      console.error("Error eliminando envío a taller:", error);
      toast.error("Error al eliminar el envío: " + error.message);
      return;
    }

    if (existing?.status === 'En Taller' && existing.machineId) {
      const { error: statusErr } = await supabase.from('maquinas').update({ estado: 'Operativo' }).eq('id', existing.machineId);
      if (statusErr) console.error("Error liberando máquina tras eliminar envío:", statusErr);
    }

    toast.success("Envío a taller eliminado");
    fetchAllData();
  };

  const addWorkshopLog = async (id: string, note: string, s?: WorkshopRecordStatus) => {
    const { error } = await supabase.from('seguimiento_taller').insert({ envio_id: id, nota: note, estado_nuevo: s || null });
    if (error) {
      console.error("Error agregando seguimiento:", error);
      toast.error("Error al agregar el seguimiento: " + error.message);
      return;
    }
    fetchAllData();
  };

  const addDocumentsToWorkshop = async (envioId: string, docs: AppDocument[]) => {
    for (const doc of docs) {
      let finalUrl = doc.dataUrl;
      if (doc.dataUrl.startsWith('data:')) {
        try {
          const res = await fetch(doc.dataUrl);
          const blob = await res.blob();
          const ext = doc.name.split('.').pop() || 'bin';
          const safeName = doc.name.replace(/[^a-zA-Z0-9]/g, '_');
          const fileName = `envio-${envioId}-${Date.now()}-${safeName}.${ext}`;
          const { data: upData, error: upErr } = await supabase.storage.from('documentos-taller').upload(fileName, blob, { upsert: true });
          if (upData) {
            const { data: { publicUrl } } = supabase.storage.from('documentos-taller').getPublicUrl(fileName);
            finalUrl = publicUrl;
          } else {
            console.error("Storage upload error", upErr);
          }
        } catch (e) {
          console.error("Error uploading workshop document to storage", e);
        }
      }

      const { error } = await supabase.from('documentos').insert({
        envio_id: envioId,
        nombre_archivo: doc.name,
        url: finalUrl,
        categoria: mapDocCategory(doc.category),
        tipo_mime: doc.mime,
        tamanio_bytes: doc.size,
        descripcion: doc.description || null,
      });
      if (error) console.error("Error inserting workshop document to DB", error);
    }
    fetchAllData();
  };

  const removeDocumentFromWorkshop = async (envioId: string, docId: string) => {
    const { error } = await supabase.from('documentos').delete().eq('id', docId);
    if (error) {
      console.error("Error eliminando documento:", error);
      toast.error("Error al eliminar el documento: " + error.message);
      return;
    }
    fetchAllData();
  };

  const addSparePart = async (p: Omit<SparePart, "id">) => {
    const institucion_id = await resolveInstitucionId();
    const { error } = await supabase.from('repuestos_catalogo').insert({
      institucion_id,
      nombre: p.name,
      referencia: p.reference,
      proveedor: p.supplier,
      precio: p.price,
      stock_minimo: p.stock
    });
    if (error) {
      console.error("Error creando repuesto:", error);
      toast.error("Error al crear el repuesto: " + error.message);
      return;
    }
    fetchAllData();
  };
  const updateSparePart = async (id: string, p: Partial<SparePart>) => {
    let payload: any = {};
    if (p.name !== undefined) payload.nombre = p.name;
    if (p.reference !== undefined) payload.referencia = p.reference;
    if (p.supplier !== undefined) payload.proveedor = p.supplier;
    if (p.price !== undefined) payload.precio = p.price;
    if (p.stock !== undefined) payload.stock_minimo = p.stock;
    const { error } = await supabase.from('repuestos_catalogo').update(payload).eq('id', id);
    if (error) {
      console.error("Error actualizando repuesto:", error);
      toast.error("Error al actualizar el repuesto: " + error.message);
      return;
    }
    fetchAllData();
  };
  const deleteSparePart = async (id: string) => {
    const { error } = await supabase.from('repuestos_catalogo').delete().eq('id', id);
    if (error) {
      console.error("Error eliminando repuesto:", error);
      toast.error("Error al eliminar el repuesto: " + error.message);
      return;
    }
    fetchAllData();
  };
  const addTechnician = async (t: Omit<Technician, "id">) => {
    const institucion_id = await resolveInstitucionId();
    const { error } = await supabase.from('usuarios').insert({
      institucion_id,
      nombre: t.name,
      email: t.email || `${Date.now()}@mantenimiento.com`,
      rol: t.role || 'Tecnico',
      area: t.area,
      activo: true
    });
    if (error) {
      console.error("Error creando usuario/técnico:", error);
      toast.error("Error al crear el técnico: " + error.message + " (puede requerir permisos de Admin/Supervisor)");
      return;
    }
    fetchAllData();
  };
  const updateTechnician = async (id: string, t: Partial<Technician>) => {
    let payload: any = {};
    if (t.name !== undefined) payload.nombre = t.name;
    if (t.email !== undefined) payload.email = t.email;
    if (t.role !== undefined) payload.rol = t.role;
    if (t.area !== undefined) payload.area = t.area;
    const { error } = await supabase.from('usuarios').update(payload).eq('id', id);
    if (error) {
      console.error("Error actualizando usuario/técnico:", error);
      toast.error("Error al actualizar el técnico: " + error.message + " (puede requerir permisos de Admin/Supervisor)");
      return;
    }
    fetchAllData();
  };
  const deleteTechnician = async (id: string) => {
    const { error } = await supabase.from('usuarios').update({ activo: false }).eq('id', id);
    if (error) {
      console.error("Error eliminando usuario/técnico:", error);
      toast.error("Error al eliminar el técnico: " + error.message + " (puede requerir permisos de Admin/Supervisor)");
      return;
    }
    fetchAllData();
  };
  const updateSettings = async (s: Partial<AppSettings>) => {
    // Optimistic update locally
    setSettings(prev => ({ ...prev, ...s }));

    try {
      // Get the existing institution to update. Ordered by created_at so this
      // ALWAYS resolves to the same row (the original one) even if duplicate
      // "instituciones" rows exist — otherwise Postgres/PostgREST may return a
      // different row on each call (undefined order for `.limit(1)` with no
      // ORDER BY), which looked like the logo "disappearing" after a refresh.
      let { data: inst } = await supabase
        .from('instituciones')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

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
        } else {
          // Upload failed (bucket missing, RLS policy, etc.) — keep the base64
          // fallback so the logo still saves and displays, but warn so the
          // user knows storage isn't wired up correctly.
          console.error("Error subiendo el logo al storage", upErr);
          toast.error("No se pudo subir el logo al almacenamiento. Se guardó localmente; revisa la configuración del bucket 'maquinas-fotos' en Supabase.");
        }
      }

      const payload: any = {};
      if (s.institutionName !== undefined) payload.nombre = s.institutionName;
      if (finalLogoUrl !== undefined) payload.logo_url = finalLogoUrl;
      if (s.notifyDaysBefore !== undefined) payload.notify_days_before = s.notifyDaysBefore;
      if (s.mtbfGoalH !== undefined) payload.mtbf_goal_h = s.mtbfGoalH;
      if (s.availabilityGoalPct !== undefined) payload.availability_goal_pct = s.availabilityGoalPct;

      let writeErr = null;
      if (inst) {
        // Update existing
        const { error } = await supabase.from('instituciones').update(payload).eq('id', inst.id);
        writeErr = error;
      } else {
        // Create new (only happens once, the very first time — after that
        // `inst` above will always find this same row again).
        if (!payload.nombre) payload.nombre = "Mi Taller";
        const { error } = await supabase.from('instituciones').insert(payload);
        writeErr = error;
      }

      if (writeErr) {
        console.error("Error guardando configuración", writeErr);
        toast.error("No se pudo guardar la configuración en la base de datos.");
      }

      fetchAllData();
    } catch(err) {
      console.error("Error updating settings", err);
      toast.error("No se pudo guardar la configuración.");
    }
  };
  const allDocuments = () => [
    ...machines.flatMap((m) => (m.documents || []).map((d) => ({ ...d, machineId: m.id }))),
    ...workshopRecords.flatMap((r) => (r.documents || []).map((d) => ({ ...d, workshopRecordId: r.id }))),
  ];

  const addUsageLog = async (log: Omit<UsageLog, "id">) => {
    // 1. Ensure cycle exists so the DB trigger can update it
    const { data: cycle } = await supabase.from('uso_ciclos').select('id').eq('maquina_id', log.machineId).maybeSingle();
    if (!cycle) {
      const { error: cycleErr } = await supabase.from('uso_ciclos').insert({ maquina_id: log.machineId, horas_acumuladas: 0 });
      if (cycleErr) console.error("Error creando ciclo de uso:", cycleErr);
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
      toast.error("Error al registrar el uso: " + error.message);
      return;
    }

    // La notificación de umbral (crítico/alerta) ya la crea automáticamente
    // el trigger `tg_notificar_umbral` en la base de datos en cuanto se
    // actualiza `uso_ciclos.horas_acumuladas` (ver migración 002/012) — antes
    // este bloque la volvía a crear también aquí en el cliente, usando el
    // estado local de `notifications` (que en ese momento todavía no reflejaba
    // lo que el trigger acababa de insertar) para decidir si ya existía. Esa
    // condición de carrera producía notificaciones duplicadas por cada uso
    // registrado que cruzaba el umbral. fetchAllData() ya trae la notificación
    // real creada por el trigger, así que no hace falta insertarla dos veces.
    fetchAllData();
  };

  const clearAllUsageLogs = async () => {
    await supabase.from('uso_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('uso_ciclos').update({ horas_acumuladas: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
    fetchAllData();
  };
  const resetCycle = (mId: string, otmRef?: string) => {
    supabase.from('uso_ciclos').update({ horas_acumuladas: 0, ultimo_reset: new Date().toISOString(), otm_ref: otmRef || null }).eq('maquina_id', mId)
    .then(({ error }) => {
      if (error) { console.error("Error reiniciando ciclo de uso:", error); toast.error("No se pudo reiniciar el ciclo: " + error.message); return; }
      fetchAllData();
    });
  };

  const markNotificationRead = (id: string) => {
    supabase.from('notificaciones').update({ leida: true }).eq('id', id).then(({ error }) => {
      if (error) { console.error("Error marcando notificación leída:", error); toast.error("No se pudo marcar como leída: " + error.message); return; }
      fetchAllData();
    });
  };
  const markAllRead = () => {
    supabase.from('notificaciones').update({ leida: true }).eq('leida', false).then(({ error }) => {
      if (error) { console.error("Error marcando todas leídas:", error); toast.error("No se pudo marcar todo como leído: " + error.message); return; }
      fetchAllData();
    });
  };
  const deleteNotification = (id: string) => {
    supabase.from('notificaciones').delete().eq('id', id).then(({ error }) => {
      if (error) { console.error("Error eliminando notificación:", error); toast.error("No se pudo eliminar la notificación: " + error.message); return; }
      fetchAllData();
    });
  };

  const value: State = {
    initializing,
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
