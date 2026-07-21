import React from 'react';
import { Card, Button } from '../components/ui/Base';
import { LoadingState } from '../components/ui/States';
import { AlertCircle, LayoutGrid, Search, X as CloseIcon } from 'lucide-react';
import { useCategories } from '../hooks/useTeams';
import { fixtureService } from '../services/fixtureService';
import { resultService } from '../services/resultService';
import { cn, formatDate } from '../lib/utils';
import { motion } from 'motion/react';
import { MatchResultModal, MatchRow } from '../components/results/MatchResultModal';
import { SegundaRuedaPanel } from '../components/segundaRueda/SegundaRuedaPanel';
import { PHASE_SECOND_ROUND } from '../constants/phases';

export default function SecondRound() {
  const { categories, loading: loadingCats } = useCategories();
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>('');
  const [status, setStatus] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [viewMatches, setViewMatches] = React.useState<any[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState<string>(ActiveCategoryFromURL() || '');
  const [modalMatch, setModalMatch] = React.useState<MatchRow | null>(null);

  function ActiveCategoryFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('category') || '';
  }

  React.useEffect(() => {
    const catId = ActiveCategoryFromURL();
    if (catId) {
      setSelectedCategoryId(catId);
    } else if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  const loadStatusAndData = React.useCallback(async () => {
    if (!selectedCategoryId) return;
    setLoading(true);
    setError(null);
    try {
      const s = await fixtureService.getStatus(selectedCategoryId);
      setStatus(s);

      const m = await fixtureService.getMatchesWithTeams(selectedCategoryId);
      // Filter only Second Round matches (phase = 2)
      const secondRoundMatches = (m || []).filter(
        (match) => match.phase === PHASE_SECOND_ROUND
      );
      setViewMatches(secondRoundMatches);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedCategoryId]);

  React.useEffect(() => {
    loadStatusAndData();
  }, [loadStatusAndData]);


  const filteredMatches = React.useMemo(() => {
    if (!searchQuery) return viewMatches;
    const q = searchQuery.toLowerCase();
    return viewMatches.filter((m) => {
      const t1 = m.team1;
      const t2 = m.team2;
      const searchStr = [
        t1?.team_name,
        t1?.player1?.first_name, t1?.player1?.last_name,
        t1?.player2?.first_name, t1?.player2?.last_name,
        t2?.team_name,
        t2?.player1?.first_name, t2?.player1?.last_name,
        t2?.player2?.first_name, t2?.player2?.last_name,
      ].join(' ').toLowerCase();
      return searchStr.includes(q);
    });
  }, [viewMatches, searchQuery]);

  const busy = loading || loadingCats;

  return (
    <div className="space-y-8">
      {/* Category selection bar */}
      <div className="flex border-b border-slate-800 overflow-x-auto custom-scrollbar no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => {
              setSelectedCategoryId(cat.id);
              // Update URL search param gracefully
              const url = new URL(window.location.href);
              url.searchParams.set('category', cat.id);
              window.history.pushState({}, '', url.toString());
            }}
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

      {error && (
        <div className="p-4 bg-red-400/10 border border-red-500/20 rounded-xl text-red-500 text-sm flex items-center gap-3">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {selectedCategoryId && (
        <div className="space-y-8">
          {/* Segunda Rueda Manager Panel */}
          <SegundaRuedaPanel
            categoryId={selectedCategoryId}
            isCategoryClosed={status?.state === 'closed'}
            onReloadMatches={loadStatusAndData}
            onError={(msg) => setError(msg || null)}
          />

          {/* Segunda Rueda Matches List */}
          {viewMatches.length > 0 && (
            <Card title="Partidos de Segunda Rueda" subtitle="Carga y edición de resultados de fase 2">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
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

              {filteredMatches.length === 0 ? (
                <div className="text-center text-slate-500 py-8 italic border border-slate-800 rounded-xl bg-slate-950/20">
                  No se encontraron partidos para la búsqueda.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredMatches.map((m) => (
                    <div
                      key={m.id}
                      className="p-4 bg-slate-900 border-2 border-indigo-500/20 rounded-2xl flex flex-col gap-3 hover:border-indigo-500/40 transition-all group shadow-lg"
                    >
                      <div className="flex justify-between items-center text-[10px] text-indigo-400/70 uppercase font-black tracking-widest">
                        <span>{m.comment || `Fecha ${m.round}`}</span>
                        {m.status === 'jugado' ? (
                          <span className="text-emerald-500 font-bold">FINALIZADO</span>
                        ) : m.match_date ? (
                          <span className="text-indigo-400 font-bold">PROGRAMADO</span>
                        ) : (
                          <span className="text-slate-600 font-bold">PENDIENTE</span>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <div
                          className={cn(
                            'text-sm font-bold italic',
                            m.winner_id === m.team1_id ? 'text-emerald-400' : 'text-white'
                          )}
                        >
                          {m.team1?.team_name || 'TBD'}
                        </div>
                        {m.team1 && (
                          <div className="text-[9px] text-slate-500 font-normal uppercase mt-0.5">
                            {m.team1?.player1?.first_name} {m.team1?.player1?.last_name} /{' '}
                            {m.team1?.player2?.first_name} {m.team1?.player2?.last_name}
                          </div>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-600 font-bold px-2">VS</div>
                      <div className="flex flex-col">
                        <div
                          className={cn(
                            'text-sm font-bold italic',
                            m.winner_id === m.team2_id ? 'text-emerald-400' : 'text-white'
                          )}
                        >
                          {m.team2?.team_name || 'TBD'}
                        </div>
                        {m.team2 && (
                          <div className="text-[9px] text-slate-500 font-normal uppercase mt-0.5">
                            {m.team2?.player1?.first_name} {m.team2?.player1?.last_name} /{' '}
                            {m.team2?.player2?.first_name} {m.team2?.player2?.last_name}
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-end mt-2 pt-2 border-t border-slate-800">
                        <div className="text-[10px] text-slate-400">
                          {m.match_date ? `${formatDate(m.match_date)} ${m.match_time}` : 'Sin fecha'}
                          {m.court_name && <span className="text-indigo-400 ml-2">· {m.court_name}</span>}
                          {m.status === 'jugado' && (
                            <div className="text-indigo-400 font-bold mt-0.5">
                              {m.winner_id ? (
                                `Resultado: ${m.s1_t1}-${m.s1_t2}${
                                  m.s2_t1 !== null && m.s2_t1 !== undefined ? `, ${m.s2_t1}-${m.s2_t2}` : ''
                                }${m.s3_t1 !== null && m.s3_t1 !== undefined ? `, ${m.s3_t1}-${m.s3_t2}` : ''}`
                              ) : (
                                'Sin puntos (0-0)'
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-8 text-xs font-bold"
                          onClick={() => setModalMatch({ ...m })}
                        >
                          {m.status === 'jugado' || m.match_date || m.match_time || m.court_name ? 'Editar' : 'Cargar'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* Match Result Modal */}
      <MatchResultModal
        isOpen={!!modalMatch}
        match={modalMatch}
        onClose={() => setModalMatch(null)}
        onSaved={loadStatusAndData}
        onSubmit={(id, payload) => resultService.updateMatchResult(id, payload)}
      />
    </div>
  );
}
