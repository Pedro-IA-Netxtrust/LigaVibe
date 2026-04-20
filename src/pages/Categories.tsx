import React from 'react';
import { Card } from '../components/ui/Base';
import { Table, TableRow, TableCell } from '../components/ui/Table';

export default function Categories() {
  return (
    <Card title="Categorías de la Liga" subtitle="Configuración de modalidades y cupos">
      <Table headers={['Nombre', 'Modalidad', 'Cupos Max', 'Estado']}>
        <TableRow>
          <TableCell className="font-bold text-slate-100">2da Varones</TableCell>
          <TableCell>Doble</TableCell>
          <TableCell>16 Parejas</TableCell>
          <TableCell>
            <span className="badge badge-primary">ABIERTO</span>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell className="font-bold text-slate-100">3ra Mixto</TableCell>
          <TableCell>Doble</TableCell>
          <TableCell>12 Parejas</TableCell>
          <TableCell>
            <span className="badge badge-secondary">EN PROGRESO</span>
          </TableCell>
        </TableRow>
      </Table>
    </Card>
  );
}
