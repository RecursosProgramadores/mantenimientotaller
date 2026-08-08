-- ============================================================================================
-- FIX: logo (y demás datos de la institución) que "desaparece" al recargar
-- ============================================================================================
-- CAUSA RAÍZ:
--   El código anterior leía la fila de `instituciones` con `.limit(1)` sin
--   ORDER BY. Si por cualquier motivo llegó a existir más de una fila en esa
--   tabla, Postgres/PostgREST no garantiza cuál de ellas te devuelve cada vez
--   — así que a veces la app leía la fila con el logo guardado, y a veces
--   leía otra fila vacía. Por eso el logo "se subía" pero luego de varias
--   actualizaciones/recargas parecía desaparecer.
--
--   El código de la aplicación ya fue corregido para ordenar siempre por
--   `created_at` (usa la fila más antigua de forma consistente). Este script
--   es la parte de base de datos: (1) revisa si tienes filas duplicadas,
--   (2) si las hay, consolida todo en una sola fila sin perder datos ni
--   romper referencias, y (3) agrega una restricción que hace IMPOSIBLE que
--   vuelva a crearse una segunda fila en el futuro.
--
-- CÓMO USARLO:
--   Pega y ejecuta todo este archivo en el SQL Editor de tu proyecto Supabase.
--   Es seguro ejecutarlo aunque solo tengas 1 fila (no hace nada destructivo
--   en ese caso) y es seguro ejecutarlo más de una vez.
-- ============================================================================================

-- 1) Diagnóstico rápido — revisa el resultado antes de continuar.
select id, nombre, logo_url, created_at
from instituciones
order by created_at asc;

-- 2) Consolidación: si hay más de una fila, todo el contenido (máquinas,
--    áreas, usuarios, tipos de mantenimiento, talleres, repuestos) se
--    re-apunta hacia la fila más antigua antes de borrar las demás, para no
--    perder nada (las FK son "on delete cascade": borrar una institución sin
--    re-apuntar antes borraría en cadena todo lo que dependía de ella).
do $$
declare
  keeper_id uuid;
  dup_count int;
begin
  select count(*) into dup_count from instituciones;

  if dup_count <= 1 then
    raise notice 'Solo hay % fila(s) en instituciones — nada que consolidar.', dup_count;
  else
    select id into keeper_id from instituciones order by created_at asc limit 1;

    -- Re-apunta las tablas hijas hacia la institución más antigua.
    update areas               set institucion_id = keeper_id where institucion_id is distinct from keeper_id;
    update usuarios            set institucion_id = keeper_id where institucion_id is distinct from keeper_id;
    update tipos_mantenimiento set institucion_id = keeper_id where institucion_id is distinct from keeper_id;
    update maquinas            set institucion_id = keeper_id where institucion_id is distinct from keeper_id;
    update talleres_externos   set institucion_id = keeper_id where institucion_id is distinct from keeper_id;
    update repuestos_catalogo  set institucion_id = keeper_id where institucion_id is distinct from keeper_id;

    -- Si la fila "keeper" no tenía logo/dirección pero alguna duplicada sí,
    -- rescata ese dato antes de borrar las duplicadas.
    update instituciones
    set logo_url  = coalesce(logo_url,  (select d.logo_url  from instituciones d where d.id <> keeper_id and d.logo_url  is not null order by d.created_at desc limit 1)),
        direccion = coalesce(direccion, (select d.direccion from instituciones d where d.id <> keeper_id and d.direccion is not null order by d.created_at desc limit 1))
    where id = keeper_id;

    -- Ahora sí, elimina las filas duplicadas (ya no tienen nada apuntándolas).
    delete from instituciones where id <> keeper_id;

    raise notice 'Se consolidaron % filas duplicadas en instituciones.id = %', dup_count - 1, keeper_id;
  end if;
end $$;

-- 3) Guarda de "singleton": agrega la columna si tu base de datos todavía no
--    la tiene (proyectos creados antes de este fix), y crea el índice único
--    que impide para siempre que exista una segunda fila.
alter table instituciones add column if not exists singleton boolean not null default true;
alter table instituciones drop constraint if exists instituciones_singleton_check;
alter table instituciones add constraint instituciones_singleton_check check (singleton);
create unique index if not exists instituciones_singleton_uk on instituciones (singleton);

-- 4) Verificación final — debe mostrar exactamente 1 fila.
select count(*) as total_instituciones from instituciones;
