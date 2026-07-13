import React from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { groupBadgeStyle, shortGroupLabel } from '../../lib/groupBadge';
import { GroupBadge } from '../shared/GroupBadge';
import type { ClassifiedTeam } from '../../types';

interface PlayoffLineageViewProps {
  teams: ClassifiedTeam[];
  playoffSize: number;
  grouped?: boolean;
}

export function PlayoffLineageView({ teams, playoffSize, grouped = true }: PlayoffLineageViewProps) {
  if (teams.length === 0) return null;

  const byPhase2Group = React.useMemo(() => {
    const map = new Map<string, ClassifiedTeam[]>();
    teams.forEach((t) => {
      const key = t.phase2_group_name ?? t.group_name ?? 'Sin grupo';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    map.forEach((list) => list.sort((a, b) => a.rank_in_group - b.rank_in_group));
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [teams]);

  const renderRow = (t: ClassifiedTeam, showSeed: boolean) => (
    <li
      key={t.league_team_id}
      className="px-3 py-2.5 border-b border-slate-800/60 last:border-0 hover:bg-slate-900/40 transition-colors"
    >
      <div className="flex flex-wrap items-center gap-2 mb-1.5">
        {showSeed && (
          <span className="font-mono text-xs font-bold text-amber-400 w-7 shrink-0">#{t.overall_rank}</span>
        )}
        {t.phase1_group_name && (
          <>
            <GroupBadge groupName={t.phase1_group_name} rank={t.phase1_rank_in_group} />
            <ArrowRight size={12} className="text-slate-600 shrink-0" />
          </>
        )}
        <GroupBadge
          groupName={t.phase2_group_name ?? t.group_name ?? '2da rueda'}
          rank={t.phase2_rank_in_group ?? t.rank_in_group}
        />
        <ArrowRight size={12} className="text-slate-600 shrink-0" />
        <span className="text-[10px] uppercase font-bold text-amber-400/90 border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 rounded">
          Playoff
        </span>
      </div>
      <div className="flex justify-between items-center gap-2 pl-0 sm:pl-9">
        <p className="text-sm font-medium text-slate-200 italic truncate">{t.team_name}</p>
        <span className="font-mono text-xs text-slate-400 shrink-0">{t.points} pts</span>
      </div>
    </li>
  );

  if (!grouped) {
    return (
      <ul className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden max-h-96 overflow-y-auto">
        {teams.map((t) => renderRow(t, true))}
      </ul>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl text-xs text-slate-400">
        <span className="font-bold uppercase tracking-wider text-amber-400/80">Recorrido</span>
        <span>Fase 1</span>
        <ArrowRight size={12} />
        <span>2da rueda</span>
        <ArrowRight size={12} />
        <span className="text-amber-400">Playoff ({playoffSize})</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {byPhase2Group.map(([groupName, list]) => (
          <div
            key={groupName}
            className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden"
          >
            <div className={cn('px-4 py-2.5 border-b border-slate-800', groupBadgeStyle(groupName))}>
              <p className="text-sm font-bold">{shortGroupLabel(groupName)}</p>
              <p className="text-[10px] opacity-70">
                {list.length} clasificada{list.length !== 1 ? 's' : ''} al playoff
              </p>
            </div>
            <ul>{list.map((t) => renderRow(t, true))}</ul>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/50">
          <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">
            Orden de siembra global
          </p>
        </div>
        <ul className="max-h-64 overflow-y-auto">
          {teams.map((t) => renderRow(t, true))}
        </ul>
      </div>
    </div>
  );
}
