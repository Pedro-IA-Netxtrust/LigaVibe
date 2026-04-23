import React from 'react';
import { Link } from 'react-router-dom';
import { Card, Button } from '../components/ui/Base';
import { Table, TableRow, TableCell } from '../components/ui/Table';
import { LoadingState } from '../components/ui/States';
import {
  Trophy,
  Trash2,
  Star,
  AlertCircle,
  LayoutGrid,
  History,
  Info,
  Lock,
  Copy,
  Download,
  CheckCircle2,
  Clock,
  Share2,
  Search,
  X as CloseIcon
} from 'lucide-react';
import { useCategories } from '../hooks/useTeams';
import { fixtureService } from '../services/fixtureService';
import { resultService } from '../services/resultService';
import { teamService } from '../services/teamService';
import { FixtureEngine, GroupConfig } from '../utils/fixtureEngine';
import { cn } from '../lib/utils';
import { LeagueTeam, LeagueMatch } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { MatchResultModal, MatchRow } from '../components/results/MatchResultModal';
import { computeStandingsFromMatches } from '../utils/standingsCalculator';

type PreviewState = { groups: GroupConfig[]; matches: Partial<any>[] };

export default function Fixture() {
  const { categories, loading: loadingCats } = useCategories();
  const [selectedCategoryId, setSelectedCategoryId] = React.useState<string>('');
  const [status, setStatus] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [preview, setPreview] = React.useState<PreviewState>({ groups: [], matches: [] });
  const [viewMatches, setViewMatches] = React.useState<any[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [groupSize, setGroupSize] = React.useState<number>(3);
  const [previewTeams, setPreviewTeams] = React.useState<LeagueTeam[]>([]);
  const [isDoubleRound, setIsDoubleRound] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'structure' | 'played'>('structure');
  const [selectedGroupKey, setSelectedGroupKey] = React.useState<string>('__all__');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [modalMatch, setModalMatch] = React.useState<MatchRow | null>(null);

  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const n = status?.teamCount ?? 0;

  React.useEffect(() => {
    if (categories.length > 0 && !selectedCategoryId) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  React.useEffect(() => {
    setPreview({ groups: [], matches: [] });
    setPreviewTeams([]);
  }, [selectedCategoryId]);

  const loadStatusAndData = React.useCallback(async () => {
    if (!selectedCategoryId) return;
    setLoading(true);
    try {
      const s = await fixtureService.getStatus(selectedCategoryId);
      setStatus(s);

      if (s.state === 'generated' || s.state === 'closed') {
        const m = await fixtureService.getMatchesWithTeams(selectedCategoryId);
        setViewMatches(m || []);
      } else {
        setViewMatches([]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedCategoryId]);

  React.useEffect(() => {
    loadStatusAndData();
  }, [loadStatusAndData]);

  const completeTeams = React.useCallback(async () => {
    const raw = (await teamService.getByCategoryId(selectedCategoryId)) as LeagueTeam[];
    return raw.filter((t) => {
      const isComplete = t.player1_id && t.player2_id;
      const isGhost = t.is_ghost === true || (t.team_name || '').toLowerCase().includes('fantasma') || (t.team_name || '').toLowerCase().includes('bye');
      return isComplete || isGhost;
    });
  }, [selectedCategoryId]);

  const teamNameMap = React.useMemo(() => {
    const m = new Map<string, string>();
    previewTeams.forEach((t) => m.set(t.id, t.team_name || t.id));
    return m;
  }, [previewTeams]);

  const buildPreview = (groups: GroupConfig[], matches: any[], teamsFallback: LeagueTeam[]) => {
    const flat = groups.length ? groups.flatMap((g) => g.teams) : teamsFallback;
    setPreviewTeams(flat);
    setPreview({ groups, matches });
  };

  const handleGenerateGroups = async (perGroup: number) => {
    setLoading(true);
    setError(null);
    try {
      const teams = await completeTeams();
      if (teams.length < 2) throw new Error('Se necesitan al menos 2 parejas completas.');
      const groups = FixtureEngine.distributeGroups(teams, perGroup);
      const allMatches: any[] = [];
      groups.forEach((g) => {
        allMatches.push(...FixtureEngine.generateRoundRobin(g.teams, selectedCategoryId, g.groupName, isDoubleRound));
      });
      buildPreview(groups, allMatches, teams);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateRoundRobin = async () => {
    setLoading(true);
    setError(null);
    try {
      const teams = await completeTeams();
      if (teams.length < 2) throw new Error('Se necesitan al menos 2 parejas completas.');
      const matches = FixtureEngine.generateRoundRobin(teams, selectedCategoryId, null, isDoubleRound);
      buildPreview([], matches, teams);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const moveTeamToGroup = (teamId: string, targetGroupName: string) => {
    if (!preview.groups.length) return;
    setPreview((prev) => {
      const groups = prev.groups.map((g) => ({ ...g, teams: [...g.teams] }));
      let moved: LeagueTeam | null = null;
      for (const g of groups) {
        const idx = g.teams.findIndex((t) => t.id === teamId);
        if (idx >= 0) {
          moved = g.teams.splice(idx, 1)[0];
          break;
        }
      }
      if (!moved) return prev;
      const target = groups.find((g) => g.groupName === targetGroupName);
      if (!target) return prev;
      target.teams.push(moved);
      const allMatches: any[] = [];
      groups.forEach((g) => {
        if (g.teams.length >= 2) {
          allMatches.push(
            ...FixtureEngine.generateRoundRobin(g.teams, selectedCategoryId, g.groupName, isDoubleRound)
          );
        }
      });
      const flat = groups.flatMap((g) => g.teams);
      setPreviewTeams(flat);
      return { groups, matches: allMatches };
    });
  };

  const updateMatchTeam = (matchIndex: number, field: 'team1_id' | 'team2_id', newTeamId: string) => {
    setPreview((prev) => {
      const newMatches = [...prev.matches];
      newMatches[matchIndex] = { ...newMatches[matchIndex], [field]: newTeamId };
      return { ...prev, matches: newMatches };
    });
  };

  const hasInvalidMatches = React.useMemo(() => {
    return preview.matches.some((m) => m.team1_id === m.team2_id);
  }, [preview.matches]);

  const handleConfirm = async () => {
    if (!selectedCategoryId) return;
    setLoading(true);
    try {
      await fixtureService.saveGroupsAndMatches(selectedCategoryId, preview.groups, preview.matches);
      setPreview({ groups: [], matches: [] });
      setPreviewTeams([]);
      await loadStatusAndData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    if (!window.confirm('¿Eliminar el fixture completo de esta categoría?')) return;
    setLoading(true);
    try {
      await fixtureService.clearFixture(selectedCategoryId);
      setPreview({ groups: [], matches: [] });
      setPreviewTeams([]);
      await loadStatusAndData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseFixture = async () => {
    if (!window.confirm('¿Cerrar fixture? Podrás cargar resultados con seguridad; para borrar todo primero cierra si aún no lo está.'))
      return;
    setLoading(true);
    try {
      await fixtureService.setCategoryClosed(selectedCategoryId, true);
      await loadStatusAndData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlayoff = async () => {
    if (!selectedCategoryId) return;
    const teamsToPick = window.confirm('¿Generar Cuartos de Final (Top 8)? Cancele para generar Semifinales (Top 4).') ? 8 : 4;
    
    setLoading(true);
    setError(null);
    try {
      const m = await fixtureService.getMatchesWithTeams(selectedCategoryId);
      const allTeams = await teamService.getByCategoryId(selectedCategoryId);
      const names: Record<string, string> = {};
      allTeams.forEach(t => names[t.id] = t.team_name);
      
      const finished = m.filter(x => x.status === 'jugado');
      const standings = computeStandingsFromMatches(finished, names);
      
      const topIds = standings.slice(0, teamsToPick).map(s => s.league_team_id);
      const topTeams = allTeams.filter(t => topIds.includes(t.id))
        .sort((a, b) => topIds.indexOf(a.id) - topIds.indexOf(b.id));

      if (topTeams.length < 2) {
        throw new Error('No hay suficientes equipos con partidos jugados para generar un playoff.');
      }

      const playoffMatches = FixtureEngine.generatePlayoffs(topTeams, selectedCategoryId);
      await fixtureService.savePlayoffMatches(playoffMatches);
      await loadStatusAndData();
      alert('¡Playoffs generados con éxito!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopySummary = () => {
    if (!viewMatches || viewMatches.length === 0) return;

    const catName = selectedCategory?.name || 'Categoría';
    const totalPartidos = viewMatches.length;
    const jugados = viewMatches.filter((m) => m.status === 'jugado').length;
    const pendientes = totalPartidos - jugados;

    let text = `🏆 *FIXTURE - ${catName.toUpperCase()}*\n`;
    text += `📊 ${jugados}/${totalPartidos} partidos jugados · ${pendientes} pendientes\n`;
    text += `${'─'.repeat(32)}\n\n`;

    const grouped = viewMatches.reduce((acc, m) => {
      const g = m.group?.group_name || 'Liga Única';
      if (!acc[g]) acc[g] = {};
      if (!acc[g][m.round]) acc[g][m.round] = [];
      acc[g][m.round].push(m);
      return acc;
    }, {} as Record<string, Record<string, any[]>>);

    Object.keys(grouped).sort().forEach((gName) => {
      text += `🔶 *${gName.toUpperCase()}*\n`;
      const rounds = grouped[gName];
      Object.keys(rounds)
        .sort((a, b) => Number(a) - Number(b))
        .forEach((r) => {
          text += `\n  📅 *Fecha ${r}*\n`;
          rounds[r].forEach((m: any) => {
            const p1 = m.team1?.team_name || '?';
            const p2 = m.team2?.team_name || '?';
            if (m.status === 'jugado') {
              const score = (m.team1_sets !== null && m.team2_sets !== null)
                ? `${m.team1_sets}-${m.team2_sets}`
                : 'Jugado';
              const winner = m.winner_id === m.team1_id ? p1 : p2;
              text += `  ✅ ${p1} ${score} ${p2}  ← Ganó *${winner}*\n`;
            } else {
              text += `  ⏳ ${p1}  vs  ${p2}\n`;
            }
          });
        });
      text += '\n';
    });

    text += `_Generado por VIBE EVENTS_`;

    navigator.clipboard.writeText(text).then(() => {
      alert('✅ Resumen copiado al portapapeles. ¡Listo para pegar en WhatsApp!');
    }).catch(() => {
      alert('No se pudo copiar automáticamente. Copia el texto manualmente.');
    });
  };

  const handleExportCSV = () => {
    if (!viewMatches || viewMatches.length === 0) return;

    const headers = ['Grupo', 'Fecha', 'Pareja 1', 'Pareja 2', 'Sets P1', 'Sets P2', 'Games P1', 'Games P2', 'Ganador', 'Estado'];
    const rows = viewMatches.map((m: any) => [
      m.group?.group_name || 'Liga',
      m.round,
      m.team1?.team_name || '',
      m.team2?.team_name || '',
      m.team1_sets ?? '',
      m.team2_sets ?? '',
      m.team1_games ?? '',
      m.team2_games ?? '',
      m.winner_id === m.team1_id ? m.team1?.team_name : m.winner_id === m.team2_id ? m.team2?.team_name : '',
      m.status === 'jugado' ? 'Jugado' : 'Pendiente'
    ]);

    const csv = [headers, ...rows].map((r) => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fixture_${selectedCategory?.name.replace(/\s+/g, '_') || 'categoria'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatRules = React.useMemo(() => {
    return { showRR: n >= 2, showGroups: n >= 2, groupsOnly: false };
  }, [n]);

  const busy = loading || loadingCats;

  return (
    <div className="space-y-8">
      <div className="flex border-b border-slate-800 overflow-x-auto custom-scrollbar no-scrollbar">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategoryId(cat.id)}
            className={cn(
              'px-6 py-4 text-sm font-semibold transition-all duration-200 shrink-0 relative',
              selectedCategoryId === cat.id 
                ? 'text-indigo-400 bg-indigo-500/5' 
                : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
            )}
          >
            {cat.name}
            {selectedCategoryId === cat.id && (
              <motion.div 
                layoutId="activeCategory"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" 
              />
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center px-2">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3 flex-wrap">
            Fixture
            {status?.state === 'draft' && (
              <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20 uppercase">
                BORRADOR / INCOMPLETO
              </span>
            )}
            {status?.state === 'ready' && (
              <span className="text-[10px] bg-sky-500/20 text-sky-400 px-2 py-0.5 rounded-full border border-sky-500/20 uppercase">
                LISTO
              </span>
            )}
            {status?.state === 'generated' && (
              <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20 uppercase">
                GENERADO
              </span>
            )}
            {status?.state === 'closed' && (
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase">
                CERRADO
              </span>
            )}
          </h2>
          <p className="text-sm text-slate-500 mt-1 uppercase tracking-widest">
            {n} parejas inscritas
            {status?.hasIncomplete ? ' · Hay borradores sin jugador 2' : ''}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(status?.state === 'generated' || status?.state === 'closed') && (
            <>
              <Button variant="secondary" size="md" onClick={handleCopySummary} disabled={busy}>
                <Copy size={16} className="mr-2" />
                Copiar WhatsApp
              </Button>
              <Button variant="secondary" size="md" onClick={handleExportCSV} disabled={busy}>
                <Download size={16} className="mr-2" />
                Exportar CSV
              </Button>
              <Button variant="danger" size="md" onClick={handleClear} disabled={busy}>
                <Trash2 size={18} className="mr-2" />
                Eliminar
              </Button>
            </>
          )}
          {status?.state === 'generated' && (
            <Button variant="secondary" size="md" onClick={handleCloseFixture} disabled={busy}>
              <Lock size={18} className="mr-2" />
              Cerrar fixture
            </Button>
          )}
          {status?.state === 'closed' && (
            <Button variant="primary" size="md" onClick={handleGeneratePlayoff} disabled={busy}>
              <Trophy size={18} className="mr-2" />
              Generar Playoff
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-400/10 border border-red-500/20 rounded-xl text-red-500 text-sm flex items-center gap-3">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {busy && !preview.matches.length ? (
        <Card className="flex items-center justify-center py-20">
          <LoadingState />
        </Card>
      ) : status?.state === 'draft' ? (
        <Card className="p-10 border-dashed border-2 border-slate-800 flex flex-col items-center text-center">
          <div className="p-4 bg-amber-500/10 rounded-full text-amber-500 mb-6">
            <History size={48} />
          </div>
          <h4 className="text-xl font-bold text-white mb-2">Aún no se puede generar el fixture</h4>
          <p className="max-w-md text-slate-500 mb-8">
            Todas las parejas deben estar completas (2 jugadores) y se requieren al menos 2 parejas.
          </p>
          <Link
            to="/inscripciones"
            className="inline-flex items-center justify-center rounded-xl font-medium px-5 py-2.5 text-sm bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700"
          >
            Ir a inscripciones
          </Link>
        </Card>
      ) : status?.state === 'ready' && preview.matches.length === 0 ? (
        <div className="space-y-6">
          <Card className="p-4 bg-slate-950/80 border-slate-800 flex justify-between items-center flex-wrap gap-4">
            <p className="text-sm text-slate-400">
              Elige formato según el número de parejas ({n}). Puedes reordenar en inscripciones antes de
              confirmar.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="doubleRoundToggle"
                checked={isDoubleRound}
                onChange={(e) => setIsDoubleRound(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-950"
              />
              <label htmlFor="doubleRoundToggle" className="text-sm text-slate-300 font-medium cursor-pointer">
                Ida y vuelta
              </label>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {formatRules.showGroups && (
              <Card
                title="Grupos + round robin"
                subtitle={
                  formatRules.groupsOnly
                    ? `Obligatorio por formato (${n} parejas)`
                    : 'Recomendado con muchas parejas'
                }
              >
                <div className="flex flex-col items-center py-6 gap-4">
                  <div className="p-6 bg-indigo-500/10 rounded-2xl text-indigo-400">
                    <LayoutGrid size={44} />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <span>Parejas por grupo</span>
                    <select
                      value={groupSize}
                      onChange={(e) => setGroupSize(Number(e.target.value))}
                      className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-200"
                    >
                      <option value={3}>3</option>
                      <option value={4}>4</option>
                      <option value={5}>5</option>
                      <option value={6}>6</option>
                      <option value={7}>7</option>
                      <option value={8}>8</option>
                    </select>
                  </div>
                  <Button onClick={() => handleGenerateGroups(groupSize)} disabled={busy}>
                    Previsualizar grupos
                  </Button>
                </div>
              </Card>
            )}

            {formatRules.showRR && !formatRules.groupsOnly && (
              <Card title="Todos contra todos" subtitle="Una sola tabla de posiciones">
                <div className="flex flex-col items-center py-6 gap-4">
                  <div className="p-6 bg-indigo-500/10 rounded-2xl text-indigo-400">
                    <Trophy size={44} />
                  </div>
                  <Button onClick={handleGenerateRoundRobin} disabled={busy}>
                    Previsualizar liga
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      ) : status?.state === 'ready' && preview.matches.length > 0 ? (
        <div className="space-y-6">
          <div className="flex items-center gap-3 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
            <Info size={20} />
            <p className="text-sm font-medium">Previsualización — confirma para guardar en base de datos.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {preview.groups.length > 0 ? (
              preview.groups.map((group) => (
                <Card key={group.groupName} title={group.groupName} subtitle={`${group.teams.length} parejas`}>
                  <div className="space-y-2 mt-4">
                    {group.teams.map((t: LeagueTeam) => (
                      <div
                        key={t.id}
                        className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex flex-col gap-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold italic text-slate-200">{t.team_name}</span>
                          {t.is_seeded && <Star size={14} className="text-amber-500 shrink-0" fill="currentColor" />}
                        </div>
                        <label className="text-[10px] text-slate-500 uppercase">Mover a</label>
                        <select
                          className="bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-200 py-1"
                          value={group.groupName}
                          onChange={(e) => moveTeamToGroup(t.id, e.target.value)}
                        >
                          {preview.groups.map((g) => (
                            <option key={g.groupName} value={g.groupName}>
                              {g.groupName}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full mt-2 text-[10px] h-7"
                          onClick={() => {
                            const text = `🏆 *${selectedCategory?.name || 'Categoría'}*\n👥 *${group.groupName}*\n\n` + 
                              group.teams.map((t: any, i: number) => `${i + 1}. ${t.team_name}`).join('\n') +
                              `\n\n_Vibe Events_`;
                            navigator.clipboard.writeText(text);
                            alert('✅ Grupos copiados al portapapeles');
                          }}
                        >
                          <Share2 size={12} className="mr-1" /> Copiar Lista
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card>
              ))
            ) : (
              <Card title="Liga única" subtitle="Todos contra todos">
                <p className="text-sm text-slate-400">Se generarán cruces entre {previewTeams.length} parejas.</p>
              </Card>
            )}
          </div>

          {hasInvalidMatches && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-3">
              <AlertCircle size={20} className="shrink-0" />
              <strong>Partido inválido:</strong> Detectamos uno o más partidos donde una pareja juega contra sí misma. Por favor, corrígelo.
            </div>
          )}

          <Card title="Partidos">
            <Table headers={['Grupo', 'Fecha', 'Pareja 1', '', 'Pareja 2', 'Estado']}>
              {preview.matches.map((m, i) => (
                <TableRow key={i}>
                  <TableCell className="text-indigo-400 font-bold">
                    {(m.league_group_id as string) || 'Liga'}
                  </TableCell>
                  <TableCell className="text-slate-500 font-mono">#{m.round}</TableCell>
                  <TableCell>
                    <select
                      value={m.team1_id as string}
                      onChange={(e) => updateMatchTeam(i, 'team1_id', e.target.value)}
                      className={cn(
                        "bg-slate-950 border rounded-lg px-2 py-1.5 text-sm font-bold italic w-full max-w-[200px]",
                        m.team1_id === m.team2_id ? "border-red-500 text-red-500" : "border-slate-800 text-slate-200"
                      )}
                    >
                      {previewTeams.map((t) => (
                        <option key={t.id} value={t.id}>{t.team_name}</option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell className="text-slate-600 font-bold">VS</TableCell>
                  <TableCell>
                    <select
                      value={m.team2_id as string}
                      onChange={(e) => updateMatchTeam(i, 'team2_id', e.target.value)}
                      className={cn(
                        "bg-slate-950 border rounded-lg px-2 py-1.5 text-sm font-bold italic w-full max-w-[200px]",
                        m.team1_id === m.team2_id ? "border-red-500 text-red-500" : "border-slate-800 text-slate-200"
                      )}
                    >
                      {previewTeams.map((t) => (
                        <option key={t.id} value={t.id}>{t.team_name}</option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    {m.status === 'jugado' ? (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 uppercase font-bold">
                        Finalizado
                      </span>
                    ) : m.match_date || m.match_time || m.court_name ? (
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20 uppercase font-bold">
                        Programado
                      </span>
                    ) : (
                      <span className="text-[10px] bg-slate-500/20 text-slate-400 px-2 py-0.5 rounded-full border border-slate-500/20 uppercase font-bold">
                        Sin programar
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          </Card>

          <div className="flex justify-end gap-3">
            <Button
              variant="ghost"
              onClick={() => {
                setPreview({ groups: [], matches: [] });
                setPreviewTeams([]);
              }}
            >
              Cancelar
            </Button>
            <Button size="lg" onClick={handleConfirm} disabled={busy || hasInvalidMatches}>
              Confirmar y guardar
            </Button>
          </div>
        </div>
      ) : status?.state === 'generated' || status?.state === 'closed' ? (
        <div className="space-y-6">
          {viewMatches.length === 0 ? (
            <LoadingState />
          ) : (
            <>
              {/* Stats bar */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                    <LayoutGrid size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Total partidos</p>
                    <p className="text-xl font-bold text-white">{viewMatches.length}</p>
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Jugados</p>
                    <p className="text-xl font-bold text-white">{viewMatches.filter((m) => m.status === 'jugado').length}</p>
                  </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Pendientes</p>
                    <p className="text-xl font-bold text-white">{viewMatches.filter((m) => m.status === 'pendiente').length}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
                <div className="flex border-b border-slate-800 flex-1 w-full md:w-auto">
                  <button
                    onClick={() => setActiveTab('structure')}
                    className={cn(
                      'px-6 py-3 text-sm font-medium relative',
                      activeTab === 'structure' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <LayoutGrid size={16} /> Fixture (Fechas)
                    </div>
                    {activeTab === 'structure' && <motion.div layoutId="subtab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
                  </button>

                  <button
                    onClick={() => setActiveTab('played')}
                    className={cn(
                      'px-6 py-3 text-sm font-medium relative',
                      activeTab === 'played' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} /> Resultados
                    </div>
                    {activeTab === 'played' && <motion.div layoutId="subtab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedGroupKey}
                      onChange={(e) => setSelectedGroupKey(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    >
                      <option value="__all__">Todos los grupos</option>
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

                  <div className="relative flex-1 md:w-64">
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
              </div>

              {activeTab === 'structure' ? (
                <div className="space-y-8">
                  {(() => {
                    const filtered = viewMatches.filter(m => {
                      const mGroupKey = m.league_group_id || '__liga__';
                      const matchesGroup = selectedGroupKey === '__all__' || mGroupKey === selectedGroupKey;
                      if (!matchesGroup) return false;

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

                    const groups = Array.from(new Set(filtered.map(m => m.group?.group_name || 'Liga Única'))).sort();
                    
                    if (groups.length === 0) return <Card className="p-8 text-center text-slate-500 italic">No hay partidos que coincidan.</Card>;

                    return groups.map(gName => (
                      <div key={gName} className="space-y-4">
                        <h3 className="text-xl font-bold text-indigo-400 border-l-4 border-indigo-500 pl-4 py-1 bg-indigo-500/5 rounded-r-lg">
                          {gName}
                        </h3>
                        {(() => {
                          const gMatches = filtered.filter(m => (m.group?.group_name || 'Liga Única') === gName);
                          const phase1Matches = gMatches.filter(m => m.phase === 1 || !m.phase);
                          const phase2Matches = gMatches.filter(m => m.phase === 2);
                          
                          return (
                            <div className="space-y-8">
                              {phase1Matches.length > 0 && (
                                <Card title="Pool de Clasificación (Fase 1)" subtitle="Orden de fecha no relevante">
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                                    {phase1Matches.map(m => (
                                      <div key={m.id} className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-col gap-2 hover:border-slate-700 transition-all group">
                                        <div className="flex justify-between items-center text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1">
                                          <span>Match #{m.id.slice(-4)} {m.round ? `· F${m.round}` : ''}</span>
                                          {m.status === 'jugado' ? (
                                            <span className="text-emerald-500">FINALIZADO</span>
                                          ) : m.match_date ? (
                                            <span className="text-indigo-400">PROGRAMADO</span>
                                          ) : (
                                            <span className="text-slate-600">PENDIENTE</span>
                                          )}
                                        </div>
                                        <div className="flex flex-col gap-1 text-sm font-semibold italic text-white leading-tight">
                                          <div className={cn(m.winner_id === m.team1_id && "text-emerald-400")}>{m.team1?.team_name}</div>
                                          <div className="text-[10px] text-slate-600 font-bold not-italic my-0.5">VS</div>
                                          <div className={cn(m.winner_id === m.team2_id && "text-emerald-400")}>{m.team2?.team_name}</div>
                                        </div>
                                        <div className="flex justify-between items-end mt-2">
                                          <div className="text-[10px] text-slate-400">
                                            {m.match_date ? `${m.match_date} ${m.match_time}` : "Sin fecha"}
                                          </div>
                                          <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => setModalMatch({ ...m })}>
                                            {m.status === 'jugado' ? 'Editar' : 'Cargar'}
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </Card>
                              )}

                              {phase2Matches.length > 0 && (
                                <div className="space-y-4">
                                  <h4 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                                    <Trophy size={20} /> Fase 2: Playoff / Eliminación
                                  </h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {phase2Matches.map(m => (
                                      <div key={m.id} className="p-4 bg-slate-900 border-2 border-amber-500/20 rounded-2xl flex flex-col gap-3 shadow-lg shadow-amber-500/5">
                                        <div className="flex justify-between items-center text-[10px] text-amber-500/70 uppercase font-black tracking-widest">
                                          <span>{m.comment || 'Playoff'}</span>
                                          {m.status === 'jugado' ? 'FINAL' : 'PENDIENTE'}
                                        </div>
                                        <div className="flex flex-col gap-2">
                                          <div className={cn("text-sm font-bold italic", m.winner_id === m.team1_id ? "text-emerald-400" : "text-white")}>
                                            {m.team1?.team_name || 'TBD'}
                                          </div>
                                          <div className="text-[10px] text-slate-600 font-bold px-2">VS</div>
                                          <div className={cn("text-sm font-bold italic", m.winner_id === m.team2_id ? "text-emerald-400" : "text-white")}>
                                            {m.team2?.team_name || 'TBD'}
                                          </div>
                                        </div>
                                        <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                                          <span className="text-[10px] text-slate-500 italic">#{m.id.slice(-4)}</span>
                                          <Button size="sm" variant="secondary" className="h-8 text-xs font-bold" onClick={() => setModalMatch({ ...m })}>
                                            Resultado
                                          </Button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    ));
                  })()}
                </div>
              ) : (
                <div className="space-y-6">
                  {(() => {
                    const playedMatches = viewMatches.filter(m => m.status === 'jugado');
                    const filtered = playedMatches.filter(m => {
                      const mGroupKey = m.league_group_id || '__liga__';
                      const matchesGroup = selectedGroupKey === '__all__' || mGroupKey === selectedGroupKey;
                      if (!matchesGroup) return false;
                      
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      const t1 = m.team1;
                      const t2 = m.team2;
                      const matchT1 = t1?.team_name?.toLowerCase().includes(q) || 
                                     t1?.player1?.first_name?.toLowerCase().includes(q) || 
                                     t1?.player1?.last_name?.toLowerCase().includes(q) ||
                                     t1?.player2?.first_name?.toLowerCase().includes(q) || 
                                     t1?.player2?.last_name?.toLowerCase().includes(q);
                      const matchT2 = t2?.team_name?.toLowerCase().includes(q) || 
                                     t2?.player1?.first_name?.toLowerCase().includes(q) || 
                                     t2?.player1?.last_name?.toLowerCase().includes(q) ||
                                     t2?.player2?.first_name?.toLowerCase().includes(q) || 
                                     t2?.player2?.last_name?.toLowerCase().includes(q);
                      return matchT1 || matchT2;
                    });
                    
                    const groups = Array.from(new Set(filtered.map(m => m.group?.group_name || 'Liga Única'))).sort();

                    if (filtered.length === 0) {
                      return (
                        <Card>
                          <p className="text-sm text-slate-500 py-8 text-center italic">No hay resultados registrados en este filtro.</p>
                        </Card>
                      );
                    }

                    return groups.map(gName => (
                      <Card key={gName} title={`Resultados ${gName}`}>
                        <Table headers={[
                          'Ronda', 
                          'Pareja 1', 
                          'Pareja 2', 
                          'Sets', 
                          'Ganador', 
                          ...(filtered.some(m => m.match_date || m.match_time || m.court_name || m.comment) 
                              ? ['Info Adicional'] 
                              : []),
                          'Acción'
                        ]}>
                          {filtered
                            .filter(m => (m.group?.group_name || 'Liga Única') === gName)
                            .map((m) => {
                              const p1 = m.team1?.team_name || '?';
                              const p2 = m.team2?.team_name || '?';
                              const winner = m.winner_id === m.team1_id ? p1 : p2;
                              const hasExtra = m.match_date || m.match_time || m.court_name || m.comment;
                              
                              return (
                                <TableRow key={m.id}>
                                  <TableCell className="text-slate-500 font-mono text-xs">F{m.round}</TableCell>
                                  <TableCell className={cn("font-bold italic", m.winner_id === m.team1_id ? "text-emerald-400" : "text-white")}>
                                    {p1}
                                  </TableCell>
                                  <TableCell className={cn("font-bold italic", m.winner_id === m.team2_id ? "text-emerald-400" : "text-white")}>
                                    {p2}
                                  </TableCell>
                                  <TableCell className="font-mono text-center font-bold text-indigo-400">
                                    {m.team1_sets}-{m.team2_sets}
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 font-bold uppercase">
                                      Ganó {winner}
                                    </span>
                                  </TableCell>
                                  {filtered.some(f => f.match_date || f.match_time || f.court_name || f.comment) && (
                                    <TableCell>
                                      <div className="text-[10px] flex flex-col gap-0.5">
                                        {(m.match_date || m.match_time) && (
                                          <span className="text-slate-300 font-medium">
                                            {m.match_date || ''} {m.match_time || ''}
                                          </span>
                                        )}
                                        {m.court_name && (
                                          <span className="text-indigo-400">Cancha: {m.court_name}</span>
                                        )}
                                        {m.comment && (
                                          <span className="text-slate-500 italic max-w-[150px] truncate" title={m.comment}>
                                            "{m.comment}"
                                          </span>
                                        )}
                                      </div>
                                    </TableCell>
                                  )}
                                  <TableCell>
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => {
                                        setModalMatch({
                                          id: m.id,
                                          team1_id: m.team1_id,
                                          team2_id: m.team2_id,
                                          team1: m.team1,
                                          team2: m.team2,
                                          status: m.status,
                                          match_date: m.match_date,
                                          match_time: m.match_time,
                                          court_name: m.court_name,
                                          comment: m.comment
                                        });
                                      }}
                                    >
                                      Editar
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </Table>
                      </Card>
                    ));
                  })()}
                </div>
              )}
            </>
          )}
        </div>
      ) : null}

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
