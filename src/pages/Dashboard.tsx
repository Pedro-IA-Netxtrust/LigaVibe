import React from 'react';
import { Card } from '../components/ui/Base';
import { Table, TableRow, TableCell } from '../components/ui/Table';
import { cn } from '../lib/utils';
import { dashboardService } from '../services/dashboardService';
import { LoadingState } from '../components/ui/States';
import { Trophy, Calendar, AlertCircle, Clock, DollarSign } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = React.useState<any[]>([]);
  const [results, setResults] = React.useState<any[]>([]);
  const [upcoming, setUpcoming] = React.useState<any[]>([]);
  const [debtors, setDebtors] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadAllData() {
      try {
        const [statsData, resultsData, upcomingData, debtorsData] = await Promise.all([
          dashboardService.getStats(),
          dashboardService.getRecentResults(5),
          dashboardService.getUpcomingMatches(5),
          dashboardService.getDebtors(10)
        ]);

        setStats([
          { label: 'Jugadores Totales', value: statsData.players.toString(), trend: 'Registrados', color: 'text-indigo-400', icon: Trophy },
          { label: 'Categorías Activas', value: statsData.categories.toString(), trend: 'En curso', color: 'text-slate-400', icon: Calendar },
          { label: 'Inscripciones Pagadas', value: statsData.paidRegistrations.toString(), trend: 'Recaudación', color: 'text-emerald-400', icon: DollarSign },
          { label: 'Partidos Jugados', value: statsData.playedMatches.toString(), trend: 'Finalizados', color: 'text-indigo-400', icon: Clock },
        ]);

        setResults(resultsData);
        setUpcoming(upcomingData);
        setDebtors(debtorsData);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadAllData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingState />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 rounded-lg bg-slate-800/50">
                <stat.icon className={cn("w-5 h-5", stat.color)} />
              </div>
              <span className={cn("text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-800", stat.color)}>
                {stat.trend}
              </span>
            </div>
            <div>
              <p className="text-[13px] font-medium text-slate-400 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold text-white tracking-tight">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Results */}
        <Card 
          title="Últimos Resultados" 
          subtitle="Partidos finalizados recientemente"
          className="border-l-4 border-l-emerald-500/50"
        >
          <div className="space-y-4">
            {results.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center italic">No hay resultados recientes.</p>
            ) : (
              results.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-800/50 hover:bg-slate-800/50 transition-all group">
                  <div className="flex-1">
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-wider">{m.category?.name}</div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 text-right font-bold text-white text-sm truncate">{m.team1?.team_name}</div>
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 font-black text-sm border border-indigo-500/20">
                        {m.team1_score} - {m.team2_score}
                      </div>
                      <div className="flex-1 text-left font-bold text-white text-sm truncate">{m.team2?.team_name}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Upcoming Matches */}
        <Card 
          title="Próximos Partidos" 
          subtitle="Encuentros programados en agenda"
          className="border-l-4 border-l-indigo-500/50"
        >
          <div className="space-y-4">
            {upcoming.length === 0 ? (
              <p className="text-sm text-slate-500 py-8 text-center italic">No hay partidos programados.</p>
            ) : (
              upcoming.map((m) => (
                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 border border-slate-800/50 hover:bg-slate-800/50 transition-all">
                  <div className="flex-1">
                    <div className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-wider">{m.category?.name}</div>
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-200 text-sm truncate max-w-[200px]">
                        {m.team1?.team_name} <span className="text-slate-600 mx-1">vs</span> {m.team2?.team_name}
                      </div>
                      <div className="text-right">
                        <div className="text-[11px] font-bold text-indigo-400 flex items-center gap-1">
                          <Calendar size={12} /> {m.match_date}
                        </div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 justify-end">
                          <Clock size={10} /> {m.match_time}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Debtors Section */}
      <Card 
        title="Control de Pagos (Deudores)" 
        subtitle="Jugadores con inscripción pendiente de pago"
        className="border-l-4 border-l-amber-500/50"
      >
        <Table headers={['Equipo / Jugadores', 'Categoría', 'Estado Jugador 1', 'Estado Jugador 2']}>
          {debtors.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-8 text-slate-500 italic">No hay deudores pendientes.</TableCell>
            </TableRow>
          ) : (
            debtors.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <div className="font-bold text-slate-100">{t.team_name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {t.player1?.first_name} {t.player1?.last_name} / {t.player2?.first_name} {t.player2?.last_name}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs font-medium text-slate-400">{t.category?.name}</span>
                </TableCell>
                <TableCell>
                  {t.paid_player1 ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Pagado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      <AlertCircle size={10} /> Pendiente
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  {t.paid_player2 ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Pagado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 uppercase bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      <AlertCircle size={10} /> Pendiente
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </Table>
      </Card>
    </div>
  );
}

