const { createClient } = require('@supabase/supabase-js');


const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function clean() {
  console.log("Autenticando en Supabase...");
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@gmail.com',
    password: 'taller2026'
  });
  if (authErr) {
    console.error("Error de auth:", authErr.message);
    return;
  }
  
  console.log("Conectando a Supabase para eliminar registros de uso erróneos...");
  
  const { error: err1 } = await supabase.from('uso_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (err1) console.error("Error al borrar logs:", err1.message);
  
  const { error: err2 } = await supabase.from('uso_ciclos').update({ horas_acumuladas: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
  if (err2) console.error("Error al reiniciar ciclos:", err2.message);
  
  console.log("¡Limpieza de historial de uso completada exitosamente!");
}

clean();
