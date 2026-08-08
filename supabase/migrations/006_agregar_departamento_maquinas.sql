-- ============================================================================================
-- FIX: el campo "Facultad / Departamento" del modal Nueva Máquina no se guardaba
-- ============================================================================================
-- CAUSA: la tabla `maquinas` nunca tuvo una columna para ese dato — el campo
-- existía solo en el formulario, pero no había dónde guardarlo en la base de
-- datos. Esta migración agrega la columna. El código de la app ya fue
-- corregido para leerla y escribirla correctamente.
-- ============================================================================================

alter table maquinas add column if not exists departamento text;

comment on column maquinas.departamento is 'Facultad / Departamento de la universidad al que pertenece la máquina (campo descriptivo, independiente del área/taller interno).';

-- Fuerza a PostgREST (la capa que expone la base de datos como API) a
-- refrescar su caché de esquema de inmediato. Sin esto, a veces la columna
-- ya existe en la tabla pero la API sigue "sin verla" por unos segundos u
-- minutos, y el error "Could not find the 'departamento' column... in the
-- schema cache" persiste aunque el ALTER TABLE ya se haya ejecutado bien.
notify pgrst, 'reload schema';
