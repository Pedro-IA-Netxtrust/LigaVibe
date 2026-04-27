import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { LeagueCategory } from '../types';

export function useCategories() {
  const [categories, setCategories] = useState<LeagueCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    async function loadCategories() {
      try {
        const { data, error: err } = await supabase
          .from('league_categories')
          .select('*')
          .order('name');
        if (err) throw err;
        setCategories(data || []);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    loadCategories();
  }, []);

  return { categories, loading, error };
}

export function usePlayers() {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    async function loadPlayers() {
      try {
        const { data, error: err } = await supabase
          .from('clients')
          .select('*')
          .order('last_name');
        if (err) throw err;
        setPlayers(data || []);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    loadPlayers();
  }, []);

  return { players, loading, error };
}
