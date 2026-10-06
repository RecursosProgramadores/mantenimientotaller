-- ============================================================================================
-- 017 — CREAR/HABILITAR LOS BUCKETS DE STORAGE (maquinas-fotos, documentos-otm, documentos-taller)
--
-- Contexto: estos 3 buckets ya estaban definidos en 002_schema_consolidado.sql (líneas ~822-856),
-- pero esa parte del archivo nunca se ejecutó contra esta base de datos real — por eso al subir un
-- documento (ej. en "Talleres Externos" o en una OTM) el frontend arma la URL pública con
-- getPublicUrl() como si el bucket existiera, pero Supabase Storage responde
-- {"error":"Bucket not found","code":"NoSuchBucket"} al intentar verla, porque el bucket nunca se
-- creó. El código del frontend está bien; esto es exclusivamente configuración de la base de datos.
--
-- Este script es idempotente (se puede correr varias veces sin error): crea los 3 buckets como
-- públicos (el frontend los lee con getPublicUrl(), así que deben ser públicos para que esas URLs
-- funcionen) y sus políticas de acceso — lectura pública, escritura/borrado solo para usuarios
-- autenticados (el panel admin).
--
-- CÓMO EJECUTAR: pégalo una sola vez en el SQL Editor de tu proyecto Supabase
-- (https://supabase.com/dashboard/project/agrcocrkiuwoyblewyyx/sql/new) y dale Run.
-- Después de correrlo, los documentos que ya intentaste subir y fallaron con "Bucket not found"
-- deben volver a subirse (el registro en la tabla `documentos` ya quedó guardado con una URL rota
-- de un bucket que no existía, así que ese archivo en concreto no se puede "recuperar" — solo los
-- que subas de ahora en adelante funcionarán).
-- ============================================================================================

insert into storage.buckets (id, name, public) values ('maquinas-fotos', 'maquinas-fotos', true)
  on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public) values ('documentos-otm', 'documentos-otm', true)
  on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public) values ('documentos-taller', 'documentos-taller', true)
  on conflict (id) do update set public = true;

drop policy if exists "maquinas_fotos_public_read" on storage.objects;
create policy "maquinas_fotos_public_read" on storage.objects for select using (bucket_id = 'maquinas-fotos');
drop policy if exists "maquinas_fotos_auth_write" on storage.objects;
create policy "maquinas_fotos_auth_write" on storage.objects for insert to authenticated with check (bucket_id = 'maquinas-fotos');
drop policy if exists "maquinas_fotos_auth_update" on storage.objects;
create policy "maquinas_fotos_auth_update" on storage.objects for update to authenticated using (bucket_id = 'maquinas-fotos');

drop policy if exists "documentos_otm_public_read" on storage.objects;
create policy "documentos_otm_public_read" on storage.objects for select using (bucket_id = 'documentos-otm');
drop policy if exists "documentos_otm_auth_write" on storage.objects;
create policy "documentos_otm_auth_write" on storage.objects for insert to authenticated with check (bucket_id = 'documentos-otm');
drop policy if exists "documentos_otm_auth_delete" on storage.objects;
create policy "documentos_otm_auth_delete" on storage.objects for delete to authenticated using (bucket_id = 'documentos-otm');

drop policy if exists "documentos_taller_public_read" on storage.objects;
create policy "documentos_taller_public_read" on storage.objects for select using (bucket_id = 'documentos-taller');
drop policy if exists "documentos_taller_auth_write" on storage.objects;
create policy "documentos_taller_auth_write" on storage.objects for insert to authenticated with check (bucket_id = 'documentos-taller');
drop policy if exists "documentos_taller_auth_delete" on storage.objects;
create policy "documentos_taller_auth_delete" on storage.objects for delete to authenticated using (bucket_id = 'documentos-taller');
