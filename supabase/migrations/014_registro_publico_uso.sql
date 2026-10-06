-- ============================================================================================
-- 014 — AUTOREGISTRO PÚBLICO DE USO DE MÁQUINAS (alumnos, sin login)
--
-- Contexto: hoy solo un usuario autenticado puede registrar el uso de una máquina
-- (pantalla Uso de Máquinas del panel). Se necesita una ruta pública
-- (/registro-uso, ver src/routes/registro-uso.tsx) donde el alumno, SIN iniciar
-- sesión, elija una máquina (con foto) de una galería con buscador, indique
-- nombre, apellido, DNI, código de estudiante/facultad y cuánto tiempo la va a
-- usar. El panel admin (Uso de Máquinas) sigue siendo el lugar donde se
-- supervisa todo ese uso.
--
-- Todas las tablas de este esquema tienen RLS "acceso_autenticado" (solo
-- auth.role() = 'authenticated'), así que un visitante anónimo no puede leer
-- `maquinas` ni escribir en `uso_logs` directamente. En vez de abrir esas
-- tablas al rol `anon` (lo que expondría columnas sensibles y permitiría
-- inserts arbitrarios), esta migración expone exactamente dos puertas:
--   1. Dos VISTAS de solo lectura con las columnas mínimas necesarias para la
--      galería pública (maquinas_publico, institucion_publico). Al crearlas
--      como el dueño de las tablas (igual que el resto de las migraciones),
--      leen sin toparse con RLS; solo se les da GRANT SELECT a anon.
--   2. Una función SECURITY DEFINER (registrar_uso_publico) que valida los
--      datos en el servidor y hace el único INSERT permitido en uso_logs.
--      Es la misma lógica que ya usa el panel (turno automático según la
--      hora, el trigger tg_acumular_horas de la migración 002 sigue sumando
--      horas al ciclo y tg_notificar_umbral sigue avisando si se cruza el
--      umbral) — solo que aquí la valida el propio servidor, no el cliente.
-- ============================================================================================


-- ============================================================================================
-- 1) Columnas nuevas en uso_logs — para no seguir empaquetando nombre/DNI/código/facultad
--    dentro de un solo texto libre en `operador` (que se conserva por compatibilidad con
--    los registros antiguos y como resumen legible en pantalla/impresión).
-- ============================================================================================

alter table uso_logs
  add column if not exists tipo_operador  text not null default 'Interno'
    check (tipo_operador in ('Alumno','Externo','Interno')),
  add column if not exists alumno_nombre    text,
  add column if not exists alumno_apellido  text,
  add column if not exists alumno_dni       text,
  add column if not exists alumno_codigo    text,
  add column if not exists alumno_facultad  text,
  add column if not exists origen         text not null default 'panel_admin'
    check (origen in ('publico','panel_admin'));

comment on column uso_logs.tipo_operador is
  'Quién usó la máquina: Alumno, persona Externa, o personal Interno (valor por defecto de los registros previos a esta migración).';
comment on column uso_logs.origen is
  'publico = autoregistro del alumno desde /registro-uso sin sesión iniciada; panel_admin = cargado desde el panel por un usuario autenticado.';

create index if not exists idx_usologs_origen on uso_logs(origen);


-- ============================================================================================
-- 2) Vistas públicas de solo lectura (sin datos sensibles: sin costos, sin observaciones
--    internas, sin documentos). Se crean con el mismo dueño que las tablas base (el rol que
--    corre esta migración), por lo que — igual que la función es_admin_o_supervisor() de la
--    migración 002 — leen sin quedar sujetas a las políticas RLS de `maquinas`/`instituciones`.
-- ============================================================================================

create or replace view public.maquinas_publico as
select
  m.id,
  m.codigo,
  m.nombre,
  m.marca,
  m.modelo,
  m.foto_url,
  m.estado::text as estado,
  a.nombre as area
from maquinas m
left join areas a on a.id = m.area_id
where m.activo = true
order by m.nombre;

comment on view public.maquinas_publico is
  'Listado de máquinas para la galería pública de autoregistro (/registro-uso). Solo columnas no sensibles.';

grant select on public.maquinas_publico to anon, authenticated;

create or replace view public.institucion_publico as
select nombre, logo_url
from instituciones
order by created_at asc
limit 1;

comment on view public.institucion_publico is
  'Nombre/logo de la institución para el encabezado de /registro-uso, sin exponer metas de KPI ni configuración interna.';

grant select on public.institucion_publico to anon, authenticated;


-- ============================================================================================
-- 3) Función pública de autoregistro (SECURITY DEFINER): valida en el servidor y hace el
--    único INSERT permitido en uso_logs para un visitante sin sesión.
-- ============================================================================================

