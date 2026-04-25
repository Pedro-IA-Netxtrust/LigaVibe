import { supabase } from '../lib/supabase';

export const dashboardService = {
  async getStats() {
    // 1. Total players (clients)
    const { count: playerCount } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true });

    // 2. Active categories
    const { count: categoryCount } = await supabase
      .from('league_categories')
      .select('*', { count: 'exact', head: true });

    // 3. Paid registrations
    // This is a bit tricky with Supabase's head-only count if we want sum of two columns.
    // We'll fetch all teams and sum in JS for now, or use a RPC if available.
    // Given the scale, fetching all teams is fine.
    const { data: teams } = await supabase
      .from('league_teams')
      .select('paid_player1, paid_player2');
    
    const paidRegistrations = (teams || []).reduce((acc, t) => {
      if (t.paid_player1) acc++;
      if (t.paid_player2) acc++;
      return acc;
    }, 0);

    // 4. Matches played
    const { count: playedMatches } = await supabase
      .from('league_matches')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'jugado');

    return {
      players: playerCount || 0,
      categories: categoryCount || 0,
      paidRegistrations,
      playedMatches: playedMatches || 0
    };
  },

  async getRecentResults(limit = 5) {
    const { data, error } = await supabase
      .from('league_matches')
      .select(`
        *,
        team1:league_teams!team1_id(team_name),
        team2:league_teams!team2_id(team_name),
        category:league_categories(name)
      `)
      .eq('status', 'jugado')
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  async getUpcomingMatches(limit = 5) {
    // Matches that have a date and are not played
    const { data, error } = await supabase
      .from('league_matches')
      .select(`
        *,
        team1:league_teams!team1_id(team_name),
        team2:league_teams!team2_id(team_name),
        category:league_categories(name)
      `)
      .neq('status', 'jugado')
      .not('match_date', 'is', null)
      .order('match_date', { ascending: true })
      .order('match_time', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  async getDebtors(limit = 10) {
    const { data, error } = await supabase
      .from('league_teams')
      .select(`
        id,
        team_name,
        paid_player1,
        paid_player2,
        player1:clients!player1_id(first_name, last_name),
        player2:clients!player2_id(first_name, last_name),
        category:league_categories(name)
      `)
      .or('paid_player1.eq.false,paid_player2.eq.false')
      .limit(limit);

    if (error) throw error;
    return data;
  }
};
