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

async function run() {
  console.log('📊 OBTENIENDO ESTADO OPERATIVO DE CATEGORÍAS EN LA BD\n');

  const { data: categories, error: catErr } = await supabase
    .from('league_categories')
    .select('id, name, fixture_status');

  if (catErr) {
    console.error('Error fetching categories:', catErr.message);
    process.exit(1);
  }

  for (const cat of categories || []) {
    const { count: teamCount } = await supabase
      .from('league_teams')
      .select('*', { count: 'exact', head: true })
      .eq('league_category_id', cat.id);

    const { data: matches } = await supabase
      .from('league_matches')
      .select('status, phase')
      .eq('league_category_id', cat.id);

    const totalMatches = matches?.length || 0;
    const playedMatches = matches?.filter(m => m.status === 'jugado').length || 0;
    const phase1Matches = matches?.filter(m => m.phase === 1).length || 0;
    const phase2Matches = matches?.filter(m => m.phase === 2).length || 0;

    console.log(`🏆 Categoría: ${cat.name}`);
    console.log(`   - ID: ${cat.id}`);
    console.log(`   - Estado del Fixture (fixture_status): ${cat.fixture_status}`);
    console.log(`   - Parejas inscritas: ${teamCount}`);
    console.log(`   - Partidos totales: ${totalMatches} (${playedMatches} jugados, ${totalMatches - playedMatches} pendientes)`);
    console.log(`   - Fase 1 (Regular): ${phase1Matches} partidos`);
    console.log(`   - Fase 2 (Playoffs): ${phase2Matches} partidos`);
    console.log('----------------------------------------------------');
  }
}

run();
