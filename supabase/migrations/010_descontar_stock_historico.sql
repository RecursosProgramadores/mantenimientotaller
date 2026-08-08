-- ============================================================================================
-- FIX: el stock del catálogo no bajaba al usar repuestos en una OTM
-- ============================================================================================
-- CAUSA: no existía ninguna lógica que conectara "repuestos usados en una
-- orden de trabajo" con "stock disponible en el catálogo" — eran dos tablas
-- completamente independientes. Ya corregí el código de la aplicación para
-- que, de ahora en adelante, usar un repuesto del catálogo en una OTM reste
-- automáticamente esa cantidad de su stock (y editar/eliminar la orden lo
-- devuelva correctamente, sin descontar dos veces).
--
-- Este script es SOLO para corregir, una única vez, el stock de las OTM que
-- ya guardaste ANTES de este arreglo (como tu OTM-2026-001 con 2 "tuerca").
-- Ejecuta este archivo UNA SOLA VEZ. Si lo corres dos veces, descontará el
-- doble por error.
-- ============================================================================================

-- 1) Vista previa: qué se va a descontar y de qué repuesto (revisa antes de aplicar).
select
  rc.nombre as repuesto,
  rc.stock_minimo as stock_actual,
  sum(ro.cantidad) as cantidad_usada_en_otms,
  rc.stock_minimo - sum(ro.cantidad) as stock_resultante
from repuestos_otm ro
join repuestos_catalogo rc on rc.nombre ilike ro.nombre
group by rc.id, rc.nombre, rc.stock_minimo;

-- 2) Aplica el descuento (una sola vez).
update repuestos_catalogo rc
set stock_minimo = greatest(0, rc.stock_minimo - uso.cantidad_total)
from (
  select rc2.id as catalogo_id, sum(ro.cantidad) as cantidad_total
  from repuestos_otm ro
  join repuestos_catalogo rc2 on rc2.nombre ilike ro.nombre
  group by rc2.id
) uso
where rc.id = uso.catalogo_id;

-- 3) Verificación — revisa que el stock haya quedado correcto.
select nombre, referencia, stock_minimo as stock, precio from repuestos_catalogo order by nombre;
