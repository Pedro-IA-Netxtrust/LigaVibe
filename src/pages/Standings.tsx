import React from 'react';
import { Card, Button } from '../components/ui/Base';
import { Table, TableRow, TableCell } from '../components/ui/Table';
import { LoadingState, EmptyState } from '../components/ui/States';
import { ListOrdered, AlertCircle, Pencil, RotateCcw } from 'lucide-react';
import { useCategories } from '../hooks/useTeams';
import { resultService } from '../services/resultService';
import { fixtureService } from '../services/fixtureService';
import { computeStandingsFromMatches, ComputedStanding } from '../utils/standingsCalculator';
import { MatchResultModal, MatchRow } from '../components/results/MatchResultModal';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Share2 } from 'lucide-react';

export default function Standings() {
  const { categories, loading: loadingCats } = useCategories();
  const [categoryId, setCategoryId] = React.useState('');
  const [groupKey, setGroupKey] = React.useState<string>('__all__');
  const [matches, setMatches] = React.useState<any[]>([]);
  const [teamNames, setTeamNames] = React.useState<Record<string, string>>({});
  const [fixtureState, setFixtureState] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [modalMatch, setModalMatch] = React.useState<MatchRow | null>(null);

  React.useEffect(() => {
    if (categories.length && !categoryId) setCategoryId(categories[0].id);
  }, [categories, categoryId]);

  const load = React.useCallback(async () => {
    if (!categoryId) return;
    setLoading(true);
    setError(null);
    try {
      const st = await fixtureService.getStatus(categoryId);
      setFixtureState(st.state);
      const m = await resultService.getMatchesForCategory(categoryId);
      setMatches(m);
      const names: Record<string, string> = {};
      m.forEach((row: any) => {
        if (row.team1?.team_name) names[row.team1_id] = row.team1.team_name;
        if (row.team2?.team_name) names[row.team2_id] = row.team2.team_name;
      });
      setTeamNames(names);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  React.useEffect(() => {
    load();
  }, [load]);

  const groupOptions = React.useMemo(() => {
    const opts: { key: string; label: string }[] = [{ key: '__all__', label: 'Todos los grupos' }];
    const seen = new Set<string>();
    matches.forEach((m) => {
      const id = m.league_group_id as string | null;
      const label = m.group?.group_name || (id ? 'Grupo' : 'Liga única');
      const key = id ?? '__liga__';
      if (!seen.has(key)) {
        seen.add(key);
        opts.push({ key, label });
      }
    });
    return opts;
  }, [matches]);

  const finishedFiltered = React.useMemo(() => {
    const fin = matches.filter((m) => m.status === 'jugado');
    if (groupKey === '__all__') return fin;
    if (groupKey === '__liga__') return fin.filter((m) => !m.league_group_id);
    return fin.filter((m) => m.league_group_id === groupKey);
  }, [matches, groupKey]);

  const pendingFiltered = React.useMemo(() => {
    const p = matches.filter((m) => m.status === 'pendiente');
    if (groupKey === '__all__') return p;
    if (groupKey === '__liga__') return p.filter((m) => !m.league_group_id);
    return p.filter((m) => m.league_group_id === groupKey);
  }, [matches, groupKey]);

  const standingsByGroup = React.useMemo(() => {
    const groups: Record<string, { label: string; rows: ComputedStanding[] }> = {};
    
    // Identify all groups present
    matches.forEach(m => {
      const gid = m.league_group_id || '__liga__';
      if (!groups[gid]) {
        groups[gid] = {
          label: m.group?.group_name || (m.league_group_id ? 'Grupo' : 'Liga única'),
          rows: []
        };
      }
    });

    // Compute standings for each group
    Object.keys(groups).forEach(gid => {
      const allGroupMatches = matches.filter(m => (m.league_group_id || '__liga__') === gid);
      const groupMatches = allGroupMatches.filter(m => m.status === 'jugado');
      
      const groupTeamNames: Record<string, string> = {};
      allGroupMatches.forEach(m => {
        if (m.team1?.team_name) groupTeamNames[m.team1_id] = m.team1.team_name;
        if (m.team2?.team_name) groupTeamNames[m.team2_id] = m.team2.team_name;
      });

      const slice = groupMatches.map(m => ({
        team1_id: m.team1_id,
        team2_id: m.team2_id,
        winner_id: m.winner_id,
        team1_sets: m.team1_sets,
        team2_sets: m.team2_sets,
        team1_games: m.team1_games,
        team2_games: m.team2_games
      }));
      groups[gid].rows = computeStandingsFromMatches(slice, groupTeamNames);
    });

    return groups;
  }, [matches, teamNames]);

  const displayedGroups = React.useMemo(() => {
    if (groupKey === '__all__') {
      return Object.entries(standingsByGroup)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([id, data]) => ({ id, ...data }));
    }
    return [
      { 
        id: groupKey, 
        ...standingsByGroup[groupKey] || { label: 'Sin datos', rows: [] } 
      }
    ];
  }, [standingsByGroup, groupKey]);

  const canEdit = fixtureState === 'generated' || fixtureState === 'closed';

  const handleResetStandings = async () => {
    if (!window.confirm('¿Reiniciar la tabla de posiciones? Esto borrará todas las posiciones calculadas y las recalculará desde los partidos con resultado. Los resultados NO se pierden.')) return;
    setLoading(true);
    setError(null);
    try {
      await resultService.recalculateStandings(categoryId);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyGroup = (groupLabel: string, rows: ComputedStanding[]) => {
    if (rows.length === 0) return;
    
    const catName = categories.find(c => c.id === categoryId)?.name || 'Categoría';
    
    let text = `🏆 *${catName.toUpperCase()}*\n`;
    text += `👥 *${groupLabel.toUpperCase()}*\n\n`;
    
    rows.forEach((r, idx) => {
      text += `${idx + 1}. ${r.team_name}\n`;
    });
    
    text += `\n_Liga Vibe Sport_`;

    navigator.clipboard.writeText(text).then(() => {
      alert('✅ Lista del grupo copiada al portapapeles. ¡Listo para pegar!');
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex border-b border-slate-800 overflow-x-auto">
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setCategoryId(c.id);
              setGroupKey('__all__');
            }}
            className={cn(
              'px-6 py-4 text-sm font-bold transition-all duration-200 shrink-0 relative',
              categoryId === c.id 
                ? 'text-white bg-indigo-500/10' 
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
            )}
          >
            {c.name}
            {categoryId === c.id && (
              <motion.div 
                layoutId="activeCategory"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.8)]" 
              />
            )}
          </button>
        ))}
      </div>

      {!canEdit && !loading && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 text-sm">
          Genera el fixture en la pestaña Fixture para habilitar resultados y la tabla en esta categoría.
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-400/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex gap-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="text-sm text-slate-400">Grupo</label>
          <select
            value={groupKey}
            onChange={(e) => setGroupKey(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200"
          >
            {groupOptions.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
          {groupKey !== '__all__' && groupKey !== '__liga__' && standingsByGroup[groupKey]?.rows.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleCopyGroup(standingsByGroup[groupKey].label, standingsByGroup[groupKey].rows)}
              title="Copiar lista de parejas de este grupo"
            >
              <Share2 size={14} className="mr-1.5" />
              Copiar Lista
            </Button>
          )}
        </div>
        {canEdit && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetStandings}
            disabled={loading}
            title="Recalcular tabla desde los resultados registrados"
          >
            <RotateCcw size={14} className="mr-1.5" />
            Recalcular tabla
          </Button>
        )}
      </div>

      {loading || loadingCats ? (
        <Card className="flex justify-center py-16">
          <LoadingState />
        </Card>
      ) : (
        <>
          <div className="space-y-6">
            {displayedGroups.length === 0 || (displayedGroups.length === 1 && displayedGroups[0].rows.length === 0) ? (
              <Card title="Tabla de posiciones">
                <EmptyState
                  icon={ListOrdered}
                  title="Sin datos aún"
                  description="Cuando existan partidos finalizados, la tabla se llenará automáticamente."
                />
              </Card>
            ) : (
              displayedGroups.map((g) => (
                <Card key={g.id} title={g.label}>
                  <Table
                    headers={[
                      '#',
                      'Pareja',
                      'PJ',
                      'PG',
                      'PP',
                      'SF',
                      'SC',
                      'DS',
                      'GF',
                      'GC',
                      'DG',
                      'Pts'
                    ]}
                  >
                    {g.rows.map((r, idx) => {
                      const ds = r.sets_for - r.sets_against;
                      const dg = r.games_for - r.games_against;
                      return (
                        <TableRow key={r.league_team_id}>
                          <TableCell className="text-slate-500 font-mono w-8">{idx + 1}</TableCell>
                          <TableCell className="font-semibold text-white italic">{r.team_name}</TableCell>
                          <TableCell>{r.played}</TableCell>
                          <TableCell>{r.won}</TableCell>
                          <TableCell>{r.lost}</TableCell>
                          <TableCell>{r.sets_for}</TableCell>
                          <TableCell>{r.sets_against}</TableCell>
                          <TableCell>{ds >= 0 ? `+${ds}` : ds}</TableCell>
                          <TableCell>{r.games_for}</TableCell>
                          <TableCell>{r.games_against}</TableCell>
                          <TableCell>{dg >= 0 ? `+${dg}` : dg}</TableCell>
                          <TableCell className="bg-indigo-500/10 text-indigo-400 font-black text-center border-l border-indigo-500/20">{r.points}</TableCell>
                        </TableRow>
                      );
                    })}
                  </Table>
                  {displayedGroups.length > 1 && (
                    <div className="mt-4 flex justify-end">
                       <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyGroup(g.label, g.rows)}
                      >
                        <Share2 size={14} className="mr-1.5" />
                        Copiar Lista {g.label}
                      </Button>
                    </div>
                  )}
                </Card>
              ))
            )}
            <p className="text-[11px] text-slate-500 mt-2 px-2">
              Criterios: 1) puntos (2 por victoria) 2) diferencia de sets 3) diferencia de games.
            </p>
          </div>

          <Card title="Partidos pendientes">
            {pendingFiltered.length === 0 ? (
              <p className="text-sm text-slate-500">No hay partidos pendientes en este filtro.</p>
            ) : (
              <Table headers={['Grupo', 'Fecha', 'Pareja 1', '', 'Pareja 2', 'Acción']}>
                {pendingFiltered.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-indigo-400 font-medium">
                      {m.group?.group_name || 'Liga'}
                    </TableCell>
                    <TableCell className="text-slate-500 font-mono">F{m.round}</TableCell>
                    <TableCell className="font-semibold text-white italic">{m.team1?.team_name}</TableCell>
                    <TableCell className="text-slate-600">vs</TableCell>
                    <TableCell className="font-semibold text-white italic">{m.team2?.team_name}</TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={!canEdit}
                        onClick={() =>
                          setModalMatch({
                            id: m.id,
                            team1_id: m.team1_id,
                            team2_id: m.team2_id,
                            team1: m.team1,
                            team2: m.team2,
                            status: m.status
                          })
                        }
                      >
                        <Pencil size={14} className="mr-1" />
                        Resultado
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </Table>
            )}
          </Card>
        </>
      )}

      <MatchResultModal
        isOpen={!!modalMatch}
        match={modalMatch}
        onClose={() => setModalMatch(null)}
        onSaved={load}
        onSubmit={(id, payload) => resultService.updateMatchResult(id, payload)}
      />
    </div>
  );
}
