import { supabase } from '../lib/supabase';
import { mapSupabaseError } from '../lib/supabaseErrors';
import { LeagueTeam, Client } from '../types';
import { getDbGenderValues } from '../utils/gender';

async function assertPlayerNotInCategoryTeam(
  categoryId: string,
  playerId: string,
  excludeTeamId?: string
) {
  let q = supabase
    .from('league_teams')
    .select('team_name')
    .eq('league_category_id', categoryId)
    .or(`player1_id.eq.${playerId},player2_id.eq.${playerId}`);
  if (excludeTeamId) q = q.neq('id', excludeTeamId);
  const { data } = await q.maybeSingle();
  if (data) {
    throw new Error(
      `El jugador ya está inscrito en esta categoría (pareja: "${(data as { team_name: string }).team_name}").`
    );
  }
}

export const teamService = {
  async getByCategoryId(categoryId: string) {
    const { data, error } = await supabase
      .from('league_teams')
      .select(
        `
        *,
        player1:clients!player1_id(id, first_name, last_name, rut, phone),
        player2:clients!player2_id(id, first_name, last_name, rut, phone)
      `
      )
      .eq('league_category_id', categoryId)
      .order('order_index', { ascending: true })
      .order('registration_number', { ascending: true });

    if (error) throw new Error(mapSupabaseError(error));
    return data;
  },

  async getAvailablePlayers(categoryId: string, categoryName: string) {
    const { data: existingTeams, error: teamsError } = await supabase
      .from('league_teams')
      .select('player1_id, player2_id')
      .eq('league_category_id', categoryId);

    if (teamsError) throw new Error(mapSupabaseError(teamsError));

    const playersInTeams = new Set<string>();
    existingTeams?.forEach((t) => {
      if (t.player1_id) playersInTeams.add(t.player1_id);
      if (t.player2_id) playersInTeams.add(t.player2_id);
    });

    const safeName = categoryName.trim();
    let query = supabase
      .from('clients')
      .select('*');

    const lowerCat = safeName.toLowerCase();
    const isMixed = lowerCat.includes('mixto') || lowerCat.includes('mixta');

    if (!isMixed) {
      if (lowerCat.includes('damas') || lowerCat.includes('mujeres') || lowerCat.includes('femenino')) {
        query = query.in('gender', getDbGenderValues('female'));
      }
      // Si es varones, no filtramos por género para permitir que aparezcan mujeres habilitadas
    }

    const { data: players, error: playersError } = await query.order('last_name');

    if (playersError) throw new Error(mapSupabaseError(playersError));

    // Función para normalizar categorías (ej: "4ta Varones" -> "4ta")
    const normalizeCatName = (name: string) => {
      return name.toLowerCase()
        .replace(/varones|hombres|masculino/g, '')
        .replace(/damas|mujeres|femenino/g, '')
        .trim();
    };

    const targetBaseCat = normalizeCatName(lowerCat);

    return (players as Client[]).filter((p) => {
      const p1Cat = p.categoria ? normalizeCatName(p.categoria) : '';
      const p2Cat = p.categoria_secundaria ? normalizeCatName(p.categoria_secundaria) : '';
      
      const matchesCategory = 
        p1Cat === targetBaseCat || 
        p2Cat === targetBaseCat ||
        p.categoria?.toLowerCase().trim() === lowerCat || 
        p.categoria_secundaria?.toLowerCase().trim() === lowerCat;
      
      return matchesCategory && !playersInTeams.has(p.id);
    });
  },

  async renumberRegistrationOrder(categoryId: string) {
    const { data: rows, error } = await supabase
      .from('league_teams')
      .select('id')
      .eq('league_category_id', categoryId)
      .order('order_index', { ascending: true })
      .order('registration_number', { ascending: true });

    if (error) throw new Error(mapSupabaseError(error));
    const updates = (rows || []).map((r: { id: string }, index: number) =>
      supabase
        .from('league_teams')
        .update({ order_index: index + 1, registration_number: index + 1 })
        .eq('id', r.id)
    );
    await Promise.all(updates);
  },

  async create(team: Partial<LeagueTeam>) {
    if (!team.league_category_id || !team.player1_id) {
      throw new Error('Faltan datos obligatorios de la pareja.');
    }

    const p2 =
      team.player2_id && String(team.player2_id).trim() !== '' ? team.player2_id : null;

    await assertPlayerNotInCategoryTeam(team.league_category_id, team.player1_id);
    if (p2) await assertPlayerNotInCategoryTeam(team.league_category_id, p2);

    const { data: lastTeam } = await supabase
      .from('league_teams')
      .select('registration_number')
      .eq('league_category_id', team.league_category_id)
      .order('registration_number', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextNumber = (lastTeam?.registration_number || 0) + 1;

    const row = {
      league_category_id: team.league_category_id,
      player1_id: team.player1_id,
      player2_id: p2,
      team_name: team.team_name || '',
      is_seeded: team.is_seeded ?? false,
      paid_player1: team.paid_player1 ?? false,
      paid_player2: team.paid_player2 ?? false,
      registration_number: nextNumber,
      order_index: nextNumber
    };

    const { data, error } = await supabase.from('league_teams').insert([row]).select().single();

    if (error) throw new Error(mapSupabaseError(error));
    return data;
  },

  async update(id: string, team: Partial<LeagueTeam>) {
    const { data: current, error: curErr } = await supabase
      .from('league_teams')
      .select('*')
      .eq('id', id)
      .single();

    if (curErr) throw new Error(mapSupabaseError(curErr));
    if (!current) throw new Error('Pareja no encontrada.');

    const { count } = await supabase
      .from('league_matches')
      .select('id', { count: 'exact', head: true })
      .eq('league_category_id', current.league_category_id)
      .eq('status', 'jugado');

    if (count && count > 0) {
      throw new Error('No se puede editar la pareja: La categoría ya tiene partidos jugados.');
    }

    const catId = current.league_category_id as string;
    const newP1 = (team.player1_id ?? current.player1_id) as string;
    const newP2 =
      team.player2_id !== undefined
        ? team.player2_id && String(team.player2_id).trim() !== ''
          ? team.player2_id
          : null
        : (current.player2_id as string | null);

    await assertPlayerNotInCategoryTeam(catId, newP1, id);
    if (newP2) await assertPlayerNotInCategoryTeam(catId, newP2, id);

    const payload: Record<string, unknown> = { ...team };
    if (team.player2_id !== undefined) {
      payload.player2_id = newP2;
    }

    const { data, error } = await supabase
      .from('league_teams')
      .update(payload as unknown as LeagueTeam)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(mapSupabaseError(error));
    return data;
  },

  async delete(teamId: string) {
    const { data: team } = await supabase
      .from('league_teams')
      .select('league_category_id')
      .eq('id', teamId)
      .single();

    if (team) {
      const { count } = await supabase
        .from('league_matches')
        .select('id', { count: 'exact', head: true })
        .or(`team1_id.eq.${teamId},team2_id.eq.${teamId}`);

      if (count && count > 0) {
        throw new Error('No se puede eliminar: Esta pareja ya tiene partidos registrados.');
      }
    }

    const { error } = await supabase.from('league_teams').delete().eq('id', teamId);

    if (error) throw new Error(mapSupabaseError(error));
    return true;
  },

  async updateOrder(teams: { id: string; order_index: number }[]) {
    const updates = teams.map((t) =>
      supabase.from('league_teams').update({ order_index: t.order_index }).eq('id', t.id)
    );

    await Promise.all(updates);
  },

  async deleteAllMatchesForCategory(categoryId: string) {
    // Also delete standings and groups
    await supabase.from('league_standings').delete().eq('league_category_id', categoryId);
    await supabase.from('league_matches').delete().eq('league_category_id', categoryId);
    const { error } = await supabase.from('league_groups').delete().eq('league_category_id', categoryId);
    if (error) throw new Error(mapSupabaseError(error));
  },

  async deleteAllTeamsForCategory(categoryId: string) {
    // Must delete matches, standings and groups first due to FK constraints
    await supabase.from('league_standings').delete().eq('league_category_id', categoryId);
    await supabase.from('league_matches').delete().eq('league_category_id', categoryId);
    await supabase.from('league_groups').delete().eq('league_category_id', categoryId);
    const { error } = await supabase.from('league_teams').delete().eq('league_category_id', categoryId);
    if (error) throw new Error(mapSupabaseError(error));
  }
};

