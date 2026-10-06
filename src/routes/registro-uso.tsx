import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FacultyCombobox } from "@/components/FacultyCombobox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Search, Factory, Clock, CheckCircle2, Loader2, GraduationCap,
  UserRound, ShieldCheck, Wrench, AlertTriangle, RotateCcw, IdCard, SlidersHorizontal, Lock, Timer,
} from "lucide-react";
import { toast } from "sonner";
import LinearProgress from "@mui/material/LinearProgress";

export const Route = createFileRoute("/registro-uso")({
  head: () => ({
    meta: [
      { title: "Registro de Uso de Máquina — MantePro" },
      { name: "description", content: "Autoregistro público de uso de máquinas para alumnos y personal externo." },
    ],
  }),
  component: RegistroUsoPage,
});

// ── Tipos de la data pública (vistas maquinas_publico / institucion_publico) ──
type MaquinaPublica = {
  id: string;
  codigo: string;
  nombre: string;
  marca: string | null;
  modelo: string | null;
  foto_url: string | null;
  estado: string;
  area: string | null;
  // Calculados en vivo por la vista `maquinas_publico` (migración 016) contra
  // `uso_logs`: en_uso = true mientras exista una sesión con end_at > now()
  // para esta máquina. No es un estado guardado — se libera sola, sin que
  // nadie tenga que intervenir, apenas se cumple la hora que el propio
  // alumno registró al empezar a usarla.
  en_uso: boolean;
  uso_libre_en: string | null;
};

type Institucion = { nombre: string; logo_url: string | null };

// Duraciones ofrecidas al alumno. Se retiraron 4h/6h/8h: una máquina
// compartida no debería quedar bloqueada media jornada desde el
// autoregistro público — un bloque tan largo se coordina con el encargado
// del taller desde el panel admin, no aquí.
const DURACIONES = [0.5, 1, 1.5, 2, 3];
const AUTO_CLOSE_MS = 7000;
// Cada cuánto se refresca en segundo plano la galería, para que el candado
// "en uso" que puso otra persona aparezca (o se libere solo al cumplirse su
// hora) sin que nadie tenga que recargar la página.
const REFRESH_MS = 20000;

type DialogPhase = "form" | "success";
type TipoOperador = "Alumno" | "Externo";

const estadoPill: Record<string, string> = {
  "Operativo": "bg-success/90 text-white",
  "En Revisión": "bg-warning/90 text-white",
  "En Taller": "bg-info/90 text-white",
  "Fuera de Servicio": "bg-critical/90 text-white",
};

const fmtHora = (iso: string) =>
  new Date(iso).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });

// Minutos que faltan para que `iso` se cumpla, nunca negativo (una vez pasa
// la hora, la propia vista `maquinas_publico` deja de mandar en_uso=true en
// el próximo refresco, así que esto es solo para el texto del contador).
const minutosRestantes = (iso: string) => Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60000));

function MachineImage({ url, name, className }: { url: string | null; name: string; className?: string }) {
  const [broken, setBroken] = useState(false);
  if (!url || broken) {
    return (
      <div className={cn("grid place-items-center bg-secondary/60 text-muted-foreground", className)}>
        <Factory className="h-8 w-8 opacity-40" />
      </div>
    );
  }
  return <img src={url} alt={name} onError={() => setBroken(true)} className={cn("object-cover", className)} />;
}

// ── Skeleton de carga (evita el "salto" de layout cuando llegan los datos) ──
function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden animate-pulse">
      <div className="aspect-[4/3] bg-secondary/60" />
      <div className="p-3 space-y-2">
        <div className="h-3 w-2/3 rounded bg-secondary/60" />
        <div className="h-2.5 w-1/3 rounded bg-secondary/50" />
      </div>
    </div>
  );
}

function IconField({
  icon: Icon, label, ...props
}: { icon: any; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="relative mt-1">
        <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <Input {...props} className={cn("h-10 pl-8 text-sm", props.className)} />
      </div>
    </div>
  );
}

