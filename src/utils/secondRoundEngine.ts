import type { ComputedStanding } from './standingsCalculator';
import type { GroupConfig } from './fixtureEngine';
import type { LeagueTeam, SecondRoundGroupDetail } from '../types';
import { recommendQualifiers, type BracketSize } from './playoffEngine';

/** Standing de fase 1 con posición y grupo de origen. */
export type Phase1GroupStanding = ComputedStanding & {
  group_id: string | null;
  group_name: string;
  rank_in_group: number;
};

export type Phase1Format = 'single_group' | 'multi_group';

export type RedistributionMode = 'matrix' | 'snake_draft' | 'same_group';

export interface Phase2RulesResolved {
  format: Phase1Format;
  groups_count: number;
  teams_per_group: number;
  qualifiers_per_group: number;
  best_sixths_count: number;
  best_thirds_count: number;
  playoff_size: BracketSize;
  redistribution: RedistributionMode;
  summary: string;
  detail: string;
}

export function detectPhase1Format(phase1ByGroup: Phase1GroupStanding[][]): Phase1Format {
  return phase1ByGroup.length === 1 ? 'single_group' : 'multi_group';
}

function clampPlayoffSize(n: number): BracketSize {
  if (n <= 2) return 2;
  if (n <= 4) return 4;
  if (n <= 8) return 8;
  return 16;
}

/**
 * Resuelve reglas de segunda rueda y playoff según estructura de fase 1.
 * - Multi-grupo (2+): matriz de rotación por posición.
 * - Liga única: serpenteo por ranking o un solo grupo si son pocas parejas.
 */
export function resolvePhase2Rules(phase1ByGroup: Phase1GroupStanding[][]): Phase2RulesResolved {
  const G = phase1ByGroup.length;
  const teamCounts = phase1ByGroup.map((g) => g.length);
  const maxPerGroup = Math.max(...teamCounts, 0);

  if (G === 0) {
    return {
      format: 'single_group',
      groups_count: 1,
      teams_per_group: 0,
      qualifiers_per_group: 2,
      best_sixths_count: 0,
      best_thirds_count: 0,
      playoff_size: 4,
      redistribution: 'same_group',
      summary: 'Sin datos de fase 1.',
      detail: '',
    };
  }

  if (G === 1) {
    const n = teamCounts[0];
    let subGroups = 1;
    if (n >= 18 && n % 3 === 0) subGroups = 3;
    else if (n >= 12 && n % 3 === 0) subGroups = 3;
    else if (n >= 8) subGroups = 2;

    const perGroup = subGroups === 1 ? n : Math.ceil(n / subGroups);
    const qpg =
      subGroups === 3 && perGroup >= 6
        ? 5
        : Math.max(2, Math.min(8, Math.floor(perGroup / 2) || 2));
    const best6 = subGroups === 3 && perGroup >= 6 ? 1 : 0;
    const playoffTotal = subGroups * qpg + best6;

    if (subGroups === 1) {
      const playoffSize = clampPlayoffSize(Math.min(n, recommendQualifiers(n)));
      return {
        format: 'single_group',
        groups_count: 1,
        teams_per_group: n,
        qualifiers_per_group: Math.min(qpg, n),
        best_sixths_count: 0,
        best_thirds_count: 0,
        playoff_size: playoffSize,
        redistribution: 'same_group',
        summary: `Liga única (${n} parejas): segunda rueda en un solo grupo.`,
        detail: `Se mantienen todos los puntos de fase 1. Clasifican las mejores ${playoffSize} al playoff.`,
      };
    }

    return {
      format: 'single_group',
      groups_count: subGroups,
      teams_per_group: perGroup,
      qualifiers_per_group: qpg,
      best_sixths_count: best6,
      best_thirds_count: 0,
      playoff_size: clampPlayoffSize(playoffTotal),
      redistribution: 'snake_draft',
      summary: `Liga única (${n} parejas): se divide en ${subGroups} grupos por ranking.`,
      detail:
        best6 > 0
          ? `Serpenteo por posición general. Clasifican ${qpg} por grupo + mejor 6° (${playoffTotal} al playoff).`
          : `Serpenteo por posición general. Clasifican top ${qpg} por grupo.`,
    };
  }

  if (G === 3 && maxPerGroup >= 6) {
    return {
      format: 'multi_group',
      groups_count: 3,
      teams_per_group: maxPerGroup,
      qualifiers_per_group: 5,
      best_sixths_count: 1,
      best_thirds_count: 0,
      playoff_size: 16,
      redistribution: 'matrix',
      summary: `3 grupos × ${maxPerGroup} parejas: matriz de rotación A/B/C.`,
      detail:
        '1°, 4° y 7° mantienen grupo; 2°, 3°, 5° y 6° rotan. Clasifican 5 por grupo + mejor 6° (16 al playoff). Puntos de fase 1 se arrastran.',
    };
  }

  if (G === 2) {
    const qpg = maxPerGroup >= 6 ? 4 : Math.max(2, Math.floor(maxPerGroup / 2));
    const total = qpg * 2;
    return {
      format: 'multi_group',
      groups_count: 2,
      teams_per_group: maxPerGroup,
      qualifiers_per_group: qpg,
      best_sixths_count: 0,
      best_thirds_count: 0,
      playoff_size: clampPlayoffSize(total),
      redistribution: 'matrix',
      summary: `2 grupos × ${maxPerGroup} parejas: redistribución cruzada por posición.`,
      detail: `Matriz de rotación entre 2 grupos. Clasifican top ${qpg} de cada grupo (${total} al playoff).`,
    };
  }

  const qpg = Math.max(2, Math.floor(16 / G));
  const total = qpg * G;
  return {
    format: 'multi_group',
    groups_count: G,
    teams_per_group: maxPerGroup,
    qualifiers_per_group: qpg,
    best_sixths_count: 0,
    best_thirds_count: 0,
    playoff_size: clampPlayoffSize(total),
    redistribution: 'matrix',
    summary: `${G} grupos × ~${maxPerGroup} parejas: matriz de rotación.`,
    detail: `Clasifican top ${qpg} por grupo (${clampPlayoffSize(total)} al playoff).`,
  };
}

