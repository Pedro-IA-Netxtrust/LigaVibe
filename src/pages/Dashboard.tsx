import React from 'react';
import { Card, Button } from '../components/ui/Base';
import { Table, TableRow, TableCell } from '../components/ui/Table';
import { cn } from '../lib/utils';
import { Users, UserPlus, Trophy, Calendar } from 'lucide-react';

export default function Dashboard() {
  const stats = [
    { label: 'Jugadores Totales', value: '248', trend: '+12 este mes', color: 'text-indigo-400' },
    { label: 'Categorías Activas', value: '6', trend: 'Sin cambios', color: 'text-slate-400' },
    { label: 'Parejas Inscritas', value: '42', trend: '+5 hoy', color: 'text-indigo-400' },
    { label: 'Partidos Pendientes', value: '18', trend: '4 prioritarios', color: 'text-amber-400' },
  ];

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <div>
              <p className="text-[13px] font-medium text-slate-400 mb-2">{stat.label}</p>
              <p className="text-2xl font-bold text-white">{stat.value}</p>
              <p className={cn("text-xs mt-2 font-medium", stat.color)}>
                {stat.trend}
              </p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card title="Jugadores Recientes" subtitle="Resumen de actividad en la plataforma">
          <Table headers={['Nombre', 'Email', 'Categoría', 'Estado']}>
            <TableRow>
              <TableCell className="font-semibold text-slate-100">Sebastian Piñera</TableCell>
              <TableCell className="text-slate-500">s.pinera@vibesport.com</TableCell>
              <TableCell>
                <span className="badge badge-primary">2da Varones</span>
              </TableCell>
              <TableCell>
                <span className="text-xs font-medium text-indigo-400">Activo</span>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-semibold text-slate-100">Claudia Schmidt</TableCell>
              <TableCell className="text-slate-500">c.schmidt@email.com</TableCell>
              <TableCell>
                <span className="badge badge-primary">3ra Damas</span>
              </TableCell>
              <TableCell>
                <span className="text-xs font-medium text-indigo-400">Inscrito</span>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-semibold text-slate-100">Ricardo Fort</TableCell>
              <TableCell className="text-slate-500">comandante@miami.ar</TableCell>
              <TableCell>
                <span className="badge badge-secondary">4ta Varones</span>
              </TableCell>
              <TableCell>
                <span className="text-xs font-medium text-slate-500">Pendiente</span>
              </TableCell>
            </TableRow>
          </Table>
          <div className="mt-4 flex justify-end px-4">
            <button className="text-indigo-400 text-sm font-semibold hover:text-indigo-300 transition-colors">
              Ver todos los jugadores
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}