create or replace function public.registrar_uso_publico(
  p_maquina_id      uuid,
  p_tipo_operador   text,
  p_nombre          text,
  p_apellido        text,
  p_dni             text,
  p_start_at        timestamptz,
  p_horas           numeric,
  p_codigo_alumno   text default null,
  p_facultad        text default null,
  p_observaciones   text default null
)
returns table (log_id uuid, horas_acumuladas numeric, umbral_horas_ciclo numeric, alerta text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_maquina     maquinas%rowtype;
  v_end_at      timestamptz;
  v_turno       turno_type;
  v_operador    text;
  v_log_id      uuid;
  v_horas_acum  numeric;
  v_pct         numeric;
  v_alerta      text;
begin
  if p_tipo_operador not in ('Alumno', 'Externo') then
    raise exception 'Tipo de operador inválido';
  end if;
  if coalesce(trim(p_nombre), '') = '' or coalesce(trim(p_apellido), '') = '' then
    raise exception 'El nombre y el apellido son obligatorios';
  end if;
  if coalesce(trim(p_dni), '') = '' then
    raise exception 'El DNI es obligatorio';
  end if;
  if p_tipo_operador = 'Alumno' and coalesce(trim(p_codigo_alumno), '') = '' then
    raise exception 'El código de estudiante es obligatorio';
  end if;
  if p_tipo_operador = 'Alumno' and coalesce(trim(p_facultad), '') = '' then
    raise exception 'Selecciona tu facultad';
  end if;
  if p_start_at is null then
    raise exception 'Falta la fecha/hora de inicio';
  end if;
  if p_horas is null or p_horas <= 0 or p_horas > 12 then
    raise exception 'La duración debe estar entre 0.5 y 12 horas';
  end if;

  select * into v_maquina from maquinas where id = p_maquina_id and activo = true;
  if not found then
    raise exception 'La máquina seleccionada no existe o ya no está disponible';
  end if;
  if v_maquina.estado <> 'Operativo' then
    raise exception 'La máquina "%" no está disponible en este momento (estado: %)', v_maquina.nombre, v_maquina.estado;
  end if;

  v_end_at := p_start_at + make_interval(mins => round(p_horas * 60)::int);

  v_turno := case
    when extract(hour from p_start_at) >= 6  and extract(hour from p_start_at) < 14 then 'Mañana'::turno_type
    when extract(hour from p_start_at) >= 14 and extract(hour from p_start_at) < 22 then 'Tarde'::turno_type
    else 'Noche'::turno_type
  end;

  -- Resumen legible que se conserva en `operador` por compatibilidad con la columna
  -- de texto que ya muestran la tabla e impresión del panel de Uso de Máquinas.
  v_operador := case
    when p_tipo_operador = 'Alumno' then
      format('Alumno: %s %s | DNI: %s | Cód: %s | Facultad: %s',
             trim(p_nombre), trim(p_apellido), trim(p_dni), trim(p_codigo_alumno), p_facultad)
    else
      format('Externo: %s %s | DNI: %s', trim(p_nombre), trim(p_apellido), trim(p_dni))
  end;

  insert into uso_logs (
    maquina_id, operador, tipo_operador, alumno_nombre, alumno_apellido, alumno_dni,
    alumno_codigo, alumno_facultad, start_at, end_at, horas, turno, observaciones, origen
  ) values (
    p_maquina_id, v_operador, p_tipo_operador, trim(p_nombre), trim(p_apellido), trim(p_dni),
    nullif(trim(coalesce(p_codigo_alumno, '')), ''), nullif(p_facultad, ''),
    p_start_at, v_end_at, p_horas, v_turno,
    nullif(trim(coalesce(p_observaciones, '')), ''), 'publico'
  )
  returning id into v_log_id;

  -- El trigger tg_acumular_horas (migración 002) ya actualizó/creó uso_ciclos
  -- de forma síncrona como parte del INSERT de arriba.
  -- OJO: "uc.horas_acumuladas" va calificado con el alias de la tabla porque
  -- el nombre de columna choca con la columna homónima de este mismo RETURNS
  -- TABLE (ver arriba) — sin calificar, Postgres no sabe a cuál te refieres
  -- y falla con "column reference horas_acumuladas is ambiguous".
  select uc.horas_acumuladas into v_horas_acum from uso_ciclos uc where uc.maquina_id = p_maquina_id;

  v_pct := case when v_maquina.umbral_horas_ciclo > 0
    then (coalesce(v_horas_acum, 0) / v_maquina.umbral_horas_ciclo) * 100
    else 0 end;
  v_alerta := case
    when v_pct >= 100 then 'critical'
    when v_pct >= v_maquina.umbral_alerta_pct then 'warning'
    else 'normal'
  end;

  return query select v_log_id, v_horas_acum, v_maquina.umbral_horas_ciclo, v_alerta;
end;
$$;

comment on function public.registrar_uso_publico is
  'Único punto de escritura permitido para el rol anon: autoregistro de uso desde /registro-uso. Valida todo en el servidor antes de insertar en uso_logs.';

grant execute on function public.registrar_uso_publico(
  uuid, text, text, text, text, timestamptz, numeric, text, text, text
) to anon, authenticated;

-- Refresca de inmediato el caché de esquema de PostgREST para que las vistas
-- y la función queden disponibles sin esperar a la próxima recarga automática.
notify pgrst, 'reload schema';
