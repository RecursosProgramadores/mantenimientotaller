-- ============================================================================================
-- FIX: el campo "Área" del formulario de Mantenimientos no se guardaba
-- ============================================================================================
-- CAUSA: igual que pasó con "Facultad/Departamento" en Máquinas, el campo
-- "Área" del formulario de OTM nunca tuvo una columna en `ordenes_trabajo`
-- donde guardarse. El código de la app ya fue corregido para leerla/escribirla.
-- ============================================================================================

alter table ordenes_trabajo add column if not exists area text;

comment on column ordenes_trabajo.area is 'Área/ubicación de la máquina al momento de la OTM (independiente del área actual de la máquina, por si cambia con el tiempo).';

notify pgrst, 'reload schema';
