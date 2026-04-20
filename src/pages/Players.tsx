import React from 'react';
import { Card, Button } from '../components/ui/Base';
import { Table, TableRow, TableCell } from '../components/ui/Table';
import { LoadingState, EmptyState } from '../components/ui/States';
import { Users, Search, Filter, Plus, Edit2, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePlayersList } from '../hooks/usePlayers';
import { PlayerModal } from '../components/players/PlayerModal';
import { playerService } from '../services/playerService';
import { supabase } from '../lib/supabase';
import { Client } from '../types';
import { formatGenderForUi } from '../utils/gender';

export default function Players() {
  const {
    players,
    loading,
    error,
    filters,
    updateFilters,
    totalPages,
    total,
    deletePlayer,
    refresh
  } = usePlayersList();

  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedPlayer, setSelectedPlayer] = React.useState<Client | null>(null);
  const [categoryFilterOptions, setCategoryFilterOptions] = React.useState<string[]>([]);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function loadCategoryFilters() {
      const [{ data: leagueCats }, distinctFromPlayers] = await Promise.all([
        supabase.from('league_categories').select('name').order('name'),
        playerService.getDistinctPlayerCategories()
      ]);
      const fromLeague = (leagueCats || []).map((c: { name: string }) => c.name).filter(Boolean);
      const merged = Array.from(new Set([...fromLeague, ...distinctFromPlayers])).sort((a, b) =>
        a.localeCompare(b)
      );
      setCategoryFilterOptions(merged);
    }
    loadCategoryFilters();
  }, []);

  const handleCreate = () => {
    setSelectedPlayer(null);
    setIsModalOpen(true);
  };

  const handleEdit = (player: Client) => {
    setSelectedPlayer(player);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este jugador?')) {
      try {
        setDeleteError(null);
        await deletePlayer(id);
      } catch (err: any) {
        setDeleteError(err.message);
        setTimeout(() => setDeleteError(null), 5000);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nombre o RUT..." 
            value={filters.search}
            onChange={(e) => updateFilters({ search: e.target.value })}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
        
        <div className="flex w-full md:w-auto gap-2">
          <select
            value={filters.category}
            onChange={(e) => updateFilters({ category: e.target.value })}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Todas las Categorías</option>
            {categoryFilterOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <select
            value={filters.gender}
            onChange={(e) => updateFilters({ gender: e.target.value })}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">Géneros</option>
            <option value="Masculino">Masculino</option>
            <option value="Femenino">Femenino</option>
          </select>

          <Button size="md" onClick={handleCreate}>
            <Plus size={18} className="mr-2" />
            Nuevo
          </Button>
        </div>
      </div>

      {deleteError && (
        <div className="p-4 bg-red-400/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
          {deleteError}
        </div>
      )}

      {loading ? (
        <Card className="flex items-center justify-center py-20">
          <LoadingState />
        </Card>
      ) : players.length === 0 ? (
        <EmptyState 
          icon={Users} 
          title="Sin resultados" 
          description="No se encontraron jugadores que coincidan con la búsqueda." 
        />
      ) : (
        <div className="space-y-4">
          <Card>
            <Table headers={['Jugador', 'RUT / Contacto', 'Categoría', 'Acciones']}>
              {players.map((player) => (
                <TableRow key={player.id}>
                  <TableCell>
                    <div className="font-semibold text-slate-100 italic">
                      {player.first_name} {player.last_name}
                    </div>
                    <div className="text-[11px] text-slate-500 uppercase font-medium">
                      Género: {formatGenderForUi(player.gender)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-slate-300 font-mono">{player.rut}</div>
                    <div className="text-xs text-slate-500">{player.email || 'Sin email'}</div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <span className="badge badge-primary">{player.categoria}</span>
                      {player.categoria_secundaria && (
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-slate-700" />
                          {player.categoria_secundaria}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-slate-400 hover:text-indigo-400"
                        onClick={() => handleEdit(player)}
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-slate-400 hover:text-red-400"
                        onClick={() => handleDelete(player.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          </Card>

          {/* Pagination */}
          <div className="flex items-center justify-between px-2">
            <p className="text-sm text-slate-500">
              Página {filters.page} de {totalPages || 1} — {total} jugador{total !== 1 ? 'es' : ''} en total
            </p>
            <div className="flex gap-2">
              <Button 
                variant="secondary" 
                size="sm" 
                disabled={filters.page === 1}
                onClick={() => updateFilters({ page: filters.page - 1 })}
              >
                <ChevronLeft size={16} />
              </Button>
              <div className="flex items-center px-4 bg-slate-900 border border-slate-800 rounded-lg text-sm font-medium text-slate-300">
                Página {filters.page} de {totalPages || 1}
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                disabled={filters.page >= totalPages}
                onClick={() => updateFilters({ page: filters.page + 1 })}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        </div>
      )}

      <PlayerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={refresh}
        player={selectedPlayer}
        playerService={playerService}
      />
    </div>
  );
}
