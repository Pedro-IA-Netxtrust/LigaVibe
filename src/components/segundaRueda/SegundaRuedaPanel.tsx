import React from 'react';
import { AlertCircle, LayoutGrid, RefreshCw, Info } from 'lucide-react';
import { Card, Button } from '../ui/Base';
import { phase2Service } from '../../services/phase2Service';
import type { Phase2RulesResolved } from '../../utils/secondRoundEngine';
import { fixtureService } from '../../services/fixtureService';
import type { Phase2GroupStanding, Phase2Classification, SecondRoundGroupDetail } from '../../types';
import { PHASE_SECOND_ROUND } from '../../constants/phases';
import { SecondRoundGroupsView } from './SecondRoundGroupsView';
import { GroupBadge } from '../shared/GroupBadge';
import { ArrowRight } from 'lucide-react';

interface SegundaRuedaPanelProps {
  categoryId: string;
  isCategoryClosed: boolean;
  onReloadMatches: () => Promise<void>;
  onError: (message: string) => void;
}

export function SegundaRuedaPanel({
  categoryId,
  isCategoryClosed,
  onReloadMatches,
  onError,
}: SegundaRuedaPanelProps) {
  const [loading, setLoading] = React.useState(false);
  const [standings, setStandings] = React.useState<Phase2GroupStanding[]>([]);
  const [classification, setClassification] = React.useState<Phase2Classification | null>(null);
  const [groupDetails, setGroupDetails] = React.useState<SecondRoundGroupDetail[]>([]);
  const [isDoubleRound, setIsDoubleRound] = React.useState(false);
  const [matchCount, setMatchCount] = React.useState(0);
  const [rules, setRules] = React.useState<Phase2RulesResolved | null>(null);

  const loadData = React.useCallback(async () => {
    if (!categoryId) return;
    setLoading(true);
    try {
      const [rulesPreview, s, c, matches, details] = await Promise.all([
        phase2Service.getPhase2RulesPreview(categoryId),
        phase2Service.previewPhase2Standings(categoryId),
        phase2Service.getPhase2Classification(categoryId),
        phase2Service.getPhase2Matches(categoryId),
        phase2Service.previewSecondRoundGroupDetails(categoryId),
      ]);
      setRules(rulesPreview);
      setStandings(s);
      setClassification(c);
      setMatchCount(matches.length);
      setGroupDetails(details);
    } catch (err: any) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  }, [categoryId, onError]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerateSecondRound = async () => {
    setLoading(true);
    onError('');
    try {
      await phase2Service.generateSecondRoundFromPhase1(categoryId, { isDoubleRound });
      await onReloadMatches();
      await loadData();
    } catch (err: any) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSegundaRueda = async () => {
    if (!window.confirm('¿Eliminar todos los grupos y partidos de segunda rueda?')) return;
    setLoading(true);
    onError('');
    try {
      await fixtureService.clearSegundaRueda(categoryId);
      await onReloadMatches();
      await loadData();
    } catch (err: any) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const estimatedMatches = React.useMemo(() => {
    return groupDetails.reduce((sum, g) => {
      const n = g.teams.length;
      if (n < 2) return sum;
      const single = (n * (n - 1)) / 2;
      return sum + (isDoubleRound ? single * 2 : single);
    }, 0);
  }, [groupDetails, isDoubleRound]);

  const originByTeam = React.useMemo(() => {
    const map = new Map<string, { phase1_group_name: string; phase1_rank: number }>();
    groupDetails.forEach((g) =>
      g.teams.forEach((t) =>
        map.set(t.league_team_id, {
          phase1_group_name: t.phase1_group_name,
          phase1_rank: t.phase1_rank_in_group,
        })
      )
    );
    return map;
  }, [groupDetails]);

  if (!isCategoryClosed) {
    return (
      <div className="flex items-center gap-3 p-4 bg-slate-800/40 border border-slate-700 rounded-xl text-slate-400 text-sm">
        <AlertCircle size={16} className="text-indigo-400" />
        Cierra la fase regular con <strong className="text-white">Cerrar fixture</strong> para habilitar la segunda rueda.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3 px-1">
        <h3 className="text-xl font-bold text-indigo-400 flex items-center gap-2">
          <LayoutGrid size={20} /> Segunda rueda
        </h3>
        <div className="flex flex-wrap gap-2">
          {matchCount > 0 && (
            <Button variant="danger" size="sm" onClick={handleClearSegundaRueda} disabled={loading}>
              Reiniciar segunda rueda
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw size={14} className="mr-1" /> Actualizar
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-xl text-slate-300 text-sm">
        <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <p>{rules?.summary ?? 'Detectando reglas según la estructura de fase 1…'}</p>
          {rules?.detail && <p className="text-slate-500 mt-1">{rules.detail}</p>}
          {rules && (
            <p className="text-slate-500 mt-1">
              Playoff: {rules.qualifiers_per_group} por grupo
              {rules.best_sixths_count > 0 && ` + mejor 6°`}
              {rules.best_thirds_count > 0 && ` + mejores 3°`}
              {' → '}
              {rules.playoff_size} parejas. Los puntos de fase 1 se arrastran.
            </p>
          )}
        </div>
      </div>

      <Card
        title={matchCount > 0 ? 'Grupos de segunda rueda' : 'Redistribución fase 1 → segunda rueda'}
        subtitle={
          rules
            ? `Fase ${PHASE_SECOND_ROUND} · ${rules.groups_count} grupo${rules.groups_count > 1 ? 's' : ''} · cada pareja muestra de dónde viene y dónde queda`
            : `Fase ${PHASE_SECOND_ROUND}`
        }
      >
        {groupDetails.length === 0 ? (
          <p className="text-sm text-slate-500 italic py-4">
            No hay datos de fase 1 suficientes para calcular la redistribución.
          </p>
        ) : (
          <SecondRoundGroupsView groups={groupDetails} />
        )}
      </Card>

      <Card
        title="Generar fixture de segunda rueda"
        subtitle={
          matchCount > 0
            ? `${matchCount} partidos generados`
            : estimatedMatches > 0
              ? `Se crearán ~${estimatedMatches} partidos`
              : 'Importa parejas desde fase 1'
        }
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isDoubleRound}
                onChange={(e) => setIsDoubleRound(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-500"
                disabled={loading}
              />
              <span className="text-sm text-slate-300">Ida y vuelta</span>
            </label>
            <Button onClick={handleGenerateSecondRound} disabled={loading || groupDetails.length === 0}>
              {matchCount > 0 ? 'Regenerar desde fase 1' : 'Generar grupos y fixture'}
            </Button>
          </div>

          {matchCount === 0 && groupDetails.length > 0 && (
            <p className="text-xs text-slate-500">
              Revisa arriba la redistribución antes de confirmar. Al generar se crean grupos, se arrastran puntos
              y se programa el round robin.
            </p>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Posiciones (fase 1 + fase 2)" subtitle="Puntos acumulados en segunda rueda">
          {standings.length === 0 ? (
            <p className="text-sm text-slate-500 italic py-4">Genera la segunda rueda para ver posiciones.</p>
          ) : (
            <ul className="space-y-1 mt-2 max-h-80 overflow-y-auto">
              {standings.map((s) => {
                const origin = originByTeam.get(s.league_team_id);
                return (
                  <li
                    key={`${s.league_team_id}-${s.group_id}`}
                    className="flex justify-between items-center gap-2 text-sm px-2 py-1.5 border-b border-slate-800/50"
                  >
                    <span className="text-slate-300 flex items-center gap-1.5 flex-wrap min-w-0">
                      {origin && (
                        <>
                          <GroupBadge groupName={origin.phase1_group_name} rank={origin.phase1_rank} />
                          <ArrowRight size={10} className="text-slate-600 shrink-0" />
                        </>
                      )}
                      <GroupBadge groupName={s.group_name ?? 'Grupo'} rank={s.rank_in_group} />
                      <span className="truncate italic">{s.team_name}</span>
                    </span>
                    <span className="font-mono text-indigo-400 shrink-0">{s.points} pts</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card
          title="Clasificación a playoffs"
          subtitle={
            rules
              ? `${rules.qualifiers_per_group} por grupo${rules.best_sixths_count ? ' + mejor 6°' : ''} → ${rules.playoff_size}`
              : 'Según reglas de categoría'
          }
        >
          {!classification ? (
            <p className="text-sm text-slate-500 italic py-4">Sin datos.</p>
          ) : (
            <div className="space-y-4 mt-2">
              <div>
                <h5 className="text-xs uppercase text-emerald-400 font-bold mb-2">
                  Clasifican ({classification.classified.length}/{rules?.playoff_size ?? '?'})
                </h5>
                {classification.classified.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">Completa partidos de segunda rueda.</p>
                ) : (
                  <ul className="space-y-1 max-h-48 overflow-y-auto">
                    {classification.classified.map((m) => {
                      const origin = originByTeam.get(m.league_team_id);
                      return (
                        <li
                          key={m.league_team_id}
                          className="text-sm text-emerald-300 flex flex-wrap items-center gap-1.5 py-1"
                        >
                          {origin && (
                            <>
                              <GroupBadge groupName={origin.phase1_group_name} rank={origin.phase1_rank} />
                              <ArrowRight size={10} className="text-slate-600" />
                            </>
                          )}
                          <GroupBadge groupName={m.group_name ?? '?'} rank={m.rank_in_group} />
                          <span className="italic">{m.team_name}</span>
                          <span className="text-emerald-500/70 font-mono text-xs">{m.points} pts</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              <div>
                <h5 className="text-xs uppercase text-slate-400 font-bold mb-2">Fuera de playoff</h5>
                {classification.waiting_list.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">Vacía.</p>
                ) : (
                  <ul className="space-y-1">
                    {classification.waiting_list.map((m) => {
                      const origin = originByTeam.get(m.league_team_id);
                      return (
                        <li
                          key={m.league_team_id}
                          className="text-sm text-slate-400 flex flex-wrap items-center gap-1.5 py-0.5"
                        >
                          {origin && (
                            <>
                              <GroupBadge groupName={origin.phase1_group_name} rank={origin.phase1_rank} />
                              <ArrowRight size={10} className="text-slate-600" />
                            </>
                          )}
                          <GroupBadge groupName={m.group_name ?? '?'} rank={m.rank_in_group} />
                          <span>{m.team_name}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
