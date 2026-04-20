import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Base';

export type MatchRow = {
  id: string;
  team1_id: string;
  team2_id: string;
  team1?: { team_name?: string };
  team2?: { team_name?: string };
  status: string;
};

interface MatchResultModalProps {
  isOpen: boolean;
  match: MatchRow | null;
  onClose: () => void;
  onSaved: () => void;
  onSubmit: (
    matchId: string,
    payload: {
      mode: 'quick' | 'full';
      winnerTeamId: string;
      team1_sets?: number;
      team2_sets?: number;
      team1_games?: number;
      team2_games?: number;
    }
  ) => Promise<void>;
}

export function MatchResultModal({ isOpen, match, onClose, onSaved, onSubmit }: MatchResultModalProps) {
  const [winnerId, setWinnerId] = React.useState<string>('');
  const [s1t1, setS1t1] = React.useState<number | ''>('');
  const [s1t2, setS1t2] = React.useState<number | ''>('');
  const [s2t1, setS2t1] = React.useState<number | ''>('');
  const [s2t2, setS2t2] = React.useState<number | ''>('');
  const [s3t1, setS3t1] = React.useState<number | ''>('');
  const [s3t2, setS3t2] = React.useState<number | ''>('');

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!match || !isOpen) return;
    setWinnerId('');
    setS1t1(''); setS1t2('');
    setS2t1(''); setS2t2('');
    setS3t1(''); setS3t2('');
    setError(null);
  }, [match, isOpen]);

  if (!isOpen || !match) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!winnerId) {
      setError('Selecciona el ganador. Es obligatorio.');
      return;
    }

    let team1_sets = 0;
    let team2_sets = 0;
    let team1_games = 0;
    let team2_games = 0;
    let finalMode: 'quick' | 'full' = 'quick';

    const hasSetInputs = s1t1 !== '' || s1t2 !== '' || s2t1 !== '' || s2t2 !== '';
    if (hasSetInputs) {
      const v_s1t1 = Number(s1t1) || 0;
      const v_s1t2 = Number(s1t2) || 0;
      const v_s2t1 = Number(s2t1) || 0;
      const v_s2t2 = Number(s2t2) || 0;
      const v_s3t1 = Number(s3t1) || 0;
      const v_s3t2 = Number(s3t2) || 0;

      let sets1 = 0;
      let sets2 = 0;
      if (v_s1t1 > v_s1t2) sets1++; else if (v_s1t2 > v_s1t1) sets2++;
      if (v_s2t1 > v_s2t2) sets1++; else if (v_s2t2 > v_s2t1) sets2++;
      if (v_s3t1 > v_s3t2) sets1++; else if (v_s3t2 > v_s3t1) sets2++;

      const computedWinner = sets1 > sets2 ? match.team1_id : match.team2_id;
      if (sets1 === sets2) {
         setError('Los games introducidos marcan un empate en sets. Revisa los resultados.');
         return;
      }
      if (computedWinner !== winnerId) {
         setError('El ganador seleccionado no coincide con el resultado ingresado en los sets.');
         return;
      }

      team1_sets = sets1;
      team2_sets = sets2;
      team1_games = v_s1t1 + v_s2t1 + v_s3t1;
      team2_games = v_s1t2 + v_s2t2 + v_s3t2;
      finalMode = 'full';
    } else {
       if (winnerId === match.team1_id) {
          team1_sets = 2;
          team2_sets = 0;
       } else {
          team1_sets = 0;
          team2_sets = 2;
       }
    }

    setLoading(true);
    try {
      await onSubmit(match.id, {
        mode: finalMode,
        winnerTeamId: winnerId,
        team1_sets,
        team2_sets,
        team1_games,
        team2_games
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

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
          className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        >
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-lg font-bold text-white">Registrar resultado</h3>
            <button type="button" onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X size={22} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="p-3 bg-red-400/10 border border-red-500/20 rounded-xl flex gap-2 text-red-400 text-sm">
                <AlertCircle size={18} className="shrink-0" />
                {error}
              </div>
            )}

            <div className="text-center text-sm text-slate-400">
              <span className="text-white font-semibold italic">{match.team1?.team_name}</span>
              <span className="mx-2 text-slate-600">vs</span>
              <span className="text-white font-semibold italic">{match.team2?.team_name}</span>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Ganador del Partido (Obligatorio)</label>
                <select
                  value={winnerId}
                  onChange={(e) => setWinnerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 font-semibold"
                >
                  <option value="">-- Selecciona ganador --</option>
                  <option value={match.team1_id}>{match.team1?.team_name}</option>
                  <option value={match.team2_id}>{match.team2?.team_name}</option>
                </select>
              </div>

              <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
                <label className="text-sm font-medium text-slate-300 block mb-1">Detalle por Sets (Opcional)</label>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">Puedes omitir esto si solo quieres guardar el ganador. Si lo llenas, el sistema calculará todo automáticamente.</p>

                <div className="space-y-4 pt-1">
                  <div className="flex text-[11px] text-slate-500 font-semibold uppercase tracking-wider">
                    <div className="w-14"></div>
                    <div className="flex-1 text-center truncate px-1">{match.team1?.team_name}</div>
                    <div className="w-4"></div>
                    <div className="flex-1 text-center truncate px-1">{match.team2?.team_name}</div>
                  </div>
                  
                  <div className="flex gap-2 items-center">
                    <span className="w-14 text-xs text-slate-400 font-medium shrink-0 uppercase">Set 1</span>
                    <input type="number" min="0" max="9" value={s1t1} onChange={(e) => setS1t1(e.target.value ? Number(e.target.value) : '')} className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-center text-slate-200 text-sm font-bold w-0 min-w-0" />
                    <span className="text-slate-600 font-bold text-xs">-</span>
                    <input type="number" min="0" max="9" value={s1t2} onChange={(e) => setS1t2(e.target.value ? Number(e.target.value) : '')} className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-center text-slate-200 text-sm font-bold w-0 min-w-0" />
                  </div>
                  
                  <div className="flex gap-2 items-center">
                    <span className="w-14 text-xs text-slate-400 font-medium shrink-0 uppercase">Set 2</span>
                    <input type="number" min="0" max="9" value={s2t1} onChange={(e) => setS2t1(e.target.value ? Number(e.target.value) : '')} className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-center text-slate-200 text-sm font-bold w-0 min-w-0" />
                    <span className="text-slate-600 font-bold text-xs">-</span>
                    <input type="number" min="0" max="9" value={s2t2} onChange={(e) => setS2t2(e.target.value ? Number(e.target.value) : '')} className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-center text-slate-200 text-sm font-bold w-0 min-w-0" />
                  </div>

                  <div className="flex gap-2 items-center">
                    <span className="w-14 text-xs text-slate-400 font-medium shrink-0 flex flex-col uppercase">
                      Set 3
                      <span className="text-[9px] text-slate-500 font-normal lowercase">(opcional)</span>
                    </span>
                    <input type="number" min="0" max="9" value={s3t1} onChange={(e) => setS3t1(e.target.value ? Number(e.target.value) : '')} className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-center text-slate-200 text-sm font-bold w-0 min-w-0" />
                    <span className="text-slate-600 font-bold text-xs">-</span>
                    <input type="number" min="0" max="9" value={s3t2} onChange={(e) => setS3t2(e.target.value ? Number(e.target.value) : '')} className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-center text-slate-200 text-sm font-bold w-0 min-w-0" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={loading}>
                Guardar
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
