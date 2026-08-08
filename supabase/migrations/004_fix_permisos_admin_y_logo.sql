-- ============================================================================================
-- FIX: el logo (y cualquier cambio en "Configuración") no se guarda nunca
-- ============================================================================================
-- CAUSA RAÍZ REAL (confirmada con total_instituciones = 0 del script anterior):
--   Las fotos de máquinas se guardan sin problema porque su política de
--   seguridad (RLS) solo exige "estar autenticado". Pero la tabla
--   `instituciones` tiene una política más estricta: solo puede escribirla
--   un usuario cuyo rol en la tabla `usuarios` sea 'Admin' o 'Supervisor'.
--
--   Lo más probable es que tu cuenta de acceso (la que usas para iniciar
--   sesión) todavía no tiene una fila en `usuarios`, o la tiene con otro
--   rol — así que cada vez que subes el logo, la base de datos RECHAZA el
--   guardado en silencio (antes el código no mostraba ese error; ya lo
--   corregí para que ahora sí te avise con un mensaje).
--
-- CÓMO USARLO:
--   1. Ejecuta primero el PASO 1 solo, y mira el resultado.
--   2. Según lo que veas, sigue el PASO 2A o 2B (están comentados abajo).
--   3. Ejecuta el PASO 3 al final.
-- ============================================================================================

-- ── PASO 1: Diagnóstico ──────────────────────────────────────────────────────
-- Mira tu email de inicio de sesión en auth.users, y si ya existe (o no) en usuarios.
select au.id as auth_id, au.email as auth_email,
       u.id as usuario_id, u.rol, u.activo, u.auth_user_id
from auth.users au
left join usuarios u on u.auth_user_id = au.id or u.email = au.email
order by au.created_at asc;

-- ── PASO 2A: si la fila de `usuarios` SÍ aparece pero con otro rol ──────────
-- Reemplaza 'TU-CORREO@EJEMPLO.COM' por tu correo real (el que usas para
-- iniciar sesión en el sistema) y ejecuta:
--
-- update usuarios
-- set rol = 'Admin', activo = true
-- where email = 'TU-CORREO@EJEMPLO.COM';

-- ── PASO 2B: si NO aparece ninguna fila de `usuarios` para tu correo ────────
-- Esto crea tu perfil de administrador enlazado a tu cuenta de auth.
-- Reemplaza 'TU-CORREO@EJEMPLO.COM' por tu correo real:
--
-- insert into usuarios (auth_user_id, nombre, email, rol, activo)
-- select id, coalesce(raw_user_meta_data->>'name', split_part(email, '@', 1)), email, 'Admin', true
-- from auth.users
-- where email = 'TU-CORREO@EJEMPLO.COM'
-- on conflict (email) do update
--   set rol = 'Admin', activo = true, auth_user_id = excluded.auth_user_id;

-- ── PASO 3: crea la fila única de `instituciones` si todavía no existe ──────
-- (Con tu cuenta ya como Admin, esto también lo puede hacer la propia app la
-- próxima vez que guardes algo en Configuración — pero lo dejamos aquí por
-- si prefieres crearla ya mismo.)
insert into instituciones (nombre)
select 'Mi Institución de Mantenimiento'
where not exists (select 1 from instituciones);

-- ── Verificación final ───────────────────────────────────────────────────────
select id, email, rol, activo from usuarios order by created_at asc;
select count(*) as total_instituciones from instituciones;