/**
 * Índice del grupo de origen para el nuevo grupo `newGroupIndex` en la fila `rank` (1-based).
 * Fórmula: (g + r - 1) % numGroups
 */
export function sourceGroupIndex(newGroupIndex: number, rank: number, numGroups: number): number {
  return (newGroupIndex + rank - 1) % numGroups;
}

/**
 * Redistribuye parejas según matriz de rotación por posición (2+ grupos en fase 1).
 */
export function redistributeByPositionMatrix(
  phase1ByGroup: Phase1GroupStanding[][]
): GroupConfig[] {
  const G = phase1ByGroup.length;
  if (G === 0) return [];

  const labels = phase1ByGroup.map(
    (g, i) => g[0]?.group_name ?? `Grupo ${String.fromCharCode(65 + i)}`
  );
  const maxRank = Math.max(...phase1ByGroup.map((g) => g.length), 0);

  const groups: GroupConfig[] = labels.map((label) => ({
    groupName: label,
    teams: [] as LeagueTeam[],
  }));

  for (let g = 0; g < G; g++) {
    for (let r = 1; r <= maxRank; r++) {
      const srcIdx = sourceGroupIndex(g, r, G);
      const standing = phase1ByGroup[srcIdx][r - 1];
      if (!standing) continue;
      groups[g].teams.push({
        id: standing.league_team_id,
        team_name: standing.team_name,
        order_index: r,
        is_seeded: r <= 3,
      } as LeagueTeam);
    }
  }

  return groups;
}

/** Liga única: divide por ranking en sub-grupos con serpenteo. */
export function splitSingleGroupBySnakeDraft(
  singleGroup: Phase1GroupStanding[],
  numGroups: number
): GroupConfig[] {
  const G = Math.max(1, numGroups);
  const labels = Array.from(
    { length: G },
    (_, i) => `Grupo ${String.fromCharCode(65 + i)}`
  );
  const groups: GroupConfig[] = labels.map((label) => ({
    groupName: label,
    teams: [] as LeagueTeam[],
  }));

  singleGroup.forEach((standing, i) => {
    const row = Math.floor(i / G);
    let col = i % G;
    if (row % 2 === 1) col = G - 1 - col;
    groups[col].teams.push({
      id: standing.league_team_id,
      team_name: standing.team_name,
      order_index: standing.rank_in_group,
      is_seeded: standing.rank_in_group <= 3,
    } as LeagueTeam);
  });

  return groups;
}

