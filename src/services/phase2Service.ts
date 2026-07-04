import { supabase } from '../lib/supabase';
import { mapSupabaseError } from '../lib/supabaseErrors';
import { PHASE_SECOND_ROUND } from '../constants/phases';
import { computeStandingsFromMatches } from '../utils/standingsCalculator';
import { sortStandingsWithTiebreakers } from '../utils/tiebreaker';
import { FixtureEngine } from '../utils/fixtureEngine';
import {
  buildSecondRoundGroups,
  mergeStandingStats,
  standingToCarryover,
  carryoverToStanding,
  resolvePhase2Rules,
  type Phase1GroupStanding,
  type CarryoverStats,
  type Phase2RulesResolved,
} from '../utils/secondRoundEngine';
import { tiebreakerService } from './tiebreakerService';
import type {
  LeagueTeam,
  LeagueMatch,
  Phase2Config,
  Phase2Mode,
  Phase2Participant,
  Phase2Classification,
  Phase2GroupStanding,
  ClassifiedTeam,
} from '../types';

/** Defaults torneo 3×7 (se sobreescriben al detectar formato de categoría). */
export const TOURNAMENT_PHASE2_DEFAULTS = {
  groups_count: 3,
  teams_per_group: 7,
  qualifiers_per_group: 5,
  best_sixths_count: 1,
  best_thirds_count: 0,
} as const;

function rulesToConfig(rules: Phase2RulesResolved): Partial<Phase2Config> {
  return {
    groups_count: rules.groups_count,
    teams_per_group: rules.teams_per_group,
    qualifiers_per_group: rules.qualifiers_per_group,
    best_sixths_count: rules.best_sixths_count,
    best_thirds_count: rules.best_thirds_count,
  };
}

type Phase2ConfigRow = {
  id: string;
  league_category_id: string;
  phase: number;
  mode: Phase2Mode;
  groups_count: number;
  teams_per_group: number;
  qualifiers_per_group: number;
  best_thirds_count: number;
  best_sixths_count: number;
  cross_groups: boolean;
  protect_seeds: boolean;
  points_win: number;
  points_loss: number;
  points_walkover: number;
  points_no_show: number;
  created_at: string;
  updated_at: string;
};

type Phase2ParticipantRow = {
  id: string;
  league_category_id: string;
  phase: number;
  league_team_id: string;
  source_phase_closure_id: string | null;
  seed: number | null;
  manually_added: boolean;
  manually_removed: boolean;
  notes: string | null;
  carryover_points: number;
  carryover_played: number;
  carryover_won: number;
  carryover_lost: number;
  carryover_sets_for: number;
  carryover_sets_against: number;
  carryover_games_for: number;
  carryover_games_against: number;
  created_at: string;
  updated_at: string;
  team?: { team_name?: string | null } | null;
};

function toPhase2Config(row: Phase2ConfigRow): Phase2Config {
  return {
    ...row,
    phase: PHASE_SECOND_ROUND,
    mode: 'group_league',
    best_sixths_count: row.best_sixths_count ?? 0,
  };
}

function toPhase2Participant(row: Phase2ParticipantRow): Phase2Participant {
  return {
    id: row.id,
    league_category_id: row.league_category_id,
    phase: PHASE_SECOND_ROUND,
    league_team_id: row.league_team_id,
    source_phase_closure_id: row.source_phase_closure_id,
    seed: row.seed,
    manually_added: row.manually_added,
    manually_removed: row.manually_removed,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
    team_name: row.team?.team_name ?? undefined,
  };
}

function rowCarryover(row: Phase2ParticipantRow): CarryoverStats {
  return {
    points: row.carryover_points ?? 0,
    played: row.carryover_played ?? 0,
    won: row.carryover_won ?? 0,
    lost: row.carryover_lost ?? 0,
    sets_for: row.carryover_sets_for ?? 0,
    sets_against: row.carryover_sets_against ?? 0,
    games_for: row.carryover_games_for ?? 0,
    games_against: row.carryover_games_against ?? 0,
  };
}

function compareStandings(a: Phase2GroupStanding, b: Phase2GroupStanding): number {
  if (b.points !== a.points) return b.points - a.points;
  if (b.sets_diff !== a.sets_diff) return b.sets_diff - a.sets_diff;
  return b.games_diff - a.games_diff;
}

