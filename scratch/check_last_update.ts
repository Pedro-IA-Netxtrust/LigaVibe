import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLastUpdates() {
  console.log('🔌 VERIFICANDO CONEXIÓN A SUPABASE Y ÚLTIMAS ACTUALIZACIONES\n');

  try {
    // 1. Verificar conexión básica
    const { data: testCat, error: testErr } = await supabase.from('league_categories').select('id').limit(1);
    if (testErr) {
      throw new Error(`Error de conexión básico: ${testErr.message}`);
    }
    console.log('✅ Conexión establecida exitosamente con Supabase.\n');

    // 2. Obtener el último partido actualizado
    const { data: lastMatches, error: matchErr } = await supabase
      .from('league_matches')
      .select('updated_at, team1:league_teams!team1_id(team_name), team2:league_teams!team2_id(team_name), status, team1_sets, team2_sets, category:league_categories(name)')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (matchErr) {
      console.error('⚠️ Error al consultar league_matches:', matchErr.message);
    } else if (lastMatches && lastMatches.length > 0) {
      const m = lastMatches[0] as any;
      console.log('🎾 Último partido actualizado en la BD:');
      console.log(`   - Categoría: ${m.category?.name || 'Desconocida'}`);
      console.log(`   - Enfrentamiento: ${m.team1?.team_name || '?'} vs ${m.team2?.team_name || '?'}`);
      console.log(`   - Estado: ${m.status}`);
      console.log(`   - Resultado: ${m.team1_sets}-${m.team2_sets}`);
      console.log(`   - Fecha de actualización: ${new Date(m.updated_at).toLocaleString()}`);
      console.log('----------------------------------------------------');
    } else {
      console.log('ℹ️ No se encontraron partidos en la tabla league_matches.');
    }

    // 3. Obtener el último equipo / inscripción actualizada
    const { data: lastTeams, error: teamErr } = await supabase
      .from('league_teams')
      .select('updated_at, team_name, category:league_categories(name)')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (teamErr) {
      console.error('⚠️ Error al consultar league_teams:', teamErr.message);
    } else if (lastTeams && lastTeams.length > 0) {
      const t = lastTeams[0] as any;
      console.log('👥 Último equipo/inscripción actualizada:');
      console.log(`   - Categoría: ${t.category?.name || 'Desconocida'}`);
      console.log(`   - Nombre del Equipo: ${t.team_name}`);
      console.log(`   - Fecha de actualización: ${new Date(t.updated_at).toLocaleString()}`);
      console.log('----------------------------------------------------');
    }

    // 4. Obtener el último cierre de fase realizado
    const { data: lastClosures, error: closureErr } = await supabase
      .from('league_phase_closures')
      .select('closed_at, phase_closed, category:league_categories(name), notes')
      .order('closed_at', { ascending: false })
      .limit(1);

    if (closureErr) {
      // Es posible que la tabla no tenga registros o no exista todavía en el esquema
      console.log('ℹ️ No se pudo obtener cierres de fase (puede que la tabla esté vacía o no exista).');
    } else if (lastClosures && lastClosures.length > 0) {
      const c = lastClosures[0] as any;
      console.log('🔒 Último cierre de fase regular realizado:');
      console.log(`   - Categoría: ${c.category?.name || 'Desconocida'}`);
      console.log(`   - Fase cerrada: ${c.phase_closed}`);
      console.log(`   - Notas: ${c.notes || 'Ninguna'}`);
      console.log(`   - Fecha de cierre: ${new Date(c.closed_at).toLocaleString()}`);
      console.log('----------------------------------------------------');
    } else {
      console.log('ℹ️ No se han realizado cierres de fase regular todavía.');
    }

  } catch (err: any) {
    console.error('❌ Error general durante la verificación:', err.message);
  }
}

checkLastUpdates();
