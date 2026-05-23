import { ComputedStanding } from './standingsCalculator';
import type { TiebreakerDecision, TieGroup } from '../types';

/** Clave estable para un cluster de parejas empatadas. */
export function tieClusterKey(teamIds: string[]): string {
  return [...teamIds].sort().join('|');
}

export function compareStandingsWithTiebreak(
  a: ComputedStanding,
  b: ComputedStanding,
  manualOrder: Map<string, number>
): number {
  if (b.points !== a.points) return b.points - a.points;
  const dsA = a.sets_for - a.sets_against;
  const dsB = b.sets_for - b.sets_against;
  if (dsB !== dsA) return dsB - dsA;
  const dgA = a.games_for - a.games_against;
  const dgB = b.games_for - b.games_against;
  if (dgB !== dgA) return dgB - dgA;

  const oA = manualOrder.get(a.league_team_id);
  const oB = manualOrder.get(b.league_team_id);
  if (oA !== undefined && oB !== undefined && oA !== oB) return oA - oB;

  return a.team_name.localeCompare(b.team_name);
}

export function sortStandingsWithTiebreakers(
  standings: ComputedStanding[],
  decisions: TiebreakerDecision[]
): ComputedStanding[] {
  const manualOrder = new Map<string, number>();
  for (const d of decisions) {
    (d.ordered_team_ids || []).forEach((id, idx) => manualOrder.set(id, idx));
  }
  return [...standings].sort((a, b) => compareStandingsWithTiebreak(a, b, manualOrder));
}

export function buildManualOrderMap(decisions: TiebreakerDecision[]): Map<string, number> {
  const manualOrder = new Map<string, number>();
  for (const d of decisions) {
    (d.ordered_team_ids || []).forEach((id, idx) => manualOrder.set(id, idx));
  }
  return manualOrder;
}

export function hasDecisionForTie(tie: TieGroup, decisions: TiebreakerDecision[]): boolean {
  const key = tieClusterKey(tie.teams);
  return decisions.some(
    (d) => tieClusterKey((d.team_ids_involved as string[]) || []) === key
  );
}

export function filterUnresolvedTies(
  ties: TieGroup[],
  decisions: TiebreakerDecision[]
): TieGroup[] {
  return ties.filter((t) => !hasDecisionForTie(t, decisions));
}

/** Cuántas plazas del grupo se definen por este empate (desde la primera pareja empatada). */
export function slotsAtStakeFromTie(standings: ComputedStanding[], tie: TieGroup, spots: number): number {
  const ids = new Set(tie.teams);
  const firstIdx = standings.findIndex((s) => ids.has(s.league_team_id));
  if (firstIdx < 0) return 1;
  return Math.max(1, Math.min(spots - firstIdx, tie.teams.length));
}

export function enrichTieGroup(
  tie: TieGroup,
  standings: ComputedStanding[],
  spots: number,
  groupName: string | null
): TieGroup {
  return {
    ...tie,
    group_name: groupName,
    spots_in_group: spots,
    slots_at_stake: slotsAtStakeFromTie(standings, tie, spots),
  };
}
