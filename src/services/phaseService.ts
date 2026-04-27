import { supabase } from '../lib/supabase';
import { mapSupabaseError } from '../lib/supabaseErrors';
import { computeStandingsFromMatches } from '../utils/standingsCalculator';
import { detectTiesAtBoundary, recommendQualifiers } from '../utils/playoffEngine';
import type {
  PhaseClosePreview,
  PhaseClosureRecord,
  PhaseSnapshotRow,
  ClassifiedTeam,
} from '../types';

export const phaseService = {
  /**
   * Previsualiza el cierre de fase sin persistir nada.
   * Devuelve: partidos pendientes, clasificados sugeridos, empates en el límite.
   */
  async previewPhaseClose(
    categoryId: string,
    qualifiers: number
  ): Promise<PhaseClosePreview> {
    // 1. Fetch all phase-1 matches with teams
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

    const total = allMatches.length;
    const played = allMatches.filter(m => m.status === 'jugado').length;
    const pending = total - played;

    // 2. Build team name map
    const teamNames: Record<string, string> = {};
    allMatches.forEach((m: any) => {
      if (m.team1?.team_name) teamNames[m.team1_id] = m.team1.team_name;
      if (m.team2?.team_name) teamNames[m.team2_id] = m.team2.team_name;
    });

    // 3. Compute standings per group
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

    // 4. Classify teams from each group
    const classified: ClassifiedTeam[] = [];
    const ties_at_boundary: ReturnType<typeof detectTiesAtBoundary> = [];

    const groupKeys = Object.keys(groupMap).sort((a, b) => {
      const na = groupMap[a].group_name ?? 'z';
      const nb = groupMap[b].group_name ?? 'z';
      return na.localeCompare(nb);
    });

    const numGroups = groupKeys.length;
    // How many classifiers per group (floor). If not evenly divisible, top groups get +1
    const qualifiersPerGroup = Math.floor(qualifiers / numGroups);
    const extraSpots = qualifiers % numGroups;

    let overallRank = 0;

    groupKeys.forEach((key, idx) => {
      const group = groupMap[key];
      const finished = group.matches.filter(m => m.status === 'jugado');
      const groupNames = Object.fromEntries(
        Object.entries(teamNames).filter(([id]) =>
          group.matches.some(m => m.team1_id === id || m.team2_id === id)
        )
      );
      const standings = computeStandingsFromMatches(finished, groupNames);
      const spots = qualifiersPerGroup + (idx < extraSpots ? 1 : 0);

      // Detect ties at boundary of this group
      const groupTies = detectTiesAtBoundary(standings, spots, group.group_id);
      ties_at_boundary.push(...groupTies);

      standings.forEach((s, rankIdx) => {
        overallRank++;
        classified.push({
          league_team_id: s.league_team_id,
          team_name: s.team_name,
          group_id: group.group_id,
          group_name: group.group_name,
          rank_in_group: rankIdx + 1,
          overall_rank: overallRank,
          points: s.points,
          sets_diff: s.sets_for - s.sets_against,
          games_diff: s.games_for - s.games_against,
        });
      });
    });

    // Sort globally: rank_in_group first, then by points/sets/games
    classified.sort((a, b) => {
      if (a.rank_in_group !== b.rank_in_group) return a.rank_in_group - b.rank_in_group;
      if (b.points !== a.points) return b.points - a.points;
      if (b.sets_diff !== a.sets_diff) return b.sets_diff - a.sets_diff;
      return b.games_diff - a.games_diff;
    });

    // Re-assign overall rank after global sort
    classified.forEach((t, i) => { t.overall_rank = i + 1; });

    return {
      total_matches: total,
      played_matches: played,
      pending_matches: pending,
      can_close_normally: pending === 0,
      classified,
      ties_at_boundary,
      recommended_qualifiers: recommendQualifiers(classified.length),
    };
  },

  /**
   * Ejecuta el cierre de fase:
   * 1. Crea snapshot de standings
   * 2. Registra el cierre en league_phase_closures
   * 3. Actualiza fixture_status = 'Closed'
   */
  async closePhase(
    categoryId: string,
    qualifiers: number,
    preview: PhaseClosePreview,
    options: { forced?: boolean; notes?: string } = {}
  ): Promise<string> {
    const { forced = false, notes } = options;

    if (!forced && preview.pending_matches > 0) {
      throw new Error(
        `Hay ${preview.pending_matches} partidos pendientes. Usa cierre forzado o completa los partidos primero.`
      );
    }

    if (preview.ties_at_boundary.length > 0 && !forced) {
      throw new Error(
        'Hay empates en el límite de clasificación. Resuelve los empates antes de cerrar.'
      );
    }

    // 1. Create closure record
    const { data: closure, error: cErr } = await supabase
      .from('league_phase_closures')
      .insert({
        league_category_id: categoryId,
        phase_closed: 1,
        total_matches: preview.total_matches,
        played_matches: preview.played_matches,
        pending_matches: preview.pending_matches,
        was_forced: forced,
        notes: notes ?? null,
      })
      .select('id')
      .single();

    if (cErr) throw new Error(mapSupabaseError(cErr));
    const closureId = closure.id;

    // 2. Get current standings from DB for snapshot
    const { data: currentStandings, error: sErr } = await supabase
      .from('league_standings')
      .select('*')
      .eq('league_category_id', categoryId)
      .eq('phase', 1);

    if (sErr) throw new Error(mapSupabaseError(sErr));

    // 3. Insert snapshots
    const classifiedIds = new Set(preview.classified.slice(0, qualifiers).map(t => t.league_team_id));
    const snapshotRows = (currentStandings || []).map((s: any, idx: number) => ({
      league_phase_closure_id: closureId,
      league_category_id: categoryId,
      league_group_id: s.league_group_id,
      league_team_id: s.league_team_id,
      phase: 1,
      final_rank: idx + 1,
      classified: classifiedIds.has(s.league_team_id),
      points: s.points,
      played: s.played,
      won: s.won,
      lost: s.lost,
      sets_for: s.sets_for,
      sets_against: s.sets_against,
      games_for: s.games_for,
      games_against: s.games_against,
    }));

    if (snapshotRows.length > 0) {
      const { error: snErr } = await supabase
        .from('league_phase_snapshots')
        .insert(snapshotRows);
      if (snErr) throw new Error(mapSupabaseError(snErr));
    }

    // 4. Mark category as closed
    const { error: catErr } = await supabase
      .from('league_categories')
      .update({ fixture_status: 'Closed' })
      .eq('id', categoryId);

    if (catErr) throw new Error(mapSupabaseError(catErr));

    return closureId;
  },

  /**
   * Retrieves all phase closure records for a category (for history view).
   */
  async getPhaseHistory(categoryId: string): Promise<PhaseClosureRecord[]> {
    const { data, error } = await supabase
      .from('league_phase_closures')
      .select('*')
      .eq('league_category_id', categoryId)
      .order('closed_at', { ascending: false });

    if (error) throw new Error(mapSupabaseError(error));
    return (data as PhaseClosureRecord[]) || [];
  },

  /**
   * Retrieves the snapshot of standings for a specific closure.
   */
  async getPhaseSnapshot(closureId: string): Promise<PhaseSnapshotRow[]> {
    const { data, error } = await supabase
      .from('league_phase_snapshots')
      .select(`
        *,
        team:league_teams!league_team_id(team_name),
        group:league_groups!league_group_id(group_name)
      `)
      .eq('league_phase_closure_id', closureId)
      .order('final_rank', { ascending: true });

    if (error) throw new Error(mapSupabaseError(error));
    return ((data || []).map((r: any) => ({
      ...r,
      team_name: r.team?.team_name,
      group_name: r.group?.group_name,
    })) as PhaseSnapshotRow[]);
  },
};
