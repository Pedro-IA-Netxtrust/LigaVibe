import { supabase } from '../lib/supabase';
import { mapSupabaseError } from '../lib/supabaseErrors';
import { LeagueMatch, LeagueTeam } from '../types';

export const fixtureService = {
  async getStatus(categoryId: string) {
    const { data: cat, error: catErr } = await supabase
      .from('league_categories')
      .select('fixture_status')
      .eq('id', categoryId)
      .single();

    if (catErr) throw new Error(mapSupabaseError(catErr));

    const { data: allTeams } = await supabase
      .from('league_teams')
      .select('*')
      .eq('league_category_id', categoryId);

    const hasIncomplete = (allTeams || []).some((t) => {
      const isMissingP2 = !t.player2_id;
      const isGhost = t.is_ghost === true || (t.team_name || '').toLowerCase().includes('fantasma') || (t.team_name || '').toLowerCase().includes('bye');
      return isMissingP2 && !isGhost;
    });

    const { data: matches } = await supabase
      .from('league_matches')
      .select('id, status')
      .eq('league_category_id', categoryId);

    const hasMatches = (matches?.length || 0) > 0;
    const categoryClosed = cat?.fixture_status === 'Closed';

    const teamCount = allTeams?.length || 0;

    let state: 'draft' | 'ready' | 'generated' | 'closed' = 'draft';

    if (hasMatches && categoryClosed) {
      state = 'closed';
    } else if (hasMatches) {
      state = 'generated';
    } else if (!hasIncomplete && (teamCount || 0) >= 2) {
      state = 'ready';
    }

    return {
      state,
      hasIncomplete,
      teamCount: teamCount || 0,
      matches: matches || [],
      categoryStatus: cat?.fixture_status as string | undefined
    };
  },

  /** Cierra la categoría para fijar fixture y permitir borrado total con resultados. */
  async setCategoryClosed(categoryId: string, closed: boolean) {
    const nextStatus = closed ? 'Closed' : 'Open';
    const { error } = await supabase
      .from('league_categories')
      .update({ fixture_status: nextStatus })
      .eq('id', categoryId);

    if (error) throw new Error(mapSupabaseError(error));
  },

  async clearFixture(categoryId: string) {
    const { data: cat } = await supabase
      .from('league_categories')
      .select('fixture_status')
      .eq('id', categoryId)
      .single();

    const { data: finished } = await supabase
      .from('league_matches')
      .select('id')
      .eq('league_category_id', categoryId)
      .eq('status', 'jugado')
      .limit(1);

    const hasFinished = (finished?.length || 0) > 0;
    if (hasFinished && cat?.fixture_status !== 'Closed') {
      throw new Error(
        'No se puede eliminar el fixture: hay partidos finalizados. Cierra la categoría primero para poder borrar y rehacer.'
      );
    }

    await supabase.from('league_matches').delete().eq('league_category_id', categoryId);

    const { data: groups } = await supabase.from('league_groups').select('id').eq('league_category_id', categoryId);
    if (groups && groups.length > 0) {
      const groupIds = groups.map((g) => g.id);
      await supabase.from('league_group_teams').delete().in('league_group_id', groupIds);
      await supabase.from('league_groups').delete().eq('league_category_id', categoryId);
    }

    await supabase.from('league_standings').delete().eq('league_category_id', categoryId);

    if (cat?.fixture_status === 'Closed') {
      await supabase.from('league_categories').update({ fixture_status: 'Open' }).eq('id', categoryId);
    }

    return true;
  },

  async saveGroupsAndMatches(
    categoryId: string,
    groups: { groupName: string; teams: LeagueTeam[] }[],
    allMatches: Partial<LeagueMatch>[]
  ) {
    await this.clearFixture(categoryId);

    const createdGroups: { [key: string]: string } = {};

    for (const group of groups) {
      const { data: newGroup, error: gError } = await supabase
        .from('league_groups')
        .insert([
          {
            league_category_id: categoryId,
            phase: 1,
            group_name: group.groupName
          }
        ])
        .select()
        .single();

      if (gError) throw new Error(mapSupabaseError(gError));
      createdGroups[group.groupName] = newGroup.id;

      const groupTeams = group.teams.map((t) => ({
        league_group_id: newGroup.id,
        league_team_id: t.id
      }));

      const { error: gtError } = await supabase.from('league_group_teams').insert(groupTeams);
      if (gtError) throw new Error(mapSupabaseError(gtError));
    }

    const matchesToInsert = allMatches.map((m) => {
      const gName = m.league_group_id as string | null | undefined;
      const gId =
        gName && typeof gName === 'string' && createdGroups[gName] ? createdGroups[gName] : null;

      return {
        ...m,
        league_group_id: gId
      };
    });

    const { error: mError } = await supabase.from('league_matches').insert(matchesToInsert);
    if (mError) throw new Error(mapSupabaseError(mError));

    return true;
  },

  async getMatchesWithTeams(categoryId: string) {
    const { data, error } = await supabase
      .from('league_matches')
      .select(
        `
        *,
        team1:league_teams!team1_id(
          id, 
          team_name, 
          player1:clients!player1_id(first_name, last_name, rut, phone), 
          player2:clients!player2_id(first_name, last_name, rut, phone)
        ),
        team2:league_teams!team2_id(
          id, 
          team_name, 
          player1:clients!player1_id(first_name, last_name, rut, phone), 
          player2:clients!player2_id(first_name, last_name, rut, phone)
        ),
        group:league_groups(id, group_name)
      `
      )
      .eq('league_category_id', categoryId)
      .order('round', { ascending: true });

    if (error) throw new Error(mapSupabaseError(error));
    return data;
  },

  async savePlayoffMatches(allMatches: Partial<LeagueMatch>[]) {
    const { error } = await supabase.from('league_matches').insert(allMatches);
    if (error) throw new Error(mapSupabaseError(error));
    return true;
  }
};
