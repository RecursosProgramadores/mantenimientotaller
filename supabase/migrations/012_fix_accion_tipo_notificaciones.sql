-- ============================================================================================
-- FIX: el botón de acción ("Crear OTM urgente" / "Programar OTM") nunca
-- aparecía en las notificaciones automáticas de umbral de uso
-- ============================================================================================
-- CAUSA: la función notificar_umbral_uso() (disparada por el trigger
-- tg_notificar_umbral sobre uso_ciclos) siempre guardaba accion_tipo =
-- 'programar_otm', tanto para alertas críticas como de advertencia. Además,
-- el frontend (pantalla de Notificaciones) comparaba ese valor contra otros
-- strings que nunca existieron en la base de datos, así que el botón de
-- acción no se mostraba en ningún caso. Ya corregí el frontend para que
-- reconozca los valores reales del enum `notification_action` (crear_otm /
-- programar_otm / ver_historial); este script actualiza la función en la
-- base de datos para que las alertas críticas usen 'crear_otm' (botón
-- "Crear OTM urgente") y las de advertencia sigan usando 'programar_otm'
-- (botón "Programar OTM").
--
-- También corregí un bug relacionado: el frontend volvía a crear la misma
-- notificación de umbral manualmente además de este trigger, lo que podía
-- duplicar notificaciones. Ya no lo hace: este trigger es ahora la única
-- fuente de estas notificaciones.
-- ============================================================================================

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

notify pgrst, 'reload schema';
