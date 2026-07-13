import React from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { groupBadgeStyle } from '../../lib/groupBadge';
import { GroupBadge } from '../shared/GroupBadge';
import type { SecondRoundGroupDetail } from '../../types';

interface SecondRoundGroupsViewProps {
  groups: SecondRoundGroupDetail[];
  showLegend?: boolean;
}

export function SecondRoundGroupsView({ groups, showLegend = true }: SecondRoundGroupsViewProps) {
  const originGroups = React.useMemo(() => {
    const names = new Set<string>();
    groups.forEach((g) => g.teams.forEach((t) => names.add(t.phase1_group_name)));
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [groups]);

  if (groups.length === 0) return null;

  return (
    <div className="space-y-4">
      {showLegend && originGroups.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
          <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mr-1">
            Origen fase 1
          </span>
          {originGroups.map((name) => (
            <GroupBadge key={name} groupName={name} />
          ))}
          <span className="text-slate-600 mx-1">→</span>
          <span className="text-[10px] uppercase text-slate-500 font-bold tracking-wider mr-1">
            Destino 2da rueda
          </span>
          {groups.map((g) => (
            <GroupBadge key={g.groupName} groupName={g.groupName} size="md" />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {groups.map((group) => (
          <div
            key={group.groupName}
            className="rounded-xl border-2 border-indigo-500/25 bg-slate-950 overflow-hidden"
          >
            <div className={cn('px-4 py-3 border-b border-slate-800', groupBadgeStyle(group.groupName))}>
              <div className="flex items-center justify-between gap-2">
                <h5 className="text-sm font-bold">{group.groupName}</h5>
                <span className="text-[10px] uppercase tracking-wider opacity-80">2da rueda</span>
              </div>
              <p className="text-[10px] opacity-70 mt-0.5">{group.teams.length} parejas</p>
            </div>

            <ul className="divide-y divide-slate-800/80">
              {group.teams.map((team) => (
                <li key={team.league_team_id} className="px-3 py-2.5 hover:bg-slate-900/50 transition-colors">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <GroupBadge
                      groupName={team.phase1_group_name}
                      rank={team.phase1_rank_in_group}
                    />
                    <ArrowRight size={12} className="text-slate-600 shrink-0" />
                    <GroupBadge groupName={team.destination_group_name} rank={team.position_slot} />
                    {team.changed_group && (
                      <span className="text-[9px] uppercase text-amber-400/80 font-bold tracking-wide">
                        rotó
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-slate-200 italic truncate">{team.team_name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{team.phase1_points} pts arrastrados (fase 1)</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
