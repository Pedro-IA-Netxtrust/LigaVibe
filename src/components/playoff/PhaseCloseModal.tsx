import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, AlertTriangle, CheckCircle2, Lock, Shuffle } from 'lucide-react';
import { Button } from '../ui/Base';
import { cn } from '../../lib/utils';
import type { PhaseClosePreview, ClassifiedTeam, TieGroup } from '../../types';

interface PhaseCloseModalProps {
  isOpen: boolean;
  preview: PhaseClosePreview | null;
  loading: boolean;
  qualifiers: number;
  onQualifiersChange: (n: number) => void;
  onConfirm: (forced: boolean, notes: string) => void;
  onClose: () => void;
  onResolveTie: (tie: TieGroup) => void;
}

export function PhaseCloseModal({
  isOpen,
  preview,
  loading,
  qualifiers,
  onQualifiersChange,
  onConfirm,
  onClose,
  onResolveTie,
}: PhaseCloseModalProps) {
  const [forced, setForced] = React.useState(false);
  const [notes, setNotes] = React.useState('');

  React.useEffect(() => {
    if (isOpen) { setForced(false); setNotes(''); }
  }, [isOpen]);

  if (!isOpen) return null;

  const hasPending = (preview?.pending_matches ?? 0) > 0;
  const hasTies = (preview?.ties_at_boundary?.length ?? 0) > 0;
  const canConfirm = !loading && preview !== null && (!hasPending || forced) && (!hasTies || forced);

  const classified = preview?.classified.slice(0, qualifiers) ?? [];
  const notClassified = preview?.classified.slice(qualifiers) ?? [];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Lock size={20} className="text-amber-400" />
                  Cerrar Fase Regular
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Revisa y confirma el cierre antes de generar el cuadro de playoffs
                </p>
              </div>
              <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all">
                <X size={20} />
              </button>
            </div>

            {loading && !preview ? (
              <div className="flex items-center justify-center py-20 text-slate-400">
                Calculando clasificados...
              </div>
            ) : preview ? (
              <div className="p-6 space-y-6">
                {/* Stats bar */}
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Total Partidos', value: preview.total_matches, color: 'text-slate-300' },
                    { label: 'Jugados', value: preview.played_matches, color: 'text-emerald-400' },
                    { label: 'Pendientes', value: preview.pending_matches, color: preview.pending_matches > 0 ? 'text-amber-400' : 'text-slate-500' },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-800/50 rounded-xl p-4 text-center border border-slate-800">
                      <div className={cn('text-3xl font-black', s.color)}>{s.value}</div>
                      <div className="text-[11px] text-slate-500 uppercase font-bold tracking-widest mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Warnings */}
                {hasPending && (
                  <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-amber-300">Hay {preview.pending_matches} partidos pendientes</p>
                      <p className="text-xs text-amber-400/70 mt-1">
                        Puedes continuar con cierre forzado. Los partidos quedarán sin resultado en el histórico.
                      </p>
                    </div>
                  </div>
                )}
                {hasTies && !forced && (
                  <div className="flex items-start gap-3 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                    <AlertCircle size={18} className="text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-rose-300">Empate en zona de clasificación</p>
                      <p className="text-xs text-rose-400/70 mt-1 mb-3">
                        Equipos con estadísticas idénticas en el borde de clasificación. Resolución requerida.
                      </p>
                      {preview.ties_at_boundary.map((tie, i) => (
                        <Button key={i} size="sm" variant="secondary" onClick={() => onResolveTie(tie)} className="flex items-center gap-2">
                          <Shuffle size={14} />
                          Resolver empate — Posición {tie.rank_position}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Qualifier selector */}
                <div className="bg-slate-800/50 border border-slate-800 rounded-xl p-4">
                  <label className="text-sm font-bold text-slate-300 block mb-3">
                    ¿Cuántas parejas clasifican al playoff?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {([2, 4, 8] as const).map(n => (
                      <button
                        key={n}
                        onClick={() => onQualifiersChange(n)}
                        className={cn(
                          'px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all',
                          qualifiers === n
                            ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                            : 'border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-600'
                        )}
                      >
                        {n === 2 ? 'Final Directa' : n === 4 ? 'Semifinales' : 'Cuartos de Final'}
                        <span className="block text-[10px] font-normal opacity-70">Top {n}</span>
                      </button>
                    ))}
                  </div>
                  {qualifiers === preview.recommended_qualifiers && (
                    <p className="text-[11px] text-emerald-400 mt-2 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Formato recomendado para {preview.classified.length} equipos
                    </p>
                  )}
                </div>

                {/* Classified preview */}
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                    Clasifican ({classified.length})
                  </h4>
                  <div className="space-y-1.5">
                    {classified.map((t, i) => (
                      <ClassifiedRow key={t.league_team_id} team={t} rank={i + 1} classified />
                    ))}
                  </div>

                  {notClassified.length > 0 && (
                    <>
                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-4">
                        No clasifican ({notClassified.length})
                      </h4>
                      <div className="space-y-1.5 opacity-40">
                        {notClassified.map((t, i) => (
                          <ClassifiedRow key={t.league_team_id} team={t} rank={classified.length + i + 1} classified={false} />
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Force close section */}
                {(hasPending || hasTies) && (
                  <div className="border border-rose-500/20 rounded-xl p-4 bg-rose-500/5">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={forced}
                        onChange={e => setForced(e.target.checked)}
                        className="w-4 h-4 accent-rose-500"
                      />
                      <span className="text-sm font-bold text-rose-300">Cierre forzado</span>
                    </label>
                    {forced && (
                      <textarea
                        className="w-full mt-3 bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-rose-500/30"
                        placeholder="Nota obligatoria: justifica el cierre forzado..."
                        rows={3}
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                      />
                    )}
                  </div>
                )}
              </div>
            ) : null}

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 pb-6 pt-2 sticky bottom-0 bg-slate-900 border-t border-slate-800">
              <Button variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button
                onClick={() => onConfirm(forced, notes)}
                disabled={!canConfirm || (forced && !notes.trim())}
                className="bg-amber-500 hover:bg-amber-400 text-black font-black"
              >
                <Lock size={16} className="mr-2" />
                Confirmar Cierre
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function ClassifiedRow({ team, rank, classified }: { team: ClassifiedTeam; rank: number; classified: boolean; key?: React.Key }) {
  return (
    <div className={cn(
      'flex items-center gap-3 px-3 py-2 rounded-xl border',
      classified
        ? 'bg-emerald-500/5 border-emerald-500/20'
        : 'bg-slate-800/30 border-slate-800'
    )}>
      <span className="w-6 text-center text-xs font-mono text-slate-500">#{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-white italic truncate">{team.team_name}</div>
        {team.group_name && (
          <div className="text-[10px] text-slate-500">{team.group_name}</div>
        )}
      </div>
      <div className="flex items-center gap-3 text-xs font-mono">
        <span className="text-indigo-400 font-bold">{team.points}pts</span>
        <span className="text-slate-500">
          {team.sets_diff > 0 ? '+' : ''}{team.sets_diff} sets
        </span>
        {classified && (
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold uppercase">
            Clasifica
          </span>
        )}
      </div>
    </div>
  );
}
