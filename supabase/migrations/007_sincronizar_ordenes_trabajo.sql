-- ============================================================================================
-- FIX: "Could not find the 'firma_supervisor' column of 'ordenes_trabajo'..."
-- ============================================================================================
-- CAUSA: tu base de datos en Supabase se creó con una versión más antigua del
-- esquema, antes de que se agregaran varias columnas a `ordenes_trabajo`
-- (notas durante el trabajo, próximo tipo de mantenimiento sugerido, firmas
-- de cierre). El código de la aplicación ya espera esas columnas, pero la
-- tabla real en tu proyecto todavía no las tiene.
--
-- Este script agrega TODAS las columnas que pudieran faltar en `ordenes_trabajo`
-- de una sola vez (no solo `firma_supervisor`), para no tener que repetir este
-- mismo proceso columna por columna cada vez que aparezca un error parecido.
-- Es seguro ejecutarlo aunque alguna columna ya exista (usa IF NOT EXISTS) y
-- es seguro ejecutarlo más de una vez.
-- ============================================================================================

alter table ordenes_trabajo add column if not exists observaciones text;          -- notas durante el trabajo (MaintenanceRecord.notes)
alter table ordenes_trabajo add column if not exists hallazgos text;              -- hallazgos de cierre (MaintenanceRecord.findings)
alter table ordenes_trabajo add column if not exists proximo_mantenimiento date;
alter table ordenes_trabajo add column if not exists proximo_tipo_id uuid references tipos_mantenimiento(id) on delete set null;
alter table ordenes_trabajo add column if not exists firma_tecnico text;
alter table ordenes_trabajo add column if not exists firma_supervisor text;

-- `estado_post_maquina` debe ser texto libre (el formulario no restringe sus
-- valores a los mismos que el estado normal de la máquina). Si en tu base de
-- datos quedó creada como el tipo `machine_status` de una versión anterior,
-- este bloque la convierte a texto sin perder los datos que ya tenga.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'ordenes_trabajo' and column_name = 'estado_post_maquina' and data_type <> 'text'
  ) then
    alter table ordenes_trabajo alter column estado_post_maquina type text using estado_post_maquina::text;
  elsif not exists (
    select 1 from information_schema.columns
    where table_name = 'ordenes_trabajo' and column_name = 'estado_post_maquina'
  ) then
    alter table ordenes_trabajo add column estado_post_maquina text;
  end if;
end $$;

-- Refresca la caché de la API para que reconozca las columnas nuevas de inmediato.
notify pgrst, 'reload schema';

-- Verificación — deberías ver todas estas columnas listadas.
select column_name, data_type
from information_schema.columns
where table_name = 'ordenes_trabajo'
order by ordinal_position;
