import React from 'react';
import { AlertCircle, Trophy } from 'lucide-react';
import { Button } from '../ui/Base';
import { BracketView } from '../playoff/BracketView';
import { playoffService } from '../../services/playoffService';
import { phase2Service } from '../../services/phase2Service';
import type { Phase2RulesResolved } from '../../utils/secondRoundEngine';
import type { BracketSize } from '../../utils/playoffEngine';
import { resultService } from '../../services/resultService';
import type { BracketMatch, LeagueMatch, PlayoffConfig } from '../../types';

interface PlayoffPanelProps {
  categoryId: string;
  isCategoryClosed: boolean;
  onEditMatch: (match: LeagueMatch) => void;
  onError: (message: string) => void;
}

export function PlayoffPanel({
  categoryId,
  isCategoryClosed,
  onEditMatch,
  onError,
}: PlayoffPanelProps) {
  const [loading, setLoading] = React.useState(false);
  const [bracketMatches, setBracketMatches] = React.useState<BracketMatch[]>([]);
  const [playoffConfig, setPlayoffConfig] = React.useState<PlayoffConfig | null>(null);
  const [classifiedCount, setClassifiedCount] = React.useState(0);
  const [rules, setRules] = React.useState<Phase2RulesResolved | null>(null);

  const playoffSize: BracketSize = rules?.playoff_size ?? 16;

  const loadBracket = React.useCallback(async () => {
    if (!categoryId) return;
    try {
      const [bracket, cfg, classified, rulesPreview] = await Promise.all([
        playoffService.getBracket(categoryId),
        playoffService.getConfig(categoryId),
        phase2Service.getPlayoffClassifiedTeams(categoryId),
        phase2Service.getPhase2RulesPreview(categoryId),
      ]);
      setBracketMatches(bracket);
      setPlayoffConfig(cfg);
      setClassifiedCount(classified.length);
      setRules(rulesPreview);
    } catch (err: any) {
      onError(err.message);
    }
  }, [categoryId, onError]);

  React.useEffect(() => {
    loadBracket();
  }, [loadBracket]);

  const handleGenerateBracket = async () => {
    setLoading(true);
    onError('');
    try {
      const classified = await phase2Service.getPlayoffClassifiedTeams(categoryId);
      if (classified.length < 2) {
        throw new Error(
          'No hay clasificados. Completa la segunda rueda y verifica la clasificación antes de generar el cuadro.'
        );
      }
      const rulesPreview = await phase2Service.getPhase2RulesPreview(categoryId);
      setRules(rulesPreview);
      const count = Math.min(rulesPreview.playoff_size, classified.length) as BracketSize;
      const cfg = await playoffService.saveConfig(categoryId, {
        qualifiers_count: count,
        cross_groups: true,
        protect_seeds: true,
      });
      await playoffService.generateBracket(categoryId, classified.slice(0, count), cfg);
      await loadBracket();
    } catch (err: any) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBracket = async () => {
    if (!window.confirm('¿Eliminar el cuadro de playoffs?')) return;
    setLoading(true);
    onError('');
    try {
      await playoffService.clearBracket(categoryId);
      await loadBracket();
    } catch (err: any) {
      onError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isCategoryClosed) {
    return (
      <div className="flex items-center gap-3 p-4 bg-slate-800/40 border border-slate-700 rounded-xl text-slate-400 text-sm">
        <AlertCircle size={16} className="text-amber-400" />
        Cierra la fase regular con <strong className="text-white">Cerrar fixture</strong> para habilitar los playoffs.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3 px-1">
        <h3 className="text-xl font-bold text-amber-400 flex items-center gap-2">
          <Trophy size={20} /> Playoffs
        </h3>
        <div className="flex flex-wrap gap-2">
          {bracketMatches.length === 0 && (
            <Button onClick={handleGenerateBracket} disabled={loading}>
              Generar cuadro ({playoffSize})
            </Button>
          )}
          {bracketMatches.length > 0 && (
            <Button variant="danger" size="sm" onClick={handleRemoveBracket} disabled={loading}>
              Reiniciar cuadro
            </Button>
          )}
        </div>
      </div>

      {bracketMatches.length === 0 && (
        <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl text-sm text-slate-300">
          <p>
            {rules?.summary ?? 'Reglas de playoff según la categoría.'}
          </p>
          {rules?.detail && <p className="text-slate-500 mt-1">{rules.detail}</p>}
          <p className="text-slate-500 mt-2">
            Clasificados detectados: <strong className="text-amber-400">{classifiedCount}</strong>
            {' / '}
            <strong className="text-white">{playoffSize}</strong>
            {classifiedCount < playoffSize && ' — completa la segunda rueda para alcanzar el cupo.'}
          </p>
        </div>
      )}

      <BracketView
        matches={bracketMatches}
        onEditMatch={onEditMatch}
        onResultSaved={loadBracket}
        onSubmitResult={async (matchId, payload) => {
          await resultService.updateMatchResult(matchId, payload);
        }}
      />

      {playoffConfig && bracketMatches.length > 0 && (
        <p className="text-xs text-slate-500 text-center">
          Cuadro de {playoffConfig.qualifiers_count} parejas · octavos → cuartos → semis → final
        </p>
      )}
    </div>
  );
}
