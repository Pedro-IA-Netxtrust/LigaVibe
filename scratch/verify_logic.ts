import { computeStandingsFromMatches } from '../src/utils/standingsCalculator';
import { detectTiesAtBoundary, assignByes, generatePlayoffMatchups } from '../src/utils/playoffEngine';
import { sortStandingsWithTiebreakers } from '../src/utils/tiebreaker';
import type { ClassifiedTeam, PlayoffConfig, TiebreakerDecision } from '../src/types';

function runTests() {
  console.log('🧪 INICIANDO PRUEBAS DE SIMULACIÓN DE LÓGICA DEPORTIVA\n');

  let failed = false;
  const assert = (condition: boolean, message: string) => {
    if (!condition) {
      console.error(`❌ FALSO: ${message}`);
      failed = true;
    } else {
      console.log(`✅ ${message}`);
    }
  };

  // ==========================================
  // TEST 1: Cómputo de Standings y Reglas de Puntuación
  // ==========================================
  console.log('--- Test 1: Cálculo de Puntos y Standings ---');
  const teamNames = {
    'team-1': 'Pareja 1',
    'team-2': 'Pareja 2',
    'team-3': 'Pareja 3',
    'team-4': 'Pareja 4',
  };

  // Simulamos partidos:
  // - 1 vs 2: 1 gana 2-0 (sets 2-0, games 12-6) -> 1 obtiene 3 pts, 2 obtiene 0 pts
  // - 3 vs 4: 3 gana 2-1 (sets 2-1, games 15-13) -> 3 obtiene 2 pts, 4 obtiene 1 pt
  const simulatedMatches = [
    {
      team1_id: 'team-1',
      team2_id: 'team-2',
      winner_id: 'team-1',
      team1_sets: 2,
      team2_sets: 0,
      team1_games: 12,
      team2_games: 6,
    },
    {
      team1_id: 'team-3',
      team2_id: 'team-4',
      winner_id: 'team-3',
      team1_sets: 2,
      team2_sets: 1,
      team1_games: 15,
      team2_games: 13,
    }
  ];

  const standings = computeStandingsFromMatches(simulatedMatches, teamNames);

  const s1 = standings.find(s => s.league_team_id === 'team-1');
  const s2 = standings.find(s => s.league_team_id === 'team-2');
  const s3 = standings.find(s => s.league_team_id === 'team-3');
  const s4 = standings.find(s => s.league_team_id === 'team-4');

  assert(!!s1 && s1.points === 3, 'Victoria 2-0 otorga 3 puntos');
  assert(!!s2 && s2.points === 0, 'Derrota 0-2 otorga 0 puntos');
  assert(!!s3 && s3.points === 2, 'Victoria 2-1 otorga 2 puntos');
  assert(!!s4 && s4.points === 1, 'Derrota 1-2 otorga 1 punto');

  assert(!!s1 && s1.sets_for - s1.sets_against === 2, 'Diferencia sets Victoria 2-0 es +2');
  assert(!!s3 && s3.sets_for - s3.sets_against === 1, 'Diferencia sets Victoria 2-1 es +1');
  assert(!!s4 && s4.sets_for - s4.sets_against === -1, 'Diferencia sets Derrota 1-2 es -1');

  // ==========================================
  // TEST 2: Ordenación de Standings por Criterio por Defecto
  // ==========================================
  console.log('\n--- Test 2: Ordenación por Defecto ---');
  // team-1 tiene 3 pts (rank 1)
  // team-3 tiene 2 pts (rank 2)
  // team-4 tiene 1 pt (rank 3)
  // team-2 tiene 0 pts (rank 4)
  assert(standings[0].league_team_id === 'team-1', 'Primer lugar es para team-1 (3 pts)');
  assert(standings[1].league_team_id === 'team-3', 'Segundo lugar es para team-3 (2 pts)');
  assert(standings[2].league_team_id === 'team-4', 'Tercer lugar es para team-4 (1 pt)');
  assert(standings[3].league_team_id === 'team-2', 'Cuarto lugar es para team-2 (0 pts)');

  // ==========================================
  // TEST 3: Detección de Empates en la Frontera de Clasificación
  // ==========================================
  console.log('\n--- Test 3: Detección de Empates en el Límite ---');
  // Supongamos que clasifican 2 equipos, pero team-3 (pos 2) y team-4 (pos 3) empatan en todo.
  // Modificamos a team-4 para empatar con team-3 en todo: 2 pts, sets_for=2, sets_against=1, games_for=15, games_against=13.
  const tiedStandings = [
    {
      league_team_id: 'team-1',
      team_name: 'Pareja 1',
      played: 1, won: 1, lost: 0, won2_0: 1, won2_1: 0,
      points: 3, sets_for: 2, sets_against: 0, games_for: 12, games_against: 6
    },
    {
      league_team_id: 'team-3',
      team_name: 'Pareja 3',
      played: 1, won: 1, lost: 0, won2_0: 0, won2_1: 1,
      points: 2, sets_for: 2, sets_against: 1, games_for: 15, games_against: 13
    },
    {
      league_team_id: 'team-4',
      team_name: 'Pareja 4',
      played: 1, won: 1, lost: 0, won2_0: 0, won2_1: 1,
      points: 2, sets_for: 2, sets_against: 1, games_for: 15, games_against: 13
    },
    {
      league_team_id: 'team-2',
      team_name: 'Pareja 2',
      played: 1, won: 0, lost: 1, won2_0: 0, won2_1: 0,
      points: 0, sets_for: 0, sets_against: 2, games_for: 6, games_against: 12
    }
  ];

  const ties = detectTiesAtBoundary(tiedStandings, 2, 'grupo-a');
  assert(ties.length === 1, 'Se detecta un empate en la frontera de corte (2° clasificado)');
  assert(ties[0].teams.includes('team-3') && ties[0].teams.includes('team-4'), 'Los equipos empatados son team-3 y team-4');

  // ==========================================
  // TEST 4: Resolución y Aplicación de Desempates Manuales
  // ==========================================
  console.log('\n--- Test 4: Desempates Manuales ---');
  // Por defecto, sortStandings ordenará team-3 antes de team-4 (o al revés por nombre).
  // Si aplicamos una decisión manual que dice que team-4 va antes que team-3:
  const decisions: TiebreakerDecision[] = [
    {
      league_category_id: 'cat-1',
      league_group_id: 'grupo-a',
      phase: 1,
      team_ids_involved: ['team-3', 'team-4'],
      ordered_team_ids: ['team-4', 'team-3'], // manual override
      reason: 'Resultado directo'
    }
  ];

  const sortedWithManual = sortStandingsWithTiebreakers(tiedStandings, decisions);
  const posTeam4 = sortedWithManual.findIndex(s => s.league_team_id === 'team-4');
  const posTeam3 = sortedWithManual.findIndex(s => s.league_team_id === 'team-3');
  assert(posTeam4 < posTeam3, 'La decisión manual posiciona correctamente a team-4 antes que team-3');

  // ==========================================
  // TEST 5: Gestión de BYEs y Playoff Seeding
  // ==========================================
  console.log('\n--- Test 5: Asignación de BYEs ---');
  const classified: ClassifiedTeam[] = [
    { league_team_id: 'team-1', team_name: 'Pareja 1', group_id: 'grupo-a', group_name: 'Grupo A', rank_in_group: 1, overall_rank: 1, points: 3, sets_diff: 2, games_diff: 6 },
    { league_team_id: 'team-2', team_name: 'Pareja 2', group_id: 'grupo-b', group_name: 'Grupo B', rank_in_group: 1, overall_rank: 2, points: 3, sets_diff: 2, games_diff: 6 },
    { league_team_id: 'team-3', team_name: 'Pareja 3', group_id: 'grupo-a', group_name: 'Grupo A', rank_in_group: 2, overall_rank: 3, points: 2, sets_diff: 1, games_diff: 2 },
  ];

  const paddedFor4 = assignByes(classified, 4);
  assert(paddedFor4.length === 4, 'Se rellena el cuadro a 4 parejas');
  assert(paddedFor4[3].is_bye === true && paddedFor4[3].team_name === 'BYE', 'El último elemento es una pareja BYE');

  // ==========================================
  // TEST 6: Cruces entre Grupos (Cross-grouping)
  // ==========================================
  console.log('\n--- Test 6: Cruces de Grupo ---');
  // Para 2 grupos, clasificados = 4 (incluyendo el BYE).
  // Los clasificados reales:
  // - 1° de Grupo A: team-1
  // - 1° de Grupo B: team-2
  // - 2° de Grupo A: team-3
  // - BYE (4°)
  const crossConfig: Pick<PlayoffConfig, 'qualifiers_count' | 'cross_groups'> = {
    qualifiers_count: 4,
    cross_groups: true
  };

  const matchups = generatePlayoffMatchups(classified, crossConfig);
  assert(matchups.length === 2, 'Genera 2 semifinales');

  // Con cruzado:
  // SF1: 1A (team-1) contra el 2° del otro grupo. Pero el otro grupo es B, que no tiene 2° clasificado aquí (es el BYE, que es el 4° general, asignado como 2B en padding).
  // Veamos los emparejamientos reales generados por el algoritmo:
  console.log(`SF1: ${matchups[0].team1.team_name} vs ${matchups[0].team2.team_name} (${matchups[0].comment})`);
  console.log(`SF2: ${matchups[1].team1.team_name} vs ${matchups[1].team2.team_name} (${matchups[1].comment})`);

  // En seedWithGroupCrossing:
  // Para 2 grupos, 4 clasificados:
  // SF1: 1A contra 2B. 1A es team-1. 2B es el BYE.
  // SF2: 1B contra 2A. 1B es team-2. 2A es team-3.
  assert(matchups[0].team1.league_team_id === 'team-1' && matchups[0].team2.is_bye === true, 'SF1 es 1A (team-1) vs 2B (BYE)');
  assert(matchups[1].team1.league_team_id === 'team-2' && matchups[1].team2.league_team_id === 'team-3', 'SF2 es 1B (team-2) vs 2A (team-3)');

  if (failed) {
    console.error('\n🔴 ALGUNAS PRUEBAS FALLARON.');
    process.exit(1);
  } else {
    console.log('\n🟢 TODAS LAS PRUEBAS SE COMPLETARON CON ÉXITO.');
  }
}

runTests();
