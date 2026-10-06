-- ============================================================================================
-- 015 — HABILITAR REALTIME EN uso_logs / uso_ciclos
--
-- Contexto: MantePro.tsx ya abre un canal `postgres_changes` y escucha UPDATE en uso_ciclos
-- (entre otras tablas) para refrescar el panel automáticamente. Pero ninguna migración
-- anterior agregó estas tablas a la publicación `supabase_realtime` — sin eso, Postgres
-- nunca emite el evento y el cliente nunca se entera, sin importar qué tan bien esté escrito
-- el `.on(...)` en el frontend. Por eso un registro nuevo (desde /registro-uso o desde el
-- panel) no aparecía "al instante" en Uso de Máquinas: había que refrescar la página a mano.
--
-- Este script agrega uso_logs y uso_ciclos a esa publicación (si no estuvieran ya, es
-- idempotente — se puede correr varias veces sin error). Con esto:
--   - INSERT en uso_logs  -> dispara el listener nuevo (ver MantePro.tsx) que refresca todo
--     y muestra un aviso con la máquina afectada.
--   - UPDATE en uso_ciclos (el upsert de horas acumuladas que ya hace tg_acumular_horas) ->
--     sigue disparando el refresh que ya existía.
--
-- CÓMO EJECUTAR: pégalo una sola vez en el SQL Editor de tu proyecto Supabase y dale Run.
-- No hace falta repetirlo ni migrar nada más — es autocontenido.
-- ============================================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'uso_logs'
  ) then
    alter publication supabase_realtime add table public.uso_logs;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'uso_ciclos'
  ) then
    alter publication supabase_realtime add table public.uso_ciclos;
  end if;
end $$;