/** Liga única pequeña: mantiene un solo grupo en segunda rueda. */
export function keepSameGroupSecondRound(
  singleGroup: Phase1GroupStanding[]
): GroupConfig[] {
  const name = singleGroup[0]?.group_name ?? 'Liga Única';
  return [
    {
      groupName: name,
      teams: singleGroup.map(
        (s) =>
          ({
            id: s.league_team_id,
            team_name: s.team_name,
            order_index: s.rank_in_group,
            is_seeded: s.rank_in_group <= 3,
          }) as LeagueTeam
      ),
    },
  ];
}

/** Construye grupos de segunda rueda según formato detectado. */
export function buildSecondRoundGroups(
  phase1ByGroup: Phase1GroupStanding[][],
  rules: Phase2RulesResolved
): GroupConfig[] {
  if (rules.format === 'multi_group') {
    return redistributeByPositionMatrix(phase1ByGroup);
  }
  if (rules.redistribution === 'same_group') {
    return keepSameGroupSecondRound(phase1ByGroup[0]);
  }
  return splitSingleGroupBySnakeDraft(phase1ByGroup[0], rules.groups_count);
}

/** Grupos de segunda rueda con trazabilidad fase 1 → fase 2. */
export function buildSecondRoundGroupDetails(
  phase1ByGroup: Phase1GroupStanding[][],
  rules: Phase2RulesResolved
): SecondRoundGroupDetail[] {
  const groups = buildSecondRoundGroups(phase1ByGroup, rules);
  const lookup = new Map<string, Phase1GroupStanding>();
  phase1ByGroup.flat().forEach((s) => lookup.set(s.league_team_id, s));

  return groups.map((g) => ({
    groupName: g.groupName,
    teams: g.teams
      .map((t) => {
        const p1 = lookup.get(t.id);
        if (!p1) return null;
        const slot = t.order_index ?? p1.rank_in_group;
        return {
          league_team_id: t.id,
          team_name: t.team_name ?? p1.team_name,
          phase1_group_name: p1.group_name,
          phase1_rank_in_group: p1.rank_in_group,
          phase1_points: p1.points,
          destination_group_name: g.groupName,
          position_slot: slot,
          changed_group: p1.group_name !== g.groupName,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
      .sort((a, b) => a.position_slot - b.position_slot),
  }));
}

/** Suma estadísticas de fase 1 (baseline) + partidos de fase 2. */
export function mergeStandingStats(
  baseline: ComputedStanding,
  fromPhase2: ComputedStanding
): ComputedStanding {
  return {
    league_team_id: baseline.league_team_id,
    team_name: baseline.team_name,
    played: baseline.played + fromPhase2.played,
    won: baseline.won + fromPhase2.won,
    lost: baseline.lost + fromPhase2.lost,
    won2_0: baseline.won2_0 + fromPhase2.won2_0,
    won2_1: baseline.won2_1 + fromPhase2.won2_1,
    points: baseline.points + fromPhase2.points,
    sets_for: baseline.sets_for + fromPhase2.sets_for,
    sets_against: baseline.sets_against + fromPhase2.sets_against,
    games_for: baseline.games_for + fromPhase2.games_for,
    games_against: baseline.games_against + fromPhase2.games_against,
  };
}

export type CarryoverStats = {
  points: number;
  played: number;
  won: number;
  lost: number;
  sets_for: number;
  sets_against: number;
  games_for: number;
  games_against: number;
};

export function standingToCarryover(s: ComputedStanding): CarryoverStats {
  return {
    points: s.points,
    played: s.played,
    won: s.won,
    lost: s.lost,
    sets_for: s.sets_for,
    sets_against: s.sets_against,
    games_for: s.games_for,
    games_against: s.games_against,
  };
}

export function carryoverToStanding(teamId: string, teamName: string, c: CarryoverStats): ComputedStanding {
  return {
    league_team_id: teamId,
    team_name: teamName,
    played: c.played,
    won: c.won,
    lost: c.lost,
    won2_0: 0,
    won2_1: 0,
    points: c.points,
    sets_for: c.sets_for,
    sets_against: c.sets_against,
    games_for: c.games_for,
    games_against: c.games_against,
  };
}
