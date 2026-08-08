-- ============================================================================================
-- Eliminar un envío a taller de prueba (uso manual, una sola vez)
-- ============================================================================================
-- Ya agregué un botón "Eliminar" tanto en la lista de Talleres Externos como
-- en el detalle de cada envío, así que de ahora en adelante no necesitas SQL
-- para esto — basta con el botón (y libera la máquina a "Operativo"
-- automáticamente si estaba "En Taller").
--
-- Este script es por si quieres borrar ahora mismo, desde SQL, el envío de
-- prueba que aparece para MAQ-001 / "taller expres". Ajusta el `codigo` y el
-- `nombre` del taller en el WHERE si no son exactos a lo que ves en pantalla.
-- ============================================================================================

-- 1) Vista previa: revisa que sea el registro correcto antes de borrar.
select e.id, m.codigo, m.nombre as maquina, t.nombre as taller, e.estado, e.fecha_envio
from envios_taller e
join maquinas m on m.id = e.maquina_id
left join talleres_externos t on t.id = e.taller_id
where m.codigo = 'MAQ-001' and t.nombre ilike 'taller expres';

-- 2) Libera la máquina si el envío que se va a borrar es el que la tiene "En Taller".
update maquinas m
set estado = 'Operativo'
where m.codigo = 'MAQ-001'
  and exists (
    select 1 from envios_taller e
    join talleres_externos t on t.id = e.taller_id
    where e.maquina_id = m.id and t.nombre ilike 'taller expres' and e.estado = 'En Taller'
  );

-- 3) Elimina el envío de prueba (arrastra en cascada su seguimiento, componentes
--    afectados y documentos asociados, por las FKs "on delete cascade").
delete from envios_taller e
using maquinas m
left join talleres_externos t on t.id = e.taller_id
where e.maquina_id = m.id and m.codigo = 'MAQ-001' and t.nombre ilike 'taller expres';

-- 4) Verificación.
select codigo, nombre, estado from maquinas where codigo = 'MAQ-001';
