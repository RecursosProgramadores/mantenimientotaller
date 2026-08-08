-- ============================================================================================
-- Crea tu perfil de Admin (enlazado a tu cuenta real) + la institución.
-- Ya con tus datos reales (tallermecanico96@gmail.com / UID de auth.users).
-- Pega y ejecuta todo este archivo en el SQL Editor de Supabase.
-- ============================================================================================

-- 1) Crea (o corrige) tu perfil en `usuarios`, enlazado a tu cuenta de auth
--    y con rol Admin — así ya puedes escribir en `instituciones`.
insert into usuarios (auth_user_id, nombre, email, rol, activo)
values (
  'c0a4343b-d6d0-4727-addf-8f4385ee0b32',
  'Taller Mecánico',
  'tallermecanico26@gmail.com',
  'Admin',
  true
)
on conflict (email) do update
  set rol = 'Admin',
      activo = true,
      auth_user_id = excluded.auth_user_id;

-- 2) Crea la fila única de `instituciones` si todavía no existe.
insert into instituciones (nombre)
select 'Mi Institución de Mantenimiento'
where not exists (select 1 from instituciones);

-- 3) Verificación — deberías ver tu usuario con rol = Admin y 1 institución.
select id, email, rol, activo, auth_user_id from usuarios order by created_at asc;
select count(*) as total_instituciones from instituciones;
