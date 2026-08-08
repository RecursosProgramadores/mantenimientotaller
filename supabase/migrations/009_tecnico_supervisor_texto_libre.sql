-- ============================================================================================
-- FIX: "Técnico Responsable" y "Supervisor" deben aceptar cualquier nombre,
-- no solo el de un usuario ya registrado en el sistema
-- ============================================================================================
-- CAUSA: antes, el nombre escrito en el formulario debía coincidir EXACTO
-- con un `usuarios.nombre` para poder guardarse (se resolvía a un tecnico_id/
-- supervisor_id). Si no coincidía, el campo se guardaba vacío sin avisar.
--
-- SOLUCIÓN: se agregan dos columnas de texto libre (`tecnico_nombre`,
-- `supervisor_nombre`) que guardan el nombre tal cual se escribió, siempre,
-- sin depender de que exista un usuario con ese nombre exacto. Las columnas
-- `tecnico_id`/`supervisor_id` se mantienen como enlace OPCIONAL a un usuario
-- real (útil a futuro para reportes por técnico), pero ya no son necesarias
-- para que el nombre se guarde y se muestre correctamente.
-- ============================================================================================

alter table ordenes_trabajo add column if not exists tecnico_nombre text;
alter table ordenes_trabajo add column if not exists supervisor_nombre text;

comment on column ordenes_trabajo.tecnico_nombre is 'Nombre del técnico tal cual se escribió en el formulario (fuente de verdad para mostrar).';
comment on column ordenes_trabajo.supervisor_nombre is 'Nombre del supervisor tal cual se escribió en el formulario (fuente de verdad para mostrar).';

-- Migra los datos ya existentes: si una OTM tenía tecnico_id/supervisor_id
-- resuelto pero el nombre de texto libre está vacío, copia el nombre desde
-- el usuario enlazado para no perder lo que ya tenías guardado.
update ordenes_trabajo o
set tecnico_nombre = u.nombre
from usuarios u
where o.tecnico_id = u.id and (o.tecnico_nombre is null or o.tecnico_nombre = '');

update ordenes_trabajo o
set supervisor_nombre = u.nombre
from usuarios u
where o.supervisor_id = u.id and (o.supervisor_nombre is null or o.supervisor_nombre = '');

notify pgrst, 'reload schema';
