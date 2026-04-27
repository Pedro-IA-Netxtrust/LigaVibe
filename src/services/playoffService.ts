import { supabase } from '../lib/supabase';
import { mapSupabaseError } from '../lib/supabaseErrors';
import { generatePlayoffMatchups, buildSubsequentRounds, assignByes } from '../utils/playoffEngine';
import type { ClassifiedTeam, PlayoffConfig, BracketMatch } from '../types';

export const playoffService = {
  /**
   * Fetches or creates playoff config for a category.
   */
  async getConfig(categoryId: string): Promise<PlayoffConfig | null> {
    const { data, error } = await supabase
      .from('league_playoff_config')
      .select('*')
      .eq('league_category_id', categoryId)
      .eq('phase', 2)
      .maybeSingle();

    if (error) throw new Error(mapSupabaseError(error));
    return data as PlayoffConfig | null;
  },

  /**
   * Saves or updates playoff config.
   */
  async saveConfig(categoryId: string, config: Partial<PlayoffConfig>): Promise<PlayoffConfig> {
    const existing = await this.getConfig(categoryId);

    const payload: Partial<PlayoffConfig> = {
      league_category_id: categoryId,
      phase: 2,
      qualifiers_count: config.qualifiers_count ?? 4,
      bracket_type: 'single_elimination',
      cross_groups: config.cross_groups ?? true,
      protect_seeds: config.protect_seeds ?? true,
    };

    if (existing?.id) {
      const { data, error } = await supabase
        .from('league_playoff_config')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw new Error(mapSupabaseError(error));
      return data as PlayoffConfig;
    } else {
      const { data, error } = await supabase
        .from('league_playoff_config')
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(mapSupabaseError(error));
      return data as PlayoffConfig;
    }
  },

  /**
   * Generates the playoff bracket and inserts all matches into league_matches.
   * Phase 2, round 1 = first round (QF/SF/F).
   * Subsequent rounds are created as placeholder matches (no teams yet).
   */
  async generateBracket(
    categoryId: string,
    classifiedTeams: ClassifiedTeam[],
    config: PlayoffConfig
  ): Promise<void> {
    // Delete any existing playoff matches first
    const { error: delErr } = await supabase
      .from('league_matches')
      .delete()
      .eq('league_category_id', categoryId)
      .eq('phase', 2);
    if (delErr) throw new Error(mapSupabaseError(delErr));

    // Generate first-round matchups
    const topTeams = classifiedTeams.slice(0, config.qualifiers_count);
    const matchups = generatePlayoffMatchups(topTeams, config);

    // Insert first-round matches
    const round1Inserts = matchups.map(m => ({
      league_category_id: categoryId,
      team1_id: m.team1.is_bye ? null : m.team1.league_team_id,
      team2_id: m.team2.is_bye ? null : m.team2.league_team_id,
      winner_id: m.team2.is_bye ? m.team1.league_team_id : (m.team1.is_bye ? m.team2.league_team_id : null),
      round: 1,
      phase: 2,
      status: m.team2.is_bye || m.team1.is_bye ? 'jugado' : 'pendiente',
      team1_sets: 0,
      team1_games: 0,
      team2_sets: 0,
      team2_games: 0,
      playoff_slot: m.slot,
      is_bye: m.team1.is_bye || m.team2.is_bye,
      comment: m.comment,
    }));

    const { data: insertedRound1, error: r1Err } = await supabase
      .from('league_matches')
      .insert(round1Inserts)
      .select('id, playoff_slot');
    if (r1Err) throw new Error(mapSupabaseError(r1Err));

    // Build slot → id map
    const slotToId: Record<string, string> = {};
    (insertedRound1 || []).forEach((m: any) => { slotToId[m.playoff_slot] = m.id; });

    // Generate subsequent rounds (placeholders)
    const subsequent = buildSubsequentRounds(matchups, categoryId);
    if (subsequent.length === 0) return;

    const placeholderInserts = subsequent.map(r => ({
      league_category_id: categoryId,
      team1_id: null,
      team2_id: null,
      winner_id: null,
      round: r.round,
      phase: 2,
      status: 'pendiente',
      team1_sets: 0,
      team1_games: 0,
      team2_sets: 0,
      team2_games: 0,
      playoff_slot: r.slot,
      is_bye: false,
      comment: r.comment,
      source_match1_id: slotToId[r.source_slot1] ?? null,
      source_match2_id: slotToId[r.source_slot2] ?? null,
    }));

    const { error: phErr } = await supabase
      .from('league_matches')
      .insert(placeholderInserts);
    if (phErr) throw new Error(mapSupabaseError(phErr));
  },

  /**
   * Advances the winner of a match to the next playoff slot.
   * Call this after every playoff result is recorded.
   */
  async advanceWinner(matchId: string, winnerId: string): Promise<void> {
    // Find matches that reference this match as a source
    const { data: nextMatches, error: nErr } = await supabase
      .from('league_matches')
      .select('id, team1_id, team2_id, source_match1_id, source_match2_id')
      .or(`source_match1_id.eq.${matchId},source_match2_id.eq.${matchId}`)
      .eq('phase', 2);

    if (nErr) throw new Error(mapSupabaseError(nErr));
    if (!nextMatches || nextMatches.length === 0) return;

    for (const nextMatch of nextMatches) {
      const isSource1 = nextMatch.source_match1_id === matchId;
      const updateField = isSource1 ? 'team1_id' : 'team2_id';

      const { error: upErr } = await supabase
        .from('league_matches')
        .update({ [updateField]: winnerId })
        .eq('id', nextMatch.id);

      if (upErr) throw new Error(mapSupabaseError(upErr));
    }
  },

  /**
   * Fetches all playoff matches with team names for display.
   */
  async getBracket(categoryId: string): Promise<BracketMatch[]> {
    const { data, error } = await supabase
      .from('league_matches')
      .select(`
        id, playoff_slot, round, phase, team1_id, team2_id, winner_id,
        status, source_match1_id, source_match2_id, comment, is_bye,
        s1_t1, s1_t2, s2_t1, s2_t2, s3_t1, s3_t2,
        team1_sets, team2_sets, team1_games, team2_games,
        match_date, match_time, court_name,
        team1:league_teams!team1_id(team_name),
        team2:league_teams!team2_id(team_name)
      `)
      .eq('league_category_id', categoryId)
      .eq('phase', 2)
      .order('round', { ascending: true })
      .order('playoff_slot', { ascending: true });

    if (error) throw new Error(mapSupabaseError(error));

    return ((data || []).map((m: any) => ({
      ...m,
      team1_name: m.team1?.team_name ?? (m.is_bye ? 'BYE' : 'Por definir'),
      team2_name: m.team2?.team_name ?? (m.is_bye ? 'BYE' : 'Por definir'),
    })) as BracketMatch[]);
  },

  /**
   * Clears all playoff matches for a category.
   */
  async clearBracket(categoryId: string): Promise<void> {
    const { error } = await supabase
      .from('league_matches')
      .delete()
      .eq('league_category_id', categoryId)
      .eq('phase', 2);
    if (error) throw new Error(mapSupabaseError(error));
  },
};
