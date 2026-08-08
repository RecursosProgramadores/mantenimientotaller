-- ============================================================================================
--  MANTEPRO — SISTEMA DE GESTIÓN DE MANTENIMIENTO INDUSTRIAL
--  Base de datos consolidada, limpia y profesional para PostgreSQL / Supabase
--
--  Reemplaza:
--    - supabase/migrations/001_initial_schema.sql
--    - todos los patch_*.cjs / rewrite*.cjs sueltos del repositorio (ninguno de ellos
--      modificaba la base de datos; solo parcheaban el frontend a golpes. Con este
--      script la base de datos queda completa y el frontend (src/context/MantePro.tsx,
--      src/context/AuthContext.tsx) habla directo contra ella sin necesitar más parches).
--
--  Diseñado leyendo el código real (context, rutas y componentes) para que columnas,
--  nombres y valores de los ENUM coincidan EXACTAMENTE con lo que la app ya envía y lee.
--
--  Seguro de re-ejecutar: usa CREATE TYPE/TABLE ... IF NOT EXISTS y DROP ... IF EXISTS
--  antes de recrear triggers/policies, así que puede correrse varias veces sin romper nada.
-- ============================================================================================


-- ============================================================================================
-- SECCIÓN 0 — EXTENSIONES
-- ============================================================================================
create extension if not exists pgcrypto;


-- ============================================================================================
-- SECCIÓN 1 — TIPOS ENUMERADOS
--  (antes eran TEXT + CHECK sueltos; con ENUM el motor valida y documenta los valores
--   posibles, y coinciden 1:1 con los literales que usa la interfaz)
-- ============================================================================================
do $$ begin
  create type user_role as enum ('Admin', 'Supervisor', 'Tecnico', 'Operador');
exception when duplicate_object then null; end $$;

do $$ begin
  -- OJO: "En Revisión" lleva tilde porque así lo envía MachineFormDialog.tsx.
  -- (la migración anterior usaba "En Revision" sin tilde => todo update a ese estado fallaba)
  create type machine_status as enum ('Operativo', 'En Revisión', 'En Taller', 'Fuera de Servicio');
exception when duplicate_object then null; end $$;

do $$ begin
  create type criticality_level as enum ('Alto', 'Medio', 'Bajo');
exception when duplicate_object then null; end $$;

do $$ begin
  -- "A condición" con tilde, igual que tipos-mantenimiento.tsx
  create type maintenance_frequency as enum ('Diario', 'Semanal', 'Mensual', 'Semestral', 'Anual', 'A condición');
exception when duplicate_object then null; end $$;

do $$ begin
  create type maintenance_category as enum ('Preventivo', 'Correctivo', 'Predictivo');
exception when duplicate_object then null; end $$;

