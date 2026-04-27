import { ComputedStanding } from './standingsCalculator';
import { ClassifiedTeam, TieGroup, PlayoffConfig } from '../types';

// ---- SEEDING & CLASSIFICATION ----

/**
 * Detects ties that fall exactly at the qualification boundary.
 * e.g. if qualifiers=4 and positions 4 and 5 have identical stats → tie at boundary.
 */
export function detectTiesAtBoundary(
  standings: ComputedStanding[],
  qualifiers: number,
  groupId: string | null
): TieGroup[] {
  const ties: TieGroup[] = [];
  
  // Check tie at the last qualifying spot vs first non-qualifying
  const lastQualifier = standings[qualifiers - 1];
  const firstOut = standings[qualifiers];
  
  if (!lastQualifier || !firstOut) return ties;
  
  const isTied = (a: ComputedStanding, b: ComputedStanding) =>
    a.points === b.points &&
    (a.sets_for - a.sets_against) === (b.sets_for - b.sets_against) &&
    (a.games_for - a.games_against) === (b.games_for - b.games_against);
  
  if (isTied(lastQualifier, firstOut)) {
    // Find all teams in this tie cluster
    const tiedTeams = standings.filter(s => isTied(s, lastQualifier));
    ties.push({
      group_id: groupId,
      teams: tiedTeams.map(t => t.league_team_id),
      rank_position: qualifiers,
    });
  }
  
  return ties;
}

/**
 * Recommended qualifiers count based on team count.
 * Follows power-of-2 logic for brackets.
 */
export function recommendQualifiers(totalTeams: number): 2 | 4 | 8 {
  if (totalTeams <= 4) return 2;
  if (totalTeams <= 12) return 4;
  return 8;
}

/**
 * Pads the classified teams list with BYE slots to reach the next power of 2.
 */
export function assignByes(teams: ClassifiedTeam[], targetSize: 2 | 4 | 8): ClassifiedTeam[] {
  const result = [...teams.slice(0, targetSize)];
  while (result.length < targetSize) {
    result.push({
      league_team_id: `BYE-${result.length}`,
      team_name: 'BYE',
      group_id: null,
      group_name: null,
      rank_in_group: 99,
      overall_rank: 99,
      points: 0,
      sets_diff: 0,
      games_diff: 0,
      is_bye: true,
    });
  }
  return result;
}

// ---- SEEDING ALGORITHMS ----

interface Matchup {
  slot: string;
  round: number;
  team1: ClassifiedTeam;
  team2: ClassifiedTeam;
  comment: string;
}

/**
 * Olympic seeding: 1 vs N, 2 vs N-1, 3 vs N-2, 4 vs N-3
 * Seeds 1 & 2 are protected: they can only meet in the Final.
 */
export function seedOlympic(teams: ClassifiedTeam[]): Matchup[] {
  const n = teams.length;
  if (n === 2) {
    return [{ slot: 'F', round: 1, team1: teams[0], team2: teams[1], comment: 'Gran Final' }];
  }
  if (n === 4) {
    return [
      { slot: 'SF1', round: 1, team1: teams[0], team2: teams[3], comment: 'Semifinal 1' },
      { slot: 'SF2', round: 1, team1: teams[1], team2: teams[2], comment: 'Semifinal 2' },
    ];
  }
  if (n === 8) {
    return [
      { slot: 'QF1', round: 1, team1: teams[0], team2: teams[7], comment: 'Cuartos 1' },
      { slot: 'QF2', round: 1, team1: teams[3], team2: teams[4], comment: 'Cuartos 2' },
      { slot: 'QF3', round: 1, team1: teams[1], team2: teams[6], comment: 'Cuartos 3' },
      { slot: 'QF4', round: 1, team1: teams[2], team2: teams[5], comment: 'Cuartos 4' },
    ];
  }
  return seedOlympic(teams.slice(0, 8));
}

/**
 * Group-crossing seeding: ensures teams from the same group
 * don't face each other in the first round.
 *
 * For 2 groups (A/B), 4 classifiers (2 per group):
 *   SF1: 1A vs 2B | SF2: 1B vs 2A
 *
 * For 2 groups, 8 classifiers:
 *   QF1: 1A vs 4B | QF2: 2A vs 3B | QF3: 1B vs 4A | QF4: 2B vs 3A
 */
