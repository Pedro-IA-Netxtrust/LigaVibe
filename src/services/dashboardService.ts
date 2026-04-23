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
  }
};
