import { supabase } from '../lib/supabase';
import { mapSupabaseError } from '../lib/supabaseErrors';
import { computeStandingsFromMatches } from '../utils/standingsCalculator';
import { sortStandingsWithTiebreakers } from '../utils/tiebreaker';
import { FixtureEngine } from '../utils/fixtureEngine';
import { tiebreakerService } from './tiebreakerService';
import type {
  LeagueTeam,
  LeagueMatch,
  Phase2Config,
  Phase2Mode,
  Phase2Participant,
  Phase2Classification,
  Phase2GroupStanding,
} from '../types';

type Phase2ConfigRow = {
  id: string;
  league_category_id: string;
  phase: number;
  mode: Phase2Mode;
  groups_count: number;
  teams_per_group: number;
  qualifiers_per_group: number;
  best_thirds_count: number;
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
  created_at: string;
  updated_at: string;
  team?: { team_name?: string | null } | null;
};

function toPhase2Config(row: Phase2ConfigRow): Phase2Config {
  return {
    ...row,
    phase: 2,
  };
}

function toPhase2Participant(row: Phase2ParticipantRow): Phase2Participant {
  return {
    id: row.id,
    league_category_id: row.league_category_id,
    phase: 2,
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

export const phase2Service = {
  async getConfig(categoryId: string): Promise<Phase2Config | null> {
    const { data, error } = await supabase
      .from('league_phase2_config')
      .select('*')
      .eq('league_category_id', categoryId)
      .eq('phase', 2)
      .maybeSingle();

    if (error) throw new Error(mapSupabaseError(error));
    if (!data) return null;
    return toPhase2Config(data as Phase2ConfigRow);
  },

  async saveConfig(categoryId: string, partial: Partial<Phase2Config> = {}): Promise<Phase2Config> {
    const existing = await this.getConfig(categoryId);

    const payload: Partial<Phase2ConfigRow> = {
      league_category_id: categoryId,
      phase: 2,
      mode: partial.mode ?? 'elimination',
      groups_count: partial.groups_count ?? 2,
      teams_per_group: partial.teams_per_group ?? 4,
      qualifiers_per_group: partial.qualifiers_per_group ?? 2,
      best_thirds_count: partial.best_thirds_count ?? 0,
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

  async getParticipants(categoryId: string): Promise<Phase2Participant[]> {
    const { data, error } = await supabase
      .from('league_phase2_participants')
      .select(`
        *,
        team:league_teams!league_team_id(team_name)
      `)
      .eq('league_category_id', categoryId)
      .eq('phase', 2)
      .eq('manually_removed', false)
      .order('seed', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) throw new Error(mapSupabaseError(error));
    return ((data || []) as Phase2ParticipantRow[]).map(toPhase2Participant);
  },

  async seedParticipantsFromPhase1(
    categoryId: string,
    teamIds: string[],
    sourceClosureId: string | null = null
  ): Promise<void> {
    if (!teamIds.length) return;

    const rows = teamIds.map((id, idx) => ({
      league_category_id: categoryId,
      phase: 2,
      league_team_id: id,
      source_phase_closure_id: sourceClosureId,
      seed: idx + 1,
      manually_added: false,
      manually_removed: false,
      notes: null,
    }));

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
          phase: 2,
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
      .update({
        manually_removed: true,
        updated_at: new Date().toISOString(),
      })
      .eq('league_category_id', categoryId)
      .eq('phase', 2)
      .eq('league_team_id', leagueTeamId);

    if (error) throw new Error(mapSupabaseError(error));
  },

  async clearPhase2Data(categoryId: string): Promise<void> {
    const { error: mErr } = await supabase
      .from('league_matches')
      .delete()
      .eq('league_category_id', categoryId)
      .eq('phase', 2);
    if (mErr) throw new Error(mapSupabaseError(mErr));

    const { error: gErr } = await supabase
      .from('league_groups')
      .delete()
      .eq('league_category_id', categoryId)
      .eq('phase', 2);
    if (gErr) throw new Error(mapSupabaseError(gErr));

    const { error: sErr } = await supabase
      .from('league_standings')
      .delete()
      .eq('league_category_id', categoryId)
      .eq('phase', 2);
    if (sErr) throw new Error(mapSupabaseError(sErr));
  },

  async generateGroupMatchesPhase2(
    categoryId: string,
    options: { isDoubleRound?: boolean } = {}
  ): Promise<void> {
    const participants = await this.getParticipants(categoryId);
    if (participants.length < 2) {
      throw new Error('Se requieren al menos 2 parejas en fase 2.');
    }

    const config = await this.getConfig(categoryId);
    if (!config || config.mode !== 'group_league') {
      throw new Error('La configuración de fase 2 no está en modo group_league.');
    }

    const { data: teamsData, error: tErr } = await supabase
      .from('league_teams')
      .select('*')
      .eq('league_category_id', categoryId);

    if (tErr) throw new Error(mapSupabaseError(tErr));
    const teamsById = new Map<string, LeagueTeam>((teamsData as LeagueTeam[]).map((t) => [t.id, t]));

    const phase2Teams = participants
      .map((p) => teamsById.get(p.league_team_id))
      .filter(Boolean) as LeagueTeam[];

    const groups = FixtureEngine.distributeGroups(phase2Teams, config.teams_per_group);

    await this.clearPhase2Data(categoryId);

    const allGroupNames = groups.map((g) => g.groupName);
    const { error: cErr } = await supabase
      .from('league_groups')
      .insert(
        allGroupNames.map((groupName) => ({
          league_category_id: categoryId,
          phase: 2,
          group_name: groupName,
        }))
      );
    if (cErr) throw new Error(mapSupabaseError(cErr));

    const { data: createdGroups, error: gErr } = await supabase
      .from('league_groups')
      .select('id, group_name')
      .eq('league_category_id', categoryId)
      .eq('phase', 2);

    if (gErr) throw new Error(mapSupabaseError(gErr));
    const groupNameToId = new Map<string, string>((createdGroups || []).map((g: any) => [g.group_name, g.id]));

    const matches = groups.flatMap((g) =>
      FixtureEngine.generateRoundRobin(g.teams, categoryId, g.groupName, options.isDoubleRound ?? false).map((m) => ({
        ...m,
        league_group_id: groupNameToId.get(g.groupName) ?? null,
        phase: 2,
      }))
    );

    if (matches.length > 0) {
      const { error: mErr } = await supabase.from('league_matches').insert(matches);
      if (mErr) throw new Error(mapSupabaseError(mErr));
    }
  },

  async getPhase2Matches(categoryId: string): Promise<LeagueMatch[]> {
    const { data, error } = await supabase
      .from('league_matches')
      .select('*')
      .eq('league_category_id', categoryId)
      .eq('phase', 2);

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
      .eq('phase', 2);

    if (mErr) throw new Error(mapSupabaseError(mErr));
    const allMatches = matches || [];
    const tiebreakerDecisions = await tiebreakerService.getForCategory(categoryId, 2);

    const teamNames: Record<string, string> = {};
    allMatches.forEach((m: any) => {
      if (m.team1?.team_name) teamNames[m.team1_id] = m.team1.team_name;
      if (m.team2?.team_name) teamNames[m.team2_id] = m.team2.team_name;
    });

    const groupMap: Record<string, { group_id: string | null; group_name: string | null; matches: any[] }> = {};
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
        Object.entries(teamNames).filter(([id]) =>
          group.matches.some((m) => m.team1_id === id || m.team2_id === id)
        )
      );

      const raw = computeStandingsFromMatches(finished, groupNames);
      const standings = sortStandingsWithTiebreakers(raw, tiebreakerDecisions);

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

  async getPhase2Classification(categoryId: string): Promise<Phase2Classification> {
    const config = await this.getConfig(categoryId);
    const standings = await this.previewPhase2Standings(categoryId);

    if (!config) {
      return { classified: [], waiting_list: standings };
    }

    const byGroup = new Map<string, Phase2GroupStanding[]>();
    standings.forEach((s) => {
      const key = s.group_id ?? '__liga__';
      if (!byGroup.has(key)) byGroup.set(key, []);
      byGroup.get(key)!.push(s);
    });

    const classified: Phase2GroupStanding[] = [];
    const waiting: Phase2GroupStanding[] = [];

    byGroup.forEach((list) => {
      list.sort((a, b) => {
        if (a.rank_in_group !== b.rank_in_group) return a.rank_in_group - b.rank_in_group;
        if (b.points !== a.points) return b.points - a.points;
        if (b.sets_diff !== a.sets_diff) return b.sets_diff - a.sets_diff;
        return b.games_diff - a.games_diff;
      });
      classified.push(...list.slice(0, config.qualifiers_per_group));
      waiting.push(...list.slice(config.qualifiers_per_group));
    });

    if (config.best_thirds_count > 0 && waiting.length > 0) {
      const best = [...waiting]
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          if (b.sets_diff !== a.sets_diff) return b.sets_diff - a.sets_diff;
          return b.games_diff - a.games_diff;
        })
        .slice(0, config.best_thirds_count);

      const bestIds = new Set(best.map((b) => b.league_team_id));
      classified.push(...best);
      const finalWaiting = waiting.filter((w) => !bestIds.has(w.league_team_id));
      return { classified, waiting_list: finalWaiting };
    }

    return { classified, waiting_list: waiting };
  },
};
