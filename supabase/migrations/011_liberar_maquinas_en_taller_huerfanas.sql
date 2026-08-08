-- ============================================================================================
-- FIX: máquinas atascadas en estado "En Taller" sin ningún envío real registrado
-- ============================================================================================
-- CAUSA: antes de esta corrección, el botón "Taller" del módulo Máquinas
-- solo cambiaba el campo `maquinas.estado` a 'En Taller', sin crear ningún
-- registro en `envios_taller`. Por eso esas máquinas (como MAQ-002) aparecen
-- "En Taller" en la tarjeta pero nunca existieron en el módulo de Talleres
-- Externos: no hay ningún envío del que "regresarlas".
--
-- Ya corregí el código: ahora el único lugar para enviar una máquina a
-- taller es el módulo Talleres Externos ("+ Enviar a taller"), que sí crea
-- el registro real y sincroniza el estado de la máquina automáticamente
-- (y al marcar "Devuelto"/"Cancelado" ahí, la máquina vuelve sola a
-- "Operativo"). Este script es solo para LIMPIAR, una única vez, las
-- máquinas que quedaron atascadas por el bug anterior.
-- ============================================================================================

-- 1) Vista previa: qué máquinas están "En Taller" sin ningún envío activo real.
select m.id, m.codigo, m.nombre, m.estado
from maquinas m
where m.estado = 'En Taller'
  and not exists (
    select 1 from envios_taller e
    where e.maquina_id = m.id and e.estado = 'En Taller'
  );

-- 2) Corrige el estado: las vuelve a "Operativo" (solo las que no tienen
--    ningún envío real en curso; si una máquina sí tiene un envío legítimo
--    "En Taller" en la tabla envios_taller, esta consulta NO la toca).
update maquinas m
set estado = 'Operativo'
where m.estado = 'En Taller'
  and not exists (
    select 1 from envios_taller e
    where e.maquina_id = m.id and e.estado = 'En Taller'
  );

-- 3) Verificación.
select codigo, nombre, estado from maquinas order by codigo;