export const phase2Service = {
  async getConfig(categoryId: string): Promise<Phase2Config | null> {
    const { data, error } = await supabase
      .from('league_phase2_config')
      .select('*')
      .eq('league_category_id', categoryId)
      .eq('phase', PHASE_SECOND_ROUND)
      .maybeSingle();

    if (error) throw new Error(mapSupabaseError(error));
    if (!data) return null;
    return toPhase2Config(data as Phase2ConfigRow);
  },

  async saveConfig(categoryId: string, partial: Partial<Phase2Config> = {}): Promise<Phase2Config> {
    const existing = await this.getConfig(categoryId);

    const payload: Partial<Phase2ConfigRow> = {
      league_category_id: categoryId,
      phase: PHASE_SECOND_ROUND,
      mode: 'group_league',
      groups_count: partial.groups_count ?? TOURNAMENT_PHASE2_DEFAULTS.groups_count,
      teams_per_group: partial.teams_per_group ?? TOURNAMENT_PHASE2_DEFAULTS.teams_per_group,
      qualifiers_per_group:
        partial.qualifiers_per_group ?? TOURNAMENT_PHASE2_DEFAULTS.qualifiers_per_group,
      best_thirds_count: partial.best_thirds_count ?? TOURNAMENT_PHASE2_DEFAULTS.best_thirds_count,
      best_sixths_count: partial.best_sixths_count ?? TOURNAMENT_PHASE2_DEFAULTS.best_sixths_count,
      cross_groups: partial.cross_groups ?? true,
      protect_seeds: partial.protect_seeds ?? true,
      points_win: partial.points_win ?? 2,
      points_loss: partial.points_loss ?? 1,
      points_walkover: partial.points_walkover ?? 2,
      points_no_show: partial.points_no_show ?? 0,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { data, error } = await supabase
        .from('league_phase2_config')
        .update(payload)
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) throw new Error(mapSupabaseError(error));
      return toPhase2Config(data as Phase2ConfigRow);
    }

    const { data, error } = await supabase
      .from('league_phase2_config')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw new Error(mapSupabaseError(error));
    return toPhase2Config(data as Phase2ConfigRow);
  },

  /** Standings de fase 1 ordenados por grupo (posiciones 1..N). */
  async getPhase1StandingsByGroup(categoryId: string): Promise<Phase1GroupStanding[][]> {
    const { data: matches, error: mErr } = await supabase
      .from('league_matches')
      .select(`
        id, status, league_group_id, team1_id, team2_id, winner_id,
        team1_sets, team2_sets, team1_games, team2_games,
        team1:league_teams!team1_id(id, team_name),
        team2:league_teams!team2_id(id, team_name),
        group:league_groups(id, group_name)
      `)
      .eq('league_category_id', categoryId)
      .eq('phase', 1);

    if (mErr) throw new Error(mapSupabaseError(mErr));
    const allMatches = matches || [];
    const tiebreakerDecisions = await tiebreakerService.getForCategory(categoryId, 1);

    const teamNames: Record<string, string> = {};
    allMatches.forEach((m: any) => {
      if (m.team1?.team_name) teamNames[m.team1_id] = m.team1.team_name;
      if (m.team2?.team_name) teamNames[m.team2_id] = m.team2.team_name;
    });

    const groupMap: Record<
      string,
      { group_id: string | null; group_name: string | null; matches: any[] }
    > = {};
    allMatches.forEach((m: any) => {
      const key = m.league_group_id ?? '__liga__';
      if (!groupMap[key]) {
        groupMap[key] = {
          group_id: m.league_group_id ?? null,
          group_name: m.group?.group_name ?? null,
          matches: [],
        };
      }
      groupMap[key].matches.push(m);
    });

    const keys = Object.keys(groupMap).sort((a, b) => {
      const na = groupMap[a].group_name ?? 'z';
      const nb = groupMap[b].group_name ?? 'z';
      return na.localeCompare(nb);
    });

    return keys.map((key) => {
      const group = groupMap[key];
      const finished = group.matches.filter((m: any) => m.status === 'jugado');
      const groupNames = Object.fromEntries(
        Object.entries(teamNames).filter(([id]) =>
          group.matches.some((m: any) => m.team1_id === id || m.team2_id === id)
        )
      );
      const raw = computeStandingsFromMatches(finished, groupNames);
      const standings = sortStandingsWithTiebreakers(raw, tiebreakerDecisions);
      return standings.map((s, idx) => ({
        ...s,
        group_id: group.group_id,
        group_name:
          group.group_name ??
          (key === '__liga__' ? 'Liga Única' : `Grupo ${String.fromCharCode(65 + keys.indexOf(key))}`),
        rank_in_group: idx + 1,
      }));
    });
  },

  async getParticipants(categoryId: string): Promise<Phase2Participant[]> {
    const { data, error } = await supabase
      .from('league_phase2_participants')
      .select(`
        *,
        team:league_teams!league_team_id(team_name)
      `)
      .eq('league_category_id', categoryId)
      .eq('phase', PHASE_SECOND_ROUND)
      .eq('manually_removed', false)
      .order('seed', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) throw new Error(mapSupabaseError(error));
    return ((data || []) as Phase2ParticipantRow[]).map(toPhase2Participant);
  },

  async getParticipantCarryoverMap(categoryId: string): Promise<Map<string, CarryoverStats>> {
    const { data, error } = await supabase
      .from('league_phase2_participants')
      .select('*')
      .eq('league_category_id', categoryId)
      .eq('phase', PHASE_SECOND_ROUND)
      .eq('manually_removed', false);

    if (error) throw new Error(mapSupabaseError(error));
    const map = new Map<string, CarryoverStats>();
    ((data || []) as Phase2ParticipantRow[]).forEach((row) => {
      map.set(row.league_team_id, rowCarryover(row));
    });
    return map;
  },

  async seedParticipantsFromPhase1(
    categoryId: string,
    teamIds: string[],
    sourceClosureId: string | null = null,
    carryoverByTeam?: Map<string, CarryoverStats>
  ): Promise<void> {
    if (!teamIds.length) return;

    const rows = teamIds.map((id, idx) => {
      const c = carryoverByTeam?.get(id);
      return {
        league_category_id: categoryId,
        phase: PHASE_SECOND_ROUND,
        league_team_id: id,
        source_phase_closure_id: sourceClosureId,
        seed: idx + 1,
        manually_added: false,
        manually_removed: false,
        notes: null,
        carryover_points: c?.points ?? 0,
        carryover_played: c?.played ?? 0,
        carryover_won: c?.won ?? 0,
        carryover_lost: c?.lost ?? 0,
        carryover_sets_for: c?.sets_for ?? 0,
        carryover_sets_against: c?.sets_against ?? 0,
        carryover_games_for: c?.games_for ?? 0,
        carryover_games_against: c?.games_against ?? 0,
      };
    });

    const { error } = await supabase
      .from('league_phase2_participants')
      .upsert(rows, { onConflict: 'league_category_id,phase,league_team_id' });

    if (error) throw new Error(mapSupabaseError(error));
  },

  async addParticipant(
    categoryId: string,
    leagueTeamId: string,
    options: { seed?: number | null; notes?: string | null } = {}
  ): Promise<void> {
    const { error } = await supabase
      .from('league_phase2_participants')
      .upsert(
        {
          league_category_id: categoryId,
          phase: PHASE_SECOND_ROUND,
          league_team_id: leagueTeamId,
          seed: options.seed ?? null,
          manually_added: true,
          manually_removed: false,
          notes: options.notes ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'league_category_id,phase,league_team_id' }
      );

    if (error) throw new Error(mapSupabaseError(error));
  },

  async removeParticipant(categoryId: string, leagueTeamId: string): Promise<void> {
    const { error } = await supabase
      .from('league_phase2_participants')
      .update({ manually_removed: true, updated_at: new Date().toISOString() })
      .eq('league_category_id', categoryId)
      .eq('phase', PHASE_SECOND_ROUND)
      .eq('league_team_id', leagueTeamId);

    if (error) throw new Error(mapSupabaseError(error));
  },

  async clearPhase2Data(categoryId: string): Promise<void> {
    await supabase
      .from('league_phase2_participants')
      .delete()
      .eq('league_category_id', categoryId)
      .eq('phase', PHASE_SECOND_ROUND);

    const { error: mErr } = await supabase
      .from('league_matches')
      .delete()
      .eq('league_category_id', categoryId)
      .eq('phase', PHASE_SECOND_ROUND);
    if (mErr) throw new Error(mapSupabaseError(mErr));

    const { error: gErr } = await supabase
      .from('league_groups')
      .delete()
      .eq('league_category_id', categoryId)
      .eq('phase', PHASE_SECOND_ROUND);
    if (gErr) throw new Error(mapSupabaseError(gErr));

    const { error: sErr } = await supabase
      .from('league_standings')
      .delete()
      .eq('league_category_id', categoryId)
      .eq('phase', PHASE_SECOND_ROUND);
    if (sErr) throw new Error(mapSupabaseError(sErr));
  },

  /** Preview de reglas según estructura actual de fase 1 (grupos vs liga única). */
  async getPhase2RulesPreview(categoryId: string): Promise<Phase2RulesResolved> {
    const phase1Groups = await this.getPhase1StandingsByGroup(categoryId);
    return resolvePhase2Rules(phase1Groups);
  },

  /**
   * - Matriz de redistribución A/B/C por posición
   * - Arrastre de puntos/sets/juegos de fase 1
   * - Round robin por grupo (fase 2)
   */
  async generateSecondRoundFromPhase1(
    categoryId: string,
    options: { isDoubleRound?: boolean } = {}
  ): Promise<void> {
    const phase1Groups = await this.getPhase1StandingsByGroup(categoryId);
    if (phase1Groups.length === 0 || phase1Groups.every((g) => g.length === 0)) {
      throw new Error('No hay standings de fase 1. Juega partidos antes de generar la segunda rueda.');
    }

    const rules = resolvePhase2Rules(phase1Groups);
    const redistributed = buildSecondRoundGroups(phase1Groups, rules);

    if (redistributed.some((g) => g.teams.length < 2) && rules.redistribution !== 'same_group') {
      throw new Error('Algún grupo de segunda rueda quedaría con menos de 2 parejas.');
    }
    if (redistributed.every((g) => g.teams.length < 2)) {
      throw new Error('Se requieren al menos 2 parejas para generar la segunda rueda.');
    }

    await this.saveConfig(categoryId, rulesToConfig(rules));
    await this.clearPhase2Data(categoryId);

    const carryoverByTeam = new Map<string, CarryoverStats>();
    const phase1Lookup = new Map<string, Phase1GroupStanding>();
    phase1Groups.flat().forEach((s) => {
      phase1Lookup.set(s.league_team_id, s);
      carryoverByTeam.set(s.league_team_id, standingToCarryover(s));
    });

    const allTeamIds = redistributed.flatMap((g) => g.teams.map((t) => t.id));
    await this.seedParticipantsFromPhase1(categoryId, allTeamIds, null, carryoverByTeam);

    const { error: cErr } = await supabase.from('league_groups').insert(
      redistributed.map((g) => ({
        league_category_id: categoryId,
        phase: PHASE_SECOND_ROUND,
        group_name: g.groupName,
      }))
    );
    if (cErr) throw new Error(mapSupabaseError(cErr));

    const { data: createdGroups, error: gErr } = await supabase
      .from('league_groups')
      .select('id, group_name')
      .eq('league_category_id', categoryId)
      .eq('phase', PHASE_SECOND_ROUND);
    if (gErr) throw new Error(mapSupabaseError(gErr));

    const groupNameToId = new Map<string, string>(
      (createdGroups || []).map((g: any) => [g.group_name, g.id])
    );

    const standingRows: Record<string, unknown>[] = [];
    redistributed.forEach((g) => {
      const groupId = groupNameToId.get(g.groupName);
      g.teams.forEach((t) => {
        const p1 = phase1Lookup.get(t.id);
        if (!p1 || !groupId) return;
        standingRows.push({
          league_category_id: categoryId,
          league_group_id: groupId,
          league_team_id: t.id,
          phase: PHASE_SECOND_ROUND,
          played: p1.played,
          won: p1.won,
          lost: p1.lost,
          won2_0: p1.won2_0,
          won2_1: p1.won2_1,
          points: p1.points,
          sets_for: p1.sets_for,
          sets_against: p1.sets_against,
          games_for: p1.games_for,
          games_against: p1.games_against,
        });
      });
    });

    if (standingRows.length > 0) {
      const { error: sErr } = await supabase.from('league_standings').insert(standingRows);
      if (sErr) throw new Error(mapSupabaseError(sErr));
    }

    const matches = redistributed.flatMap((g) =>
      FixtureEngine.generateRoundRobin(
        g.teams as LeagueTeam[],
        categoryId,
        g.groupName,
        options.isDoubleRound ?? false
      ).map((m) => ({
        ...m,
        league_group_id: groupNameToId.get(g.groupName) ?? null,
        phase: PHASE_SECOND_ROUND,
      }))
    );

    if (matches.length > 0) {
      const { error: mErr } = await supabase.from('league_matches').insert(matches);
      if (mErr) throw new Error(mapSupabaseError(mErr));
    }
  },

  /** @deprecated Usar generateSecondRoundFromPhase1 */
  async generateGroupMatchesPhase2(
    categoryId: string,
    options: { isDoubleRound?: boolean } = {}
  ): Promise<void> {
    return this.generateSecondRoundFromPhase1(categoryId, options);
  },

  async getPhase2Matches(categoryId: string): Promise<LeagueMatch[]> {
    const { data, error } = await supabase
      .from('league_matches')
      .select('*')
      .eq('league_category_id', categoryId)
      .eq('phase', PHASE_SECOND_ROUND);

    if (error) throw new Error(mapSupabaseError(error));
    return (data as LeagueMatch[]) || [];
  },

  async previewPhase2Standings(categoryId: string): Promise<Phase2GroupStanding[]> {
    const { data: matches, error: mErr } = await supabase
      .from('league_matches')
      .select(`
        id, status, league_group_id, team1_id, team2_id, winner_id,
        team1_sets, team2_sets, team1_games, team2_games,
        team1:league_teams!team1_id(id, team_name),
        team2:league_teams!team2_id(id, team_name),
        group:league_groups(id, group_name)
      `)
      .eq('league_category_id', categoryId)
      .eq('phase', PHASE_SECOND_ROUND);

    if (mErr) throw new Error(mapSupabaseError(mErr));
    const allMatches = matches || [];
    const tiebreakerDecisions = await tiebreakerService.getForCategory(categoryId, PHASE_SECOND_ROUND);
    const carryoverMap = await this.getParticipantCarryoverMap(categoryId);

    const teamNames: Record<string, string> = {};
    allMatches.forEach((m: any) => {
      if (m.team1?.team_name) teamNames[m.team1_id] = m.team1.team_name;
      if (m.team2?.team_name) teamNames[m.team2_id] = m.team2.team_name;
    });

    const groupMap: Record<
      string,
      { group_id: string | null; group_name: string | null; matches: any[]; teamIds: Set<string> }
    > = {};
    allMatches.forEach((m: any) => {
      const key = m.league_group_id ?? '__liga__';
      if (!groupMap[key]) {
        groupMap[key] = {
          group_id: m.league_group_id ?? null,
          group_name: m.group?.group_name ?? null,
          matches: [],
          teamIds: new Set(),
        };
      }
      groupMap[key].matches.push(m);
      if (m.team1_id) groupMap[key].teamIds.add(m.team1_id);
      if (m.team2_id) groupMap[key].teamIds.add(m.team2_id);
    });

    const rows: Phase2GroupStanding[] = [];
    const keys = Object.keys(groupMap).sort((a, b) => {
      const na = groupMap[a].group_name ?? 'z';
      const nb = groupMap[b].group_name ?? 'z';
      return na.localeCompare(nb);
    });

    for (const k of keys) {
      const group = groupMap[k];
      const finished = group.matches.filter((m) => m.status === 'jugado');
      const groupNames = Object.fromEntries(
        [...group.teamIds].map((id) => [id, teamNames[id] ?? id.slice(0, 8)])
      );

      const phase2Only = computeStandingsFromMatches(finished, groupNames);

      const merged = [...group.teamIds].map((teamId) => {
        const name = teamNames[teamId] ?? teamId.slice(0, 8);
        const carry = carryoverMap.get(teamId);
        const baseline = carry
          ? carryoverToStanding(teamId, name, carry)
          : computeStandingsFromMatches([], { [teamId]: name })[0] ??
            carryoverToStanding(teamId, name, {
              points: 0,
              played: 0,
              won: 0,
              lost: 0,
              sets_for: 0,
              sets_against: 0,
              games_for: 0,
              games_against: 0,
            });
        const delta = phase2Only.find((s) => s.league_team_id === teamId);
        return delta ? mergeStandingStats(baseline, delta) : baseline;
      });

      const standings = sortStandingsWithTiebreakers(merged, tiebreakerDecisions);

      standings.forEach((s, idx) => {
        rows.push({
          league_team_id: s.league_team_id,
          team_name: s.team_name,
          group_id: group.group_id,
          group_name: group.group_name,
          rank_in_group: idx + 1,
          points: s.points,
          played: s.played,
          won: s.won,
          lost: s.lost,
          sets_for: s.sets_for,
          sets_against: s.sets_against,
          games_for: s.games_for,
          games_against: s.games_against,
          sets_diff: s.sets_for - s.sets_against,
          games_diff: s.games_for - s.games_against,
        });
      });
    }

    return rows;
  },

  /**
   * Clasificación a playoffs: top N por grupo + mejor 6° (configurable).
   * Default: 5 + 5 + 5 + mejor 6° = 16.
   */
  async getPhase2Classification(categoryId: string): Promise<Phase2Classification> {
    const config =
      (await this.getConfig(categoryId)) ?? (await this.saveConfig(categoryId, rulesToConfig(
        resolvePhase2Rules(await this.getPhase1StandingsByGroup(categoryId))
      )));
    const standings = await this.previewPhase2Standings(categoryId);

    const byGroup = new Map<string, Phase2GroupStanding[]>();
    standings.forEach((s) => {
      const key = s.group_id ?? '__liga__';
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key)!.push(s);
    });

    const classified: Phase2GroupStanding[] = [];
    const waiting: Phase2GroupStanding[] = [];

    byGroup.forEach((list) => {
      list.sort((a, b) => a.rank_in_group - b.rank_in_group);
      classified.push(...list.slice(0, config.qualifiers_per_group));
      waiting.push(...list.slice(config.qualifiers_per_group));
    });

    if (config.best_sixths_count > 0) {
      const sixths = waiting.filter((w) => w.rank_in_group === 6);
      const bestSixths = [...sixths].sort(compareStandings).slice(0, config.best_sixths_count);
      const bestIds = new Set(bestSixths.map((b) => b.league_team_id));
      classified.push(...bestSixths);
      const finalWaiting = waiting.filter((w) => !bestIds.has(w.league_team_id));
      return { classified, waiting_list: finalWaiting };
    }

    if (config.best_thirds_count > 0 && waiting.length > 0) {
      const best = [...waiting].sort(compareStandings).slice(0, config.best_thirds_count);
      const bestIds = new Set(best.map((b) => b.league_team_id));
      classified.push(...best);
      return { classified, waiting_list: waiting.filter((w) => !bestIds.has(w.league_team_id)) };
    }

    return { classified, waiting_list: waiting };
  },

  /** Clasificados a playoff como ClassifiedTeam con seed global 1..16. */
  async getPlayoffClassifiedTeams(categoryId: string): Promise<ClassifiedTeam[]> {
    const { classified } = await this.getPhase2Classification(categoryId);
    const sorted = [...classified].sort(compareStandings);
    return sorted.map((s, i) => ({
      league_team_id: s.league_team_id,
      team_name: s.team_name,
      group_id: s.group_id,
      group_name: s.group_name,
      rank_in_group: s.rank_in_group,
      overall_rank: i + 1,
      points: s.points,
      sets_diff: s.sets_diff,
      games_diff: s.games_diff,
    }));
  },

  async recalculatePhase2Standings(categoryId: string): Promise<void> {
    const rows = await this.previewPhase2Standings(categoryId);
    await supabase
      .from('league_standings')
      .delete()
      .eq('league_category_id', categoryId)
      .eq('phase', PHASE_SECOND_ROUND);

    const inserts = rows.map((s) => ({
      league_category_id: categoryId,
      league_group_id: s.group_id,
      league_team_id: s.league_team_id,
      phase: PHASE_SECOND_ROUND,
      played: s.played,
      won: s.won,
      lost: s.lost,
      points: s.points,
      sets_for: s.sets_for,
      sets_against: s.sets_against,
      games_for: s.games_for,
      games_against: s.games_against,
    }));

    if (inserts.length > 0) {
      const { error } = await supabase.from('league_standings').insert(inserts);
      if (error) throw new Error(mapSupabaseError(error));
    }
  },
};
