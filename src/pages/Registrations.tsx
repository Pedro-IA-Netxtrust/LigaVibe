import React from 'react';
import { Card, Button } from '../components/ui/Base';
import { Table, TableRow, TableCell } from '../components/ui/Table';
import { LoadingState, EmptyState } from '../components/ui/States';
import { 
  UserPlus, 
  ChevronUp, 
  ChevronDown, 
  Edit2, 
  Trash2, 
  Star,
  CheckCircle2,
  Circle,
  AlertCircle,
  ShieldAlert
} from 'lucide-react';
import { useTeams, useCategories } from '../hooks/useTeams';
import { TeamModal } from '../components/registrations/TeamModal';
import { teamService } from '../services/teamService';
import { cn } from '../lib/utils';

export default function Registrations() {
  const { categories, loading: loadingCats } = useCategories();
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>('');
  
  const selectedCategory = categories.find(c => c.id === selectedCategoryId);
  
  const { teams, loading, error, refresh, reorderTeams } = useTeams(selectedCategoryId);
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedTeam, setSelectedTeam] = React.useState<any | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  // Auto-select first category if none selected
  React.useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  const handleCreate = () => {
    setSelectedTeam(null);
    setIsModalOpen(true);
  };

  const handleEdit = (team: any) => {
    setSelectedTeam(team);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Eliminar esta inscripción?')) {
      try {
        await teamService.delete(id);
        refresh();
      } catch (err: any) {
        setActionError(err.message);
        setTimeout(() => setActionError(null), 5000);
      }
    }
  };

  const moveTeam = async (index: number, direction: 'up' | 'down') => {
    const newTeams = [...teams];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= teams.length) return;
    
    [newTeams[index], newTeams[targetIndex]] = [newTeams[targetIndex], newTeams[index]];
    await reorderTeams(newTeams);
  };

  const handleDeleteAllMatches = async () => {
    const catName = selectedCategory?.name || 'esta categoría';
    const first = window.confirm(
      `⚠️ ELIMINAR TODOS LOS PARTIDOS\n\nEsto borrará permanentemente todos los partidos, grupos y tabla de posiciones de "${catName}".\n\nLas PAREJAS inscritas NO se eliminarán.\n\n¿Deseas continuar?`
    );
    if (!first) return;
    const second = window.confirm(
      `❗ CONFIRMACIÓN FINAL\n\nEsta acción es IRREVERSIBLE. El administrador asume total responsabilidad.\n\n¿Eliminar todos los partidos de "${catName}"?`
    );
    if (!second) return;
    try {
      await teamService.deleteAllMatchesForCategory(selectedCategoryId);
      refresh();
    } catch (err: any) {
      setActionError(err.message);
      setTimeout(() => setActionError(null), 5000);
    }
  };

  const handleDeleteAllTeams = async () => {
    const catName = selectedCategory?.name || 'esta categoría';
    const first = window.confirm(
      `⚠️ ELIMINAR TODAS LAS PAREJAS\n\nEsto borrará permanentemente TODAS las parejas inscritas, partidos, grupos y tabla de posiciones de "${catName}".\n\n¿Deseas continuar?`
    );
    if (!first) return;
    const second = window.confirm(
      `❗ CONFIRMACIÓN FINAL\n\nEsta acción es TOTALMENTE IRREVERSIBLE. No se podrá recuperar nada. El administrador asume total responsabilidad.\n\n¿Eliminar TODO de "${catName}"?`
    );
    if (!second) return;
    try {
      await teamService.deleteAllTeamsForCategory(selectedCategoryId);
      refresh();
    } catch (err: any) {
      setActionError(err.message);
      setTimeout(() => setActionError(null), 5000);
    }
  };

  return (
    <div className="space-y-8">
      {/* Category Tabs */}
      <div className="flex border-b border-slate-800 overflow-x-auto custom-scrollbar no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategoryId(cat.id)}
            className={cn(
              "px-6 py-4 text-sm font-medium transition-all relative shrink-0",
              selectedCategoryId === cat.id 
                ? "text-indigo-400" 
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            {cat.name}
            {selectedCategoryId === cat.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
            )}
          </button>
        ))}
      </div>

      <div className="flex justify-between items-center px-2">
        <div>
          <h2 className="text-xl font-bold text-white">Listado de Inscritos</h2>
          {selectedCategory && (
            <p className="text-sm text-slate-500 uppercase tracking-widest mt-0.5">
              {teams.length} / {selectedCategory.cupos_max} Cupos
            </p>
          )}
        </div>
        <Button size="md" onClick={handleCreate} disabled={!selectedCategoryId}>
          <UserPlus size={18} className="mr-2" />
          Inscribir Pareja
        </Button>
      </div>

      {actionError && (
        <div className="p-4 bg-red-400/10 border border-red-500/20 rounded-xl text-red-500 text-sm flex items-center gap-3">
          <AlertCircle size={18} />
          {actionError}
        </div>
      )}

      {loading || loadingCats ? (
        <Card className="flex items-center justify-center py-20">
          <LoadingState />
        </Card>
      ) : !selectedCategoryId ? (
        <EmptyState 
          icon={UserPlus} 
          title="Selecciona una categoría" 
          description="Debes seleccionar una categoría para gestionar sus inscripciones." 
        />
      ) : teams.length === 0 ? (
        <EmptyState 
          icon={UserPlus} 
          title="Sin inscritos" 
          description="Aún no hay parejas inscritas en esta categoría." 
        />
      ) : (
        <Card className="border-none bg-transparent! p-0!">
          <Table headers={['№', 'Categoría', 'Pareja / Jugadores', 'Estado', 'P1', 'P2', 'Seed', 'Acciones']}>
            {teams.map((team, index) => {
              const isIncomplete = !team.player2_id;
              
              return (
                <TableRow key={team.id}>
                  <TableCell className="w-12 font-mono text-slate-500 text-center">
                    {team.registration_number}
                  </TableCell>
                  <TableCell className="text-xs text-slate-400 max-w-[120px] truncate">
                    {selectedCategory?.name || '—'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-white text-lg italic">
                        {team.team_name}
                      </div>
                      {team.is_seeded && (
                        <div className="p-1 bg-amber-500/10 text-amber-500 rounded" title="Cabeza de Serie">
                          <Star size={12} fill="currentColor" />
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 mt-1 uppercase tracking-tighter">
                      {team.player1?.last_name} & {team.player2?.last_name || 'PENDIENTE'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {isIncomplete ? (
                      <span className="badge badge-secondary">BORRADOR</span>
                    ) : (
                      <span className="badge badge-primary">CONFIRMADA</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    {team.paid_player1 
                      ? <CheckCircle2 size={18} className="text-green-500 mx-auto" /> 
                      : <Circle size={18} className="text-slate-800 mx-auto" />}
                  </TableCell>
                  <TableCell className="text-center">
                    {team.paid_player2 
                      ? <CheckCircle2 size={18} className="text-green-500 mx-auto" /> 
                      : <Circle size={18} className="text-slate-800 mx-auto" />}
                  </TableCell>
                  <TableCell className="text-center">
                    {team.is_seeded 
                      ? <Star size={18} className="text-amber-500 mx-auto" fill="currentColor" /> 
                      : <div className="w-5 h-5 mx-auto" />}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <div className="flex flex-col gap-0.5 mr-2">
                        <button 
                          onClick={() => moveTeam(index, 'up')}
                          disabled={index === 0}
                          className="p-1 hover:text-indigo-400 disabled:opacity-20 text-slate-600 transition-colors"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button 
                          onClick={() => moveTeam(index, 'down')}
                          disabled={index === teams.length - 1}
                          className="p-1 hover:text-indigo-400 disabled:opacity-20 text-slate-600 transition-colors"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-slate-500 hover:text-indigo-400"
                        onClick={() => handleEdit(team)}
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-slate-500 hover:text-red-400"
                        onClick={() => handleDelete(team.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </Table>
        </Card>
      )}

      {selectedCategory && (
        <TeamModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={refresh}
          team={selectedTeam}
          category={selectedCategory}
        />
      )}

      {/* ── Zona de Peligro ── */}
      {selectedCategoryId && (
        <div className="border border-red-500/20 rounded-2xl p-5 bg-red-500/5 space-y-4">
          <div className="flex items-center gap-2 text-red-400">
            <ShieldAlert size={18} />
            <span className="font-bold text-sm uppercase tracking-wider">Zona de Peligro</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Las siguientes acciones son <strong className="text-red-400">permanentes e irreversibles</strong>. El administrador asume plena responsabilidad al ejecutarlas. Se solicitará doble confirmación.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleDeleteAllMatches}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-semibold hover:bg-red-500/20 transition-colors"
            >
              <Trash2 size={15} />
              Eliminar todos los partidos de la categoría
            </button>
            <button
              type="button"
              onClick={handleDeleteAllTeams}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-600/40 bg-red-600/10 text-red-500 text-sm font-semibold hover:bg-red-600/20 transition-colors"
            >
              <Trash2 size={15} />
              Eliminar todas las parejas de la categoría
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
