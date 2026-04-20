import { useState, useEffect, useCallback, useMemo } from 'react';
import { playerService } from '../services/playerService';
import { Client } from '../types';

export function usePlayersList() {
  const [players, setPlayers] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const [filters, setFilters] = useState({
    search: '',
    gender: 'all',
    category: 'all',
    page: 1,
    pageSize: 10
  });

  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(filters.search), 320);
    return () => window.clearTimeout(t);
  }, [filters.search]);

  const queryFilters = useMemo(
    () => ({ ...filters, search: debouncedSearch }),
    [filters.gender, filters.category, filters.page, filters.pageSize, debouncedSearch]
  );

  const fetchPlayers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await playerService.getAll(queryFilters);
      setPlayers(result.players);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err: any) {
      setError(err.message || 'Error al cargar jugadores');
    } finally {
      setLoading(false);
    }
  }, [queryFilters]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  const updateFilters = (newFilters: Partial<typeof filters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...newFilters };
      if (
        newFilters.page === undefined &&
        (newFilters.search !== undefined ||
          newFilters.gender !== undefined ||
          newFilters.category !== undefined)
      ) {
        next.page = 1;
      }
      return next;
    });
  };

  const deletePlayer = async (id: string) => {
    await playerService.delete(id);
    await fetchPlayers();
  };

  return {
    players,
    loading,
    error,
    total,
    totalPages,
    filters,
    updateFilters,
    refresh: fetchPlayers,
    deletePlayer
  };
}
