import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim().replace(/"/g, '');
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function backfill() {
  const { data: logs, error: e1 } = await supabase.from('uso_logs').select('*');
  console.log("Logs count:", logs ? logs.length : 0, e1);
  if (e1) { console.error(e1); return; }

  const sums = {};
  logs.forEach(l => {
    if (!sums[l.maquina_id]) sums[l.maquina_id] = 0;
    sums[l.maquina_id] += Number(l.horas || 0);
  });

  for (const maquina_id of Object.keys(sums)) {
    const total = sums[maquina_id];
    console.log(`Maquina ${maquina_id} -> ${total} horas`);
    
    const { data: cycle } = await supabase.from('uso_ciclos').select('id').eq('maquina_id', maquina_id).maybeSingle();
    if (cycle) {
      await supabase.from('uso_ciclos').update({ horas_acumuladas: total }).eq('id', cycle.id);
      console.log(`Actualizado ${maquina_id}`);
    } else {
      await supabase.from('uso_ciclos').insert({ maquina_id, horas_acumuladas: total });
      console.log(`Insertado ${maquina_id}`);
    }
  }
}
backfill();