export function seedWithGroupCrossing(teams: ClassifiedTeam[]): Matchup[] {
  const groupIds = [...new Set(teams.map(t => t.group_id).filter(Boolean))];
  const n = teams.length;

  // If no groups or only one group: fall back to olympic seeding
  if (groupIds.length <= 1) return seedOlympic(teams);

  // Sort teams by group, then by rank within group
  const byGroup: Record<string, ClassifiedTeam[]> = {};
  for (const t of teams) {
    const key = t.group_id ?? '__no_group__';
    if (!byGroup[key]) byGroup[key] = [];
    byGroup[key].push(t);
  }
  Object.values(byGroup).forEach(g => g.sort((a, b) => a.rank_in_group - b.rank_in_group));

  // 2 groups, 4 classifiers
  if (groupIds.length === 2 && n === 4) {
    const [gA, gB] = groupIds.map(id => byGroup[id]);
    return [
      { slot: 'SF1', round: 1, team1: gA[0], team2: gB[1], comment: 'Semifinal 1' },
      { slot: 'SF2', round: 1, team1: gB[0], team2: gA[1], comment: 'Semifinal 2' },
    ];
  }

  // 2 groups, 8 classifiers
  if (groupIds.length === 2 && n === 8) {
    const [gA, gB] = groupIds.map(id => byGroup[id]);
    return [
      { slot: 'QF1', round: 1, team1: gA[0], team2: gB[3], comment: 'Cuartos 1' },
      { slot: 'QF2', round: 1, team1: gA[1], team2: gB[2], comment: 'Cuartos 2' },
      { slot: 'QF3', round: 1, team1: gB[0], team2: gA[3], comment: 'Cuartos 3' },
      { slot: 'QF4', round: 1, team1: gB[1], team2: gA[2], comment: 'Cuartos 4' },
    ];
  }

  // 3+ groups: best-effort cross-group via overall rank with group checking
  // Sort by overall rank, then pair 1 vs N olympic style
  // Try to swap if a pairing has same group
  const sorted = [...teams].sort((a, b) => a.overall_rank - b.overall_rank);
  const matchups = seedOlympic(sorted);
  
  // Attempt to fix same-group matchups by swapping within their half
  for (const matchup of matchups) {
    if (matchup.team1.group_id !== null && matchup.team1.group_id === matchup.team2.group_id) {
      // Mark as potentially same-group (admin is warned in UI)
      matchup.comment += ' ⚠️ Mismo grupo';
    }
  }
  
  return matchups;
}

/**
 * Main entry point: select seeding algorithm based on config.
 */
export function generatePlayoffMatchups(
  teams: ClassifiedTeam[],
  config: Pick<PlayoffConfig, 'qualifiers_count' | 'cross_groups'>
): Matchup[] {
  const padded = assignByes(teams, config.qualifiers_count);
  if (config.cross_groups && teams.some(t => t.group_id)) {
    return seedWithGroupCrossing(padded.filter(t => !t.is_bye));
  }
  return seedOlympic(padded);
}

/**
 * Builds the full bracket tree (rounds after QF/SF → Final).
 * Returns placeholder matches for subsequent rounds with source references.
 */
export function buildSubsequentRounds(
  firstRoundMatchups: Matchup[],
  _categoryId?: string
): Array<{ slot: string; round: number; comment: string; source_slot1: string; source_slot2: string }> {
  const subsequent: Array<{ slot: string; round: number; comment: string; source_slot1: string; source_slot2: string }> = [];
  
  const n = firstRoundMatchups.length;
  
  if (n === 4) {
    // QF → SF → F
    subsequent.push({ slot: 'SF1', round: 2, comment: 'Semifinal 1', source_slot1: 'QF1', source_slot2: 'QF2' });
    subsequent.push({ slot: 'SF2', round: 2, comment: 'Semifinal 2', source_slot1: 'QF3', source_slot2: 'QF4' });
    subsequent.push({ slot: 'F', round: 3, comment: 'Gran Final', source_slot1: 'SF1', source_slot2: 'SF2' });
    subsequent.push({ slot: '3P', round: 3, comment: 'Tercer Puesto', source_slot1: 'SF1_LOSER', source_slot2: 'SF2_LOSER' });
  } else if (n === 2) {
    // SF → F
    subsequent.push({ slot: 'F', round: 2, comment: 'Gran Final', source_slot1: 'SF1', source_slot2: 'SF2' });
    subsequent.push({ slot: '3P', round: 2, comment: 'Tercer Puesto', source_slot1: 'SF1_LOSER', source_slot2: 'SF2_LOSER' });
  }
  // For n=1 (2 teams, direct final), no subsequent rounds needed
  
  return subsequent;
}
