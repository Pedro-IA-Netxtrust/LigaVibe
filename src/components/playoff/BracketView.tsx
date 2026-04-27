import React from 'react';
import { motion } from 'motion/react';
import { Trophy, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Base';
import type { BracketMatch } from '../../types';
import { MatchResultModal, MatchRow } from '../results/MatchResultModal';

interface BracketViewProps {
  matches: BracketMatch[];
  onEditMatch: (match: any) => void;
  onResultSaved: () => void;
  onSubmitResult: (matchId: string, payload: any) => Promise<void>;
}

const ROUND_LABELS: Record<number, string> = {
  1: 'Ronda Inicial',
  2: 'Semifinales',
  3: 'Final',
};

const SLOT_ORDER = ['QF1', 'QF2', 'QF3', 'QF4', 'SF1', 'SF2', 'F', '3P'];

export function BracketView({ matches, onEditMatch, onResultSaved, onSubmitResult }: BracketViewProps) {
  const [modalMatch, setModalMatch] = React.useState<MatchRow | null>(null);

  const byRound = React.useMemo(() => {
    const rounds: Record<number, BracketMatch[]> = {};
    matches.forEach(m => {
      if (!rounds[m.round]) rounds[m.round] = [];
      rounds[m.round].push(m);
    });
    // Sort each round's matches by slot order
    Object.values(rounds).forEach(arr =>
      arr.sort((a, b) => SLOT_ORDER.indexOf(a.playoff_slot) - SLOT_ORDER.indexOf(b.playoff_slot))
    );
    return rounds;
  }, [matches]);

  const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b);

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="p-5 bg-amber-500/10 rounded-2xl text-amber-400 mb-4">
          <Trophy size={36} />
        </div>
        <h4 className="text-lg font-bold text-white mb-2">Cuadro no generado</h4>
        <p className="text-sm text-slate-500 max-w-xs">
          Genera el cuadro de playoffs desde el panel de configuración.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8 pb-4">
        {rounds.map(round => (
          <div key={round}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-black text-amber-400 uppercase tracking-widest">
                {ROUND_LABELS[round] ?? `Ronda ${round}`}
              </span>
              <div className="flex-1 border-t border-slate-800" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {byRound[round].map(match => (
                <BracketCard
                  key={match.id}
                  match={match}
                  onClick={() => setModalMatch(matchToRow(match))}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Result Modal */}
      <MatchResultModal
        isOpen={!!modalMatch}
        match={modalMatch}
        onClose={() => setModalMatch(null)}
        onSaved={() => { setModalMatch(null); onResultSaved(); }}
        onSubmit={onSubmitResult}
      />
    </>
  );
}

function BracketCard({ match, onClick }: { match: BracketMatch; onClick: () => void; key?: React.Key }) {
  const isDone = match.status === 'jugado';
  const isBye = match.is_bye;
  const isTeamless = !match.team1_id && !match.team2_id;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={cn(
        'p-4 rounded-2xl border-2 flex flex-col gap-3 cursor-default transition-all',
        isDone
          ? 'bg-slate-900 border-emerald-500/20 shadow-emerald-500/5 shadow-lg'
          : isBye
          ? 'bg-slate-900/50 border-slate-800 opacity-60'
          : isTeamless
          ? 'bg-slate-900/30 border-slate-800/50 border-dashed'
          : 'bg-slate-900 border-amber-500/20 shadow-amber-500/5 shadow-lg'
      )}
    >
      {/* Slot label */}
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          {match.comment ?? match.playoff_slot}
        </span>
        <StatusBadge status={match.status} isBye={isBye} isTeamless={isTeamless} />
      </div>

      {/* Teams */}
      <div className="space-y-2">
        <TeamRow
          name={match.team1_name ?? 'Por definir'}
          isWinner={match.winner_id === match.team1_id}
          isDone={isDone}
          isPlaceholder={!match.team1_id}
        />
        <div className="text-center text-[10px] font-black text-slate-600">VS</div>
        <TeamRow
          name={match.team2_name ?? 'Por definir'}
          isWinner={match.winner_id === match.team2_id}
          isDone={isDone}
          isPlaceholder={!match.team2_id}
        />
      </div>

      {/* Score */}
      {isDone && match.team1_id && match.team2_id && (
        <div className="text-center font-mono text-sm font-black text-indigo-400 border-t border-slate-800 pt-2 flex flex-col gap-1">
          <div className="text-[10px] uppercase text-slate-500 font-bold tracking-widest">— FINALIZADO —</div>
          <div className="text-lg">
            {match.s1_t1}-{match.s1_t2}
            {match.s2_t1 !== null && match.s2_t1 !== undefined && ` / ${match.s2_t1}-${match.s2_t2}`}
            {match.s3_t1 !== null && match.s3_t1 !== undefined && ` / ${match.s3_t1}-${match.s3_t2}`}
          </div>
        </div>
      )}

      {/* Action */}
      {!isBye && !isTeamless && (
        <button
          onClick={onClick}
          className={cn(
            'w-full text-xs font-bold py-1.5 rounded-xl border transition-all',
            isDone
              ? 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
              : 'border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10'
          )}
        >
          {isDone ? 'Editar resultado' : 'Cargar resultado'}
        </button>
      )}
    </motion.div>
  );
}

function TeamRow({ name, isWinner, isDone, isPlaceholder }: {
  name: string; isWinner: boolean; isDone: boolean; isPlaceholder: boolean;
}) {
  return (
    <div className={cn(
      'text-sm font-bold italic px-2 py-1.5 rounded-lg transition-all',
      isPlaceholder ? 'text-slate-600 italic' : isWinner && isDone ? 'text-emerald-400' : 'text-white'
    )}>
      {isWinner && isDone && <CheckCircle2 size={12} className="inline mr-1" />}
      {name}
    </div>
  );
}

function StatusBadge({ status, isBye, isTeamless }: { status: string; isBye: boolean; isTeamless: boolean }) {
  if (isTeamless) return <span className="text-[10px] text-slate-600 font-bold uppercase">Esperando</span>;
  if (isBye) return <span className="text-[10px] text-slate-500 font-bold uppercase">BYE</span>;
  if (status === 'jugado') return (
    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold uppercase flex items-center gap-1">
      <CheckCircle2 size={10} /> FINAL
    </span>
  );
  return (
    <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20 font-bold uppercase flex items-center gap-1">
      <Clock size={10} /> PENDIENTE
    </span>
  );
}

function matchToRow(m: BracketMatch): MatchRow {
  return {
    id: m.id,
    team1_id: m.team1_id ?? '',
    team2_id: m.team2_id ?? '',
    team1: m.team1_name ? { team_name: m.team1_name } : undefined,
    team2: m.team2_name ? { team_name: m.team2_name } : undefined,
    status: m.status,
    winner_id: m.winner_id,
    comment: m.comment,
    s1_t1: m.s1_t1,
    s1_t2: m.s1_t2,
    s2_t1: m.s2_t1,
    s2_t2: m.s2_t2,
    s3_t1: m.s3_t1,
    s3_t2: m.s3_t2,
    match_date: m.match_date,
    match_time: m.match_time,
    court_name: m.court_name,
  };
}
