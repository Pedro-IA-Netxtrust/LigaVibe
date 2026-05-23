import { supabase } from '../lib/supabase';
import { mapSupabaseError } from '../lib/supabaseErrors';
import type { TiebreakerDecision } from '../types';
import { tieClusterKey } from '../utils/tiebreaker';

export const tiebreakerService = {
  async getForCategory(categoryId: string, phase = 1): Promise<TiebreakerDecision[]> {
    const { data, error } = await supabase
      .from('league_tiebreaker_decisions')
      .select('*')
      .eq('league_category_id', categoryId)
      .eq('phase', phase)
      .order('decided_at', { ascending: true });

    if (error) throw new Error(mapSupabaseError(error));

    return (data || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      league_category_id: row.league_category_id as string,
      league_group_id: (row.league_group_id as string | null) ?? null,
      phase: row.phase as number,
      team_ids_involved: (row.team_ids_involved as string[]) || [],
      ordered_team_ids: (row.ordered_team_ids as string[]) || [],
      reason: (row.reason as string | null) ?? null,
      decided_at: row.decided_at as string,
    }));
  },

  async saveDecision(input: {
    league_category_id: string;
    league_group_id: string | null;
    phase?: number;
    team_ids_involved: string[];
    ordered_team_ids: string[];
    reason?: string;
  }): Promise<TiebreakerDecision> {
    const phase = input.phase ?? 1;
    const involved = [...input.team_ids_involved].sort();
    const key = tieClusterKey(involved);

    const existing = await this.getForCategory(input.league_category_id, phase);
    const match = existing.find(
      (d) => tieClusterKey(d.team_ids_involved) === key && d.league_group_id === input.league_group_id
    );

    const payload = {
      league_category_id: input.league_category_id,
      league_group_id: input.league_group_id,
      phase,
      team_ids_involved: involved,
      ordered_team_ids: input.ordered_team_ids,
      reason: input.reason?.trim() || null,
      decided_at: new Date().toISOString(),
    };

    if (match?.id) {
      const { data, error } = await supabase
        .from('league_tiebreaker_decisions')
        .update(payload)
        .eq('id', match.id)
        .select()
        .single();
      if (error) throw new Error(mapSupabaseError(error));
      return data as TiebreakerDecision;
    }

    const { data, error } = await supabase
      .from('league_tiebreaker_decisions')
      .insert(payload)
      .select()
      .single();

    if (error) throw new Error(mapSupabaseError(error));
    return data as TiebreakerDecision;
  },

  async deleteDecision(id: string): Promise<void> {
    const { error } = await supabase.from('league_tiebreaker_decisions').delete().eq('id', id);
    if (error) throw new Error(mapSupabaseError(error));
  },
};
