import { supabase } from '../lib/supabase';
import { mapSupabaseError } from '../lib/supabaseErrors';
import { fixtureService } from './fixtureService';
import { computeStandingsFromMatches } from '../utils/standingsCalculator';

export const resultService = {
  async assertCategoryAllowsResults(categoryId: string) {
    const s = await fixtureService.getStatus(categoryId);
    if (s.state !== 'generated' && s.state !== 'closed') {
      throw new Error('Primero debes generar el fixture de esta categoría para cargar resultados.');
    }
  },

  async getMatchesForCategory(categoryId: string) {
    const { data, error } = await supabase
      .from('league_matches')
      .select(
        `
        *,
        team1:league_teams!team1_id(id, team_name),
        team2:league_teams!team2_id(id, team_name),
        group:league_groups(id, group_name)
      `
      )
      .eq('league_category_id', categoryId)
      .order('round', { ascending: true });

    if (error) throw new Error(mapSupabaseError(error));
    return data || [];
  },

  async updateMatchResult(
    matchId: string,
    opts: {
      mode: 'quick' | 'full' | 'schedule';
      winnerTeamId?: string | null;
      team1_sets?: number;
      team2_sets?: number;
      team1_games?: number;
      team2_games?: number;
      match_date?: string | null;
      match_time?: string | null;
      court_name?: string | null;
      comment?: string | null;
    }
  ) {
    const { data: m, error: fe } = await supabase
      .from('league_matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (fe || !m) throw new Error(mapSupabaseError(fe || new Error('Partido no encontrado.')));
    await this.assertCategoryAllowsResults(m.league_category_id);

    const isResult = opts.winnerTeamId && opts.mode !== 'schedule';

    if (opts.match_date && opts.match_time && opts.court_name) {
      const { data: conflicts, error: conflictErr } = await supabase
        .from('league_matches')
        .select('id')
        .eq('match_date', opts.match_date)
        .eq('match_time', opts.match_time)
        .eq('court_name', opts.court_name)
        .neq('id', matchId);

      if (conflictErr) throw new Error(mapSupabaseError(conflictErr));
      if (conflicts && conflicts.length > 0) {
        throw new Error(`La ${opts.court_name} ya se encuentra ocupada el ${opts.match_date} a las ${opts.match_time}. Selecciona otra cancha u horario.`);
      }
    }
    
    let updatePayload: any = {
      match_date: opts.match_date,
      match_time: opts.match_time,
      court_name: opts.court_name,
      comment: opts.comment,
    };

    if (isResult) {
      let team1_sets = 2;
      let team2_sets = 0;
      let team1_games = 6;
      let team2_games = 0;

      if (opts.mode === 'full') {
        team1_sets = opts.team1_sets ?? 0;
        team2_sets = opts.team2_sets ?? 0;
        team1_games = opts.team1_games ?? 0;
        team2_games = opts.team2_games ?? 0;
      } else if (opts.winnerTeamId === m.team2_id) {
        team1_sets = 0;
        team2_sets = 2;
        team1_games = 0;
        team2_games = 6;
      }

      updatePayload = {
        ...updatePayload,
        winner_id: opts.winnerTeamId,
        team1_sets,
        team2_sets,
        team1_games,
        team2_games,
        status: 'jugado'
      };
    }

    const { error } = await supabase
      .from('league_matches')
      .update(updatePayload)
      .eq('id', matchId);

    if (error) throw new Error(mapSupabaseError(error));

    if (isResult) {
      await this.recalculateStandings(m.league_category_id);
    }
  },

  async recalculateStandings(categoryId: string) {
    const matchesRaw = (await this.getMatchesForCategory(categoryId)) as any[];
    const finished = matchesRaw.filter((x) => x.status === 'jugado');

    const { data: teams, error: te } = await supabase
      .from('league_teams')
      .select('id, team_name')
      .eq('league_category_id', categoryId);

    if (te) throw new Error(mapSupabaseError(te));

    const teamNames: Record<string, string> = {};
    (teams || []).forEach((t: { id: string; team_name: string }) => {
      teamNames[t.id] = t.team_name;
    });

    const keys = new Set<string>();
    finished.forEach((m) => keys.add(m.league_group_id ?? '__null__'));

    await supabase.from('league_standings').delete().eq('league_category_id', categoryId);

    const rowsToInsert: Record<string, unknown>[] = [];

    for (const key of keys) {
      const gid = key === '__null__' ? null : key;
      const slice = finished.filter((m) => (m.league_group_id ?? null) === gid);
      const computed = computeStandingsFromMatches(
        slice.map((m) => ({
          team1_id: m.team1_id,
          team2_id: m.team2_id,
          winner_id: m.winner_id,
          team1_sets: m.team1_sets,
          team2_sets: m.team2_sets,
          team1_games: m.team1_games,
          team2_games: m.team2_games
        })),
        teamNames
      );

      for (const row of computed) {
        if (row.played === 0) continue;
        rowsToInsert.push({
          league_category_id: categoryId,
          league_group_id: gid,
          league_team_id: row.league_team_id,
          phase: 1,
          played: row.played,
          won: row.won,
          lost: row.lost,
          won2_0: row.won2_0,
          won2_1: row.won2_1,
          points: row.points,
          sets_for: row.sets_for,
          sets_against: row.sets_against,
          games_for: row.games_for,
          games_against: row.games_against
        });
      }
    }

    if (rowsToInsert.length > 0) {
      const { error: ins } = await supabase.from('league_standings').insert(rowsToInsert);
      if (ins) throw new Error(mapSupabaseError(ins));
    }
  },

  async getStandingsFromDb(categoryId: string, groupId: string | null | 'all') {
    let q = supabase
      .from('league_standings')
      .select(
        `
        *,
        team:league_teams!league_team_id(team_name)
      `
      )
      .eq('league_category_id', categoryId);

    if (groupId !== 'all') {
      if (groupId === null) q = q.is('league_group_id', null);
      else q = q.eq('league_group_id', groupId);
    }

    const { data, error } = await q
      .order('points', { ascending: false })
      .order('sets_for', { ascending: false });

    if (error) throw new Error(mapSupabaseError(error));
    return data || [];
  },

  async deleteMatchResult(matchId: string) {
    const { data: m, error: fe } = await supabase
      .from('league_matches')
      .select('league_category_id')
      .eq('id', matchId)
      .single();

    if (fe || !m) throw new Error(mapSupabaseError(fe || new Error('Partido no encontrado.')));

    const { error } = await supabase
      .from('league_matches')
      .update({
        status: 'pendiente',
        winner_id: null,
        team1_sets: 0,
        team2_sets: 0,
        team1_games: 0,
        team2_games: 0,
        comment: null
      })
      .eq('id', matchId);

    if (error) throw new Error(mapSupabaseError(error));
    await this.recalculateStandings(m.league_category_id);
  }
};