function RegistroUsoPage() {
  const [institucion, setInstitucion] = useState<Institucion | null>(null);
  const [maquinas, setMaquinas] = useState<MaquinaPublica[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [soloDisponibles, setSoloDisponibles] = useState(false);

  const [selected, setSelected] = useState<MaquinaPublica | null>(null);
  const [phase, setPhase] = useState<DialogPhase>("form");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ horas: number; horasAcumuladas: number; umbral: number; alerta: string } | null>(null);

  const [tipo, setTipo] = useState<TipoOperador>("Alumno");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [dni, setDni] = useState("");
  const [codigo, setCodigo] = useState("");
  const [facultad, setFacultad] = useState("");
  const [horas, setHoras] = useState(1);
  const [observaciones, setObservaciones] = useState("");
  const [showObs, setShowObs] = useState(false);

  const autoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Fuerza un re-render cada 30s para que las tarjetas "en uso" recalculen su
  // cuenta regresiva y se destraben solas apenas cambia `en_uso` en el
  // próximo fetchMaquinas(), sin que el alumno tenga que tocar nada.
  const [, setTick] = useState(0);

  const fetchMaquinas = async (opts?: { silent?: boolean }) => {
    const { data: maq, error } = await supabase.from("maquinas_publico").select("*");
    if (error) {
      console.error("Error cargando máquinas públicas:", error);
      if (!opts?.silent) toast.error("No se pudo cargar el listado de máquinas. Intenta recargar la página.");
      return;
    }
    setMaquinas((maq as MaquinaPublica[]) || []);
  };

  useEffect(() => {
    (async () => {
      const [{ data: inst }] = await Promise.all([
        supabase.from("institucion_publico").select("*").maybeSingle(),
        fetchMaquinas(),
      ]);
      if (inst) setInstitucion(inst as Institucion);
      setLoading(false);
    })();

    // Poll en segundo plano: así el candado "en uso" que puso otra persona
    // aparece solo, y una máquina que ya cumplió su hora vuelve a quedar
    // disponible sin que nadie tenga que recargar la página.
    const poll = setInterval(() => fetchMaquinas({ silent: true }), REFRESH_MS);
    const tickTimer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => { clearInterval(poll); clearInterval(tickTimer); };
  }, []);

  useEffect(() => () => { if (autoCloseTimer.current) clearTimeout(autoCloseTimer.current); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return maquinas
      .filter((m) => !soloDisponibles || (m.estado === "Operativo" && !m.en_uso))
      .filter((m) =>
        !s ||
        m.codigo.toLowerCase().includes(s) ||
        m.nombre.toLowerCase().includes(s) ||
        (m.marca || "").toLowerCase().includes(s) ||
        (m.area || "").toLowerCase().includes(s),
      )
      // 001 primero (arriba-izquierda) y así ascendiendo hacia la derecha —
      // orden numérico del código, no alfabético (para que "MAQ-002" no
      // quede antes que "MAQ-010" por ejemplo).
      .sort((a, b) => a.codigo.localeCompare(b.codigo, undefined, { numeric: true, sensitivity: "base" }));
  }, [maquinas, q, soloDisponibles]);

  const disponiblesCount = maquinas.filter((m) => m.estado === "Operativo" && !m.en_uso).length;

  const resetForm = () => {
    setTipo("Alumno"); setNombre(""); setApellido(""); setDni("");
    setCodigo(""); setFacultad(""); setHoras(1); setObservaciones(""); setShowObs(false);
  };

  const pickMachine = (m: MaquinaPublica) => {
    if (m.estado !== "Operativo") {
      toast.error(`"${m.nombre}" no está disponible en este momento (${m.estado}).`);
      return;
    }
    if (m.en_uso) {
      toast.error(
        m.uso_libre_en
          ? `"${m.nombre}" ya está en uso. Queda libre a las ${fmtHora(m.uso_libre_en)} (en ${minutosRestantes(m.uso_libre_en)} min).`
          : `"${m.nombre}" ya está en uso en este momento.`,
      );
      fetchMaquinas({ silent: true });
      return;
    }
    resetForm();
    setResult(null);
    setPhase("form");
    setSelected(m);
  };

  // Único punto de "volver al inicio": se llama al cerrar el modal por
  // cualquier vía (botón, overlay, Escape, auto-cierre tras el éxito), así
  // el usuario siempre regresa a la galería de máquinas limpia.
  const volverAlInicio = () => {
    if (autoCloseTimer.current) { clearTimeout(autoCloseTimer.current); autoCloseTimer.current = null; }
    setSelected(null);
    setResult(null);
  };

  const submit = async () => {
    if (!selected) return;
    if (!nombre.trim() || !apellido.trim()) { toast.error("Ingresa tu nombre y apellido"); return; }
    if (!dni.trim()) { toast.error("Ingresa tu DNI"); return; }
    if (tipo === "Alumno" && !codigo.trim()) { toast.error("Ingresa tu código de estudiante"); return; }
    if (tipo === "Alumno" && !facultad.trim()) { toast.error("Selecciona tu facultad"); return; }

    setSubmitting(true);
    const { data, error } = await supabase.rpc("registrar_uso_publico", {
      p_maquina_id: selected.id,
      p_tipo_operador: tipo,
      p_nombre: nombre.trim(),
      p_apellido: apellido.trim(),
      p_dni: dni.trim(),
      p_start_at: new Date().toISOString(),
      p_horas: horas,
      p_codigo_alumno: tipo === "Alumno" ? codigo.trim() : null,
      p_facultad: tipo === "Alumno" ? facultad : null,
      p_observaciones: observaciones.trim() || null,
    });
    setSubmitting(false);

    if (error) {
      console.error("Error registrando uso público:", error);
      toast.error(error.message || "No se pudo registrar el uso. Intenta de nuevo.");
      // Si el rechazo fue porque alguien más registró esta máquina justo
      // antes (carrera entre dos personas tocando "Registrar" casi a la vez),
      // el estado que tenía la tarjeta en pantalla ya quedó desactualizado —
      // se refresca para que se vea el candado real sin que el alumno tenga
      // que adivinar por qué falló.
      fetchMaquinas({ silent: true });
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    setResult({
      horas,
      horasAcumuladas: Number(row?.horas_acumuladas ?? 0),
      umbral: Number(row?.umbral_horas_ciclo ?? 0),
      alerta: row?.alerta || "normal",
    });
    setPhase("success");
    fetchMaquinas({ silent: true });
    autoCloseTimer.current = setTimeout(volverAlInicio, AUTO_CLOSE_MS);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-md shadow-elevation-sm">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-3">
          {institucion?.logo_url ? (
            <img src={institucion.logo_url} alt="Logo" className="h-10 w-10 rounded-xl object-cover border border-border shrink-0 shadow-sm" />
          ) : (
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shrink-0 shadow-sm">
              <Wrench className="h-4.5 w-4.5" />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight truncate">{institucion?.nombre || "MantePro"}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Autoregistro de uso de máquinas</div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-8">
        <div className="mb-7 text-center sm:text-left">
          <h1 className="text-[28px] sm:text-[34px] font-bold tracking-tight text-foreground leading-[1.1]">¿Qué máquina vas a usar?</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto sm:mx-0">
            Busca tu máquina y cuéntanos quién eres — queda registrado al instante, sin necesidad de una cuenta.
          </p>
        </div>

        {/* ── Buscador + filtro ── */}
        <div className="flex flex-col sm:flex-row gap-2.5 mb-4 rounded-2xl border border-border bg-card/70 p-2.5 shadow-elevation-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, código, marca o área…"
              className="pl-10 h-12 rounded-xl bg-card border-border shadow-sm text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => setSoloDisponibles((v) => !v)}
            className={cn(
              "h-12 shrink-0 px-4 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer",
              soloDisponibles ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-secondary/50",
            )}
          >
            <SlidersHorizontal className="h-4 w-4" /> Solo disponibles
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-5 flex items-center justify-center sm:justify-start gap-1.5">
          {loading ? (
            "Cargando…"
          ) : (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-success shrink-0" aria-hidden="true" />
              {filtered.length} de {maquinas.length} máquinas · {disponiblesCount} disponibles ahora
            </>
          )}
        </p>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground text-sm">
            <Factory className="mx-auto h-8 w-8 mb-2 opacity-40" />
            No se encontraron máquinas{q ? ` para "${q}"` : ""}.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((m) => {
              const fueraDeEstado = m.estado !== "Operativo";
              const disponible = !fueraDeEstado && !m.en_uso;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => pickMachine(m)}
                  className={cn(
                    "text-left rounded-2xl border border-border bg-card overflow-hidden cursor-pointer",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    disponible ? "hover:border-primary/40 hover:shadow-lg" : "cursor-not-allowed",
                  )}
                >
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    <MachineImage
                      url={m.foto_url}
                      name={m.nombre}
                      className={cn(
                        "h-full w-full",
                        !disponible && "grayscale opacity-70",
                      )}
                    />
                    <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
                    {/* En uso pesa más que el estado "Operativo" en el badge — es la
                        información que el alumno necesita para decidir en un vistazo. */}
                    {!fueraDeEstado && m.en_uso ? (
                      <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-warning/95 text-white px-2 py-0.5 text-[9px] font-semibold shadow-sm">
                        <Lock className="h-2.5 w-2.5" /> En uso
                      </span>
                    ) : (
                      <span className={cn("absolute top-2 right-2 rounded-full px-2 py-0.5 text-[9px] font-semibold shadow-sm", estadoPill[m.estado] || "bg-muted text-muted-foreground")}>
                        {m.estado}
                      </span>
                    )}
                    <span className="absolute bottom-1.5 left-2.5 font-mono text-[11px] font-bold text-white drop-shadow-sm">
                      {m.codigo}
                    </span>
                    {!disponible && (
                      <div className="absolute inset-0 grid place-items-center backdrop-blur-[1px] bg-background/30">
                        {!fueraDeEstado && m.en_uso && m.uso_libre_en ? (
                          <span className="flex flex-col items-center gap-0.5 rounded-md bg-background/90 border border-border px-2.5 py-1.5 text-foreground shadow">
                            <span className="flex items-center gap-1 text-[10px] font-semibold">
                              <Timer className="h-3 w-3" /> Libre a las {fmtHora(m.uso_libre_en)}
                            </span>
                            <span className="text-[9px] text-muted-foreground">en {minutosRestantes(m.uso_libre_en)} min</span>
                          </span>
                        ) : (
                          <span className="rounded-md bg-background/90 border border-border px-2.5 py-1 text-[10px] font-semibold text-foreground shadow">
                            No disponible
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <div className="text-[13px] font-semibold text-foreground truncate leading-tight">{m.nombre}</div>
                    {m.area && <div className="text-[10.5px] text-muted-foreground truncate mt-0.5">{m.area}</div>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>

      <footer className="border-t border-border py-4">
        <div className="mx-auto max-w-6xl px-4 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5" />
          {institucion?.nombre || "MantePro"} · Autoregistro de uso de máquinas
        </div>
      </footer>

      {/* ── Modal 1: formulario de registro ──
          Layout de dos paneles: la foto de la máquina queda fija a la
          izquierda (arriba, apilada, en pantallas angostas) y el formulario
          va a la derecha. Al registrar con éxito, ESTE modal se cierra y se
          abre el modal de confirmación de abajo — son dos ventanas distintas,
          no un cambio de contenido dentro de la misma. */}
      <Dialog open={!!selected && phase === "form"} onOpenChange={(o) => { if (!o) volverAlInicio(); }}>
        <DialogContent className="max-w-md md:max-w-3xl p-0 gap-0 overflow-hidden rounded-2xl border-border/60 shadow-2xl">
          {selected && (
            <div className="flex flex-col md:flex-row md:max-h-[88vh]">
              {/* ── Panel izquierdo (arriba en mobile): foto + ficha de la máquina ── */}
              <div className="relative shrink-0 h-48 md:h-auto md:w-[38%] overflow-hidden bg-neutral-900">
                {selected.foto_url && (
                  <img
                    src={selected.foto_url}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover scale-110 blur-2xl opacity-40"
                  />
                )}
                <MachineImage
                  url={selected.foto_url}
                  name={selected.nombre}
                  className="relative h-full w-full object-contain p-3"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/25 md:bg-gradient-to-t md:from-black/85 md:via-black/25 md:to-black/10" />
                <span className="absolute left-3 top-3 rounded-full bg-success/90 text-white px-2 py-0.5 text-[9px] font-semibold shadow-sm">
                  {selected.estado}
                </span>
                <div className="absolute bottom-0 left-0 right-0 p-3.5 text-white">
                  <div className="font-mono text-[11px] font-bold opacity-90">{selected.codigo}</div>
                  <div className="text-base font-semibold leading-tight">{selected.nombre}</div>
                  {(selected.marca || selected.modelo) && (
                    <div className="text-[11px] text-white/75 mt-0.5 truncate">
                      {[selected.marca, selected.modelo].filter(Boolean).join(" · ")}
                    </div>
                  )}
                  {selected.area && (
                    <span className="hidden md:inline-flex mt-2 rounded-full bg-white/15 backdrop-blur-sm px-2 py-0.5 text-[10px] font-medium">
                      {selected.area}
                    </span>
                  )}
                </div>
              </div>

              {/* ── Panel derecho (abajo en mobile): formulario, compacto para que quepa sin scroll ── */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-5 space-y-3">
                <div>
                  <Label className="text-[11px] text-primary font-semibold mb-1 flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5" /> ¿Quién va a usar la máquina?
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["Alumno", "Externo"] as TipoOperador[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTipo(t)}
                        className={cn(
                          "h-9 rounded-lg border text-[13px] font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          tipo === t ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border text-muted-foreground hover:bg-secondary/50",
                        )}
                      >
                        {t === "Alumno" ? <GraduationCap className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
                        {t === "Alumno" ? "Soy alumno" : "Persona externa"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <IconField icon={UserRound} label="Nombres" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Juan" />
                  <IconField icon={UserRound} label="Apellidos" value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Pérez García" />
                </div>

                <div className={cn("grid gap-2.5", tipo === "Alumno" ? "grid-cols-2" : "grid-cols-1")}>
                  <IconField
                    icon={IdCard} label="DNI" value={dni} maxLength={15}
                    onChange={(e) => setDni(e.target.value.replace(/[^0-9A-Za-z]/g, ""))}
                    placeholder="12345678"
                  />
                  {tipo === "Alumno" && (
                    <IconField icon={IdCard} label="Código de estudiante" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="2021123456" />
                  )}
                </div>

                {tipo === "Alumno" && (
                  <div>
                    <Label className="text-xs">Facultad</Label>
                    <div className="mt-1">
                      <FacultyCombobox value={facultad} onChange={setFacultad} variant="field" />
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-[11px] flex items-center gap-1.5 mb-1">
                    <Clock className="h-3.5 w-3.5" /> ¿Cuánto tiempo la vas a usar?
                  </Label>
                  <div className="flex flex-nowrap gap-1 overflow-x-auto">
                    {DURACIONES.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setHoras(h)}
                        className={cn(
                          "h-9 min-w-[38px] shrink-0 px-1.5 rounded-lg border text-[11px] font-mono font-semibold transition-all cursor-pointer",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          horas === h ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border text-muted-foreground hover:bg-secondary/50",
                        )}
                      >
                        {h}h
                      </button>
                    ))}
                  </div>
                  <p className="text-[10.5px] text-muted-foreground mt-1">
                    Se registra con la hora actual. Fin estimado: {new Date(Date.now() + horas * 3600000).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>

                {/* Observaciones: oculta por defecto (divulgación progresiva) para
                    que el formulario entre completo sin scroll en el caso común. */}
                {showObs ? (
                  <div>
                    <Label className="text-[11px]">Observaciones (opcional)</Label>
                    <Textarea
                      rows={2}
                      autoFocus
                      className="mt-1 text-sm"
                      placeholder="Algo que el encargado deba saber…"
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowObs(true)}
                    className="text-[11.5px] text-primary hover:underline cursor-pointer"
                  >
                    + Añadir una observación (opcional)
                  </button>
                )}

                <button
                  onClick={submit}
                  disabled={submitting}
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.99] transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm cursor-pointer mt-1"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {submitting ? "Registrando…" : "Registrar e iniciar uso"}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal 2: confirmación de éxito — ventana independiente de la del formulario ── */}
      <Dialog open={phase === "success" && !!result} onOpenChange={(o) => { if (!o) volverAlInicio(); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          {selected && result && (
            <div className="text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/15 text-success mb-4">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <h2 className="text-lg font-bold tracking-tight">¡Registro exitoso!</h2>
              <p className="text-sm text-muted-foreground mt-1.5">
                Quedó registrado el uso de <span className="font-semibold text-foreground">{selected.nombre}</span> por{" "}
                <span className="font-semibold text-foreground">{result.horas}h</span>.
              </p>

              <div className="mt-5 w-full rounded-xl border border-border bg-card p-4 text-left">
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>Ciclo de uso acumulado</span>
                  <span className="font-mono font-semibold text-foreground">
                    {result.horasAcumuladas.toFixed(1)}h / {result.umbral || "—"}h
                  </span>
                </div>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(result.umbral ? (result.horasAcumuladas / result.umbral) * 100 : 0, 100)}
                  color={result.alerta === "critical" ? "error" : result.alerta === "warning" ? "warning" : "success"}
                  sx={{ height: 6 }}
                />
                {result.alerta !== "normal" && (
                  <div className={cn(
                    "mt-3 flex items-start gap-2 rounded-md p-2.5 text-xs",
                    result.alerta === "critical" ? "bg-critical/10 text-critical" : "bg-warning/10 text-warning",
                  )}>
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      {result.alerta === "critical"
                        ? "Esta máquina superó su ciclo de mantenimiento. Avisa al encargado del taller."
                        : "Esta máquina está por alcanzar su ciclo de mantenimiento."}
                    </span>
                  </div>
                )}
              </div>

              <button
                onClick={volverAlInicio}
                className="mt-5 w-full inline-flex items-center justify-center gap-2 h-12 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.99] transition-all cursor-pointer shadow-sm"
              >
                <RotateCcw className="h-4 w-4" /> Volver al inicio
              </button>
              <p className="text-[11px] text-muted-foreground mt-2.5">Esta ventana se cerrará sola en unos segundos…</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
