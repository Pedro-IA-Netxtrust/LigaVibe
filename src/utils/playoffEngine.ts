import { ComputedStanding } from './standingsCalculator';
import { ClassifiedTeam, TieGroup, PlayoffConfig } from '../types';

export type BracketSize = 2 | 4 | 8 | 16;

// ---- SEEDING & CLASSIFICATION ----

export function detectTiesAtBoundary(
  standings: ComputedStanding[],
  qualifiers: number,
  groupId: string | null
): TieGroup[] {
  const ties: TieGroup[] = [];
  const lastQualifier = standings[qualifiers - 1];
  const firstOut = standings[qualifiers];

  if (!lastQualifier || !firstOut) return ties;

  const isTied = (a: ComputedStanding, b: ComputedStanding) =>
    a.points === b.points &&
    a.sets_for - a.sets_against === b.sets_for - b.sets_against &&
    a.games_for - a.games_against === b.games_for - b.games_against;

  if (isTied(lastQualifier, firstOut)) {
    const tiedTeams = standings.filter((s) => isTied(s, lastQualifier));
    ties.push({
      group_id: groupId,
      teams: tiedTeams.map((t) => t.league_team_id),
      rank_position: qualifiers,
    });
  }

  return ties;
}

export function recommendQualifiers(totalTeams: number): BracketSize {
  if (totalTeams <= 4) return 2;
  if (totalTeams <= 12) return 4;
  if (totalTeams <= 16) return 16;
  return 8;
}

