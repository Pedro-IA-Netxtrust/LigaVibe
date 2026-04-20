import { useState, useEffect, useCallback } from 'react';
import { teamService } from '../services/teamService';
import { supabase } from '../lib/supabase';
import { LeagueTeam, LeagueCategory } from '../types';

export function useTeams(categoryId?: string) {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    if (!categoryId) {
      setTeams([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await teamService.getByCategoryId(categoryId);
      setTeams(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar parejas');
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const reorderTeams = async (newTeams: any[]) => {
    try {
      const updates = newTeams.map((t, index) => ({ id: t.id, order_index: index + 1 }));
      await teamService.updateOrder(updates);
      const catId = newTeams[0]?.league_category_id as string | undefined;
      if (catId) await teamService.renumberRegistrationOrder(catId);
      setTeams(newTeams);
      await fetchTeams();
    } catch (err: any) {
      setError('Error al reordenar parejas');
    }
  };

  return {
    teams,
    loading,
    error,
    refresh: fetchTeams,
    reorderTeams
  };
}

export function useCategories() {
  const [categories, setCategories] = useState<LeagueCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('league_categories').select('*').order('name');
      if (data) setCategories(data);
      setLoading(false);
    }
    load();
  }, []);

  return { categories, loading };
}
