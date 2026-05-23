import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronUp, ChevronDown, Shuffle, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Base';
import { cn } from '../../lib/utils';
import type { TieGroup } from '../../types';

export type TieTeamRow = {
  league_team_id: string;
  team_name: string;
  points: number;
  sets_diff: number;
  games_diff: number;
};

interface TieResolveModalProps {
  isOpen: boolean;
  tie: TieGroup | null;
  teams: TieTeamRow[];
  onClose: () => void;
  onSave: (orderedTeamIds: string[], reason: string) => Promise<void>;
}

export function TieResolveModal({ isOpen, tie, teams, onClose, onSave }: TieResolveModalProps) {
  const [order, setOrder] = React.useState<string[]>([]);
  const [reason, setReason] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen && teams.length > 0) {
      setOrder(teams.map((t) => t.league_team_id));
      setReason('');
      setError(null);
    }
  }, [isOpen, teams]);

  if (!isOpen || !tie) return null;

  const slots = tie.slots_at_stake ?? 1;
  const byId = Object.fromEntries(teams.map((t) => [t.league_team_id, t]));

  const move = (index: number, dir: -1 | 1) => {
    const next = [...order];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Indica el motivo del desempate (ej. enfrentamiento directo, sorteo).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSave(order, reason.trim());
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar desempate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl z-10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Shuffle size={20} className="text-rose-400" />
                Resolver empate
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {tie.group_name ? `Grupo ${tie.group_name}` : 'Liga única'} · Posición {tie.rank_position}
              </p>
            </div>
            <button type="button" onClick={onClose} className="text-slate-500 hover:text-white">
              <X size={22} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <p className="text-sm text-slate-300">
              Ordena las parejas de <strong className="text-white">mejor a peor</strong>. Las primeras{' '}
              <strong className="text-emerald-400">{slots}</strong> clasifican al playoff; el resto no.
            </p>

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              {order.map((id, index) => {
                const t = byId[id];
                if (!t) return null;
                const qualifies = index < slots;
                return (
                  <div
                    key={id}
                    className={cn(
                      'flex items-center gap-2 p-3 rounded-xl border',
                      qualifies
                        ? 'bg-emerald-500/5 border-emerald-500/30'
                        : 'bg-slate-800/50 border-slate-800'
                    )}
                  >
                    <span className="w-7 text-center text-xs font-mono text-slate-500">{index + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white italic truncate">{t.team_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {t.points} pts · {t.sets_diff >= 0 ? '+' : ''}
                        {t.sets_diff} sets · {t.games_diff >= 0 ? '+' : ''}
                        {t.games_diff} games
                      </div>
                    </div>
                    {qualifies ? (
                      <span className="text-[10px] font-bold text-emerald-400 uppercase">Clasifica</span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Fuera</span>
                    )}
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        className="p-1 text-slate-500 hover:text-white disabled:opacity-20"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === order.length - 1}
                        className="p-1 text-slate-500 hover:text-white disabled:opacity-20"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400">Motivo del desempate *</label>
              <textarea
                required
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ej: Enfrentamiento directo, más games a favor, sorteo administrativo..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={loading}>
                Guardar desempate
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
