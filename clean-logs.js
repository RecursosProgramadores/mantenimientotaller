import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function clean() {
  console.log("Conectando a Supabase para eliminar registros de uso erróneos...");
  
  // 1. Borrar todos los logs de uso (o los que tienen operador null)
  const { error: err1 } = await supabase.from('uso_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (err1) console.error("Error al borrar logs:", err1.message);
  
  // 2. Reiniciar los ciclos de horas acumuladas a 0 para que la barra de % vuelva a 0
  const { error: err2 } = await supabase.from('uso_ciclos').update({ horas_acumuladas: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
  if (err2) console.error("Error al reiniciar ciclos:", err2.message);
  
  console.log("¡Limpieza de historial de uso completada exitosamente!");
}

clean();
