import React from 'react';
import { Card, Button } from '../components/ui/Base';
import { Table, TableRow, TableCell } from '../components/ui/Table';
import { LoadingState } from '../components/ui/States';
import { Search, X as CloseIcon, Clock, Calendar as CalendarIcon } from 'lucide-react';
import { useCategories } from '../hooks/useTeams';
import { fixtureService } from '../services/fixtureService';
import { resultService } from '../services/resultService';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';
import { MatchResultModal, MatchRow } from '../components/results/MatchResultModal';

export default function Schedule() {
  const { categories, loading: loadingCats } = useCategories();
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>('');
  const [viewMatches, setViewMatches] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [selectedGroupKey, setSelectedGroupKey] = React.useState<string>('all');
  const [selectedStatus, setSelectedStatus] = React.useState<string>('all');
  const [modalMatch, setModalMatch] = React.useState<MatchRow | null>(null);

  React.useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  const loadData = React.useCallback(async () => {
    if (!selectedCategoryId) return;
    setLoading(true);
    try {
      const m = await fixtureService.getMatchesWithTeams(selectedCategoryId);
      setViewMatches(m || []);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedCategoryId]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const busy = loading || loadingCats;

  const filteredMatches = React.useMemo(() => {
    return viewMatches.filter(m => {
      // Filter by Status/Type
      if (selectedStatus === 'pending') {
        if (m.status === 'jugado') return false;
      } else if (selectedStatus === 'finished') {
        if (m.status !== 'jugado') return false;
      } else if (selectedStatus === 'scheduled') {
        if (m.status === 'jugado' || (!m.match_date && !m.match_time)) return false;
      } else if (selectedStatus === 'unscheduled') {
        if (m.status === 'jugado' || m.match_date || m.match_time) return false;
      }

      // Filter by Group
      const mGroupKey = m.league_group_id || '__liga__';
      const matchesGroup = selectedGroupKey === 'all' || mGroupKey === selectedGroupKey;
      if (!matchesGroup) return false;

      // Filter by Search
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      const t1 = m.team1;
      const t2 = m.team2;
      const searchStr = [
        t1?.team_name,
        t1?.player1?.first_name, t1?.player1?.last_name, t1?.player1?.rut, t1?.player1?.phone,
        t1?.player2?.first_name, t1?.player2?.last_name, t1?.player2?.rut, t1?.player2?.phone,
        t2?.team_name,
        t2?.player1?.first_name, t2?.player1?.last_name, t2?.player1?.rut, t2?.player1?.phone,
        t2?.player2?.first_name, t2?.player2?.last_name, t2?.player2?.rut, t2?.player2?.phone
      ].join(' ').toLowerCase();

      return searchStr.includes(q);
    });
  }, [viewMatches, selectedGroupKey, selectedStatus, searchQuery]);

  return (
    <div className="space-y-8">
      <div className="flex border-b border-slate-800 overflow-x-auto custom-scrollbar no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategoryId(cat.id)}
            className={cn(
              'px-6 py-4 text-sm font-bold transition-all duration-200 shrink-0 relative',
              selectedCategoryId === cat.id 
                ? 'text-white bg-indigo-500/10' 
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
            )}
          >
            {cat.name}
            {selectedCategoryId === cat.id && (
              <motion.div 
                layoutId="activeCategory"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.8)]" 
              />
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center px-2">
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <CalendarIcon className="text-indigo-500" />
          Programación de Partidos
        </h2>

        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
            <Search size={16} />
          </div>
          <input
            type="text"
            placeholder="Buscar pareja o jugador..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
            >
              <CloseIcon size={16} />
            </button>
          )}
        </div>
      </div>

      <Card>
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-400 font-medium">Estado</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/20 outline-none"
              >
                <option value="all">Todos los partidos</option>
                <option value="scheduled">Programados</option>
                <option value="unscheduled">Por programar</option>
                <option value="finished">Finalizados</option>
                <option value="pending">Pendientes (Sin jugar)</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm text-slate-400 font-medium">Grupo</label>
              <select
                value={selectedGroupKey}
                onChange={(e) => setSelectedGroupKey(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/20 outline-none"
              >
                <option value="all">Todos los grupos</option>
                {Array.from(new Set(viewMatches.map(m => m.league_group_id || '__liga__'))).sort().map(gid => {
                  if (gid === '__liga__') {
                    if (!viewMatches.some(m => !m.league_group_id)) return null;
                    return <option key="__liga__" value="__liga__">Liga Única</option>;
                  }
                  const gname = viewMatches.find(m => m.league_group_id === gid)?.group?.group_name || 'Grupo';
                  return <option key={gid} value={gid}>{gname}</option>;
                })}
              </select>
            </div>
          </div>

          {busy ? (
            <div className="py-20 flex justify-center">
              <LoadingState />
            </div>
          ) : filteredMatches.length === 0 ? (
            <p className="text-sm text-slate-500 py-12 text-center italic">
              {searchQuery || selectedGroupKey !== 'all' ? 'No coincide con la búsqueda o filtro.' : 'No hay partidos pendientes.'}
            </p>
          ) : (
            <Table headers={['Grupo', 'Fecha', 'Pareja 1', '', 'Pareja 2', 'Programación Actual', 'Acción']}>
              {filteredMatches.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-bold text-indigo-400">{m.group?.group_name || 'Liga'}</TableCell>
                  <TableCell className="text-slate-500 font-mono">F{m.round}</TableCell>
                  <TableCell className="font-bold text-white italic">{m.team1?.team_name}</TableCell>
                  <TableCell className="text-slate-600 font-bold">VS</TableCell>
                  <TableCell className="font-bold text-white italic">{m.team2?.team_name}</TableCell>
                  <TableCell>
                    {m.match_date || m.match_time || m.court_name ? (
                      <div className="text-[11px] text-indigo-400 font-bold leading-tight">
                        {m.match_date} - {m.match_time}
                        <div className="text-slate-500 font-normal">{m.court_name}</div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-600 font-bold uppercase italic">Sin asignar</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setModalMatch({ ...m })}
                    >
                      {m.status === 'jugado' ? 'Editar' : 'Programar'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          )}
        </div>
      </Card>

      <MatchResultModal
        isOpen={!!modalMatch}
        match={modalMatch}
        onClose={() => setModalMatch(null)}
        onSaved={loadData}
        onSubmit={(id, payload) => resultService.updateMatchResult(id, payload)}
      />
    </div>
  );
}
