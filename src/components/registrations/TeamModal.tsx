import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, Info } from 'lucide-react';
import { Button } from '../ui/Base';
import { LeagueTeam, LeagueCategory, Client } from '../../types';
import { teamService } from '../../services/teamService';
import { formatGenderForUi } from '../../utils/gender';
import { validatePairForCategory } from '../../utils/teamValidation';

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  team?: any | null;
  category: LeagueCategory;
}

export function TeamModal({ isOpen, onClose, onSave, team, category }: TeamModalProps) {
  const [formData, setFormData] = React.useState({
    player1_id: '',
    player2_id: '',
    is_seeded: false,
    paid_player1: false,
    paid_player2: false,
    team_name: ''
  });
  
  const [availablePlayers, setAvailablePlayers] = React.useState<Client[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [fetchingPlayers, setFetchingPlayers] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      loadAvailablePlayers();
    }
  }, [isOpen, category]);

  async function loadAvailablePlayers() {
    setFetchingPlayers(true);
    setError(null);
    try {
      const players = await teamService.getAvailablePlayers(category.id, category.name);
      
      // If editing, make sure the current team members are in the available list so they can be selected
      let finalPlayers = [...players];
      if (team) {
        if (team.player1 && !finalPlayers.find(p => p.id === team.player1.id)) {
          finalPlayers.push(team.player1);
        }
        if (team.player2 && !finalPlayers.find(p => p.id === team.player2.id)) {
          finalPlayers.push(team.player2);
        }
      }
      
      setAvailablePlayers(finalPlayers.sort((a, b) => a.last_name.localeCompare(b.last_name)));
    } catch (err: any) {
      console.error('Error loading players:', err);
      setError(`Error al cargar jugadores: ${err.message || 'Error desconocido'}`);
    } finally {
      setFetchingPlayers(false);
    }
  }

  React.useEffect(() => {
    if (team) {
      setFormData({
        player1_id: team.player1_id || '',
        player2_id: team.player2_id || '',
        is_seeded: team.is_seeded || false,
        paid_player1: team.paid_player1 || false,
        paid_player2: team.paid_player2 || false,
        team_name: team.team_name || ''
      });
    } else {
      setFormData({
        player1_id: '',
        player2_id: '',
        is_seeded: false,
        paid_player1: false,
        paid_player2: false,
        team_name: ''
      });
    }
    setError(null);
  }, [team, isOpen]);

  // Auto-generate team name based on surnames
  React.useEffect(() => {
    if (!formData.player1_id || availablePlayers.length === 0) return;
    
    const p1 = availablePlayers.find(p => p.id === formData.player1_id);
    const p2 = availablePlayers.find(p => p.id === formData.player2_id);
    
    if (p1) {
      let name = p1.last_name;
      if (p2) {
        name += ` / ${p2.last_name}`;
      } else {
        name += ' (INCOMPLETA)';
      }
      setFormData(prev => ({ ...prev, team_name: name }));
    }
  }, [formData.player1_id, formData.player2_id, availablePlayers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.player1_id) {
      setError('El jugador 1 es obligatorio.');
      return;
    }

    const p1 = availablePlayers.find((p) => p.id === formData.player1_id);
    const p2 = formData.player2_id
      ? availablePlayers.find((p) => p.id === formData.player2_id)
      : null;
    if (!p1) {
      setError('Jugador 1 no válido.');
      return;
    }
    const genderErr = validatePairForCategory(category.name, p1, p2 || null);
    if (genderErr) {
      setError(genderErr);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dataToSave = {
        ...formData,
        league_category_id: category.id
      };

      if (team) {
        await teamService.update(team.id, dataToSave);
      } else {
        await teamService.create(dataToSave);
      }
      
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar la pareja');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-white">
                {team ? 'Editar Pareja' : 'Inscribir Pareja'}
              </h3>
              <p className="text-xs text-indigo-400 font-medium uppercase tracking-wider mt-1">
                Categoría: {category.name}
              </p>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {error && (
              <div className="p-4 bg-red-400/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-500">
                <AlertCircle className="shrink-0" size={20} />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {!formData.player2_id && (
              <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-start gap-3 text-indigo-400">
                <Info className="shrink-0" size={18} />
                <p className="text-[12px]">Pareja guardada como borrador (Incompleta).</p>
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Jugador 1 (Titular)</label>
                <select
                  required
                  disabled={fetchingPlayers}
                  value={formData.player1_id}
                  onChange={(e) => setFormData({ ...formData, player1_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:border-indigo-500 disabled:opacity-50"
                >
                  <option value="">{fetchingPlayers ? 'Cargando jugadores...' : 'Seleccionar Jugador...'}</option>
                    {availablePlayers.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.last_name}, {p.first_name} ({formatGenderForUi(p.gender) === 'Femenino' ? '♀' : '♂'})
                      </option>
                    ))}
                </select>
                {!fetchingPlayers && availablePlayers.length === 0 && (
                  <p className="text-[10px] text-amber-500 mt-1 flex items-center gap-1">
                    <Info size={10} /> No hay jugadores inscritos en "{category.name}" disponibles.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-400">Jugador 2 (Opcional para Borrador)</label>
                <select
                  disabled={fetchingPlayers}
                  value={formData.player2_id}
                  onChange={(e) => setFormData({ ...formData, player2_id: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 focus:border-indigo-500 disabled:opacity-50"
                >
                  <option value="">{fetchingPlayers ? 'Cargando...' : 'Esperando Pareja...'}</option>
                  {availablePlayers
                    .filter(p => p.id !== formData.player1_id)
                      .map(p => (
                        <option key={p.id} value={p.id}>
                          {p.last_name}, {p.first_name} ({formatGenderForUi(p.gender) === 'Femenino' ? '♀' : '♂'})
                        </option>
                      ))
                  }
                </select>
              </div>

              <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-900 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.is_seeded}
                    onChange={(e) => setFormData({ ...formData, is_seeded: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-medium text-slate-300">Cabeza de Serie</span>
                </label>

                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-[12px] text-slate-400">
                    <input
                      type="checkbox"
                      checked={formData.paid_player1}
                      onChange={(e) => setFormData({ ...formData, paid_player1: e.target.checked })}
                    />
                    P1 Confirmado
                  </label>
                  <label className="flex items-center gap-2 text-[12px] text-slate-400">
                    <input
                      type="checkbox"
                      checked={formData.paid_player2}
                      onChange={(e) => setFormData({ ...formData, paid_player2: e.target.checked })}
                    />
                    P2 Confirmado
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={loading}>
                {team ? 'Guardar Cambios' : 'Confirmar Inscripción'}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
