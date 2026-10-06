-- ============================================================================================
-- 016 — BLOQUEO DE USO CONCURRENTE (una máquina, un usuario a la vez)
--
-- CONTEXTO: en /registro-uso (autoregistro público) un alumno elegía la máquina, indicaba
-- cuánto tiempo la iba a usar y quedaba registrado — pero nada impedía que, dos minutos
-- después, otra persona registrara esa MISMA máquina "en paralelo". El campo `maquinas.estado`
-- (Operativo/En Revisión/En Taller/Fuera de Servicio) no refleja esto: una máquina operativa
-- sigue "Operativo" aunque alguien la esté usando ahora mismo por las próximas 2 horas.
--
-- SOLUCIÓN: no se agrega un estado nuevo a `machine_status` (eso obligaría a sincronizarlo
-- manualmente cuando el tiempo se cumple, con el mismo riesgo de "máquinas huérfanas" que ya
-- se corrigió para "En Taller" en la migración 011). En vez de eso, "en uso" se CALCULA en
-- cada lectura a partir de `uso_logs`: una máquina está en uso mientras exista una fila de
-- uso_logs cuyo `end_at` sea posterior a `now()`. Se libera sola, sin ningún job ni corrección
-- manual, apenas se cumple la hora que el propio alumno registró.
--
-- Esto se aplica en dos capas, igual que el resto de invariantes de este esquema (ver
-- CLAUDE.md — "enforced server-side, not re-derived on the client"):
--   1) `maquinas_publico` ahora expone `en_uso` / `uso_libre_en` para que la galería pública
--      muestre el candado y la hora de liberación sin tener que intentar registrar primero.
--   2) `registrar_uso_publico` rechaza el registro con un mensaje claro si la máquina ya está
--      en uso, bloqueando la fila de `maquinas` (`for update`) mientras valida, para que dos
--      registros simultáneos sobre la misma máquina no puedan colarse ambos.
--   3) Un trigger `before insert` en `uso_logs` es la última línea de defensa (cubre también
--      el registro desde el panel admin en `MantePro.tsx`/`uso-maquinas.tsx`, que inserta
--      directo en la tabla): rechaza cualquier fila nueva que se solape con una sesión todavía
--      activa (end_at > now()) de la misma máquina. No toca cargas históricas/retroactivas del
--      panel (esas tienen end_at en el pasado, así que nunca chocan con "todavía activa").
-- ============================================================================================


-- ============================================================================================
-- 1) Vista pública: agrega en_uso / uso_libre_en calculados en vivo contra uso_logs.
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
  a.nombre as area,
  (uso.end_at is not null) as en_uso,
  uso.end_at as uso_libre_en
from maquinas m
left join areas a on a.id = m.area_id
left join lateral (
  select ul.end_at
  from uso_logs ul
  where ul.maquina_id = m.id
    and ul.end_at > now()
  order by ul.end_at desc
  limit 1
) uso on true
where m.activo = true
order by m.nombre;

comment on view public.maquinas_publico is
  'Listado de máquinas para la galería pública de autoregistro (/registro-uso). en_uso/uso_libre_en se calculan en vivo contra uso_logs (sesión activa = end_at > now()), sin exponer quién la está usando.';

grant select on public.maquinas_publico to anon, authenticated;


-- ============================================================================================
-- 2) Trigger de última línea de defensa sobre uso_logs — cubre también el insert directo
--    del panel admin, no solo la función pública de abajo.
-- ============================================================================================

create or replace function public.tg_bloquear_uso_concurrente()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_conflicto uso_logs%rowtype;
begin
  select * into v_conflicto
  from uso_logs ul
  where ul.maquina_id = new.maquina_id
    and ul.id is distinct from new.id
    and ul.end_at > now()               -- sigue "en curso" en este mismo instante
    and ul.start_at < new.end_at        -- y se solapa con la ventana de la fila nueva
    and ul.end_at > new.start_at
  order by ul.end_at desc
  limit 1;

  if found then
    raise exception
      'Esta máquina ya tiene un uso activo registrado hasta las % — no se puede registrar un uso superpuesto mientras esté en curso.',
      to_char(v_conflicto.end_at at time zone 'America/Lima', 'HH24:MI')
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists tg_bloquear_uso_concurrente on uso_logs;
create trigger tg_bloquear_uso_concurrente
  before insert on uso_logs
  for each row execute function public.tg_bloquear_uso_concurrente();


-- ============================================================================================
-- 3) registrar_uso_publico: valida el bloqueo con un mensaje pensado para el alumno, ANTES
--    de llegar al trigger genérico de arriba, y bloquea la fila de la máquina (`for update`)
--    para que dos registros simultáneos sobre la misma máquina se serialicen en vez de correr
--    en paralelo y colarse los dos antes de que cualquiera vea la fila del otro.
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
  v_en_uso      uso_logs%rowtype;
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
  -- Duraciones ofrecidas en el formulario: 0.5h a 3h (ver DURACIONES en
  -- src/routes/registro-uso.tsx). Se deja el tope de validación en 12h por si
  -- alguna vez se habilita una duración mayor, pero el formulario público hoy
  -- no ofrece nada por encima de 3h.
  if p_horas is null or p_horas <= 0 or p_horas > 12 then
    raise exception 'La duración debe estar entre 0.5 y 12 horas';
  end if;

  -- `for update` serializa dos registros simultáneos sobre la MISMA máquina: el segundo
  -- espera a que el primero termine su transacción (que ya habrá insertado su uso_logs) y
  -- entonces sí ve el conflicto de abajo, en vez de que ambos lean "libre" a la vez.
  select * into v_maquina from maquinas where id = p_maquina_id and activo = true for update;
  if not found then
    raise exception 'La máquina seleccionada no existe o ya no está disponible';
  end if;
  if v_maquina.estado <> 'Operativo' then
    raise exception 'La máquina "%" no está disponible en este momento (estado: %)', v_maquina.nombre, v_maquina.estado;
  end if;

  select * into v_en_uso
  from uso_logs
  where maquina_id = p_maquina_id and end_at > now()
  order by end_at desc
  limit 1;

  if found then
    raise exception
      'Esta máquina está en uso (por un/a % en este momento) hasta las %. Vuelve a intentarlo cuando termine su turno.',
      lower(v_en_uso.tipo_operador),
      to_char(v_en_uso.end_at at time zone 'America/Lima', 'HH24:MI');
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
  'Único punto de escritura permitido para el rol anon: autoregistro de uso desde /registro-uso. Valida todo en el servidor antes de insertar en uso_logs, incluyendo que la máquina no tenga ya una sesión de uso activa (end_at > now()).';

grant execute on function public.registrar_uso_publico(
  uuid, text, text, text, text, timestamptz, numeric, text, text, text
) to anon, authenticated;

-- Refresca de inmediato el caché de esquema de PostgREST.
notify pgrst, 'reload schema';