export function assignByes(teams: ClassifiedTeam[], targetSize: BracketSize): ClassifiedTeam[] {
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

interface Matchup {
  slot: string;
  round: number;
  team1: ClassifiedTeam;
  team2: ClassifiedTeam;
  comment: string;
}

function realTeams(teams: ClassifiedTeam[]): ClassifiedTeam[] {
  return teams.filter((t) => !t.is_bye);
}

/** Sembrado olímpico estándar para cuadros de potencia de 2. */
export function seedOlympic(teams: ClassifiedTeam[]): Matchup[] {
  const n = teams.length;
  if (n < 2) return [];
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
  if (n === 16) {
    return [
      { slot: 'OF1', round: 1, team1: teams[0], team2: teams[15], comment: 'Octavos 1' },
      { slot: 'OF2', round: 1, team1: teams[7], team2: teams[8], comment: 'Octavos 2' },
      { slot: 'OF3', round: 1, team1: teams[3], team2: teams[12], comment: 'Octavos 3' },
      { slot: 'OF4', round: 1, team1: teams[4], team2: teams[11], comment: 'Octavos 4' },
      { slot: 'OF5', round: 1, team1: teams[1], team2: teams[14], comment: 'Octavos 5' },
      { slot: 'OF6', round: 1, team1: teams[6], team2: teams[9], comment: 'Octavos 6' },
      { slot: 'OF7', round: 1, team1: teams[2], team2: teams[13], comment: 'Octavos 7' },
      { slot: 'OF8', round: 1, team1: teams[5], team2: teams[10], comment: 'Octavos 8' },
    ];
  }
  return seedOlympic(teams.slice(0, 16));
}

export function seedWithGroupCrossing(teams: ClassifiedTeam[]): Matchup[] {
  const real = realTeams(teams);
  const groupIds = [...new Set(real.map((t) => t.group_id).filter(Boolean))];
  const n = teams.length;

  if (groupIds.length <= 1) return seedOlympic(teams);

  const byGroup: Record<string, ClassifiedTeam[]> = {};
  groupIds.forEach((id) => {
    byGroup[id] = [];
  });
  for (const t of real) {
    if (t.group_id) byGroup[t.group_id].push(t);
  }
  Object.values(byGroup).forEach((g) => g.sort((a, b) => a.rank_in_group - b.rank_in_group));

  const byes = teams.filter((t) => t.is_bye);
  let byeIdx = 0;
  const targetGroupSize = Math.floor(n / groupIds.length);
  groupIds.forEach((id) => {
    while (byGroup[id].length < targetGroupSize && byeIdx < byes.length) {
      byGroup[id].push(byes[byeIdx++]);
    }
  });

  if (groupIds.length === 2 && n === 4) {
    const [gA, gB] = groupIds.map((id) => byGroup[id]);
    return [
      { slot: 'SF1', round: 1, team1: gA[0], team2: gB[1], comment: 'Semifinal 1' },
      { slot: 'SF2', round: 1, team1: gB[0], team2: gA[1], comment: 'Semifinal 2' },
    ];
  }

  if (groupIds.length === 2 && n === 8) {
    const [gA, gB] = groupIds.map((id) => byGroup[id]);
    return [
      { slot: 'QF1', round: 1, team1: gA[0], team2: gB[3], comment: 'Cuartos 1' },
      { slot: 'QF2', round: 1, team1: gA[1], team2: gB[2], comment: 'Cuartos 2' },
      { slot: 'QF3', round: 1, team1: gB[0], team2: gA[3], comment: 'Cuartos 3' },
      { slot: 'QF4', round: 1, team1: gB[1], team2: gA[2], comment: 'Cuartos 4' },
    ];
  }

  if (groupIds.length === 3 && n === 16) {
    const sorted = [...teams].sort((a, b) => a.overall_rank - b.overall_rank);
    const matchups = seedOlympic(sorted);
    for (const matchup of matchups) {
      if (
        matchup.team1.group_id !== null &&
        matchup.team1.group_id === matchup.team2.group_id
      ) {
        matchup.comment += ' ⚠️ Mismo grupo';
      }
    }
    return matchups;
  }

  const sorted = [...teams].sort((a, b) => a.overall_rank - b.overall_rank);
  const matchups = seedOlympic(sorted);
  for (const matchup of matchups) {
    if (matchup.team1.group_id !== null && matchup.team1.group_id === matchup.team2.group_id) {
      matchup.comment += ' ⚠️ Mismo grupo';
    }
  }
  return matchups;
}

export function generatePlayoffMatchups(
  teams: ClassifiedTeam[],
  config: Pick<PlayoffConfig, 'qualifiers_count' | 'cross_groups'>
): Matchup[] {
  const top = teams.slice(0, config.qualifiers_count);
  const padded = assignByes(top, config.qualifiers_count);
  if (config.cross_groups && realTeams(padded).some((t) => t.group_id)) {
    return seedWithGroupCrossing(padded);
  }
  return seedOlympic(padded);
}

export function buildSubsequentRounds(
  firstRoundMatchups: Matchup[],
  _categoryId?: string
): Array<{ slot: string; round: number; comment: string; source_slot1: string; source_slot2: string }> {
  const subsequent: Array<{
    slot: string;
    round: number;
    comment: string;
    source_slot1: string;
    source_slot2: string;
  }> = [];

  const n = firstRoundMatchups.length;

  if (n === 8) {
    subsequent.push({ slot: 'CF1', round: 2, comment: 'Cuartos 1', source_slot1: 'OF1', source_slot2: 'OF2' });
    subsequent.push({ slot: 'CF2', round: 2, comment: 'Cuartos 2', source_slot1: 'OF3', source_slot2: 'OF4' });
    subsequent.push({ slot: 'CF3', round: 2, comment: 'Cuartos 3', source_slot1: 'OF5', source_slot2: 'OF6' });
    subsequent.push({ slot: 'CF4', round: 2, comment: 'Cuartos 4', source_slot1: 'OF7', source_slot2: 'OF8' });
    subsequent.push({ slot: 'SF1', round: 3, comment: 'Semifinal 1', source_slot1: 'CF1', source_slot2: 'CF2' });
    subsequent.push({ slot: 'SF2', round: 3, comment: 'Semifinal 2', source_slot1: 'CF3', source_slot2: 'CF4' });
    subsequent.push({ slot: 'F', round: 4, comment: 'Gran Final', source_slot1: 'SF1', source_slot2: 'SF2' });
  } else if (n === 4) {
    subsequent.push({ slot: 'SF1', round: 2, comment: 'Semifinal 1', source_slot1: 'QF1', source_slot2: 'QF2' });
    subsequent.push({ slot: 'SF2', round: 2, comment: 'Semifinal 2', source_slot1: 'QF3', source_slot2: 'QF4' });
    subsequent.push({ slot: 'F', round: 3, comment: 'Gran Final', source_slot1: 'SF1', source_slot2: 'SF2' });
  } else if (n === 2) {
    subsequent.push({ slot: 'F', round: 2, comment: 'Gran Final', source_slot1: 'SF1', source_slot2: 'SF2' });
  }

  return subsequent;
}

export type { Matchup };