do $$ begin
  create type otm_status as enum ('Programado', 'En Proceso', 'Completado', 'Cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type component_state as enum ('Bueno', 'Regular', 'Deteriorado', 'Requiere cambio');
exception when duplicate_object then null; end $$;

do $$ begin
  create type turno_type as enum ('Mañana', 'Tarde', 'Noche', 'Tiempo completo', 'Variable');
exception when duplicate_object then null; end $$;

do $$ begin
  create type workshop_problem_type as enum
    ('Falla eléctrica', 'Falla mecánica', 'Desgaste de componentes', 'Calibración', 'Reparación mayor', 'Otro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type workshop_status as enum ('En Taller', 'Devuelto', 'Cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type workshop_condition as enum ('Operativo con fallas', 'No operativo', 'Parcialmente operativo');
exception when duplicate_object then null; end $$;

do $$ begin
  -- Valores SIN tilde a propósito: son los que MantePro.tsx normaliza y realmente
  -- inserta en `documentos.categoria` (ver addMachineDocuments).
  create type doc_category as enum
    ('Diagnostico', 'Manual', 'Presupuesto', 'Fotografia', 'Certificado', 'Factura', 'Informe', 'Otro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type as enum ('warning', 'critical', 'reminder', 'reset');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_action as enum ('crear_otm', 'ver_historial', 'programar_otm');
exception when duplicate_object then null; end $$;


-- ============================================================================================
-- SECCIÓN 2 — INSTITUCIÓN, ÁREAS Y USUARIOS
-- ============================================================================================

create table if not exists instituciones (
    id                      uuid primary key default gen_random_uuid(),
    nombre                  text not null,
    logo_url                text,
    direccion               text,
    notify_days_before      integer not null default 7,
    mtbf_goal_h             numeric not null default 500,
    availability_goal_pct   numeric not null default 95,
    -- Guarda de "singleton": la app es de una sola institución. Esta columna,
    -- siempre en `true`, más el índice único de abajo, hace imposible insertar
    -- una segunda fila (evita que `updateSettings()` cree filas duplicadas por
    -- una condición de carrera, que causaba que el logo "desapareciera" al
    -- recargar porque la app leía una fila distinta cada vez).
    singleton               boolean not null default true check (singleton),
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now()
);
create unique index if not exists instituciones_singleton_uk on instituciones (singleton);
comment on table instituciones is 'Datos de la institución/taller y metas de KPIs (mapea AppSettings). Restringida a una sola fila mediante instituciones_singleton_uk.';

create table if not exists areas (
    id              uuid primary key default gen_random_uuid(),
    institucion_id  uuid references instituciones(id) on delete cascade,
    nombre          text not null,
    descripcion     text
);

create table if not exists usuarios (
    id              uuid primary key default gen_random_uuid(),
    institucion_id  uuid references instituciones(id) on delete cascade,
    auth_user_id    uuid unique references auth.users(id) on delete set null,
    nombre          text not null,
    email           text unique not null,
    rol             user_role not null default 'Operador',
    area            text,
    telefono        text,
    activo          boolean not null default true,
    avatar_url      text,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);
comment on table usuarios is 'Perfil de aplicación ligado 1:1 a auth.users vía auth_user_id.';


-- ============================================================================================
-- SECCIÓN 3 — CONFIGURACIÓN DE MANTENIMIENTO
-- ============================================================================================

create table if not exists tipos_mantenimiento (
    id              uuid primary key default gen_random_uuid(),
    institucion_id  uuid references instituciones(id) on delete cascade,
    nombre          text not null,
    color           text,
    categoria       maintenance_category not null default 'Preventivo',
    frecuencia      maintenance_frequency not null,
    duracion_min    integer,
    descripcion     text,
    activo          boolean not null default true,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create table if not exists actividades_tipo (
    id           uuid primary key default gen_random_uuid(),
    tipo_id      uuid references tipos_mantenimiento(id) on delete cascade,
    descripcion  text not null,
    duracion_min integer,
    responsable  text,
    orden        integer
);


-- ============================================================================================
-- SECCIÓN 4 — MÁQUINAS Y ACTIVOS
-- ============================================================================================

create table if not exists maquinas (
    id                      uuid primary key default gen_random_uuid(),
    area_id                 uuid references areas(id) on delete set null,
    institucion_id          uuid references instituciones(id) on delete cascade,
    codigo                  text unique not null,
    codigo_patrimonial      text unique not null,
    nombre                  text not null,
    marca                   text,
    modelo                  text,
    departamento            text,
    numero_serie            text,
    anio_fabricacion        integer,
    anio_adquisicion        integer,
    costo                   numeric,
    estado                  machine_status not null default 'Operativo',
    criticidad              criticality_level not null default 'Medio',
    potencia_kw             numeric,
    voltaje_v               numeric,
    frecuencia_hz           numeric,
    peso_kg                 numeric,
    foto_url                text,
    observaciones           text,
    umbral_horas_ciclo      numeric not null default 30,
    umbral_dias_maximos     integer not null default 7,
    umbral_alerta_pct       integer not null default 80 check (umbral_alerta_pct between 10 and 90),
    turno_operacion         turno_type,
    dias_operacion          text[] default '{}',
    activo                  boolean not null default true,
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now()
);
comment on column maquinas.activo is 'Baja lógica: permite implementar deleteMachine sin perder historial de OTMs/documentos.';

create table if not exists maquina_tipos_mantenimiento (
    maquina_id uuid references maquinas(id) on delete cascade,
    tipo_id    uuid references tipos_mantenimiento(id) on delete cascade,
    primary key (maquina_id, tipo_id)
);

create table if not exists maquina_operadores (
    maquina_id uuid references maquinas(id) on delete cascade,
    usuario_id uuid references usuarios(id) on delete cascade,
    primary key (maquina_id, usuario_id)
);

create table if not exists componentes_criticos (
    id          uuid primary key default gen_random_uuid(),
    maquina_id  uuid references maquinas(id) on delete cascade,
    numero      integer,
    nombre      text not null,
    funcion     text,
    estado      component_state not null default 'Bueno',
    criticidad  criticality_level not null default 'Medio',
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);


-- ============================================================================================
-- SECCIÓN 5 — CICLOS Y REGISTROS DE USO
-- ============================================================================================

create table if not exists uso_ciclos (
    id                 uuid primary key default gen_random_uuid(),
    maquina_id         uuid unique references maquinas(id) on delete cascade,
    horas_acumuladas   numeric not null default 0,
    start_at           timestamptz not null default now(),
    ultimo_reset       timestamptz not null default now(),
    otm_ref            uuid, -- FK diferida a ordenes_trabajo, se agrega más abajo
    created_at         timestamptz not null default now(),
    updated_at         timestamptz not null default now()
);
comment on column uso_ciclos.start_at is 'Nombrada start_at (no iniciado_en) para calzar con MantePro.tsx: u.start_at -> iniciadoEn.';
comment on column uso_ciclos.otm_ref is 'Nombrada otm_ref (no otm_ref_id) para calzar con MantePro.tsx: u.otm_ref -> otmRef.';

create table if not exists uso_logs (
    id               uuid primary key default gen_random_uuid(),
    maquina_id       uuid references maquinas(id) on delete cascade,
    ciclo_id         uuid references uso_ciclos(id) on delete cascade,
    operador         text,
    usuario_id       uuid references usuarios(id) on delete set null,
    start_at         timestamptz not null,
    end_at           timestamptz not null,
    horas            numeric check (horas > 0),
    turno            turno_type,
    observaciones    text,
    registrado_por   uuid references usuarios(id) on delete set null,
    created_at       timestamptz not null default now(),
    constraint check_fechas check (end_at > start_at)
);


-- ============================================================================================
-- SECCIÓN 6 — ÓRDENES DE TRABAJO (OTM)
-- ============================================================================================

create table if not exists ordenes_trabajo (
    id                     uuid primary key default gen_random_uuid(),
    maquina_id             uuid references maquinas(id) on delete cascade,
    tipo_id                uuid references tipos_mantenimiento(id) on delete set null,
    tecnico_id             uuid references usuarios(id) on delete set null, -- opcional: enlace a un usuario real del sistema, si existe
    supervisor_id          uuid references usuarios(id) on delete set null, -- opcional: enlace a un usuario real del sistema, si existe
    tecnico_nombre         text, -- nombre del técnico tal cual se escribió en el formulario (fuente de verdad para mostrar; no depende de que exista un usuario con ese nombre)
    supervisor_nombre      text, -- nombre del supervisor tal cual se escribió en el formulario (misma razón que tecnico_nombre)
    numero_otm             text unique not null,
    fecha_programada       date,
    hora_inicio            time,
    hora_fin               time,
    area                   text, -- área/ubicación de la máquina al momento de la OTM (MaintenanceRecord.area)
    estado                 otm_status not null default 'Programado',
    estado_post_maquina    text, -- texto libre (MaintenanceFormDialog no restringe valores)
    proximo_mantenimiento  date,
    proximo_tipo_id        uuid references tipos_mantenimiento(id) on delete set null,
    observaciones          text, -- notas durante el trabajo (MaintenanceRecord.notes)
    hallazgos              text, -- hallazgos de cierre (MaintenanceRecord.findings)
    firma_tecnico          text,
    firma_supervisor       text,
    costo_repuestos        numeric not null default 0,
    costo_mano_obra        numeric not null default 0,
    costo_total            numeric generated always as (costo_repuestos + costo_mano_obra) stored,
    created_at             timestamptz not null default now(),
    updated_at             timestamptz not null default now()
);

-- FK diferida ahora que ordenes_trabajo existe
alter table uso_ciclos drop constraint if exists fk_ciclo_otm;
alter table uso_ciclos add constraint fk_ciclo_otm foreign key (otm_ref) references ordenes_trabajo(id) on delete set null;

create table if not exists actividades_otm (
    id                  uuid primary key default gen_random_uuid(),
    orden_id            uuid references ordenes_trabajo(id) on delete cascade,
    actividad_tipo_id   uuid references actividades_tipo(id) on delete set null,
    descripcion         text not null,
    completada          boolean not null default false,
    observaciones       text,
    orden               integer
);

create table if not exists repuestos_otm (
    id               uuid primary key default gen_random_uuid(),
    orden_id         uuid references ordenes_trabajo(id) on delete cascade,
    nombre           text not null,
    cantidad         integer not null,
    costo_unitario   numeric not null,
    subtotal         numeric generated always as (cantidad * costo_unitario) stored
);


-- ============================================================================================
-- SECCIÓN 7 — TALLERES EXTERNOS
-- ============================================================================================

create table if not exists talleres_externos (
    id              uuid primary key default gen_random_uuid(),
    institucion_id  uuid references instituciones(id) on delete cascade,
    nombre          text not null,
    direccion       text,
    especialidad    text,
    telefono        text,
    contacto        text,
    email           text,
    rating          integer check (rating between 1 and 5),
    activo          boolean not null default true,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);
comment on column talleres_externos.especialidad is
  'Columna separada de "direccion" (antes se pisaban entre sí, ver patch_workshops_specialty*.cjs).';

create table if not exists envios_taller (
    id                     uuid primary key default gen_random_uuid(),
    maquina_id             uuid references maquinas(id) on delete cascade,
    taller_id              uuid references talleres_externos(id) on delete set null,
    autorizado_por         uuid references usuarios(id) on delete set null,
    fecha_envio            date not null default current_date,
    fecha_retorno_est      date,
    fecha_retorno_real     date,
    tipo_problema          workshop_problem_type,
    descripcion_problema   text,
    condicion_envio        workshop_condition,
    estado                 workshop_status not null default 'En Taller',
    presupuesto            numeric,
    costo_final            numeric,
    resumen_trabajos       text,
    rating                 integer check (rating between 1 and 5),
    created_at             timestamptz not null default now(),
    updated_at             timestamptz not null default now()
);
comment on table envios_taller is 'Historial de envíos de máquinas a talleres externos (pantalla talleres-externos.$id).';

create table if not exists componentes_afectados (
    envio_id        uuid references envios_taller(id) on delete cascade,
    componente_id   uuid references componentes_criticos(id) on delete cascade,
    primary key (envio_id, componente_id)
);

create table if not exists seguimiento_taller (
    id          uuid primary key default gen_random_uuid(),
    envio_id    uuid references envios_taller(id) on delete cascade,
    usuario_id  uuid references usuarios(id) on delete set null,
    estado_nuevo text,
    nota        text,
    fecha       timestamptz not null default now()
);


-- ============================================================================================
-- SECCIÓN 8 — DOCUMENTOS
-- ============================================================================================

create table if not exists documentos (
    id               uuid primary key default gen_random_uuid(),
    envio_id         uuid references envios_taller(id) on delete cascade,
    orden_id         uuid references ordenes_trabajo(id) on delete cascade,
    maquina_id       uuid references maquinas(id) on delete cascade,
    nombre_archivo   text not null,
    url              text not null,
    categoria        doc_category,
    tipo_mime        text,
    tamanio_bytes    integer,
    descripcion      text,
    subido_por       uuid references usuarios(id) on delete set null,
    uploaded_at      timestamptz not null default now(),
    constraint has_parent check (envio_id is not null or orden_id is not null or maquina_id is not null)
);


-- ============================================================================================
-- SECCIÓN 9 — NOTIFICACIONES
-- ============================================================================================

create table if not exists notificaciones (
    id           uuid primary key default gen_random_uuid(),
    maquina_id   uuid references maquinas(id) on delete cascade,
    usuario_id   uuid references usuarios(id) on delete cascade,
    tipo         notification_type not null,
    titulo       text not null,
    mensaje      text not null,
    leida        boolean not null default false,
    accion_tipo  notification_action,
    created_at   timestamptz not null default now()
);
comment on column notificaciones.usuario_id is
  'Hoy la app no lo llena (notificaciones son globales, no por usuario). Queda listo para cuando se filtren por destinatario.';


-- ============================================================================================
-- SECCIÓN 10 — KPIs Y REPORTES
-- ============================================================================================

create table if not exists kpis_maquina (
    id                    uuid primary key default gen_random_uuid(),
    maquina_id            uuid references maquinas(id) on delete cascade,
    anio                  integer not null,
    mes                   integer not null check (mes between 1 and 12),
    mtbf_horas            numeric,
    mttr_horas            numeric,
    disponibilidad_pct    numeric,
    cumplimiento_mp_pct   numeric,
    costo_periodo         numeric not null default 0,
    fallas_count          integer not null default 0,
    calculated_at         timestamptz not null default now(),
    unique (maquina_id, anio, mes)
);
comment on table kpis_maquina is 'Se recalcula automáticamente al completar una OTM (ver trigger tg_recalcular_kpis).';


-- ============================================================================================
-- SECCIÓN 11 — CATÁLOGO DE REPUESTOS
-- ============================================================================================

create table if not exists repuestos_catalogo (
    id               uuid primary key default gen_random_uuid(),
    institucion_id   uuid references instituciones(id) on delete cascade,
    nombre           text not null,
    referencia       text,
    proveedor        text,
    precio           numeric not null default 0,
    stock_minimo     integer not null default 0,
    stock_actual     integer not null default 0,
    created_at       timestamptz not null default now(),
    updated_at       timestamptz not null default now()
);


-- ============================================================================================
-- SECCIÓN 12 — ÍNDICES
-- ============================================================================================

create index if not exists idx_maquinas_area on maquinas(area_id);
create index if not exists idx_maquinas_estado on maquinas(estado);
create index if not exists idx_maquinas_institucion on maquinas(institucion_id);
create index if not exists idx_maquinas_activo on maquinas(activo);

create index if not exists idx_otm_maquina on ordenes_trabajo(maquina_id);
create index if not exists idx_otm_estado on ordenes_trabajo(estado);
create index if not exists idx_otm_fecha on ordenes_trabajo(fecha_programada);
create index if not exists idx_otm_tecnico on ordenes_trabajo(tecnico_id);

create index if not exists idx_usologs_maquina on uso_logs(maquina_id);
create index if not exists idx_usologs_start on uso_logs(start_at);

create index if not exists idx_notif_usuario on notificaciones(usuario_id);
create index if not exists idx_notif_leida on notificaciones(leida);
create index if not exists idx_notif_maquina on notificaciones(maquina_id);

create index if not exists idx_envios_maquina on envios_taller(maquina_id);
create index if not exists idx_envios_taller on envios_taller(taller_id);
create index if not exists idx_envios_estado on envios_taller(estado);

create index if not exists idx_kpis_maquina_fecha on kpis_maquina(maquina_id, anio, mes);
create index if not exists idx_compcriticos_maquina on componentes_criticos(maquina_id);

create index if not exists idx_doc_orden on documentos(orden_id);
create index if not exists idx_doc_envio on documentos(envio_id);
create index if not exists idx_doc_maquina on documentos(maquina_id);

create index if not exists idx_usuarios_auth on usuarios(auth_user_id);
create index if not exists idx_usuarios_institucion on usuarios(institucion_id);


-- ============================================================================================
-- SECCIÓN 13 — FUNCIONES Y TRIGGERS (la lógica de negocio vive en la BD)
-- ============================================================================================

-- 13.1 updated_at automático -----------------------------------------------------------------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tg_instituciones_updated_at on instituciones;
create trigger tg_instituciones_updated_at before update on instituciones for each row execute function set_updated_at();

drop trigger if exists tg_usuarios_updated_at on usuarios;
create trigger tg_usuarios_updated_at before update on usuarios for each row execute function set_updated_at();

drop trigger if exists tg_tipos_updated_at on tipos_mantenimiento;
create trigger tg_tipos_updated_at before update on tipos_mantenimiento for each row execute function set_updated_at();

drop trigger if exists tg_maquinas_updated_at on maquinas;
create trigger tg_maquinas_updated_at before update on maquinas for each row execute function set_updated_at();

drop trigger if exists tg_componentes_updated_at on componentes_criticos;
create trigger tg_componentes_updated_at before update on componentes_criticos for each row execute function set_updated_at();

drop trigger if exists tg_ciclos_updated_at on uso_ciclos;
create trigger tg_ciclos_updated_at before update on uso_ciclos for each row execute function set_updated_at();

drop trigger if exists tg_otm_updated_at on ordenes_trabajo;
create trigger tg_otm_updated_at before update on ordenes_trabajo for each row execute function set_updated_at();

drop trigger if exists tg_talleres_updated_at on talleres_externos;
create trigger tg_talleres_updated_at before update on talleres_externos for each row execute function set_updated_at();

drop trigger if exists tg_envios_updated_at on envios_taller;
create trigger tg_envios_updated_at before update on envios_taller for each row execute function set_updated_at();

drop trigger if exists tg_repuestos_updated_at on repuestos_catalogo;
create trigger tg_repuestos_updated_at before update on repuestos_catalogo for each row execute function set_updated_at();


-- 13.2 Alta automática de usuario al registrarse en Supabase Auth ---------------------------
-- Soluciona el "fallback Operador" de AuthContext.tsx: si ya existe un usuario precreado
-- con ese email (por ejemplo, dado de alta desde Configuración), se enlaza; si no existe,
-- se crea uno nuevo con rol Operador por defecto.
create or replace function handle_new_auth_user() returns trigger as $$
begin
  update usuarios set auth_user_id = new.id
   where email = new.email and auth_user_id is null;

  if not found then
    insert into usuarios (auth_user_id, nombre, email, rol, activo)
    values (new.id, split_part(new.email, '@', 1), new.email, 'Operador', true);
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists tg_on_auth_user_created on auth.users;
create trigger tg_on_auth_user_created after insert on auth.users for each row execute function handle_new_auth_user();


-- 13.3 Acumular horas de uso al registrar un uso_log -----------------------------------------
create or replace function acumular_horas_uso() returns trigger as $$
begin
  insert into uso_ciclos (maquina_id, horas_acumuladas)
  values (new.maquina_id, new.horas)
  on conflict (maquina_id) do update
    set horas_acumuladas = uso_ciclos.horas_acumuladas + excluded.horas_acumuladas,
        updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists tg_acumular_horas on uso_logs;
create trigger tg_acumular_horas after insert on uso_logs for each row execute function acumular_horas_uso();


-- 13.4 Notificación automática al cruzar el umbral de uso ------------------------------------
-- Antes esta lógica vivía solo en el frontend (MantePro.addUsageLog); ahora también
-- corre en la base de datos, así cualquier cliente que escriba en uso_ciclos la dispara.
create or replace function notificar_umbral_uso() returns trigger as $$
declare
  m maquinas%rowtype;
  pct numeric;
  tipo_alerta notification_type;
begin
  select * into m from maquinas where id = new.maquina_id;
  if not found or m.umbral_horas_ciclo is null or m.umbral_horas_ciclo <= 0 then
    return new;
  end if;

  pct := (new.horas_acumuladas / m.umbral_horas_ciclo) * 100;

  if pct >= 100 then
    tipo_alerta := 'critical';
  elsif pct >= m.umbral_alerta_pct then
    tipo_alerta := 'warning';
  else
    return new;
  end if;

  if not exists (
    select 1 from notificaciones
    where maquina_id = m.id and tipo = tipo_alerta and leida = false
  ) then
    insert into notificaciones (maquina_id, tipo, titulo, mensaje, accion_tipo)
    values (
      m.id,
      tipo_alerta,
      case when tipo_alerta = 'critical'
        then 'Mantenimiento requerido - ' || m.codigo
        else 'Mantenimiento próximo - ' || m.codigo end,
      case when tipo_alerta = 'critical'
        then format('La máquina %s ha superado su ciclo de uso (%s h / %s h). Programar mantenimiento urgente.',
                     m.nombre, round(new.horas_acumuladas, 2), m.umbral_horas_ciclo)
        else format('La máquina %s ha alcanzado el %s%% de su ciclo de uso (%s h / %s h).',
                     m.nombre, round(pct, 1), round(new.horas_acumuladas, 2), m.umbral_horas_ciclo) end,
      case when tipo_alerta = 'critical' then 'crear_otm' else 'programar_otm' end
    );
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists tg_notificar_umbral on uso_ciclos;
create trigger tg_notificar_umbral after insert or update of horas_acumuladas on uso_ciclos
  for each row execute function notificar_umbral_uso();


-- 13.5 Reset del ciclo y sincronización de estado al completar una OTM -----------------------
create or replace function reset_ciclo_on_otm_complete() returns trigger as $$
begin
  if new.estado = 'Completado' and (old.estado is distinct from 'Completado') then
    update uso_ciclos
       set horas_acumuladas = 0, ultimo_reset = now(), start_at = now(), otm_ref = new.id
     where maquina_id = new.maquina_id;

    -- estado_post_maquina es texto libre; solo sincroniza maquinas.estado si calza
    -- exactamente con uno de los valores válidos del enum machine_status.
    if new.estado_post_maquina is not null
       and new.estado_post_maquina = any (enum_range(null::machine_status)::text[]) then
      update maquinas set estado = new.estado_post_maquina::machine_status where id = new.maquina_id;
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists tg_reset_ciclo on ordenes_trabajo;
create trigger tg_reset_ciclo after update on ordenes_trabajo for each row execute function reset_ciclo_on_otm_complete();


-- 13.6 Numeración automática de OTM (red de seguridad; el frontend ya la calcula) ------------
create or replace function generar_numero_otm() returns trigger as $$
declare
  anio_actual text := to_char(now(), 'YYYY');
  siguiente int;
begin
  if new.numero_otm is null or new.numero_otm = '' then
    select count(*) + 1 into siguiente
      from ordenes_trabajo
     where numero_otm like 'OTM-' || anio_actual || '-%';
    new.numero_otm := 'OTM-' || anio_actual || '-' || lpad(siguiente::text, 3, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists tg_generar_numero_otm on ordenes_trabajo;
create trigger tg_generar_numero_otm before insert on ordenes_trabajo for each row execute function generar_numero_otm();


-- 13.7 Recalcular KPIs del mes al completar una OTM ------------------------------------------
create or replace function recalcular_kpis_maquina(p_maquina_id uuid, p_anio int, p_mes int) returns void as $$
declare
  v_costo numeric;
  v_fallas int;
  v_programadas int;
  v_completadas_prev int;
  v_cumplimiento numeric;
  v_mttr numeric;
begin
  select coalesce(sum(costo_total), 0) into v_costo
    from ordenes_trabajo
   where maquina_id = p_maquina_id and estado = 'Completado'
     and extract(year from fecha_programada) = p_anio and extract(month from fecha_programada) = p_mes;

  select count(*) into v_fallas
    from ordenes_trabajo o join tipos_mantenimiento t on t.id = o.tipo_id
   where o.maquina_id = p_maquina_id and o.estado = 'Completado' and t.categoria = 'Correctivo'
     and extract(year from o.fecha_programada) = p_anio and extract(month from o.fecha_programada) = p_mes;

  select count(*) filter (where o.estado = 'Programado' or o.estado = 'Completado'),
         count(*) filter (where o.estado = 'Completado')
    into v_programadas, v_completadas_prev
    from ordenes_trabajo o join tipos_mantenimiento t on t.id = o.tipo_id
   where o.maquina_id = p_maquina_id and t.categoria = 'Preventivo'
     and extract(year from o.fecha_programada) = p_anio and extract(month from o.fecha_programada) = p_mes;

  v_cumplimiento := case when v_programadas > 0 then (v_completadas_prev::numeric / v_programadas) * 100 else null end;

  select avg(extract(epoch from (hora_fin - hora_inicio)) / 3600.0) into v_mttr
    from ordenes_trabajo
   where maquina_id = p_maquina_id and estado = 'Completado' and hora_inicio is not null and hora_fin is not null
     and extract(year from fecha_programada) = p_anio and extract(month from fecha_programada) = p_mes;

  insert into kpis_maquina (maquina_id, anio, mes, mttr_horas, cumplimiento_mp_pct, costo_periodo, fallas_count, calculated_at)
  values (p_maquina_id, p_anio, p_mes, v_mttr, v_cumplimiento, v_costo, v_fallas, now())
  on conflict (maquina_id, anio, mes) do update
    set mttr_horas = excluded.mttr_horas,
        cumplimiento_mp_pct = excluded.cumplimiento_mp_pct,
        costo_periodo = excluded.costo_periodo,
        fallas_count = excluded.fallas_count,
        calculated_at = now();
end;
$$ language plpgsql;

create or replace function tg_recalcular_kpis_fn() returns trigger as $$
begin
  if new.estado = 'Completado' and (old.estado is distinct from 'Completado') and new.fecha_programada is not null then
    perform recalcular_kpis_maquina(new.maquina_id, extract(year from new.fecha_programada)::int, extract(month from new.fecha_programada)::int);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists tg_recalcular_kpis on ordenes_trabajo;
create trigger tg_recalcular_kpis after update on ordenes_trabajo for each row execute function tg_recalcular_kpis_fn();


-- ============================================================================================
-- SECCIÓN 14 — VISTAS DE CONSULTA RÁPIDA (para reportes / SQL directo)
-- ============================================================================================

create or replace view vista_alertas_maquinas as
select
  m.id as maquina_id, m.codigo, m.nombre, m.estado, m.criticidad,
  c.horas_acumuladas, m.umbral_horas_ciclo,
  round(coalesce(c.horas_acumuladas, 0) / nullif(m.umbral_horas_ciclo, 0) * 100, 1) as pct_uso,
  case
    when coalesce(c.horas_acumuladas, 0) / nullif(m.umbral_horas_ciclo, 0) * 100 >= 100 then 'critical'
    when coalesce(c.horas_acumuladas, 0) / nullif(m.umbral_horas_ciclo, 0) * 100 >= m.umbral_alerta_pct then 'warning'
    else 'normal'
  end as alert_status
from maquinas m
left join uso_ciclos c on c.maquina_id = m.id
where m.activo = true;

create or replace view vista_ordenes_resumen as
select
  o.id, o.numero_otm, o.estado, o.fecha_programada, o.costo_total,
  m.codigo as maquina_codigo, m.nombre as maquina_nombre,
  t.nombre as tipo_nombre, t.categoria as tipo_categoria,
  tec.nombre as tecnico_nombre, sup.nombre as supervisor_nombre
from ordenes_trabajo o
left join maquinas m on m.id = o.maquina_id
left join tipos_mantenimiento t on t.id = o.tipo_id
left join usuarios tec on tec.id = o.tecnico_id
left join usuarios sup on sup.id = o.supervisor_id;


-- ============================================================================================
-- SECCIÓN 15 — ROW LEVEL SECURITY
--  Regla general: cualquier usuario autenticado puede leer/escribir los datos operativos
--  (hoy el frontend no diferencia permisos por rol en la interfaz, así que restringir más
--  aquí rompería la app). Se deja más cerrada solo la gestión de usuarios e institución,
--  reservada a Admin/Supervisor. Ajusta estas políticas cuando el frontend implemente
--  permisos por rol.
-- ============================================================================================

create or replace function es_admin_o_supervisor() returns boolean as $$
  select exists (
    select 1 from usuarios
     where auth_user_id = auth.uid() and rol in ('Admin', 'Supervisor') and activo = true
  );
$$ language sql stable security definer set search_path = public;

do $$
declare
  t text;
  tablas_publicas text[] := array[
    'areas','tipos_mantenimiento','actividades_tipo','maquinas','maquina_tipos_mantenimiento',
    'maquina_operadores','componentes_criticos','uso_ciclos','uso_logs','ordenes_trabajo',
    'actividades_otm','repuestos_otm','talleres_externos','envios_taller','componentes_afectados',
    'seguimiento_taller','documentos','notificaciones','kpis_maquina','repuestos_catalogo'
  ];
begin
  foreach t in array tablas_publicas loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists acceso_autenticado on %I;', t);
    execute format('create policy acceso_autenticado on %I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'');', t);
  end loop;
end
$$;

-- instituciones: lectura abierta a autenticados, escritura solo Admin/Supervisor
alter table instituciones enable row level security;
drop policy if exists instituciones_select on instituciones;
create policy instituciones_select on instituciones for select using (auth.role() = 'authenticated');
drop policy if exists instituciones_write on instituciones;
create policy instituciones_write on instituciones for all
  using (es_admin_o_supervisor()) with check (es_admin_o_supervisor());

-- usuarios: todos los autenticados pueden leer (para listas de técnicos/supervisores);
-- crear/editar/borrar usuarios queda para Admin/Supervisor, salvo que cada quien pueda
-- editar su propio perfil.
alter table usuarios enable row level security;
drop policy if exists usuarios_select on usuarios;
create policy usuarios_select on usuarios for select using (auth.role() = 'authenticated');
drop policy if exists usuarios_insert on usuarios;
create policy usuarios_insert on usuarios for insert with check (es_admin_o_supervisor());
drop policy if exists usuarios_update on usuarios;
create policy usuarios_update on usuarios for update
  using (es_admin_o_supervisor() or auth_user_id = auth.uid())
  with check (es_admin_o_supervisor() or auth_user_id = auth.uid());
drop policy if exists usuarios_delete on usuarios;
create policy usuarios_delete on usuarios for delete using (es_admin_o_supervisor());


-- ============================================================================================
-- SECCIÓN 16 — ALMACENAMIENTO (STORAGE BUCKETS)
-- ============================================================================================

insert into storage.buckets (id, name, public) values ('maquinas-fotos', 'maquinas-fotos', true)
  on conflict (id) do update set public = true;

-- FIX: antes era privado pero el frontend usa getPublicUrl() sobre este bucket
-- (addMachineDocuments), lo que generaba URLs rotas. Se marca público a propósito.
insert into storage.buckets (id, name, public) values ('documentos-otm', 'documentos-otm', true)
  on conflict (id) do update set public = true;

-- Público por la misma razón que documentos-otm: el frontend arma la URL con
-- getPublicUrl() para mostrar/descargar directamente (documentos de talleres externos).
insert into storage.buckets (id, name, public) values ('documentos-taller', 'documentos-taller', true)
  on conflict (id) do update set public = true;

drop policy if exists "maquinas_fotos_public_read" on storage.objects;
create policy "maquinas_fotos_public_read" on storage.objects for select using (bucket_id = 'maquinas-fotos');
drop policy if exists "maquinas_fotos_auth_write" on storage.objects;
create policy "maquinas_fotos_auth_write" on storage.objects for insert to authenticated with check (bucket_id = 'maquinas-fotos');
drop policy if exists "maquinas_fotos_auth_update" on storage.objects;
create policy "maquinas_fotos_auth_update" on storage.objects for update to authenticated using (bucket_id = 'maquinas-fotos');

drop policy if exists "documentos_otm_public_read" on storage.objects;
create policy "documentos_otm_public_read" on storage.objects for select using (bucket_id = 'documentos-otm');
drop policy if exists "documentos_otm_auth_write" on storage.objects;
create policy "documentos_otm_auth_write" on storage.objects for insert to authenticated with check (bucket_id = 'documentos-otm');
drop policy if exists "documentos_otm_auth_delete" on storage.objects;
create policy "documentos_otm_auth_delete" on storage.objects for delete to authenticated using (bucket_id = 'documentos-otm');

drop policy if exists "documentos_taller_public_read" on storage.objects;
create policy "documentos_taller_public_read" on storage.objects for select using (bucket_id = 'documentos-taller');
drop policy if exists "documentos_taller_auth_write" on storage.objects;
create policy "documentos_taller_auth_write" on storage.objects for insert to authenticated with check (bucket_id = 'documentos-taller');
drop policy if exists "documentos_taller_auth_delete" on storage.objects;
create policy "documentos_taller_auth_delete" on storage.objects for delete to authenticated using (bucket_id = 'documentos-taller');


-- ============================================================================================
-- SECCIÓN 17 — DATOS SEMILLA (OPCIONAL)
--  Descomenta este bloque solo si quieres arrancar con datos de ejemplo.
--  Si vas a migrar datos reales existentes, deja esto comentado.
-- ============================================================================================

/*
with inst as (
    insert into instituciones (nombre) values ('Mi Institución de Mantenimiento') returning id
),
ar1 as (insert into areas (institucion_id, nombre) select id, 'Taller Mecánico' from inst returning id),
ar2 as (insert into areas (institucion_id, nombre) select id, 'Taller Eléctrico' from inst returning id),
t1 as (insert into tipos_mantenimiento (institucion_id, nombre, color, categoria, frecuencia, duracion_min)
       select id, 'Preventivo Diario', '#22C55E', 'Preventivo', 'Diario', 30 from inst returning id),
t2 as (insert into tipos_mantenimiento (institucion_id, nombre, color, categoria, frecuencia, duracion_min)
       select id, 'Preventivo Mensual', '#8B5CF6', 'Preventivo', 'Mensual', 120 from inst returning id),
t3 as (insert into tipos_mantenimiento (institucion_id, nombre, color, categoria, frecuencia, duracion_min)
       select id, 'Correctivo', '#EF4444', 'Correctivo', 'A condición', 240 from inst returning id),
maq as (
    insert into maquinas (institucion_id, area_id, codigo, codigo_patrimonial, nombre, marca, modelo,
                           anio_fabricacion, anio_adquisicion, costo, estado, criticidad, potencia_kw,
                           voltaje_v, peso_kg, umbral_horas_ciclo, umbral_dias_maximos, umbral_alerta_pct,
                           turno_operacion, dias_operacion)
    select inst.id, ar1.id, 'FRS-001', 'PAT-001', 'Fresadora/Taladro-Fresadora', 'OPTIMUM', 'ZX7032',
           2014, 2015, 5800, 'Operativo', 'Alto', 1.5, 220, 400, 30, 7, 80, 'Mañana', array['L','M','X','J','V']
    from inst, ar1
    returning id
),
uciclo as (insert into uso_ciclos (maquina_id, horas_acumuladas) select id, 26 from maq returning id),
cc1 as (insert into componentes_criticos (maquina_id, numero, nombre, estado, criticidad)
        select id, 1, 'Correas trapezoidales', 'Regular', 'Alto' from maq returning id)
select 1;
*/


-- ============================================================================================
-- NOTAS FINALES — QUÉ CAMBIÓ Y QUÉ QUEDA PENDIENTE DEL LADO DEL FRONTEND
-- ============================================================================================
-- Corregido en esta base de datos (bugs reales que rompían inserts/updates):
--   1. maquinas.estado ahora acepta "En Revisión" (con tilde), como envía el formulario.
--   2. tipos_mantenimiento.frecuencia ahora acepta "A condición" (con tilde).
--   3. uso_ciclos usa columnas start_at / otm_ref (antes iniciado_en / otm_ref_id),
--      que es como el frontend ya las lee.
--   4. talleres_externos separa "especialidad" de "direccion" (antes se pisaban).
--   5. Bucket documentos-otm pasa a público para que getPublicUrl() sirva URLs válidas.
--   6. Alta automática en `usuarios` cuando alguien se registra en Supabase Auth.
--
-- La base de datos ya soporta el flujo completo de "envío a taller externo" (envios_taller,
-- seguimiento_taller, componentes_afectados) y la edición de tipos de mantenimiento /
-- componentes críticos, pero hoy esas funciones en src/context/MantePro.tsx
-- (addWorkshopRecord, updateType, upsertComponent, deleteMachine, deleteRecord, etc.)
-- son "stubs" que no llaman a Supabase todavía. Eso es código de la aplicación, no de la
-- base de datos — la tabla y los permisos ya están listos para cuando se conecten.
-- ============================================================================================
